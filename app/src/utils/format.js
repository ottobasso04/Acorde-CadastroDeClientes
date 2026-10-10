export function formatMoney(value) {
  const cents = Math.round(Number(value || 0) * 100);
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const integer = Math.floor(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = String(absolute % 100).padStart(2, "0");
  return `${negative ? "-" : ""}R$ ${integer},${decimals}`;
}

export function formatCompactMoney(value) {
  const number = Number(value || 0);
  if (number >= 1000000) return `R$ ${(number / 1000000).toFixed(1).replace(".", ",")} mi`;
  if (number >= 1000) return `R$ ${(number / 1000).toFixed(1).replace(".", ",")} mil`;
  return formatMoney(number);
}

const pad = (value) => String(value).padStart(2, "0");

export function formatDateTime(sqlDate) {
  if (!sqlDate) return "";
  const date = new Date(`${sqlDate.replace(" ", "T")}Z`);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDay(isoDay) {
  const [, month, day] = String(isoDay).split("-");
  return `${day}/${month}`;
}

export function firstName(name) {
  return String(name ?? "").trim().split(" ")[0];
}
