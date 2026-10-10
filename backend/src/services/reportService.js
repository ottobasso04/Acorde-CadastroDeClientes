const config = require("../config");
const { db } = require("../database");
const { formatBRL, toReais } = require("../money");
const { generateJson, isConfigured, GeminiError } = require("./geminiService");

function localDay(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function periodDays(days) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - i));
    return localDay(date);
  });
}

function getDashboard(days) {
  const dayList = periodDays(days);
  const start = dayList[0];

  const salesRows = db
    .prepare(
      `SELECT date(created_at, 'localtime') AS day, COUNT(*) AS orders, SUM(total_cents) AS revenue, SUM(items_count) AS items
       FROM orders WHERE date(created_at, 'localtime') >= ? GROUP BY day`
    )
    .all(start);
  const salesByDay = new Map(salesRows.map((row) => [row.day, row]));

  const movementRows = db
    .prepare(
      `SELECT date(created_at, 'localtime') AS day,
         SUM(CASE WHEN type = 'entrada' THEN quantity ELSE 0 END) AS entries,
         SUM(CASE WHEN type = 'saida' THEN quantity ELSE 0 END) AS exits
       FROM stock_movements WHERE date(created_at, 'localtime') >= ? GROUP BY day`
    )
    .all(start);
  const movementsByDay = new Map(movementRows.map((row) => [row.day, row]));

  const vendasPorDia = dayList.map((day) => {
    const row = salesByDay.get(day);
    return {
      dia: day,
      pedidos: row?.orders || 0,
      itens: row?.items || 0,
      faturamento: toReais(row?.revenue || 0),
    };
  });

  const movimentacaoPorDia = dayList.map((day) => {
    const row = movementsByDay.get(day);
    return { dia: day, entradas: row?.entries || 0, saidas: row?.exits || 0 };
  });

  const maisVendidos = db
    .prepare(
      `SELECT p.id, p.name, p.brand, p.category, p.stock, SUM(oi.quantity) AS quantity,
         SUM(oi.quantity * oi.unit_price_cents) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE date(o.created_at, 'localtime') >= ?
       GROUP BY p.id ORDER BY quantity DESC, revenue DESC LIMIT 10`
    )
    .all(start)
    .map((row) => ({
      productId: row.id,
      nome: row.name,
      marca: row.brand,
      categoria: row.category,
      quantidade: row.quantity,
      faturamento: toReais(row.revenue),
      estoqueAtual: row.stock,
    }));

  const porCategoria = db
    .prepare(
      `SELECT p.category, SUM(oi.quantity) AS quantity, SUM(oi.quantity * oi.unit_price_cents) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE date(o.created_at, 'localtime') >= ?
       GROUP BY p.category ORDER BY revenue DESC`
    )
    .all(start)
    .map((row) => ({ categoria: row.category, itens: row.quantity, faturamento: toReais(row.revenue) }));

  const estoqueBaixo = db
    .prepare(
      `SELECT id, name, brand, category, stock, min_stock FROM products
       WHERE active = 1 AND stock <= min_stock ORDER BY stock ASC, name ASC LIMIT 20`
    )
    .all()
    .map((row) => ({
      productId: row.id,
      nome: row.name,
      marca: row.brand,
      categoria: row.category,
      estoque: row.stock,
      estoqueMinimo: row.min_stock,
    }));

  const inventory = db
    .prepare(
      "SELECT COUNT(*) AS products, SUM(stock) AS units, SUM(stock * price_cents) AS value FROM products WHERE active = 1"
    )
    .get();

  const pedidos = vendasPorDia.reduce((sum, day) => sum + day.pedidos, 0);
  const revenueCents = salesRows.reduce((sum, row) => sum + row.revenue, 0);

  return {
    periodo: { dias: days, inicio: start, fim: dayList[dayList.length - 1] },
    totais: {
      pedidos,
      faturamento: toReais(revenueCents),
      ticketMedio: pedidos ? toReais(revenueCents / pedidos) : 0,
      itensVendidos: vendasPorDia.reduce((sum, day) => sum + day.itens, 0),
      entradas: movimentacaoPorDia.reduce((sum, day) => sum + day.entradas, 0),
      saidas: movimentacaoPorDia.reduce((sum, day) => sum + day.saidas, 0),
      produtosAtivos: inventory.products || 0,
      unidadesEmEstoque: inventory.units || 0,
      valorEmEstoque: toReais(inventory.value || 0),
      itensComEstoqueBaixo: estoqueBaixo.length,
    },
    vendasPorDia,
    movimentacaoPorDia,
    maisVendidos,
    porCategoria,
    estoqueBaixo,
  };
}

const SYSTEM_INSTRUCTION = [
  "Você é o analista de dados da Acorde, uma loja online de instrumentos e produtos de música.",
  "Escreva em português do Brasil, de forma objetiva, para o administrador da loja.",
  "Use apenas os números recebidos; não invente dados. Valores em reais no formato R$ 1.234,56.",
].join(" ");

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    resumo: { type: "STRING" },
    destaques: { type: "ARRAY", items: { type: "STRING" } },
    alertas: { type: "ARRAY", items: { type: "STRING" } },
    recomendacoes: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["resumo", "destaques", "alertas", "recomendacoes"],
};

function buildPrompt(stats) {
  const money = (value) => formatBRL(Math.round(value * 100));
  const payload = {
    periodo: stats.periodo,
    totais: { ...stats.totais, faturamento: money(stats.totais.faturamento), ticketMedio: money(stats.totais.ticketMedio), valorEmEstoque: money(stats.totais.valorEmEstoque) },
    vendas_por_dia: stats.vendasPorDia.map((day) => ({ ...day, faturamento: money(day.faturamento) })),
    entradas_e_saidas_de_estoque_por_dia: stats.movimentacaoPorDia,
    mais_vendidos: stats.maisVendidos.map((item) => ({ ...item, faturamento: money(item.faturamento) })),
    vendas_por_categoria: stats.porCategoria.map((item) => ({ ...item, faturamento: money(item.faturamento) })),
    estoque_baixo: stats.estoqueBaixo,
  };
  return [
    "Dados de vendas e estoque do período (JSON):",
    JSON.stringify(payload),
    "",
    "Monte uma análise para o administrador com:",
    '- "resumo": até 3 frases sobre o desempenho do período (pedidos, faturamento, ticket médio e tendência das vendas por dia);',
    '- "destaques": de 2 a 4 pontos positivos (itens e categorias mais vendidos, melhores dias);',
    '- "alertas": de 1 a 4 riscos (estoque baixo ou zerado de itens que vendem, dias fracos, saídas maiores que entradas);',
    '- "recomendacoes": de 2 a 4 ações práticas (reposição com quantidades sugeridas, promoções, foco de categorias).',
    "Cada item das listas deve ter no máximo 2 frases.",
  ].join("\n");
}

function cleanList(value, max) {
  return (Array.isArray(value) ? value : [])
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim().slice(0, 400))
    .slice(0, max);
}

function localAnalysis(stats) {
  const { totais, vendasPorDia, maisVendidos, porCategoria, estoqueBaixo, periodo } = stats;
  const money = (value) => formatBRL(Math.round(value * 100));
  const bestDay = vendasPorDia.reduce((best, day) => (day.faturamento > best.faturamento ? day : best), vendasPorDia[0]);
  const zeroDays = vendasPorDia.filter((day) => day.pedidos === 0).length;
  const formatDay = (day) => day.split("-").reverse().slice(0, 2).join("/");

  const destaques = [];
  if (bestDay && bestDay.faturamento > 0) {
    destaques.push(`Melhor dia: ${formatDay(bestDay.dia)}, com ${bestDay.pedidos} pedidos e ${money(bestDay.faturamento)}.`);
  }
  if (maisVendidos[0]) {
    destaques.push(`Item mais vendido: ${maisVendidos[0].nome} (${maisVendidos[0].quantidade} unidades).`);
  }
  if (porCategoria[0]) {
    destaques.push(`Categoria com maior faturamento: ${porCategoria[0].categoria} (${money(porCategoria[0].faturamento)}).`);
  }

  const alertas = [];
  const critical = estoqueBaixo.filter((item) => item.estoque === 0);
  if (critical.length > 0) alertas.push(`${critical.length} produto(s) sem estoque: ${critical.slice(0, 3).map((i) => i.nome).join(", ")}.`);
  if (estoqueBaixo.length > critical.length) {
    alertas.push(`${estoqueBaixo.length - critical.length} produto(s) no estoque mínimo ou abaixo dele.`);
  }
  if (zeroDays > 0) alertas.push(`${zeroDays} dia(s) do período sem nenhuma venda.`);
  if (totais.saidas > totais.entradas) alertas.push(`Saíram ${totais.saidas} unidades e entraram ${totais.entradas}: o estoque está diminuindo.`);

  const recomendacoes = [];
  const restock = maisVendidos.filter((item) => item.estoqueAtual <= 3).slice(0, 3);
  if (restock.length > 0) recomendacoes.push(`Repor primeiro os mais vendidos com pouco estoque: ${restock.map((i) => i.nome).join(", ")}.`);
  if (porCategoria.length > 1) {
    const weakest = porCategoria[porCategoria.length - 1];
    recomendacoes.push(`Criar uma promoção para ${weakest.categoria}, a categoria com menor faturamento no período.`);
  }
  recomendacoes.push("Acompanhar este relatório semanalmente para ajustar compras e promoções.");

  return {
    resumo: `Nos últimos ${periodo.dias} dias foram ${totais.pedidos} pedidos e ${money(totais.faturamento)} de faturamento, com ticket médio de ${money(totais.ticketMedio)}.`,
    destaques,
    alertas: alertas.length > 0 ? alertas : ["Nenhum alerta importante no período."],
    recomendacoes,
  };
}

async function analyze(days) {
  const stats = getDashboard(days);
  const base = { periodo: stats.periodo, generatedAt: new Date().toISOString() };

  let warning;
  if (isConfigured()) {
    try {
      const result = await generateJson({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt: buildPrompt(stats),
        schema: RESPONSE_SCHEMA,
        temperature: 0.3,
      });
      const analise = {
        resumo: typeof result?.resumo === "string" ? result.resumo.trim().slice(0, 800) : "",
        destaques: cleanList(result?.destaques, 5),
        alertas: cleanList(result?.alertas, 5),
        recomendacoes: cleanList(result?.recomendacoes, 5),
      };
      if (analise.resumo) return { ...base, source: "gemini", model: config.geminiModel, analise };
      warning = "O Gemini devolveu uma análise vazia; mostrando a análise calculada pela loja.";
    } catch (error) {
      warning = error instanceof GeminiError ? error.message : "Falha inesperada ao consultar o Gemini.";
    }
  } else {
    warning = "Gemini não configurado (GEMINI_API_KEY); mostrando a análise calculada pela loja.";
  }

  return { ...base, source: "local", warning, analise: localAnalysis(stats) };
}

module.exports = { getDashboard, analyze, localDay };
