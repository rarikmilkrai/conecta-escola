// Redefine a senha do administrador (para quando ela for esquecida).
// Uso: docker compose exec app node --disable-warning=ExperimentalWarning dist/reset-admin.js NOVA_SENHA
import bcrypt from "bcryptjs";
import { one, run } from "./db.js";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error("Informe a nova senha (mínimo 8 caracteres). Ex.: ... dist/reset-admin.js minhaSenha123");
  process.exit(1);
}
const admin = one("SELECT id, email FROM users WHERE is_admin = 1 ORDER BY id LIMIT 1");
if (!admin) {
  console.error("Nenhum administrador encontrado.");
  process.exit(1);
}
run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", bcrypt.hashSync(password, 10), admin.id);
console.log(`Senha redefinida. Login: ${admin.email}`);
