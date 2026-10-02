const { HttpError } = require("./router");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INSTRUMENTS = ["Cordas", "Teclas", "Percussão", "Sopro", "Áudio", "Acessórios"];

const text = (value) => (typeof value === "string" ? value.trim() : "");
const onlyDigits = (value) => String(value ?? "").replace(/\D/g, "");

function validateRegister(body) {
  const value = {
    name: text(body.name),
    email: text(body.email).toLowerCase(),
    password: typeof body.password === "string" ? body.password : "",
  };
  const errors = {};

  if (value.name.length < 3) errors.name = "Informe seu nome (mínimo de 3 letras).";
  if (!EMAIL_REGEX.test(value.email)) errors.email = "Informe um e-mail válido.";
  if (value.password.length < 6) errors.password = "A senha precisa ter pelo menos 6 caracteres.";

  if (Object.keys(errors).length > 0) throw new HttpError(400, "Confira os campos do cadastro.", errors);
  return value;
}

function validateLogin(body) {
  const value = {
    email: text(body.email).toLowerCase(),
    password: typeof body.password === "string" ? body.password : "",
  };
  if (!value.email || !value.password) throw new HttpError(400, "Informe e-mail e senha.");
  return value;
}

function validateClient(body) {
  const value = {
    name: text(body.name),
    email: text(body.email).toLowerCase(),
    phone: onlyDigits(body.phone),
    address: text(body.address),
    instrument: text(body.instrument),
  };
  const errors = {};

  if (value.name.length < 3) errors.name = "Informe o nome completo (mínimo de 3 letras).";
  if (!EMAIL_REGEX.test(value.email)) errors.email = "Informe um e-mail válido.";
  if (value.phone.length < 10 || value.phone.length > 11) {
    errors.phone = "Informe o telefone com DDD (10 ou 11 dígitos).";
  }
  if (value.address.length > 200) errors.address = "O endereço pode ter no máximo 200 caracteres.";
  if (value.instrument && !INSTRUMENTS.includes(value.instrument)) {
    errors.instrument = "Categoria de instrumento desconhecida.";
  }

  if (Object.keys(errors).length > 0) throw new HttpError(400, "Confira os campos do cliente.", errors);
  return value;
}

module.exports = { validateRegister, validateLogin, validateClient, INSTRUMENTS };
