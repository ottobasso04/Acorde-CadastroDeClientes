const { db } = require("../database");
const { HttpError } = require("../router");
const { verifyToken } = require("../security");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  const payload = type === "Bearer" ? verifyToken(token) : null;
  if (!payload) throw new HttpError(401, "Sessão inválida ou expirada. Entre novamente.");

  const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(payload.sub);
  if (!user) throw new HttpError(401, "Sessão inválida ou expirada. Entre novamente.");

  req.user = user;
  await next();
}

function requireRole(role) {
  return async (req, res, next) => {
    if (req.user.role !== role) {
      const message =
        role === "admin" ? "Apenas administradores podem fazer isso." : "Esta área é exclusiva para clientes.";
      throw new HttpError(403, message);
    }
    await next();
  };
}

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.requireRole = requireRole;
module.exports.adminOnly = [requireAuth, requireRole("admin")];
module.exports.customerOnly = [requireAuth, requireRole("customer")];
