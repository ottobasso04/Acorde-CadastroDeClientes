const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");

test("banco da primeira versão é migrado sem perder clientes", () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "acorde-migracao-"));
  const file = path.join(folder, "acorde.db");

  const legacy = new DatabaseSync(file);
  legacy.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE clients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL, address TEXT NOT NULL DEFAULT '', instrument TEXT NOT NULL DEFAULT '',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    INSERT INTO users (name, email, password_hash) VALUES ('Conta Demonstração', 'demo@acorde.com', 'x:y');
    INSERT INTO clients (name, email, phone, address, instrument, created_by)
      VALUES ('Maria Antiga', 'maria@example.com', '11999990000', 'Rua Velha, 10', 'Teclas', 1);
  `);
  legacy.close();

  execFileSync(process.execPath, ["--disable-warning=ExperimentalWarning", "-e", "require('./src/database')"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DB_FILE: file },
  });

  const db = new DatabaseSync(file);
  const columns = db.prepare("PRAGMA table_info(clients)").all().map((column) => column.name);
  assert.ok(!columns.includes("address") && !columns.includes("instrument"));
  assert.ok(["cep", "street", "number", "complement", "city", "state", "interests"].every((name) => columns.includes(name)));

  const maria = db.prepare("SELECT * FROM clients WHERE email = 'maria@example.com'").get();
  assert.equal(maria.street, "Rua Velha, 10");
  assert.equal(maria.interests, '["Teclados e pianos"]');

  assert.equal(db.prepare("SELECT role FROM users WHERE email = 'demo@acorde.com'").get().role, "admin");
  assert.equal(db.prepare("SELECT role FROM users WHERE email = 'admin@acorde.com'").get().role, "admin");
  assert.ok(db.prepare("SELECT COUNT(*) AS total FROM products").get().total >= 80);
  assert.equal(db.prepare("PRAGMA user_version").get().user_version, 2);
  db.close();

  execFileSync(process.execPath, ["--disable-warning=ExperimentalWarning", "-e", "require('./src/database')"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DB_FILE: file },
  });
  const again = new DatabaseSync(file);
  assert.ok(again.prepare("SELECT COUNT(*) AS total FROM products").get().total < 200);
  again.close();
  fs.rmSync(folder, { recursive: true, force: true });
});
