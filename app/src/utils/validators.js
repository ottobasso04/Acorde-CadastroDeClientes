const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value) {
  return EMAIL_REGEX.test(String(value ?? "").trim());
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

export function validateLogin({ email, password }) {
  const errors = {};
  if (!isValidEmail(email)) errors.email = "Informe um e-mail válido.";
  if (!password) errors.password = "Informe a senha.";
  return errors;
}

export function validateRegister({ name, email, password, confirmPassword }) {
  const errors = {};
  if (String(name ?? "").trim().length < 3) errors.name = "Informe seu nome (mínimo de 3 letras).";
  if (!isValidEmail(email)) errors.email = "Informe um e-mail válido.";
  if (String(password ?? "").length < 6) errors.password = "A senha precisa ter pelo menos 6 caracteres.";
  if (password !== confirmPassword) errors.confirmPassword = "As senhas não são iguais.";
  return errors;
}

export function validateClient({ name, email, phone, address }) {
  const errors = {};
  if (String(name ?? "").trim().length < 3) errors.name = "Informe o nome completo (mínimo de 3 letras).";
  if (!isValidEmail(email)) errors.email = "Informe um e-mail válido.";
  if (!isValidPhone(phone)) errors.phone = "Informe o telefone com DDD (10 ou 11 dígitos).";
  if (String(address ?? "").trim().length > 200) errors.address = "O endereço pode ter no máximo 200 caracteres.";
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
