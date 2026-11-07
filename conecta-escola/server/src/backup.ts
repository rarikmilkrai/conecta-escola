// Gera uma cópia consistente do banco (funciona com o sistema rodando).
// Uso no container:  docker compose exec app node --disable-warning=ExperimentalWarning dist/backup.js
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = process.env.DATA_DIR || path.resolve("data");
const dir = path.join(DATA_DIR, "backups");
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const out = path.join(dir, `conecta-escola-${stamp}.db`);
const db = new DatabaseSync(path.join(DATA_DIR, "conecta-escola.db"));
db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
db.close();
console.log(out);
