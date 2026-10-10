const { HttpError } = require("../router");

const cache = new Map();
const TIMEOUT_MS = 6000;

async function getJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

function fromViaCep(data) {
  if (!data || data.erro === true || data.erro === "true") return null;
  return {
    cep: String(data.cep || "").replace(/\D/g, ""),
    street: data.logradouro || "",
    complement: data.complemento || "",
    neighborhood: data.bairro || "",
    city: data.localidade || "",
    state: data.uf || "",
  };
}

function fromBrasilApi(data) {
  if (!data || !data.cep) return null;
  return {
    cep: String(data.cep).replace(/\D/g, ""),
    street: data.street || "",
    complement: "",
    neighborhood: data.neighborhood || "",
    city: data.city || "",
    state: data.state || "",
  };
}

async function lookupCep(cep) {
  if (cache.has(cep)) return cache.get(cep);

  let address;
  try {
    const { status, data } = await getJson(`https://viacep.com.br/ws/${cep}/json/`);
    if (status === 200) address = fromViaCep(data);
    else if (status === 400) address = null;
    else throw new Error(`ViaCEP respondeu ${status}`);
  } catch {
    try {
      const { status, data } = await getJson(`https://brasilapi.com.br/api/cep/v1/${cep}`);
      if (status === 200) address = fromBrasilApi(data);
      else if (status === 404) address = null;
      else throw new Error(`BrasilAPI respondeu ${status}`);
    } catch {
      throw new HttpError(502, "O serviço de CEP está indisponível agora. Preencha o endereço manualmente.");
    }
  }

  if (!address) {
    throw new HttpError(404, "CEP não encontrado. Confira os números ou preencha o endereço manualmente.", {
      cep: "CEP não encontrado.",
    });
  }

  cache.set(cep, address);
  return address;
}

module.exports = { lookupCep };
