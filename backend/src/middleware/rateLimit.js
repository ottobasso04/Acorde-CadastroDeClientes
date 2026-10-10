const { HttpError } = require("../router");

function rateLimit({ limit, windowMs, message }) {
  const hits = new Map();

  return async (req, res, next) => {
    const key = req.user ? `user:${req.user.id}` : `ip:${req.socket.remoteAddress}`;
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
    if (recent.length >= limit) {
      const waitSeconds = Math.ceil((windowMs - (now - recent[0])) / 1000);
      res.setHeader("Retry-After", String(waitSeconds));
      throw new HttpError(429, `${message} Tente novamente em ${Math.ceil(waitSeconds / 60)} min.`);
    }
    recent.push(now);
    hits.set(key, recent);
    await next();
  };
}

module.exports = rateLimit;
