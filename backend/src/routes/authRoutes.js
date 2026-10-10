const { db, transaction } = require("../database");
const { HttpError } = require("../router");
const { hashPassword, verifyPassword, signToken } = require("../security");
const { validateRegister, validateLogin } = require("../validators");
const requireAuth = require("../middleware/requireAuth");

function session(user) {
  const publicUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  return { token: signToken({ sub: user.id }), user: publicUser };
}

function registerAuthRoutes(router) {
  router.post("/auth/register", async (req, res) => {
    const data = validateRegister(req.body);

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(data.email);
    if (existing) {
      throw new HttpError(409, "Já existe uma conta com este e-mail.", {
        email: "Este e-mail já está cadastrado.",
      });
    }

    const user = transaction(() => {
      const result = db
        .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'customer')")
        .run(data.name, data.email, hashPassword(data.password));
      const userId = Number(result.lastInsertRowid);

      const values = [
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
        userId,
      ];
      const client = db.prepare("SELECT id, user_id FROM clients WHERE email = ?").get(data.email);
      if (client && client.user_id) {
        throw new HttpError(409, "Este e-mail já pertence a outro cadastro.", { email: "E-mail em uso." });
      }
      if (client) {
        db.prepare(
          `UPDATE clients SET name = ?, phone = ?, cep = ?, street = ?, number = ?, complement = ?, neighborhood = ?,
           city = ?, state = ?, interests = ?, user_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(...values, client.id);
      } else {
        db.prepare(
          `INSERT INTO clients (name, phone, cep, street, number, complement, neighborhood, city, state, interests, user_id, email, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(...values, data.email, userId);
      }
      return { id: userId, name: data.name, email: data.email, role: "customer" };
    });

    res.json(201, session(user));
  });

  router.post("/auth/login", async (req, res) => {
    const { email, password, role } = validateLogin(req.body);

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new HttpError(401, "E-mail ou senha incorretos.");
    }
    if (user.role !== role) {
      const message =
        role === "admin"
          ? "Esta conta não é de administrador. Use a aba Cliente."
          : "Esta é uma conta de administrador. Use a aba Administrador.";
      throw new HttpError(403, message);
    }

    res.json(200, session(user));
  });

  router.get("/auth/me", requireAuth, async (req, res) => {
    res.json(200, { user: req.user });
  });
}

module.exports = registerAuthRoutes;
