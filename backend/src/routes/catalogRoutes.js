const { db, normalizeText, transaction } = require("../database");
const { HttpError } = require("../router");
const { CATEGORIES, CATEGORY_NAMES, LEVELS } = require("../catalog");
const { validateCep, validateProduct, validateStockEntry } = require("../validators");
const { requireAuth, adminOnly } = require("../middleware/requireAuth");
const rateLimit = require("../middleware/rateLimit");
const { lookupCep } = require("../services/cepService");
const { toProduct, toMovement } = require("../mappers");

const SORTS = {
  price_asc: "price_cents ASC, name COLLATE NOCASE",
  price_desc: "price_cents DESC, name COLLATE NOCASE",
  name: "name COLLATE NOCASE",
  stock: "stock ASC, name COLLATE NOCASE",
};

function findProduct(id, { includeInactive = true } = {}) {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(Number(id) || 0);
  if (!product || (!includeInactive && !product.active)) throw new HttpError(404, "Produto não encontrado.");
  return product;
}

function ensureUniqueProduct(name, brand, ignoreId = 0) {
  const duplicate = db
    .prepare(
      `SELECT id FROM products WHERE normalize_text(name) = normalize_text(?) AND normalize_text(brand) = normalize_text(?) AND id <> ?`
    )
    .get(name, brand, ignoreId);
  if (duplicate) {
    throw new HttpError(409, "Já existe uma mercadoria com este nome e marca.", { name: "Mercadoria já cadastrada." });
  }
}

function nextSku(category) {
  const code = CATEGORIES.find((item) => item.name === category).code;
  const last = db
    .prepare("SELECT sku FROM products WHERE sku LIKE ? ORDER BY sku DESC LIMIT 1")
    .get(`${code}-%`);
  const next = last ? Number(last.sku.split("-")[1]) + 1 : 1;
  return `${code}-${String(next).padStart(3, "0")}`;
}

function registerCatalogRoutes(router) {
  router.get(
    "/cep/:cep",
    rateLimit({ limit: 30, windowMs: 60 * 1000, message: "Muitas consultas de CEP." }),
    async (req, res) => {
      const cep = validateCep(req.params.cep);
      res.json(200, await lookupCep(cep));
    }
  );

  router.get("/categories", async (req, res) => {
    const counts = new Map(
      db
        .prepare("SELECT category, COUNT(*) AS total FROM products WHERE active = 1 AND stock > 0 GROUP BY category")
        .all()
        .map((row) => [row.category, row.total])
    );
    res.json(200, {
      categories: CATEGORIES.map((item) => ({ name: item.name, icon: item.icon, available: counts.get(item.name) || 0 })),
      levels: LEVELS,
    });
  });

  router.get("/products", requireAuth, async (req, res) => {
    const conditions = [];
    const params = [];
    const isAdmin = req.user.role === "admin";

    if (!isAdmin || req.query.includeInactive !== "true") conditions.push("active = 1");
    if (req.query.category) {
      if (!CATEGORY_NAMES.includes(req.query.category)) throw new HttpError(400, "Categoria desconhecida.");
      conditions.push("category = ?");
      params.push(req.query.category);
    }
    if (req.query.inStock === "true") conditions.push("stock > 0");
    if (isAdmin && req.query.lowStock === "true") conditions.push("stock <= min_stock");

    const terms = normalizeText(req.query.search).split(/\s+/).filter(Boolean).slice(0, 6);
    for (const term of terms) {
      conditions.push("instr(normalize_text(name || ' ' || brand || ' ' || category || ' ' || sku), ?) > 0");
      params.push(term);
    }

    const sort = SORTS[req.query.sort] || SORTS.price_asc;
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db.prepare(`SELECT * FROM products ${where} ORDER BY ${sort}`).all(...params);
    res.json(200, rows.map(toProduct));
  });

  router.get("/products/:id", requireAuth, async (req, res) => {
    res.json(200, toProduct(findProduct(req.params.id, { includeInactive: req.user.role === "admin" })));
  });

  router.post("/products", ...adminOnly, async (req, res) => {
    const data = validateProduct(req.body, { creating: true });
    ensureUniqueProduct(data.name, data.brand);

    const id = transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO products (sku, name, brand, category, level, price_cents, stock, min_stock, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(nextSku(data.category), data.name, data.brand, data.category, data.level, data.priceCents, data.stock, data.minStock, data.description);
      const productId = Number(result.lastInsertRowid);
      if (data.stock > 0) {
        db.prepare(
          "INSERT INTO stock_movements (product_id, type, quantity, reason, note, user_id) VALUES (?, 'entrada', ?, 'estoque inicial', ?, ?)"
        ).run(productId, data.stock, "Cadastro da mercadoria", req.user.id);
      }
      return productId;
    });

    res.json(201, toProduct(findProduct(id)));
  });

  router.put("/products/:id", ...adminOnly, async (req, res) => {
    const current = findProduct(req.params.id);
    const data = validateProduct(req.body, { creating: false });
    ensureUniqueProduct(data.name, data.brand, current.id);

    const active = req.body.active === undefined ? current.active : req.body.active ? 1 : 0;
    db.prepare(
      `UPDATE products SET name = ?, brand = ?, category = ?, level = ?, price_cents = ?, min_stock = ?, description = ?,
       active = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(data.name, data.brand, data.category, data.level, data.priceCents, data.minStock, data.description, active, current.id);

    res.json(200, toProduct(findProduct(current.id)));
  });

  router.post("/products/:id/stock", ...adminOnly, async (req, res) => {
    const current = findProduct(req.params.id);
    const { quantity, note } = validateStockEntry(req.body);

    transaction(() => {
      db.prepare("UPDATE products SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?").run(quantity, current.id);
      db.prepare(
        "INSERT INTO stock_movements (product_id, type, quantity, reason, note, user_id) VALUES (?, 'entrada', ?, 'reposição', ?, ?)"
      ).run(current.id, quantity, note, req.user.id);
    });

    res.json(201, toProduct(findProduct(current.id)));
  });

  router.get("/products/:id/movements", ...adminOnly, async (req, res) => {
    const current = findProduct(req.params.id);
    const rows = db
      .prepare(
        `SELECT m.*, p.name AS product_name, u.name AS user_name
         FROM stock_movements m
         JOIN products p ON p.id = m.product_id
         LEFT JOIN users u ON u.id = m.user_id
         WHERE m.product_id = ? ORDER BY m.created_at DESC, m.id DESC LIMIT 60`
      )
      .all(current.id);
    res.json(200, rows.map(toMovement));
  });
}

module.exports = registerCatalogRoutes;
