const { db, transaction } = require("../database");
const { HttpError } = require("../router");
const { validateOrder, validateProfile, validateReportPeriod, validateRecommendation } = require("../validators");
const { requireAuth, adminOnly, customerOnly } = require("../middleware/requireAuth");
const rateLimit = require("../middleware/rateLimit");
const config = require("../config");
const { toClient } = require("../mappers");
const { toReais } = require("../money");
const { getDashboard, analyze } = require("../services/reportService");
const { recommend } = require("../services/recommendationService");
const { isConfigured } = require("../services/geminiService");

function loadOrders(where, params) {
  const orders = db
    .prepare(
      `SELECT o.*, u.name AS customer_name FROM orders o JOIN users u ON u.id = o.user_id
       ${where} ORDER BY o.created_at DESC, o.id DESC LIMIT 100`
    )
    .all(...params);
  if (orders.length === 0) return [];

  const ids = orders.map((order) => order.id);
  const items = db
    .prepare(`SELECT * FROM order_items WHERE order_id IN (${ids.map(() => "?").join(",")}) ORDER BY id`)
    .all(...ids);

  return orders.map((order) => ({
    id: order.id,
    customerName: order.customer_name,
    total: toReais(order.total_cents),
    itemsCount: order.items_count,
    status: order.status,
    created_at: order.created_at,
    items: items
      .filter((item) => item.order_id === order.id)
      .map((item) => ({
        productId: item.product_id,
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: toReais(item.unit_price_cents),
        subtotal: toReais(item.unit_price_cents * item.quantity),
      })),
  }));
}

function findProfile(userId) {
  const row = db.prepare("SELECT * FROM clients WHERE user_id = ?").get(userId);
  if (!row) throw new HttpError(404, "Cadastro de cliente não encontrado para esta conta.");
  return row;
}

const aiLimit = rateLimit({
  limit: config.aiRequestsPerWindow,
  windowMs: config.aiWindowMs,
  message: "Limite de consultas ao assistente atingido.",
});

function registerOrderRoutes(router) {
  router.post("/orders", ...customerOnly, async (req, res) => {
    const items = validateOrder(req.body);

    const orderId = transaction(() => {
      const lines = items.map(({ productId, quantity }) => {
        const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
        if (!product || !product.active) throw new HttpError(404, "Um dos produtos do carrinho não está mais à venda.");
        if (product.stock < quantity) {
          const left = product.stock === 0 ? "está esgotado" : `tem só ${product.stock} unidade(s)`;
          throw new HttpError(409, `${product.name} ${left}. Ajuste o carrinho.`, {
            [productId]: product.stock,
          });
        }
        return { product, quantity };
      });

      const total = lines.reduce((sum, line) => sum + line.product.price_cents * line.quantity, 0);
      const count = lines.reduce((sum, line) => sum + line.quantity, 0);
      const order = db
        .prepare("INSERT INTO orders (user_id, total_cents, items_count) VALUES (?, ?, ?)")
        .run(req.user.id, total, count);
      const id = Number(order.lastInsertRowid);

      for (const { product, quantity } of lines) {
        const updated = db
          .prepare("UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ? AND stock >= ?")
          .run(quantity, product.id, quantity);
        if (updated.changes !== 1) throw new HttpError(409, `${product.name} acabou de esgotar. Ajuste o carrinho.`);
        db.prepare(
          "INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_cents) VALUES (?, ?, ?, ?, ?)"
        ).run(id, product.id, product.name, quantity, product.price_cents);
        db.prepare(
          "INSERT INTO stock_movements (product_id, type, quantity, reason, note, order_id, user_id) VALUES (?, 'saida', ?, 'venda', ?, ?, ?)"
        ).run(product.id, quantity, `Pedido #${id}`, id, req.user.id);
      }
      return id;
    });

    res.json(201, loadOrders("WHERE o.id = ?", [orderId])[0]);
  });

  router.get("/orders", requireAuth, async (req, res) => {
    if (req.user.role === "admin") return res.json(200, loadOrders("", []));
    res.json(200, loadOrders("WHERE o.user_id = ?", [req.user.id]));
  });

  router.get("/me/profile", ...customerOnly, async (req, res) => {
    res.json(200, toClient(findProfile(req.user.id)));
  });

  router.put("/me/profile", ...customerOnly, async (req, res) => {
    const current = findProfile(req.user.id);
    const data = validateProfile(req.body);
    transaction(() => {
      db.prepare(
        `UPDATE clients SET name = ?, phone = ?, cep = ?, street = ?, number = ?, complement = ?, neighborhood = ?,
         city = ?, state = ?, interests = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(
        data.name,
        data.phone,
        data.cep,
        data.street,
        data.number,
        data.complement,
        data.neighborhood,
        data.city,
        data.state,
        JSON.stringify(data.interests),
        current.id
      );
      db.prepare("UPDATE users SET name = ? WHERE id = ?").run(data.name, req.user.id);
    });
    res.json(200, toClient(findProfile(req.user.id)));
  });

  router.get("/admin/dashboard", ...adminOnly, async (req, res) => {
    res.json(200, getDashboard(validateReportPeriod(req.query.days)));
  });

  router.get("/ai/status", requireAuth, async (req, res) => {
    res.json(200, { configured: isConfigured(), model: config.geminiModel });
  });

  router.post("/ai/recommendations", ...customerOnly, aiLimit, async (req, res) => {
    const filters = validateRecommendation(req.body);
    res.json(200, await recommend(req.user, filters));
  });

  router.post("/ai/admin-report", ...adminOnly, aiLimit, async (req, res) => {
    res.json(200, await analyze(validateReportPeriod(req.body.days)));
  });
}

module.exports = registerOrderRoutes;
