const path = require("node:path");

try {
  process.loadEnvFile(path.join(__dirname, "..", ".env"));
} catch {}

const DEFAULT_SECRET = "chave-de-desenvolvimento-acorde";
const backendFolder = path.join(__dirname, "..");

function resolveDbFile(value) {
  if (!value) return path.join(backendFolder, "data", "acorde.db");
  if (value === ":memory:") return value;
  return path.resolve(backendFolder, value);
}

const config = {
  port: Number(process.env.PORT) || 3333,
  jwtSecret: process.env.JWT_SECRET || DEFAULT_SECRET,
  usingDefaultSecret: !process.env.JWT_SECRET,
  tokenTtlSeconds: 60 * 60 * 24 * 7,
  dbFile: resolveDbFile(process.env.DB_FILE),
};

module.exports = config;
