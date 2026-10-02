class HttpError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

function sendJson(res, status, data) {
  if (data === undefined) {
    res.writeHead(status);
    res.end();
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) {
        reject(new HttpError(413, "Corpo da requisição grande demais."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed && typeof parsed === "object" ? parsed : {});
      } catch {
        reject(new HttpError(400, "O corpo da requisição não é um JSON válido."));
      }
    });
    req.on("error", reject);
  });
}

class Router {
  constructor() {
    this.routes = [];
  }

  add(method, path, ...handlers) {
    const keys = [];
    const pattern = path.replace(/:([A-Za-z_]+)/g, (_, key) => {
      keys.push(key);
      return "([^/]+)";
    });
    this.routes.push({ method, regex: new RegExp(`^${pattern}/?$`), keys, handlers });
  }

  get(path, ...handlers) {
    this.add("GET", path, ...handlers);
  }
  post(path, ...handlers) {
    this.add("POST", path, ...handlers);
  }
  put(path, ...handlers) {
    this.add("PUT", path, ...handlers);
  }
  delete(path, ...handlers) {
    this.add("DELETE", path, ...handlers);
  }

  async handle(req, res) {
    const startedAt = Date.now();
    res.on("finish", () => {
      console.log(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - startedAt} ms)`);
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return sendJson(res, 204);

    try {
      const url = new URL(req.url, "http://localhost");
      const samePath = this.routes.filter((route) => route.regex.test(url.pathname));
      if (samePath.length === 0) throw new HttpError(404, "Rota não encontrada.");

      const route = samePath.find((item) => item.method === req.method);
      if (!route) throw new HttpError(405, "Método não permitido para esta rota.");

      const values = url.pathname.match(route.regex).slice(1);
      req.params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(values[i])]));
      req.query = Object.fromEntries(url.searchParams);
      req.body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readJsonBody(req) : {};

      res.json = (status, data) => sendJson(res, status, data);

      let index = 0;
      const next = async () => {
        const handler = route.handlers[index++];
        if (handler) await handler(req, res, next);
      };
      await next();
    } catch (error) {
      if (error instanceof HttpError) {
        return sendJson(res, error.status, { message: error.message, errors: error.errors });
      }
      console.error(error);
      sendJson(res, 500, { message: "Erro interno do servidor." });
    }
  }
}

module.exports = { Router, HttpError };
