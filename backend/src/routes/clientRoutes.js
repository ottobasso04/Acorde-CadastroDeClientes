const { db, normalizeText } = require("../database");
const { HttpError } = require("../router");
const { validateClient } = require("../validators");
const { adminOnly } = require("../middleware/requireAuth");
const { toClient } = require("../mappers");

function findClient(id) {
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(Number(id) || 0);
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

function addressValues(data) {
  return [
    data.name,
    data.email,
    data.phone,
    data.cep,
    data.street,
    data.number,
    data.complement,
    data.neighborhood,
    data.city,
    data.state,
    JSON.stringify(data.interests),
  ];
}

function registerClientRoutes(router) {
  router.get("/clients", ...adminOnly, async (req, res) => {
    const search = normalizeText(req.query.search).trim();

    if (!search) {
      const rows = db.prepare("SELECT * FROM clients ORDER BY name COLLATE NOCASE").all();
      return res.json(200, rows.map(toClient));
    }

    const rows = db
      .prepare(
        `SELECT * FROM clients
         WHERE instr(normalize_text(name), ?) > 0 OR instr(normalize_text(email), ?) > 0 OR instr(normalize_text(city), ?) > 0
         ORDER BY name COLLATE NOCASE`
      )
      .all(search, search, search);
    res.json(200, rows.map(toClient));
  });

  router.get("/clients/:id", ...adminOnly, async (req, res) => {
    res.json(200, toClient(findClient(req.params.id)));
  });

  router.post("/clients", ...adminOnly, async (req, res) => {
    const data = validateClient(req.body);
    ensureEmailIsFree(data.email);

    const result = db
      .prepare(
        `INSERT INTO clients (name, email, phone, cep, street, number, complement, neighborhood, city, state, interests, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(...addressValues(data), req.user.id);

    res.json(201, toClient(findClient(result.lastInsertRowid)));
  });

  router.put("/clients/:id", ...adminOnly, async (req, res) => {
    const current = findClient(req.params.id);
    const data = validateClient(req.body);
    ensureEmailIsFree(data.email, current.id);

    if (current.user_id && data.email !== current.email) {
      throw new HttpError(409, "O e-mail de um cliente com conta na loja não pode ser alterado.", {
        email: "Este e-mail é o login do cliente.",
      });
    }

    db.prepare(
      `UPDATE clients
       SET name = ?, email = ?, phone = ?, cep = ?, street = ?, number = ?, complement = ?, neighborhood = ?,
           city = ?, state = ?, interests = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(...addressValues(data), current.id);
    if (current.user_id) db.prepare("UPDATE users SET name = ? WHERE id = ?").run(data.name, current.user_id);

    res.json(200, toClient(findClient(current.id)));
  });

  router.delete("/clients/:id", ...adminOnly, async (req, res) => {
    const current = findClient(req.params.id);
    if (current.user_id) {
      throw new HttpError(409, "Este cliente tem conta na loja e pedidos vinculados; ele não pode ser excluído.");
    }
    db.prepare("DELETE FROM clients WHERE id = ?").run(current.id);
    res.json(204);
  });
}

module.exports = registerClientRoutes;
