const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const config = require("./config");
const { hashPassword } = require("./security");

if (config.dbFile !== ":memory:") {
  fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
}

const db = new DatabaseSync(config.dbFile);

db.exec("PRAGMA foreign_keys = ON;");

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
db.function("normalize_text", { deterministic: true }, normalizeText);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    phone       TEXT NOT NULL,
    address     TEXT NOT NULL DEFAULT '',
    instrument  TEXT NOT NULL DEFAULT '',
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function seed() {
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM users").get();
  if (total > 0) return;

  const user = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run("Conta Demonstração", "demo@acorde.com", hashPassword("acorde123"));

  const insertClient = db.prepare(
    "INSERT INTO clients (name, email, phone, address, instrument, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const samples = [
    ["Ana Souza", "ana.souza@example.com", "16991230001", "Rua das Palmeiras, 120 - Araraquara/SP", "Cordas"],
    ["Bruno Lima", "bruno.lima@example.com", "11988770002", "Av. Central, 45 - São Paulo/SP", "Percussão"],
    ["Carla Mendes", "carla.mendes@example.com", "1933450003", "Rua do Mercado, 8 - Campinas/SP", "Teclas"],
    ["José Ferreira", "jose.ferreira@example.com", "21977660004", "", "Áudio"],
  ];
  for (const sample of samples) {
    insertClient.run(...sample, user.lastInsertRowid);
  }
}
seed();

module.exports = { db, normalizeText };
