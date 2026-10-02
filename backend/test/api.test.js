process.env.DB_FILE = ":memory:";
process.env.JWT_SECRET = "chave-somente-para-testes";

const test = require("node:test");
const assert = require("node:assert/strict");
const server = require("../src/server");

let baseUrl;
let token;

async function api(method, path, body, authToken = token) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

test.before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

test("login com a conta de demonstração devolve token e usuário", async () => {
  const { status, data } = await api("POST", "/auth/login", {
    email: "demo@acorde.com",
    password: "acorde123",
  });
  assert.equal(status, 200);
  assert.equal(data.user.email, "demo@acorde.com");
  assert.equal(data.user.password_hash, undefined);
  assert.ok(data.token.split(".").length === 3);
  token = data.token;
});

test("login com senha errada é recusado", async () => {
  const { status, data } = await api("POST", "/auth/login", {
    email: "demo@acorde.com",
    password: "senha-errada",
  });
  assert.equal(status, 401);
  assert.equal(data.message, "E-mail ou senha incorretos.");
});

test("cadastro de conta valida os campos e não aceita e-mail repetido", async () => {
  const invalid = await api("POST", "/auth/register", { name: "A", email: "x", password: "123" });
  assert.equal(invalid.status, 400);
  assert.deepEqual(Object.keys(invalid.data.errors).sort(), ["email", "name", "password"]);

  const created = await api("POST", "/auth/register", {
    name: "Marina Teste",
    email: "Marina@Example.com",
    password: "segredo1",
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.user.email, "marina@example.com");

  const me = await api("GET", "/auth/me", null, created.data.token);
  assert.equal(me.status, 200);
  assert.equal(me.data.user.name, "Marina Teste");

  const repeated = await api("POST", "/auth/register", {
    name: "Marina Teste",
    email: "marina@example.com",
    password: "segredo1",
  });
  assert.equal(repeated.status, 409);
});

test("rotas de clientes exigem token válido", async () => {
  const semToken = await api("GET", "/clients", null, null);
  assert.equal(semToken.status, 401);

  const tokenAlterado = await api("GET", "/clients", null, token.slice(0, -2) + "xx");
  assert.equal(tokenAlterado.status, 401);
});

test("lista os clientes iniciais em ordem alfabética", async () => {
  const { status, data } = await api("GET", "/clients");
  assert.equal(status, 200);
  assert.deepEqual(
    data.map((client) => client.name),
    ["Ana Souza", "Bruno Lima", "Carla Mendes", "José Ferreira"]
  );
});

test("busca por nome ignora maiúsculas e acentos", async () => {
  const porNome = await api("GET", "/clients?search=JOSE");
  assert.deepEqual(porNome.data.map((client) => client.name), ["José Ferreira"]);

  const porEmail = await api("GET", "/clients?search=bruno.lima");
  assert.equal(porEmail.data.length, 1);

  const nada = await api("GET", "/clients?search=zzz");
  assert.deepEqual(nada.data, []);

  const injection = await api("GET", "/clients?search=" + encodeURIComponent("' OR '1'='1"));
  assert.deepEqual(injection.data, []);
});

test("CRUD completo de um cliente", async () => {
  const created = await api("POST", "/clients", {
    name: "  Diego Rocha ",
    email: "Diego@Example.com",
    phone: "(16) 99876-5432",
    address: "Rua Sete, 70",
    instrument: "Sopro",
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.name, "Diego Rocha");
  assert.equal(created.data.email, "diego@example.com");
  assert.equal(created.data.phone, "16998765432");
  const id = created.data.id;

  const found = await api("GET", `/clients/${id}`);
  assert.equal(found.status, 200);
  assert.equal(found.data.address, "Rua Sete, 70");

  const updated = await api("PUT", `/clients/${id}`, {
    name: "Diego Rocha Silva",
    email: "diego@example.com",
    phone: "16998765432",
    address: "Rua Oito, 80",
    instrument: "Cordas",
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.name, "Diego Rocha Silva");
  assert.equal(updated.data.instrument, "Cordas");

  const removed = await api("DELETE", `/clients/${id}`);
  assert.equal(removed.status, 204);

  const gone = await api("GET", `/clients/${id}`);
  assert.equal(gone.status, 404);
});

test("cadastro de cliente valida e-mail, telefone e e-mail repetido", async () => {
  const invalid = await api("POST", "/clients", {
    name: "Jo",
    email: "sem-arroba",
    phone: "123",
    instrument: "Bateria eletrônica",
  });
  assert.equal(invalid.status, 400);
  assert.deepEqual(Object.keys(invalid.data.errors).sort(), ["email", "instrument", "name", "phone"]);

  const repeated = await api("POST", "/clients", {
    name: "Outra Ana",
    email: "ana.souza@example.com",
    phone: "16991230009",
  });
  assert.equal(repeated.status, 409);
  assert.ok(repeated.data.errors.email);

  const list = await api("GET", "/clients?search=bruno");
  const conflict = await api("PUT", `/clients/${list.data[0].id}`, {
    name: "Bruno Lima",
    email: "ana.souza@example.com",
    phone: "11988770002",
  });
  assert.equal(conflict.status, 409);
});

test("respostas de erro para rota inexistente, método errado e JSON inválido", async () => {
  assert.equal((await api("GET", "/nao-existe")).status, 404);
  assert.equal((await api("DELETE", "/clients")).status, 405);
  assert.equal((await api("GET", "/clients/abc")).status, 404);

  const response = await fetch(baseUrl + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ isto não é json",
  });
  assert.equal(response.status, 400);
});

test("responde à verificação de CORS do navegador (preflight)", async () => {
  const response = await fetch(baseUrl + "/clients", { method: "OPTIONS" });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.match(response.headers.get("access-control-allow-headers"), /Authorization/);
});
