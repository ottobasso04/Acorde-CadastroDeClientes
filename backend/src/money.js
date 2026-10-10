function formatBRL(cents) {
  const negative = cents < 0;
  const absolute = Math.abs(Math.round(cents));
  const integer = Math.floor(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = String(absolute % 100).padStart(2, "0");
  return `${negative ? "-" : ""}R$ ${integer},${decimals}`;
}

const toReais = (cents) => Math.round(cents) / 100;

module.exports = { formatBRL, toReais };
