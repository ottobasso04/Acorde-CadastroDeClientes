const { db } = require("../database");
const { HttpError } = require("../router");
const { verifyToken } = require("../security");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  const payload = type === "Bearer" ? verifyToken(token) : null;
  if (!payload) throw new HttpError(401, "Sessão inválida ou expirada. Entre novamente.");

  const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(payload.sub);
  if (!user) throw new HttpError(401, "Sessão inválida ou expirada. Entre novamente.");

  req.user = user;
  await next();
}

module.exports = requireAuth;
