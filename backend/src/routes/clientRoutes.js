const { db, normalizeText } = require("../database");
const { HttpError } = require("../router");
const { validateClient } = require("../validators");
const requireAuth = require("../middleware/requireAuth");

const FIELDS = "id, name, email, phone, address, instrument, created_at, updated_at";

function findClient(id) {
  const client = db.prepare(`SELECT ${FIELDS} FROM clients WHERE id = ?`).get(Number(id) || 0);
  if (!client) throw new HttpError(404, "Cliente não encontrado.");
  return client;
}

function ensureEmailIsFree(email, ignoreId = 0) {
  const other = db.prepare("SELECT id FROM clients WHERE email = ? AND id <> ?").get(email, ignoreId);
  if (other) {
    throw new HttpError(409, "Já existe um cliente com este e-mail.", {
      email: "Este e-mail já está cadastrado.",
    });
  }
}

function registerClientRoutes(router) {
  router.get("/clients", requireAuth, async (req, res) => {
    const search = normalizeText(req.query.search).trim();

    if (!search) {
      const clients = db.prepare(`SELECT ${FIELDS} FROM clients ORDER BY name COLLATE NOCASE`).all();
      return res.json(200, clients);
    }

    const clients = db
      .prepare(
        `SELECT ${FIELDS} FROM clients
         WHERE instr(normalize_text(name), ?) > 0 OR instr(normalize_text(email), ?) > 0
         ORDER BY name COLLATE NOCASE`
      )
      .all(search, search);
    res.json(200, clients);
  });

  router.get("/clients/:id", requireAuth, async (req, res) => {
    res.json(200, findClient(req.params.id));
  });

  router.post("/clients", requireAuth, async (req, res) => {
    const data = validateClient(req.body);
    ensureEmailIsFree(data.email);

    const result = db
      .prepare(
        "INSERT INTO clients (name, email, phone, address, instrument, created_by) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(data.name, data.email, data.phone, data.address, data.instrument, req.user.id);

    res.json(201, findClient(result.lastInsertRowid));
  });

  router.put("/clients/:id", requireAuth, async (req, res) => {
    const current = findClient(req.params.id);
    const data = validateClient(req.body);
    ensureEmailIsFree(data.email, current.id);

    db.prepare(
      `UPDATE clients
       SET name = ?, email = ?, phone = ?, address = ?, instrument = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(data.name, data.email, data.phone, data.address, data.instrument, current.id);

    res.json(200, findClient(current.id));
  });

  router.delete("/clients/:id", requireAuth, async (req, res) => {
    const current = findClient(req.params.id);
    db.prepare("DELETE FROM clients WHERE id = ?").run(current.id);
    res.json(204);
  });
}

module.exports = registerClientRoutes;
