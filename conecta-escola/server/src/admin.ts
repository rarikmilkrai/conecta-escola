import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { all, one, run, tx } from "./db.js";
import { logAdmin, requireAdmin } from "./auth.js";
import { h, int, slugify, zText } from "./util.js";

export const admin = Router();
admin.use(requireAdmin);

admin.get("/stats", h((_req, res) => {
  const c = (sql: string) => one(sql)!.c as number;
  res.json({
    users_total: c("SELECT COUNT(*) AS c FROM users WHERE is_admin = 0"),
    users_pending: c("SELECT COUNT(*) AS c FROM users WHERE status = 'pending'"),
    users_approved: c("SELECT COUNT(*) AS c FROM users WHERE status = 'approved' AND is_admin = 0"),
    professionals: c("SELECT COUNT(*) AS c FROM professional_profiles p JOIN users u ON u.id = p.user_id WHERE u.status = 'approved' AND p.published = 1 AND p.hidden_by_admin = 0"),
    quotes: c("SELECT COUNT(*) AS c FROM quote_requests"),
    reviews: c("SELECT COUNT(*) AS c FROM reviews WHERE status = 'visible'"),
    partnerships: c("SELECT COUNT(*) AS c FROM partnership_posts WHERE status = 'active'"),
    reports_open: c("SELECT COUNT(*) AS c FROM reports WHERE status = 'open'"),
    support_open: c("SELECT COUNT(*) AS c FROM support_requests WHERE status = 'open'"),
    resets_open: c("SELECT COUNT(*) AS c FROM password_resets WHERE status = 'requested'"),
  });
}));

// ── Usuários e verificação ──
admin.get("/users", h((req, res) => {
  const status = String(req.query.status || "");
  const q = String(req.query.q || "").trim();
  const where = ["u.is_admin = 0"];
  const params: any[] = [];
  if (status) { where.push("u.status = ?"); params.push(status); }
  if (q) { where.push("(u.name LIKE ? OR u.email LIKE ? OR s.name LIKE ?)"); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  res.json(
    all(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.status_reason, u.is_family, u.is_professional, u.created_at, u.reviewed_at,
         s.name AS school_name, rv.name AS reviewed_by_name, p.slug AS profile_slug, p.profession, p.hidden_by_admin
       FROM users u LEFT JOIN schools s ON s.id = u.school_id LEFT JOIN users rv ON rv.id = u.reviewed_by
       LEFT JOIN professional_profiles p ON p.user_id = u.id
       WHERE ${where.join(" AND ")} ORDER BY CASE u.status WHEN 'pending' THEN 0 ELSE 1 END, u.created_at DESC LIMIT 300`,
      ...params
    )
  );
}));

admin.post("/users/:id/decision", h((req, res) => {
  const b = z.object({ status: z.enum(["approved", "rejected", "suspended", "pending"]), reason: zText(500) }).parse(req.body);
  if ((b.status === "rejected" || b.status === "suspended") && !b.reason)
    return res.status(400).json({ error: "Informe o motivo ou a instrução de correção.", fields: { reason: "Obrigatório para recusa/suspensão." } });
  const id = int(req.params.id);
  const r = run(
    "UPDATE users SET status = ?, status_reason = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND is_admin = 0",
    b.status, b.status === "approved" ? "" : b.reason, req.user!.id, id
  );
  if (!r.changes) return res.status(404).json({ error: "Usuário não encontrado." });
  logAdmin(req.user!.id, `usuario_${b.status}`, "user", id, b.reason);
  res.json({ ok: true });
}));

admin.post("/profiles/:userId/visibility", h((req, res) => {
  const { hidden, reason } = z.object({ hidden: z.boolean(), reason: zText(500) }).parse(req.body);
  const id = int(req.params.userId);
  run("UPDATE professional_profiles SET hidden_by_admin = ? WHERE user_id = ?", hidden ? 1 : 0, id);
  logAdmin(req.user!.id, hidden ? "perfil_ocultado" : "perfil_restaurado", "profile", id, reason);
  res.json({ ok: true });
}));

// ── Avaliações ──
admin.get("/reviews", h((_req, res) => {
  res.json(
    all(
      `SELECT r.id, r.rating, r.comment, r.status, r.created_at, a.name AS author_name, p.display_name, p.slug
       FROM reviews r JOIN users a ON a.id = r.author_id JOIN professional_profiles p ON p.id = r.profile_id
       ORDER BY r.created_at DESC LIMIT 300`
    )
  );
}));

admin.post("/reviews/:id/status", h((req, res) => {
  const { status, reason } = z.object({ status: z.enum(["visible", "hidden"]), reason: zText(500) }).parse(req.body);
  run("UPDATE reviews SET status = ? WHERE id = ?", status, int(req.params.id));
  logAdmin(req.user!.id, status === "hidden" ? "avaliacao_ocultada" : "avaliacao_restaurada", "review", int(req.params.id), reason);
  res.json({ ok: true });
}));

// ── Parcerias ──
admin.get("/partnerships", h((_req, res) => {
  res.json(
    all(
      `SELECT pp.id, pp.title, pp.status, pp.region, pp.created_at, u.name AS author_name
       FROM partnership_posts pp JOIN users u ON u.id = pp.author_id ORDER BY pp.created_at DESC LIMIT 300`
    )
  );
}));

admin.post("/partnerships/:id/status", h((req, res) => {
  const { status, reason } = z.object({ status: z.enum(["active", "closed", "hidden"]), reason: zText(500) }).parse(req.body);
  run("UPDATE partnership_posts SET status = ? WHERE id = ?", status, int(req.params.id));
  logAdmin(req.user!.id, `parceria_${status}`, "partnership", int(req.params.id), reason);
  res.json({ ok: true });
}));

// ── Denúncias ──
admin.get("/reports", h((_req, res) => {
  const rows = all(
    `SELECT r.*, u.name AS reporter_name, rb.name AS resolved_by_name
     FROM reports r JOIN users u ON u.id = r.reporter_id LEFT JOIN users rb ON rb.id = r.resolved_by
     ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 300`
  );
  res.json(
    rows.map((r) => {
      let target: any = null;
      if (r.target_type === "profile") target = one("SELECT display_name AS label, slug, user_id, hidden_by_admin AS hidden FROM professional_profiles WHERE id = ?", r.target_id);
      if (r.target_type === "review") target = one("SELECT r.comment AS label, p.slug, r.status = 'hidden' AS hidden FROM reviews r JOIN professional_profiles p ON p.id = r.profile_id WHERE r.id = ?", r.target_id);
      if (r.target_type === "partnership") target = one("SELECT title AS label, status = 'hidden' AS hidden FROM partnership_posts WHERE id = ?", r.target_id);
      return { ...r, target };
    })
  );
}));

admin.post("/reports/:id/resolve", h((req, res) => {
  const b = z.object({ action: z.enum(["hide", "dismiss"]), decision: zText(500, 3) }).parse(req.body);
  const rep = one("SELECT * FROM reports WHERE id = ?", int(req.params.id));
  if (!rep) return res.status(404).json({ error: "Denúncia não encontrada." });
  tx(() => {
    if (b.action === "hide") {
      if (rep.target_type === "profile") run("UPDATE professional_profiles SET hidden_by_admin = 1 WHERE id = ?", rep.target_id);
      if (rep.target_type === "review") run("UPDATE reviews SET status = 'hidden' WHERE id = ?", rep.target_id);
      if (rep.target_type === "partnership") run("UPDATE partnership_posts SET status = 'hidden' WHERE id = ?", rep.target_id);
    }
    run("UPDATE reports SET status = 'resolved', decision = ?, resolved_by = ?, resolved_at = datetime('now') WHERE id = ?",
      `${b.action === "hide" ? "Conteúdo ocultado" : "Mantido"}: ${b.decision}`, req.user!.id, rep.id);
    logAdmin(req.user!.id, `denuncia_${b.action}`, rep.target_type, rep.target_id, b.decision);
  });
  res.json({ ok: true });
}));

// ── Suporte ──
admin.get("/support", h((_req, res) => {
  res.json(all("SELECT * FROM support_requests ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, created_at DESC LIMIT 300"));
}));

admin.post("/support/:id/status", h((req, res) => {
  const { status } = z.object({ status: z.enum(["open", "closed"]) }).parse(req.body);
  run("UPDATE support_requests SET status = ? WHERE id = ?", status, int(req.params.id));
  logAdmin(req.user!.id, `suporte_${status}`, "support", int(req.params.id));
  res.json({ ok: true });
}));

// ── Recuperação de senha ──
admin.get("/password-resets", h((_req, res) => {
  res.json(
    all(
      `SELECT pr.id, pr.status, pr.created_at, pr.expires_at, u.name, u.email, u.phone
       FROM password_resets pr JOIN users u ON u.id = pr.user_id
       WHERE pr.status != 'used' ORDER BY pr.created_at DESC LIMIT 100`
    )
  );
}));

admin.post("/password-resets/:id/issue", h((req, res) => {
  const pr = one("SELECT * FROM password_resets WHERE id = ? AND status != 'used'", int(req.params.id));
  if (!pr) return res.status(404).json({ error: "Solicitação não encontrada." });
  const token = crypto.randomBytes(24).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  run("UPDATE password_resets SET token = ?, status = 'issued', expires_at = datetime('now', '+2 hours') WHERE id = ?", hash, pr.id);
  logAdmin(req.user!.id, "senha_link_gerado", "user", pr.user_id);
  // O token só existe em texto puro nesta resposta; no banco fica apenas o hash.
  res.json({ token });
}));

// ── Escolas e categorias ──
admin.get("/schools", h((_req, res) => {
  res.json(all("SELECT s.*, (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id) AS members FROM schools s ORDER BY s.name"));
}));

admin.post("/schools", h((req, res) => {
  const b = z.object({ name: zText(150, 3), city: zText(80), status: z.enum(["active", "inactive"]).default("active") }).parse(req.body);
  if (one("SELECT id FROM schools WHERE name = ?", b.name)) return res.status(409).json({ error: "Escola já cadastrada." });
  const r = run("INSERT INTO schools (name, city, status) VALUES (?, ?, ?)", b.name, b.city, b.status);
  logAdmin(req.user!.id, "escola_criada", "school", Number(r.lastInsertRowid), b.name);
  res.status(201).json({ ok: true });
}));

admin.put("/schools/:id", h((req, res) => {
  const b = z.object({ name: zText(150, 3), city: zText(80), status: z.enum(["active", "inactive"]) }).parse(req.body);
  run("UPDATE schools SET name = ?, city = ?, status = ? WHERE id = ?", b.name, b.city, b.status, int(req.params.id));
  logAdmin(req.user!.id, "escola_editada", "school", int(req.params.id), b.name);
  res.json({ ok: true });
}));

admin.get("/categories", h((_req, res) => {
  res.json(all("SELECT c.*, (SELECT COUNT(*) FROM professional_profiles p WHERE p.category_id = c.id) AS profiles FROM categories c ORDER BY c.id"));
}));

admin.post("/categories", h((req, res) => {
  const b = z.object({ name: zText(80, 2), description: zText(200), icon: zText(30).default("tag"), status: z.enum(["active", "inactive"]).default("active") }).parse(req.body);
  const slug = slugify(b.name);
  if (one("SELECT id FROM categories WHERE slug = ? OR name = ?", slug, b.name)) return res.status(409).json({ error: "Categoria já existe." });
  const r = run("INSERT INTO categories (name, slug, description, icon, status) VALUES (?, ?, ?, ?, ?)", b.name, slug, b.description, b.icon || "tag", b.status);
  logAdmin(req.user!.id, "categoria_criada", "category", Number(r.lastInsertRowid), b.name);
  res.status(201).json({ ok: true });
}));

admin.put("/categories/:id", h((req, res) => {
  const b = z.object({ name: zText(80, 2), description: zText(200), icon: zText(30), status: z.enum(["active", "inactive"]) }).parse(req.body);
  run("UPDATE categories SET name = ?, description = ?, icon = ?, status = ? WHERE id = ?", b.name, b.description, b.icon || "tag", b.status, int(req.params.id));
  logAdmin(req.user!.id, "categoria_editada", "category", int(req.params.id), b.name);
  res.json({ ok: true });
}));

// ── Registro de ações ──
admin.get("/log", h((_req, res) => {
  res.json(all("SELECT l.*, u.name AS admin_name FROM admin_log l JOIN users u ON u.id = l.admin_id ORDER BY l.id DESC LIMIT 300"));
}));
