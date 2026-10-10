const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const config = require("./config");
const { hashPassword } = require("./security");
const { CATEGORIES, LEGACY_CATEGORY_MAP, PRODUCTS } = require("./catalog");

if (config.dbFile !== ":memory:") {
  fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
}

const db = new DatabaseSync(config.dbFile);

db.exec("PRAGMA foreign_keys = ON;");

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
db.function("normalize_text", { deterministic: true }, normalizeText);

function transaction(work) {
  db.exec("BEGIN");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function columnsOf(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
}

function toSqlDate(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    phone        TEXT NOT NULL,
    cep          TEXT NOT NULL DEFAULT '',
    street       TEXT NOT NULL DEFAULT '',
    number       TEXT NOT NULL DEFAULT '',
    complement   TEXT NOT NULL DEFAULT '',
    neighborhood TEXT NOT NULL DEFAULT '',
    city         TEXT NOT NULL DEFAULT '',
    state        TEXT NOT NULL DEFAULT '',
    interests    TEXT NOT NULL DEFAULT '[]',
    user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sku         TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    brand       TEXT NOT NULL,
    category    TEXT NOT NULL,
    level       TEXT NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock   INTEGER NOT NULL DEFAULT 3 CHECK (min_stock >= 0),
    description TEXT NOT NULL DEFAULT '',
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    total_cents INTEGER NOT NULL,
    items_count INTEGER NOT NULL,
    status      TEXT NOT NULL DEFAULT 'concluido',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id       INTEGER NOT NULL REFERENCES products(id),
    product_name     TEXT NOT NULL,
    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    type       TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    reason     TEXT NOT NULL,
    note       TEXT NOT NULL DEFAULT '',
    order_id   INTEGER REFERENCES orders(id),
    user_id    INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_movements_date ON stock_movements(created_at);
  CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
`);

function migrate() {
  const version = db.prepare("PRAGMA user_version").get().user_version;
  if (version >= 2) return;

  transaction(() => {
    if (!columnsOf("users").includes("role")) {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
      db.exec("UPDATE users SET role = 'admin'");
    }

    const clientColumns = columnsOf("clients");
    const added = [
      ["cep", "TEXT NOT NULL DEFAULT ''"],
      ["street", "TEXT NOT NULL DEFAULT ''"],
      ["number", "TEXT NOT NULL DEFAULT ''"],
      ["complement", "TEXT NOT NULL DEFAULT ''"],
      ["neighborhood", "TEXT NOT NULL DEFAULT ''"],
      ["city", "TEXT NOT NULL DEFAULT ''"],
      ["state", "TEXT NOT NULL DEFAULT ''"],
      ["interests", "TEXT NOT NULL DEFAULT '[]'"],
      ["user_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"],
    ];
    for (const [name, definition] of added) {
      if (!clientColumns.includes(name)) db.exec(`ALTER TABLE clients ADD COLUMN ${name} ${definition}`);
    }

    if (clientColumns.includes("address") && clientColumns.includes("instrument")) {
      const legacy = db.prepare("SELECT id, address, instrument FROM clients").all();
      const update = db.prepare("UPDATE clients SET street = ?, interests = ? WHERE id = ?");
      for (const row of legacy) {
        const mapped = LEGACY_CATEGORY_MAP[row.instrument];
        update.run(row.address || "", JSON.stringify(mapped ? [mapped] : []), row.id);
      }
      db.exec("ALTER TABLE clients DROP COLUMN address");
      db.exec("ALTER TABLE clients DROP COLUMN instrument");
    }

    db.exec("PRAGMA user_version = 2");
  });

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id)");
}

function random(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_PASSWORD = "acorde123";

const SAMPLE_CUSTOMERS = [
  {
    name: "Cliente Demonstração",
    email: "cliente@acorde.com",
    phone: "11987650000",
    cep: "01310100",
    street: "Avenida Paulista",
    number: "1000",
    complement: "Apto 52",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    interests: ["Guitarras", "Amplificadores", "Pedais e efeitos"],
  },
  {
    name: "Ana Souza",
    email: "ana.souza@example.com",
    phone: "16991230001",
    cep: "14801300",
    street: "Rua São Bento",
    number: "120",
    complement: "",
    neighborhood: "Centro",
    city: "Araraquara",
    state: "SP",
    interests: ["Violões", "Acessórios"],
  },
  {
    name: "Bruno Lima",
    email: "bruno.lima@example.com",
    phone: "11988770002",
    cep: "04538133",
    street: "Avenida Brigadeiro Faria Lima",
    number: "3477",
    complement: "Sala 4",
    neighborhood: "Itaim Bibi",
    city: "São Paulo",
    state: "SP",
    interests: ["Baterias e percussão"],
  },
  {
    name: "Carla Mendes",
    email: "carla.mendes@example.com",
    phone: "1933450003",
    cep: "13015904",
    street: "Rua Barão de Jaguara",
    number: "8",
    complement: "",
    neighborhood: "Centro",
    city: "Campinas",
    state: "SP",
    interests: ["Teclados e pianos", "Áudio e gravação"],
  },
  {
    name: "José Ferreira",
    email: "jose.ferreira@example.com",
    phone: "21977660004",
    cep: "22071900",
    street: "Avenida Atlântica",
    number: "1702",
    complement: "Bloco B",
    neighborhood: "Copacabana",
    city: "Rio de Janeiro",
    state: "RJ",
    interests: ["Áudio e gravação", "Microfones", "DJ e produção"],
  },
];

function ensureUser(name, email, role) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return existing.id;
  const result = db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
    .run(name, email, hashPassword(DEMO_PASSWORD), role);
  return Number(result.lastInsertRowid);
}

function ensureCustomer(sample, adminId) {
  const userId = ensureUser(sample.name, sample.email, "customer");
  const linked = db.prepare("SELECT id FROM clients WHERE user_id = ?").get(userId);
  if (linked) return userId;

  const values = [
    sample.name,
    sample.phone,
    sample.cep,
    sample.street,
    sample.number,
    sample.complement,
    sample.neighborhood,
    sample.city,
    sample.state,
    JSON.stringify(sample.interests),
    userId,
  ];
  const byEmail = db.prepare("SELECT id FROM clients WHERE email = ?").get(sample.email);
  if (byEmail) {
    db.prepare(
      `UPDATE clients SET name = ?, phone = ?, cep = ?, street = ?, number = ?, complement = ?,
       neighborhood = ?, city = ?, state = ?, interests = ?, user_id = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(...values, byEmail.id);
  } else {
    db.prepare(
      `INSERT INTO clients (name, phone, cep, street, number, complement, neighborhood, city, state,
       interests, user_id, email, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(...values, sample.email, adminId);
  }
  return userId;
}

function seedCatalogAndHistory(adminId, customerIds) {
  const rand = random(20261008);
  const codes = Object.fromEntries(CATEGORIES.map((item) => [item.name, item.code]));
  const counters = {};

  const insertProduct = db.prepare(
    `INSERT INTO products (sku, name, brand, category, level, price_cents, stock, min_stock, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
  );

  const now = new Date();
  const dayAt = (daysAgo, hour, minute = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  const products = PRODUCTS.map(([category, name, brand, level, price, stock, description]) => {
    counters[category] = (counters[category] || 0) + 1;
    const sku = `${codes[category]}-${String(counters[category]).padStart(3, "0")}`;
    const priceCents = Math.round(price * 100);
    const minStock = priceCents < 20000 ? 10 : priceCents < 300000 ? 3 : 1;
    const created = toSqlDate(dayAt(31, 8));
    const result = insertProduct.run(sku, name, brand, category, level, priceCents, minStock, description, created, created);
    return { id: Number(result.lastInsertRowid), name, priceCents, finalStock: stock, sold: [] };
  });

  const weights = products.map((product) => 1 / Math.sqrt(product.priceCents / 100));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const pick = () => {
    let target = rand() * totalWeight;
    for (let i = 0; i < products.length; i++) {
      target -= weights[i];
      if (target <= 0) return products[i];
    }
    return products[products.length - 1];
  };

  const orders = [];
  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const weekday = dayAt(daysAgo, 12).getDay();
    const base = weekday === 0 || weekday === 6 ? 5 : 3;
    const count = base + Math.floor(rand() * 5);
    for (let n = 0; n < count; n++) {
      const lines = new Map();
      const lineCount = 1 + Math.floor(rand() * 3);
      for (let l = 0; l < lineCount; l++) {
        const product = pick();
        const quantity = product.priceCents < 20000 ? 1 + Math.floor(rand() * 3) : 1;
        lines.set(product, (lines.get(product) || 0) + quantity);
      }
      const hour = 9 + Math.floor(rand() * 12);
      const date = dayAt(daysAgo, hour, Math.floor(rand() * 60));
      if (date > now) continue;
      const userId = customerIds[Math.floor(rand() * customerIds.length)];
      orders.push({ date, userId, lines: [...lines.entries()] });
      for (const [product, quantity] of lines) product.sold.push({ daysAgo, quantity });
    }
  }

  const insertMovement = db.prepare(
    `INSERT INTO stock_movements (product_id, type, quantity, reason, note, order_id, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const product of products) {
    const restockDay = 2 + Math.floor(rand() * 20);
    const soldTotal = product.sold.reduce((sum, item) => sum + item.quantity, 0);
    const soldAfter = product.sold.filter((item) => item.daysAgo < restockDay).reduce((s, i) => s + i.quantity, 0);
    let restock = 0;
    if (soldTotal > 0 && rand() < 0.4) {
      restock = Math.min(Math.ceil(soldTotal * 0.6), product.finalStock + soldAfter);
    }
    const initial = product.finalStock + soldTotal - restock;
    if (initial > 0) {
      insertMovement.run(product.id, "entrada", initial, "estoque inicial", "Carga inicial do catálogo", null, adminId, toSqlDate(dayAt(31, 8)));
    }
    if (restock > 0) {
      insertMovement.run(product.id, "entrada", restock, "reposição", "Pedido ao fornecedor", null, adminId, toSqlDate(dayAt(restockDay, 10)));
    }
    db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(product.finalStock, product.id);
  }

  const insertOrder = db.prepare(
    "INSERT INTO orders (user_id, total_cents, items_count, created_at) VALUES (?, ?, ?, ?)"
  );
  const insertItem = db.prepare(
    "INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_cents) VALUES (?, ?, ?, ?, ?)"
  );
  orders.sort((a, b) => a.date - b.date);
  for (const order of orders) {
    const total = order.lines.reduce((sum, [product, quantity]) => sum + product.priceCents * quantity, 0);
    const items = order.lines.reduce((sum, [, quantity]) => sum + quantity, 0);
    const created = toSqlDate(order.date);
    const orderId = Number(insertOrder.run(order.userId, total, items, created).lastInsertRowid);
    for (const [product, quantity] of order.lines) {
      insertItem.run(orderId, product.id, product.name, quantity, product.priceCents);
      insertMovement.run(product.id, "saida", quantity, "venda", `Pedido #${orderId}`, orderId, order.userId, created);
    }
  }
}

function seed() {
  transaction(() => {
    const adminId = ensureUser("Administrador Acorde", "admin@acorde.com", "admin");
    const customerIds = SAMPLE_CUSTOMERS.map((sample) => ensureCustomer(sample, adminId));
    const { total } = db.prepare("SELECT COUNT(*) AS total FROM products").get();
    if (total === 0) seedCatalogAndHistory(adminId, customerIds.slice(1));
  });
}

migrate();
seed();

module.exports = { db, normalizeText, transaction, toSqlDate };
