const config = require("../config");
const { db, normalizeText } = require("../database");
const { CATEGORY_NAMES } = require("../catalog");
const { toProduct, parseInterests } = require("../mappers");
const { formatBRL } = require("../money");
const { generateJson, isConfigured, GeminiError } = require("./geminiService");

const TYPES = {
  melhor_preco: "Melhor preço",
  melhor_desempenho: "Melhor desempenho",
  custo_beneficio: "Custo-benefício",
};
const LEVEL_SCORE = { Iniciante: 1, Intermediário: 2, Profissional: 3 };
const MAX_CATEGORIES = 5;
const MAX_CANDIDATES = 90;
const MAX_RESULTS = 12;

const SYSTEM_INSTRUCTION = [
  "Você é o assistente de compras da Acorde, uma loja online de instrumentos e produtos de música.",
  "Responda sempre em português do Brasil, com linguagem simples e direta.",
  "Recomende SOMENTE produtos da lista recebida, usando o id exato de cada um.",
  "Avalie o desempenho pelo nível (Iniciante, Intermediário, Profissional), pela marca e pela descrição.",
  "Nunca invente produtos, preços, estoque ou características que não estejam na lista.",
].join(" ");

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    resumo: { type: "STRING" },
    recomendacoes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          productId: { type: "INTEGER" },
          tipo: { type: "STRING", enum: Object.keys(TYPES) },
          motivo: { type: "STRING" },
        },
        required: ["productId", "tipo", "motivo"],
      },
    },
  },
  required: ["resumo", "recomendacoes"],
};

function resolveCategories(user, requested) {
  if (requested.length > 0) return requested.slice(0, MAX_CATEGORIES);
  const profile = db.prepare("SELECT interests FROM clients WHERE user_id = ?").get(user.id);
  const interests = parseInterests(profile?.interests).filter((name) => CATEGORY_NAMES.includes(name));
  return (interests.length > 0 ? interests : CATEGORY_NAMES).slice(0, MAX_CATEGORIES);
}

function loadCandidates(categories, budgetCents) {
  const placeholders = categories.map(() => "?").join(", ");
  const params = [...categories];
  let sql = `SELECT * FROM products WHERE active = 1 AND stock > 0 AND category IN (${placeholders})`;
  if (budgetCents) {
    sql += " AND price_cents <= ?";
    params.push(budgetCents);
  }
  sql += " ORDER BY price_cents ASC";
  const rows = db.prepare(sql).all(...params);
  if (rows.length <= MAX_CANDIDATES) return rows;
  const step = rows.length / MAX_CANDIDATES;
  return Array.from({ length: MAX_CANDIDATES }, (_, i) => rows[Math.floor(i * step)]);
}

function buildPrompt({ categories, budgetCents, query, candidates }) {
  const payload = {
    categorias: categories,
    orcamento_maximo: budgetCents ? formatBRL(budgetCents) : "sem limite",
    pedido_do_cliente: query || "Quero as melhores opções de preço e de desempenho nessas categorias.",
    produtos: candidates.map((row) => ({
      id: row.id,
      nome: row.name,
      marca: row.brand,
      categoria: row.category,
      nivel: row.level,
      preco: formatBRL(row.price_cents),
      descricao: row.description,
    })),
  };
  return [
    "Dados da busca do cliente (JSON):",
    JSON.stringify(payload),
    "",
    "Tarefa: para cada categoria, indique até 3 produtos da lista:",
    "- melhor_preco: a opção mais barata que ainda atende bem quem procura;",
    "- melhor_desempenho: a opção de maior qualidade dentro do orçamento;",
    "- custo_beneficio: o melhor equilíbrio entre preço e qualidade.",
    "Considere o pedido do cliente ao escolher. Um mesmo produto pode aparecer em mais de um tipo.",
    `Devolva no máximo ${MAX_RESULTS} recomendações. Em "motivo", explique em até 2 frases por que o produto foi escolhido.`,
    'Em "resumo", escreva até 3 frases orientando a compra.',
    'Responda apenas com JSON no formato {"resumo": "...", "recomendacoes": [{"productId": 1, "tipo": "melhor_preco", "motivo": "..."}]}.',
  ].join("\n");
}

function sanitizeAiResult(result, candidates) {
  const byId = new Map(candidates.map((row) => [row.id, row]));
  const seen = new Set();
  const items = [];
  for (const item of Array.isArray(result?.recomendacoes) ? result.recomendacoes : []) {
    const id = Number(item?.productId);
    const tipo = item?.tipo;
    const motivo = typeof item?.motivo === "string" ? item.motivo.trim().slice(0, 400) : "";
    const key = `${id}:${tipo}`;
    if (!byId.has(id) || !TYPES[tipo] || !motivo || seen.has(key)) continue;
    seen.add(key);
    items.push({ row: byId.get(id), tipo, motivo });
    if (items.length >= MAX_RESULTS) break;
  }
  const resumo = typeof result?.resumo === "string" ? result.resumo.trim().slice(0, 600) : "";
  return { resumo, items };
}

const STOPWORDS = new Set(["para", "com", "que", "uma", "um", "por", "mais", "bom", "boa", "quero", "preciso", "algo", "tocar", "comprar", "meu", "minha", "dos", "das", "nos", "nas"]);

function queryTerms(query) {
  return normalizeText(query)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3 && !STOPWORDS.has(term))
    .map((term) => (term.length > 4 ? term.replace(/s$/, "") : term));
}

function relevance(row, terms) {
  const words = new Set(normalizeText(`${row.name} ${row.brand} ${row.category} ${row.description}`).split(/[^a-z0-9]+/));
  return terms.reduce((sum, term) => sum + (words.has(term) || words.has(`${term}s`) || words.has(`${term}es`) ? 1 : 0), 0);
}

function localRecommendations(categories, candidates, query) {
  const terms = queryTerms(query);
  const scored = candidates.map((row) => ({ row, score: relevance(row, terms) }));
  const groups = categories
    .map((category) => {
      const all = scored.filter((item) => item.row.category === category);
      const top = Math.max(0, ...all.map((item) => item.score));
      const rows = (top > 0 ? all.filter((item) => item.score > 0) : all).map((item) => item.row);
      return { category, rows, top };
    })
    .filter((group) => group.rows.length > 0)
    .sort((a, b) => b.top - a.top);

  const value = (row) => Math.pow(LEVEL_SCORE[row.level], 1.6) / Math.log10(row.price_cents / 100 + 10);
  const items = [];
  for (const { category, rows } of groups) {
    const cheapest = rows.reduce((best, row) => (row.price_cents < best.price_cents ? row : best));
    const others = rows.filter((row) => row.id !== cheapest.id);
    const strongest = (others.length ? others : rows).reduce((best, row) => {
      const score = LEVEL_SCORE[row.level] * 1e9 + row.price_cents;
      const bestScore = LEVEL_SCORE[best.level] * 1e9 + best.price_cents;
      return score > bestScore ? row : best;
    });
    const middle = rows.filter((row) => row.id !== cheapest.id && row.id !== strongest.id);

    items.push({
      row: cheapest,
      tipo: "melhor_preco",
      motivo: `É a opção mais barata de ${category} disponível agora (${formatBRL(cheapest.price_cents)}).`,
    });
    if (strongest.id !== cheapest.id) {
      items.push({
        row: strongest,
        tipo: "melhor_desempenho",
        motivo: `Nível ${strongest.level}: a opção mais completa de ${category} dentro da busca.`,
      });
    }
    if (middle.length > 0) {
      const balanced = middle.reduce((best, row) => (value(row) > value(best) ? row : best));
      items.push({
        row: balanced,
        tipo: "custo_beneficio",
        motivo: `Bom equilíbrio entre o nível ${balanced.level} e o preço de ${formatBRL(balanced.price_cents)}.`,
      });
    }
  }
  return items.slice(0, MAX_RESULTS);
}

function present(items) {
  return items.map(({ row, tipo, motivo }) => ({
    tipo,
    tipoLabel: TYPES[tipo],
    motivo,
    product: toProduct(row),
  }));
}

async function recommend(user, { categories: requested, budgetCents, query }) {
  const categories = resolveCategories(user, requested);
  const candidates = loadCandidates(categories, budgetCents);
  const base = {
    categories,
    budget: budgetCents ? budgetCents / 100 : null,
    query,
    generatedAt: new Date().toISOString(),
  };

  if (candidates.length === 0) {
    return {
      ...base,
      source: "local",
      resumo: "Não encontramos produtos em estoque com esses filtros. Tente aumentar o orçamento ou escolher outras categorias.",
      recomendacoes: [],
    };
  }

  let warning = null;
  if (isConfigured()) {
    try {
      const result = await generateJson({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt: buildPrompt({ categories, budgetCents, query, candidates }),
        schema: RESPONSE_SCHEMA,
      });
      const { resumo, items } = sanitizeAiResult(result, candidates);
      if (items.length > 0) {
        return {
          ...base,
          source: "gemini",
          model: config.geminiModel,
          resumo: resumo || "Estas são as opções que o assistente selecionou para você.",
          recomendacoes: present(items),
        };
      }
      warning = "O Gemini não devolveu produtos válidos do catálogo; mostrando a seleção da loja.";
    } catch (error) {
      warning = error instanceof GeminiError ? error.message : "Falha inesperada ao consultar o Gemini.";
    }
  } else {
    warning = "Gemini não configurado (GEMINI_API_KEY); mostrando a seleção calculada pela loja.";
  }

  return {
    ...base,
    source: "local",
    warning,
    resumo: "Seleção calculada pela própria loja: o mais barato, o mais completo e o melhor equilíbrio de cada categoria.",
    recomendacoes: present(localRecommendations(categories, candidates, query)),
  };
}

module.exports = { recommend, sanitizeAiResult, TYPES };
