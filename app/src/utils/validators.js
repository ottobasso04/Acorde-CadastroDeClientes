const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MS", "MT", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const clean = (value) => String(value ?? "").trim();

export function isValidEmail(value) {
  return EMAIL_REGEX.test(clean(value));
}

export function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function isValidPhone(value) {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function isValidCep(value) {
  return onlyDigits(value).length === 8;
}

export function parseMoney(value) {
  let text = clean(value).replace(/R\$\s?/i, "").replace(/\s/g, "");
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return NaN;
  return Number(text);
}

export function formatMoneyInput(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toFixed(2).replace(".", ",");
}

export const emptyAddress = {
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

export function addressFrom(source) {
  return {
    cep: formatCep(source?.cep),
    street: source?.street ?? "",
    number: source?.number ?? "",
    complement: source?.complement ?? "",
    neighborhood: source?.neighborhood ?? "",
    city: source?.city ?? "",
    state: source?.state ?? "",
  };
}

export function addressPayload(address) {
  return {
    cep: onlyDigits(address.cep),
    street: clean(address.street),
    number: clean(address.number),
    complement: clean(address.complement),
    neighborhood: clean(address.neighborhood),
    city: clean(address.city),
    state: clean(address.state).toUpperCase(),
  };
}

export function validateAddress(address) {
  const errors = {};
  if (!isValidCep(address.cep)) errors.cep = "Informe um CEP com 8 dígitos.";
  if (clean(address.street).length < 3) errors.street = "Informe a rua.";
  if (!clean(address.number)) errors.number = "Informe o número (ou S/N).";
  if (clean(address.complement).length > 60) errors.complement = "Até 60 caracteres.";
  if (clean(address.neighborhood).length < 2) errors.neighborhood = "Informe o bairro.";
  if (clean(address.city).length < 2) errors.city = "Informe a cidade.";
  if (!STATES.includes(clean(address.state).toUpperCase())) errors.state = "UF inválida.";
  return errors;
}

function validatePerson({ name, phone }) {
  const errors = {};
  if (clean(name).length < 3) errors.name = "Informe o nome completo (mínimo de 3 letras).";
  if (!isValidPhone(phone)) errors.phone = "Informe o telefone com DDD (10 ou 11 dígitos).";
  return errors;
}

function validateInterests(interests) {
  return interests.length === 0 ? { interests: "Escolha pelo menos uma categoria de interesse." } : {};
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!isValidEmail(email)) errors.email = "Informe um e-mail válido.";
  if (!password) errors.password = "Informe a senha.";
  return errors;
}

export function validateRegister(form) {
  const errors = { ...validatePerson(form), ...validateAddress(form.address), ...validateInterests(form.interests) };
  if (!isValidEmail(form.email)) errors.email = "Informe um e-mail válido.";
  if (String(form.password ?? "").length < 6) errors.password = "A senha precisa ter pelo menos 6 caracteres.";
  if (form.password !== form.confirmPassword) errors.confirmPassword = "As senhas não são iguais.";
  return errors;
}

export function validateClient(form) {
  const errors = { ...validatePerson(form), ...validateAddress(form.address), ...validateInterests(form.interests) };
  if (!isValidEmail(form.email)) errors.email = "Informe um e-mail válido.";
  return errors;
}

export function validateProfile(form) {
  return { ...validatePerson(form), ...validateAddress(form.address), ...validateInterests(form.interests) };
}

export function validateProduct(form, creating) {
  const errors = {};
  if (clean(form.name).length < 3) errors.name = "Informe o nome da mercadoria.";
  if (clean(form.brand).length < 2) errors.brand = "Informe a marca.";
  if (!form.category) errors.category = "Escolha uma categoria.";
  if (!form.level) errors.level = "Escolha o nível.";
  const price = parseMoney(form.price);
  if (!Number.isFinite(price) || price <= 0) errors.price = "Informe o preço (ex.: 1299,90).";
  if (creating && !/^\d{1,5}$/.test(clean(form.stock))) errors.stock = "Informe a quantidade inicial (0 ou mais).";
  if (!/^\d{1,4}$/.test(clean(form.minStock))) errors.minStock = "Informe o estoque mínimo.";
  if (clean(form.description).length > 500) errors.description = "Até 500 caracteres.";
  return errors;
}

export function validateStockEntry({ quantity, note }) {
  const errors = {};
  const value = Number(clean(quantity));
  if (!/^\d+$/.test(clean(quantity)) || value < 1 || value > 1000) errors.quantity = "De 1 a 1000 unidades.";
  if (clean(note).length > 200) errors.note = "Até 200 caracteres.";
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
