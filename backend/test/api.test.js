process.env.DB_FILE = ":memory:";
process.env.JWT_SECRET = "chave-somente-para-testes";
process.env.GEMINI_API_KEY = "";
process.env.AI_REQUESTS_PER_WINDOW = "6";

const test = require("node:test");
const assert = require("node:assert/strict");
const server = require("../src/server");
const config = require("../src/config");

const realFetch = globalThis.fetch;
let external = null;
const externalCalls = [];
globalThis.fetch = async (url, options) => {
  const target = String(url);
  if (target.startsWith("http://127.0.0.1")) return realFetch(url, options);
  externalCalls.push({ url: target, options });
  if (!external) throw new TypeError("fetch failed");
  return external(target, options);
};

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let baseUrl;
const tokens = {};

async function api(method, path, body, token) {
  const response = await realFetch(baseUrl + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

const ADDRESS = {
  cep: "01310-100",
  street: "Avenida Paulista",
  number: "1000",
  complement: "Apto 1",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "sp",
};

test.before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  globalThis.fetch = realFetch;
  server.close();
});

test("login separa cliente e administrador", async () => {
  const admin = await api("POST", "/auth/login", { email: "admin@acorde.com", password: "acorde123", role: "admin" });
  assert.equal(admin.status, 200);
  assert.equal(admin.data.user.role, "admin");
  tokens.admin = admin.data.token;

  const customer = await api("POST", "/auth/login", { email: "cliente@acorde.com", password: "acorde123", role: "customer" });
  assert.equal(customer.status, 200);
  assert.equal(customer.data.user.role, "customer");
  tokens.customer = customer.data.token;

  const adminOnCustomerTab = await api("POST", "/auth/login", { email: "admin@acorde.com", password: "acorde123", role: "customer" });
  assert.equal(adminOnCustomerTab.status, 403);
  const customerOnAdminTab = await api("POST", "/auth/login", { email: "cliente@acorde.com", password: "acorde123", role: "admin" });
  assert.equal(customerOnAdminTab.status, 403);
  assert.match(customerOnAdminTab.data.message, /não é de administrador/);

  const wrong = await api("POST", "/auth/login", { email: "admin@acorde.com", password: "errada", role: "admin" });
  assert.equal(wrong.status, 401);
});

test("cadastro de cliente exige endereço completo e categorias válidas", async () => {
  const invalid = await api("POST", "/auth/register", {
    name: "Lu",
    email: "x",
    password: "123",
    phone: "12",
    cep: "123",
    interests: ["Gaita de foles"],
  });
  assert.equal(invalid.status, 400);
  assert.deepEqual(
    Object.keys(invalid.data.errors).sort(),
    ["cep", "city", "email", "interests", "name", "neighborhood", "number", "password", "phone", "state", "street"]
  );

  const noInterest = await api("POST", "/auth/register", {
    name: "Luiza Prado",
    email: "luiza@example.com",
    password: "segredo1",
    phone: "(11) 91234-5678",
    ...ADDRESS,
    interests: [],
  });
  assert.equal(noInterest.status, 400);
  assert.ok(noInterest.data.errors.interests);
});

test("cadastro de cliente com CEP e várias categorias cria conta e perfil", async () => {
  const created = await api("POST", "/auth/register", {
    name: "  Luiza   Prado ",
    email: "Luiza@Example.com",
    password: "segredo1",
    phone: "(11) 91234-5678",
    ...ADDRESS,
    interests: ["Microfones", "Violões", "Microfones"],
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.user.role, "customer");
  assert.equal(created.data.user.name, "Luiza Prado");
  tokens.luiza = created.data.token;

  const profile = await api("GET", "/me/profile", null, tokens.luiza);
  assert.equal(profile.status, 200);
  assert.equal(profile.data.cep, "01310100");
  assert.equal(profile.data.state, "SP");
  assert.equal(profile.data.number, "1000");
  assert.deepEqual(profile.data.interests, ["Violões", "Microfones"]);

  const repeated = await api("POST", "/auth/register", {
    name: "Outra Luiza",
    email: "luiza@example.com",
    password: "segredo1",
    phone: "11912345678",
    ...ADDRESS,
    interests: ["Violões"],
  });
  assert.equal(repeated.status, 409);
});

test("conta nova aproveita o cadastro feito antes pelo administrador", async () => {
  const byAdmin = await api(
    "POST",
    "/clients",
    { name: "Marcos Teixeira", email: "marcos@example.com", phone: "11955554444", ...ADDRESS, interests: ["Baixos"] },
    tokens.admin
  );
  assert.equal(byAdmin.status, 201);
  assert.equal(byAdmin.data.hasAccount, false);

  const account = await api("POST", "/auth/register", {
    name: "Marcos Teixeira",
    email: "marcos@example.com",
    password: "segredo1",
    phone: "11955554444",
    ...ADDRESS,
    interests: ["Baixos", "Amplificadores"],
  });
  assert.equal(account.status, 201);

  const client = await api("GET", `/clients/${byAdmin.data.id}`, null, tokens.admin);
  assert.equal(client.data.hasAccount, true);
  assert.deepEqual(client.data.interests, ["Baixos", "Amplificadores"]);
});

test("consulta de CEP usa ViaCEP, cai para a BrasilAPI e trata CEP inexistente", async () => {
  external = async (url) => {
    if (url.includes("viacep") && url.includes("01310100")) {
      return jsonResponse(200, { cep: "01310-100", logradouro: "Avenida Paulista", complemento: "de 612 a 1510 - lado par", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" });
    }
    if (url.includes("viacep") && url.includes("99999999")) return jsonResponse(200, { erro: "true" });
    if (url.includes("viacep")) return jsonResponse(503, {});
    if (url.includes("brasilapi")) return jsonResponse(200, { cep: "13015904", street: "Rua Barão de Jaguara", neighborhood: "Centro", city: "Campinas", state: "SP" });
    throw new TypeError("fetch failed");
  };

  const found = await api("GET", "/cep/01310-100");
  assert.equal(found.status, 200);
  assert.equal(found.data.city, "São Paulo");
  assert.equal(found.data.street, "Avenida Paulista");

  const fallback = await api("GET", "/cep/13015904");
  assert.equal(fallback.status, 200);
  assert.equal(fallback.data.city, "Campinas");

  const missing = await api("GET", "/cep/99999999");
  assert.equal(missing.status, 404);

  const invalid = await api("GET", "/cep/123");
  assert.equal(invalid.status, 400);

  external = async () => {
    throw new TypeError("fetch failed");
  };
  const down = await api("GET", "/cep/22071900");
  assert.equal(down.status, 502);
  external = null;
});

test("catálogo tem mais de 80 itens, do mais barato ao mais caro, com filtros", async () => {
  const all = await api("GET", "/products", null, tokens.customer);
  assert.equal(all.status, 200);
  assert.ok(all.data.length >= 80, `catálogo com ${all.data.length} itens`);
  const prices = all.data.map((product) => product.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));

  const categories = await api("GET", "/categories");
  assert.equal(categories.data.categories.length, 14);
  for (const category of categories.data.categories) {
    assert.ok(all.data.some((product) => product.category === category.name), `sem produtos em ${category.name}`);
  }

  const amps = await api("GET", "/products?category=Amplificadores&sort=price_desc", null, tokens.customer);
  assert.ok(amps.data.every((product) => product.category === "Amplificadores"));
  assert.ok(amps.data[0].price >= amps.data.at(-1).price);

  const search = await api("GET", "/products?search=palheta", null, tokens.customer);
  assert.ok(search.data.length >= 2);
  assert.ok(search.data.every((product) => /palheta/i.test(product.name)));
});

test("cada perfil só acessa o que é dele", async () => {
  assert.equal((await api("POST", "/products", { name: "X" }, tokens.customer)).status, 403);
  assert.equal((await api("GET", "/clients", null, tokens.customer)).status, 403);
  assert.equal((await api("GET", "/admin/dashboard", null, tokens.customer)).status, 403);
  assert.equal((await api("POST", "/orders", { items: [{ productId: 1, quantity: 1 }] }, tokens.admin)).status, 403);
  assert.equal((await api("POST", "/ai/recommendations", {}, tokens.admin)).status, 403);
  assert.equal((await api("GET", "/products", null, null)).status, 401);
});

test("administrador cadastra mercadoria e registra entrada de estoque", async () => {
  const invalid = await api("POST", "/products", { name: "Ab", price: "10,5", category: "Kazoo", level: "Mestre", stock: -1 }, tokens.admin);
  assert.equal(invalid.status, 400);
  assert.deepEqual(Object.keys(invalid.data.errors).sort(), ["brand", "category", "level", "name", "price", "stock"]);

  const created = await api(
    "POST",
    "/products",
    { name: "Afinador Cromático Teste", brand: "Acorde", category: "Acessórios", level: "Iniciante", price: 79.9, stock: 5, minStock: 2, description: "Para testes" },
    tokens.admin
  );
  assert.equal(created.status, 201);
  assert.equal(created.data.stock, 5);
  assert.match(created.data.sku, /^ACE-\d{3}$/);
  tokens.productId = created.data.id;

  const duplicate = await api(
    "POST",
    "/products",
    { name: "afinador cromático teste", brand: "ACORDE", category: "Acessórios", level: "Iniciante", price: 80 },
    tokens.admin
  );
  assert.equal(duplicate.status, 409);

  const entry = await api("POST", `/products/${created.data.id}/stock`, { quantity: 10, note: "Fornecedor X" }, tokens.admin);
  assert.equal(entry.status, 201);
  assert.equal(entry.data.stock, 15);

  const badEntry = await api("POST", `/products/${created.data.id}/stock`, { quantity: 0 }, tokens.admin);
  assert.equal(badEntry.status, 400);

  const movements = await api("GET", `/products/${created.data.id}/movements`, null, tokens.admin);
  assert.deepEqual(movements.data.map((item) => [item.type, item.quantity, item.reason]), [
    ["entrada", 10, "reposição"],
    ["entrada", 5, "estoque inicial"],
  ]);
});

test("compra baixa o estoque, registra saída e usa o preço do banco", async () => {
  const before = await api("GET", "/admin/dashboard?days=7", null, tokens.admin);
  const product = (await api("GET", `/products/${tokens.productId}`, null, tokens.customer)).data;

  const order = await api(
    "POST",
    "/orders",
    { items: [{ productId: product.id, quantity: 2, price: 0.01 }, { productId: product.id, quantity: 1 }] },
    tokens.customer
  );
  assert.equal(order.status, 201);
  assert.equal(order.data.itemsCount, 3);
  assert.equal(order.data.total, Math.round(product.price * 3 * 100) / 100);

  const after = (await api("GET", `/products/${product.id}`, null, tokens.customer)).data;
  assert.equal(after.stock, product.stock - 3);

  const movements = await api("GET", `/products/${product.id}/movements`, null, tokens.admin);
  assert.deepEqual([movements.data[0].type, movements.data[0].quantity, movements.data[0].orderId], ["saida", 3, order.data.id]);

  const dashboard = await api("GET", "/admin/dashboard?days=7", null, tokens.admin);
  assert.equal(dashboard.data.totais.pedidos, before.data.totais.pedidos + 1);
  assert.equal(dashboard.data.vendasPorDia.length, 7);
  assert.equal(dashboard.data.movimentacaoPorDia.length, 7);
  assert.ok(dashboard.data.maisVendidos.length > 0);

  const mine = await api("GET", "/orders", null, tokens.customer);
  assert.equal(mine.data[0].id, order.data.id);
});

test("compra com estoque insuficiente não altera nada", async () => {
  const product = (await api("GET", `/products/${tokens.productId}`, null, tokens.customer)).data;
  const cheap = (await api("GET", "/products?search=palheta", null, tokens.customer)).data[0];

  const tooMuch = await api(
    "POST",
    "/orders",
    { items: [{ productId: cheap.id, quantity: 1 }, { productId: product.id, quantity: product.stock + 1 }] },
    tokens.customer
  );
  assert.equal(tooMuch.status, product.stock + 1 > 10 ? 400 : 409);

  const cheapAfter = (await api("GET", `/products/${cheap.id}`, null, tokens.customer)).data;
  assert.equal(cheapAfter.stock, cheap.stock);

  assert.equal((await api("POST", "/orders", { items: [] }, tokens.customer)).status, 400);
  assert.equal((await api("POST", "/orders", { items: [{ productId: cheap.id, quantity: 11 }] }, tokens.customer)).status, 400);

  const soldOut = await api(
    "POST",
    "/products",
    { name: "Item Esgotado Teste", brand: "Acorde", category: "Acessórios", level: "Iniciante", price: 10, stock: 0 },
    tokens.admin
  );
  const blocked = await api("POST", "/orders", { items: [{ productId: soldOut.data.id, quantity: 1 }] }, tokens.customer);
  assert.equal(blocked.status, 409);
  assert.match(blocked.data.message, /esgotado/);
});

test("assistente sem chave do Gemini usa a seleção local da loja", async () => {
  config.geminiApiKey = "";
  const result = await api("POST", "/ai/recommendations", { categories: ["Guitarras"], budget: 5000 }, tokens.customer);
  assert.equal(result.status, 200);
  assert.equal(result.data.source, "local");
  assert.match(result.data.warning, /GEMINI_API_KEY/);
  assert.deepEqual(result.data.recomendacoes.map((item) => item.tipo), ["melhor_preco", "melhor_desempenho", "custo_beneficio"]);
  for (const item of result.data.recomendacoes) {
    assert.equal(item.product.category, "Guitarras");
    assert.ok(item.product.price <= 5000);
    assert.ok(item.product.stock > 0);
  }

  const defaults = await api("POST", "/ai/recommendations", {}, tokens.customer);
  assert.deepEqual(defaults.data.categories, ["Guitarras", "Amplificadores", "Pedais e efeitos"]);

  const invalid = await api("POST", "/ai/recommendations", { categories: ["Kazoo"], budget: "abc" }, tokens.customer);
  assert.equal(invalid.status, 400);
});

test("assistente com Gemini: monta a requisição e descarta produtos inventados", async () => {
  config.geminiApiKey = "chave-falsa";
  const catalog = (await api("GET", "/products?category=Microfones", null, tokens.luiza)).data;
  const valid = catalog.find((product) => product.stock > 0 && product.price <= 1000);

  externalCalls.length = 0;
  external = async () =>
    jsonResponse(200, {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  resumo: "Para começar a gravar, foque em microfones dinâmicos.",
                  recomendacoes: [
                    { productId: valid.id, tipo: "custo_beneficio", motivo: "Ótimo para voz." },
                    { productId: 99999, tipo: "melhor_preco", motivo: "Produto inventado." },
                    { productId: valid.id, tipo: "tipo_errado", motivo: "Tipo inválido." },
                  ],
                }),
              },
            ],
          },
        },
      ],
    });

  const result = await api("POST", "/ai/recommendations", { categories: ["Microfones"], budget: "1000", query: "gravar voz em casa" }, tokens.luiza);
  assert.equal(result.status, 200);
  assert.equal(result.data.source, "gemini");
  assert.equal(result.data.recomendacoes.length, 1);
  assert.equal(result.data.recomendacoes[0].product.id, valid.id);
  assert.equal(result.data.recomendacoes[0].tipoLabel, "Custo-benefício");

  const call = externalCalls.find((item) => item.url.includes("generativelanguage.googleapis.com"));
  assert.ok(call.url.includes(`/models/${config.geminiModel}:generateContent`));
  assert.equal(call.options.headers["x-goog-api-key"], "chave-falsa");
  const body = JSON.parse(call.options.body);
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.ok(body.generationConfig.responseSchema.properties.recomendacoes);
  const prompt = body.contents[0].parts[0].text;
  assert.match(prompt, /gravar voz em casa/);
  const sent = JSON.parse(prompt.split("\n")[1]);
  assert.ok(sent.produtos.length > 0);
  assert.ok(sent.produtos.every((item) => item.categoria === "Microfones"));
  assert.ok(!sent.produtos.some((item) => item.preco === "R$ 1.990,00"));

  external = async () => jsonResponse(500, { error: { message: "Erro interno" } });
  const failed = await api("POST", "/ai/recommendations", { categories: ["Microfones"] }, tokens.luiza);
  assert.equal(failed.data.source, "local");
  assert.match(failed.data.warning, /HTTP 500/);
  assert.ok(failed.data.recomendacoes.length > 0);
  external = null;
});

test("relatório do administrador com Gemini e com modo local", async () => {
  config.geminiApiKey = "chave-falsa";
  external = async (url, options) => {
    const prompt = JSON.parse(options.body).contents[0].parts[0].text;
    assert.match(prompt, /mais_vendidos/);
    return jsonResponse(200, {
      candidates: [
        {
          content: {
            parts: [
              { text: "```json\n" + JSON.stringify({ resumo: "Semana boa.", destaques: ["A", ""], alertas: ["B"], recomendacoes: ["C", 5] }) + "\n```" },
            ],
          },
        },
      ],
    });
  };
  const ai = await api("POST", "/ai/admin-report", { days: 7 }, tokens.admin);
  assert.equal(ai.status, 200);
  assert.equal(ai.data.source, "gemini");
  assert.deepEqual(ai.data.analise, { resumo: "Semana boa.", destaques: ["A"], alertas: ["B"], recomendacoes: ["C"] });

  config.geminiApiKey = "";
  external = null;
  const local = await api("POST", "/ai/admin-report", { days: 30 }, tokens.admin);
  assert.equal(local.data.source, "local");
  assert.match(local.data.analise.resumo, /Nos últimos 30 dias/);

  assert.equal((await api("POST", "/ai/admin-report", { days: 9 }, tokens.admin)).status, 400);
});

test("limite de consultas ao assistente por usuário", async () => {
  const user = await api("POST", "/auth/register", {
    name: "Teste Limite",
    email: "limite@example.com",
    password: "segredo1",
    phone: "11912345678",
    ...ADDRESS,
    interests: ["Sopros"],
  });
  const statuses = [];
  for (let i = 0; i < 7; i++) {
    statuses.push((await api("POST", "/ai/recommendations", {}, user.data.token)).status);
  }
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 200, 429]);
});

test("cliente atualiza o próprio cadastro", async () => {
  const updated = await api(
    "PUT",
    "/me/profile",
    { name: "Luiza Prado Lima", phone: "11912345678", ...ADDRESS, number: "s/n", complement: "", interests: ["Sopros", "Baixos"] },
    tokens.luiza
  );
  assert.equal(updated.status, 200);
  assert.equal(updated.data.number, "S/N");
  assert.deepEqual(updated.data.interests, ["Baixos", "Sopros"]);

  const me = await api("GET", "/auth/me", null, tokens.luiza);
  assert.equal(me.data.user.name, "Luiza Prado Lima");
});

test("CRUD de clientes do administrador com as novas regras", async () => {
  const list = await api("GET", "/clients?search=sao paulo", null, tokens.admin);
  assert.ok(list.data.length >= 2);

  const created = await api(
    "POST",
    "/clients",
    { name: "Diego Rocha", email: "diego@example.com", phone: "16998765432", ...ADDRESS, interests: ["Cordas de arco", "Sopros"] },
    tokens.admin
  );
  assert.equal(created.status, 201);
  assert.deepEqual(created.data.interests, ["Sopros", "Cordas de arco"]);

  const updated = await api(
    "PUT",
    `/clients/${created.data.id}`,
    { ...created.data, city: "Santos", interests: ["Violões"] },
    tokens.admin
  );
  assert.equal(updated.data.city, "Santos");

  assert.equal((await api("DELETE", `/clients/${created.data.id}`, null, tokens.admin)).status, 204);

  const withAccount = (await api("GET", "/clients?search=cliente@acorde.com", null, tokens.admin)).data[0];
  assert.equal(withAccount.hasAccount, true);
  assert.equal((await api("DELETE", `/clients/${withAccount.id}`, null, tokens.admin)).status, 409);
  const changeEmail = await api("PUT", `/clients/${withAccount.id}`, { ...withAccount, email: "novo@example.com" }, tokens.admin);
  assert.equal(changeEmail.status, 409);
});

test("respostas de erro gerais e CORS", async () => {
  assert.equal((await api("GET", "/nao-existe")).status, 404);
  assert.equal((await api("DELETE", "/products")).status, 405);
  const response = await realFetch(baseUrl + "/orders", { method: "OPTIONS" });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
});
