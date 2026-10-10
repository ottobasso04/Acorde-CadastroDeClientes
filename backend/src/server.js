const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(
    `Este backend precisa do Node.js 22.13 ou mais novo (você está usando a versão ${process.versions.node}).\n` +
      "Baixe a versão LTS em https://nodejs.org e tente de novo."
  );
  process.exit(1);
}

const http = require("node:http");
const os = require("node:os");
const config = require("./config");
const { Router } = require("./router");
const registerAuthRoutes = require("./routes/authRoutes");
const registerClientRoutes = require("./routes/clientRoutes");
const registerCatalogRoutes = require("./routes/catalogRoutes");
const registerOrderRoutes = require("./routes/orderRoutes");
const { isConfigured } = require("./services/geminiService");

const router = new Router();

router.get("/", async (req, res) => {
  res.json(200, { name: "Acorde API", status: "ok", gemini: isConfigured() ? "configurado" : "modo local" });
});

registerAuthRoutes(router);
registerClientRoutes(router);
registerCatalogRoutes(router);
registerOrderRoutes(router);

const server = http.createServer((req, res) => router.handle(req, res));

function localAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => item.address);
}

if (require.main === module) {
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `A porta ${config.port} já está em uso. Feche o outro terminal que está rodando a API ` +
          "ou defina outra porta no arquivo .env (PORT=3334)."
      );
      process.exit(1);
    }
    throw error;
  });

  server.listen(config.port, "0.0.0.0", () => {
    console.log("API da Acorde no ar:");
    console.log(`  neste computador: http://localhost:${config.port}`);
    for (const address of localAddresses()) {
      console.log(`  na rede local:    http://${address}:${config.port}`);
    }
    console.log(`  banco de dados:   ${config.dbFile}`);
    console.log(
      isConfigured()
        ? `  Gemini:           ativo (modelo ${config.geminiModel})`
        : "  Gemini:           sem GEMINI_API_KEY no .env (o assistente usa o modo local)"
    );
    if (config.usingDefaultSecret) {
      console.log("  aviso: usando a chave JWT padrão. Crie um arquivo .env antes de publicar.");
    }
  });
}

module.exports = server;
