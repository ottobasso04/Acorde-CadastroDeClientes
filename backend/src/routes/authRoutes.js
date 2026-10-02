const { db } = require("../database");
const { HttpError } = require("../router");
const { hashPassword, verifyPassword, signToken } = require("../security");
const { validateRegister, validateLogin } = require("../validators");
const requireAuth = require("../middleware/requireAuth");

function session(user) {
  const publicUser = { id: user.id, name: user.name, email: user.email };
  return { token: signToken({ sub: user.id }), user: publicUser };
}

function registerAuthRoutes(router) {
  router.post("/auth/register", async (req, res) => {
    const { name, email, password } = validateRegister(req.body);

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      throw new HttpError(409, "Já existe uma conta com este e-mail.", {
        email: "Este e-mail já está cadastrado.",
      });
    }

    const result = db
      .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
      .run(name, email, hashPassword(password));

    res.json(201, session({ id: Number(result.lastInsertRowid), name, email }));
  });

  router.post("/auth/login", async (req, res) => {
    const { email, password } = validateLogin(req.body);

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new HttpError(401, "E-mail ou senha incorretos.");
    }

    res.json(200, session(user));
  });

  router.get("/auth/me", requireAuth, async (req, res) => {
    res.json(200, { user: req.user });
  });
}

module.exports = registerAuthRoutes;
