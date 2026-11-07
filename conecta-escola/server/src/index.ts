import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "node:path";
import fs from "node:fs";
import { seed } from "./db.js";
import { loadUser } from "./auth.js";
import { api } from "./api.js";
import { admin } from "./admin.js";
import { errorHandler } from "./util.js";

seed();

const app = express();
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        upgradeInsecureRequests: null, // roda em HTTP na rede local
      },
    },
    strictTransportSecurity: false,
    crossOriginOpenerPolicy: false,
  })
);
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());
app.use(loadUser);

app.use("/api/admin", admin);
app.use("/api", api);
app.use("/api", (_req, res) => res.status(404).json({ error: "Rota não encontrada." }));
app.use("/api", errorHandler);

// Frontend compilado (SPA): qualquer rota que não seja /api devolve o index.html.
const WEB_DIR = path.resolve(process.env.WEB_DIR || "../web/dist");
if (fs.existsSync(WEB_DIR)) {
  app.use(express.static(WEB_DIR, { index: false, maxAge: "1h" }));
  app.use((req, res, next) => (req.method === "GET" ? res.sendFile(path.join(WEB_DIR, "index.html")) : next()));
}

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, "0.0.0.0", () => console.log(`[conecta-escola] rodando em http://0.0.0.0:${PORT}`));
