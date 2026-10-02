const crypto = require("node:crypto");
const config = require("./config");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const received = crypto.scryptSync(password, salt, 64);

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function toBase64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(content) {
  return crypto.createHmac("sha256", config.jwtSecret).update(content).digest("base64url");
}

function signToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url({ alg: "HS256", typ: "JWT" });
  const body = toBase64Url({ ...payload, iat: now, exp: now + config.tokenTtlSeconds });
  return `${header}.${body}.${sign(`${header}.${body}`)}`;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = Buffer.from(sign(`${header}.${body}`));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };
