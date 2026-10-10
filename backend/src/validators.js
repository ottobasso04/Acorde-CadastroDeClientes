const { HttpError } = require("./router");
const { CATEGORY_NAMES, LEVELS } = require("./catalog");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MS", "MT", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const ROLES = ["customer", "admin"];
const REPORT_PERIODS = [7, 15, 30];

const text = (value) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");
const onlyDigits = (value) => String(value ?? "").replace(/\D/g, "");

function fail(errors, message) {
  if (Object.keys(errors).length > 0) throw new HttpError(400, message, errors);
}

function readInteger(value) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return NaN;
}

function readMoneyCents(value) {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return NaN;
  return Math.round(Number(raw) * 100);
}

function validatePerson(body, errors) {
  const value = {
    name: text(body.name),
    phone: onlyDigits(body.phone),
  };
  if (value.name.length < 3 || value.name.length > 80) errors.name = "Informe o nome completo (de 3 a 80 letras).";
  if (value.phone.length < 10 || value.phone.length > 11) errors.phone = "Informe o telefone com DDD (10 ou 11 dígitos).";
  return value;
}

function validateEmail(body, errors) {
  const email = text(body.email).toLowerCase();
  if (!EMAIL_REGEX.test(email) || email.length > 120) errors.email = "Informe um e-mail válido.";
  return email;
}

function validateAddress(body, errors) {
  const value = {
    cep: onlyDigits(body.cep),
    street: text(body.street),
    number: text(body.number).toUpperCase(),
    complement: text(body.complement),
    neighborhood: text(body.neighborhood),
    city: text(body.city),
    state: text(body.state).toUpperCase(),
  };
  if (value.cep.length !== 8) errors.cep = "Informe um CEP com 8 dígitos.";
  if (value.street.length < 3 || value.street.length > 120) errors.street = "Informe a rua.";
  if (!value.number || value.number.length > 10) errors.number = "Informe o número (ou S/N).";
  if (value.complement.length > 60) errors.complement = "O complemento pode ter até 60 caracteres.";
  if (value.neighborhood.length < 2 || value.neighborhood.length > 80) errors.neighborhood = "Informe o bairro.";
  if (value.city.length < 2 || value.city.length > 80) errors.city = "Informe a cidade.";
  if (!STATES.includes(value.state)) errors.state = "Informe a UF (ex.: SP).";
  return value;
}

function validateInterests(raw, errors, { required = true } = {}) {
  const list = Array.isArray(raw) ? raw.filter((item) => typeof item === "string").map((item) => item.trim()) : [];
  const unique = [...new Set(list)];
  if (unique.some((item) => !CATEGORY_NAMES.includes(item))) {
    errors.interests = "Há uma categoria de interesse desconhecida.";
  } else if (required && unique.length === 0) {
    errors.interests = "Escolha pelo menos uma categoria de interesse.";
  }
  return CATEGORY_NAMES.filter((name) => unique.includes(name));
}

function validateRegister(body) {
  const errors = {};
  const person = validatePerson(body, errors);
  const email = validateEmail(body, errors);
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 6 || password.length > 72) errors.password = "A senha precisa ter de 6 a 72 caracteres.";
  const address = validateAddress(body, errors);
  const interests = validateInterests(body.interests, errors);
  fail(errors, "Confira os campos do cadastro.");
  return { ...person, email, password, ...address, interests };
}

function validateLogin(body) {
  const value = {
    email: text(body.email).toLowerCase(),
    password: typeof body.password === "string" ? body.password : "",
    role: body.role === undefined ? "customer" : body.role,
  };
  if (!value.email || !value.password) throw new HttpError(400, "Informe e-mail e senha.");
  if (!ROLES.includes(value.role)) throw new HttpError(400, "Tipo de acesso inválido.");
  return value;
}

function validateClient(body) {
  const errors = {};
  const person = validatePerson(body, errors);
  const email = validateEmail(body, errors);
  const address = validateAddress(body, errors);
  const interests = validateInterests(body.interests, errors);
  fail(errors, "Confira os campos do cliente.");
  return { ...person, email, ...address, interests };
}

function validateProfile(body) {
  const errors = {};
  const person = validatePerson(body, errors);
  const address = validateAddress(body, errors);
  const interests = validateInterests(body.interests, errors);
  fail(errors, "Confira os campos do seu cadastro.");
  return { ...person, ...address, interests };
}

function validateCep(raw) {
  const cep = onlyDigits(raw);
  if (cep.length !== 8) throw new HttpError(400, "Informe um CEP com 8 dígitos.", { cep: "Informe um CEP com 8 dígitos." });
  return cep;
}

function validateProduct(body, { creating }) {
  const errors = {};
  const value = {
    name: text(body.name),
    brand: text(body.brand),
    category: text(body.category),
    level: text(body.level),
    priceCents: readMoneyCents(body.price),
    minStock: body.minStock === undefined || body.minStock === "" ? 3 : readInteger(body.minStock),
    description: text(body.description),
  };
  if (value.name.length < 3 || value.name.length > 120) errors.name = "Informe o nome da mercadoria (3 a 120 caracteres).";
  if (value.brand.length < 2 || value.brand.length > 60) errors.brand = "Informe a marca.";
  if (!CATEGORY_NAMES.includes(value.category)) errors.category = "Escolha uma categoria.";
  if (!LEVELS.includes(value.level)) errors.level = "Escolha o nível: Iniciante, Intermediário ou Profissional.";
  if (!Number.isFinite(value.priceCents) || value.priceCents <= 0 || value.priceCents > 50_000_000) {
    errors.price = "Informe um preço maior que zero, com até 2 casas decimais.";
  }
  if (!Number.isInteger(value.minStock) || value.minStock < 0 || value.minStock > 1000) {
    errors.minStock = "O estoque mínimo deve ser um número inteiro de 0 a 1000.";
  }
  if (value.description.length > 500) errors.description = "A descrição pode ter até 500 caracteres.";
  if (creating) {
    value.stock = body.stock === undefined || body.stock === "" ? 0 : readInteger(body.stock);
    if (!Number.isInteger(value.stock) || value.stock < 0 || value.stock > 10000) {
      errors.stock = "O estoque inicial deve ser um número inteiro de 0 a 10000.";
    }
  }
  fail(errors, "Confira os dados da mercadoria.");
  return value;
}

function validateStockEntry(body) {
  const errors = {};
  const quantity = readInteger(body.quantity);
  const note = text(body.note);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
    errors.quantity = "Informe uma quantidade inteira de 1 a 1000.";
  }
  if (note.length > 200) errors.note = "A observação pode ter até 200 caracteres.";
  fail(errors, "Confira a entrada de estoque.");
  return { quantity, note };
}

function validateOrder(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) throw new HttpError(400, "O carrinho está vazio.");
  if (items.length > 20) throw new HttpError(400, "Um pedido pode ter no máximo 20 produtos diferentes.");

  const merged = new Map();
  for (const item of items) {
    const productId = readInteger(item?.productId);
    const quantity = readInteger(item?.quantity);
    if (!Number.isInteger(productId) || productId < 1) throw new HttpError(400, "Produto inválido no carrinho.");
    if (!Number.isInteger(quantity) || quantity < 1) throw new HttpError(400, "Quantidade inválida no carrinho.");
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }
  for (const quantity of merged.values()) {
    if (quantity > 10) throw new HttpError(400, "É possível comprar no máximo 10 unidades de cada produto por pedido.");
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

function validateRecommendation(body) {
  const errors = {};
  const categories = validateInterests(body.categories, errors, { required: false });
  let budgetCents = null;
  if (body.budget !== undefined && body.budget !== null && body.budget !== "") {
    budgetCents = readMoneyCents(body.budget);
    if (!Number.isFinite(budgetCents) || budgetCents <= 0) errors.budget = "Informe um orçamento válido em reais.";
  }
  const query = text(body.query);
  if (query.length > 200) errors.query = "Descreva o que procura em até 200 caracteres.";
  fail(errors, "Confira os dados da busca.");
  return { categories, budgetCents, query };
}

function validateReportPeriod(raw) {
  if (raw === undefined || raw === "") return 7;
  const days = readInteger(raw);
  if (!REPORT_PERIODS.includes(days)) throw new HttpError(400, "Período inválido. Use 7, 15 ou 30 dias.");
  return days;
}

module.exports = {
  validateRegister,
  validateLogin,
  validateClient,
  validateProfile,
  validateCep,
  validateProduct,
  validateStockEntry,
  validateOrder,
  validateRecommendation,
  validateReportPeriod,
  STATES,
};
