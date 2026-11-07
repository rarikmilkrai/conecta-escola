import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { all, one, run, tx, type Row } from "./db.js";
import { clearSession, publicUser, requireApproved, requireAuth, setSession } from "./auth.js";
import { h, int, uniqueSlug, zOptPhone, zPhone, zText } from "./util.js";

export const api = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Muitas tentativas. Aguarde alguns minutos." } });
const formLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Muitas solicitações. Aguarde alguns minutos." } });

// ───────────────────────── Conteúdo público ─────────────────────────

api.get("/health", (_req, res) => res.json({ ok: true }));

api.get("/site", h((_req, res) => {
  const school = one("SELECT id, name, city FROM schools WHERE status = 'active' ORDER BY id LIMIT 1");
  res.json({ school, publicUrl: process.env.PUBLIC_URL || "" });
}));

api.get("/schools", h((_req, res) => {
  res.json(all("SELECT id, name, city FROM schools WHERE status = 'active' ORDER BY name"));
}));

const VISIBLE = `u.status = 'approved' AND p.published = 1 AND p.hidden_by_admin = 0`;

api.get("/categories", h((_req, res) => {
  res.json(
    all(
      `SELECT c.id, c.name, c.slug, c.description, c.icon,
        (SELECT COUNT(*) FROM professional_profiles p JOIN users u ON u.id = p.user_id WHERE p.category_id = c.id AND ${VISIBLE}) AS count
       FROM categories c WHERE c.status = 'active' ORDER BY c.id`
    )
  );
}));

api.get("/stats", h((_req, res) => {
  res.json({
    professionals: one(`SELECT COUNT(*) AS c FROM professional_profiles p JOIN users u ON u.id = p.user_id WHERE ${VISIBLE}`)!.c,
    members: one("SELECT COUNT(*) AS c FROM users WHERE status = 'approved' AND is_admin = 0")!.c,
    partnerships: one("SELECT COUNT(*) AS c FROM partnership_posts WHERE status = 'active'")!.c,
  });
}));

const CARD_FIELDS = `p.id, p.slug, p.display_name, p.profession, p.bio, p.city, p.neighborhood, p.price_range,
  c.name AS category_name, c.slug AS category_slug, s.name AS school_name,
  (SELECT ROUND(AVG(rating),1) FROM reviews r WHERE r.profile_id = p.id AND r.status = 'visible') AS rating,
  (SELECT COUNT(*) FROM reviews r WHERE r.profile_id = p.id AND r.status = 'visible') AS review_count`;

api.get("/professionals", h((req, res) => {
  const q = String(req.query.q || "").trim();
  const category = String(req.query.categoria || "");
  const school = int(req.query.escola);
  const city = String(req.query.cidade || "").trim();
  const minRating = int(req.query.nota);
  const sort = String(req.query.ordem || "relevancia");
  const page = Math.max(1, int(req.query.pagina, 1));
  const perPage = 12;

  const where = [VISIBLE];
  const params: any[] = [];
  if (q) {
    where.push(`(p.display_name LIKE ? OR p.profession LIKE ? OR p.bio LIKE ? OR c.name LIKE ?
      OR EXISTS (SELECT 1 FROM services sv WHERE sv.profile_id = p.id AND (sv.title LIKE ? OR sv.description LIKE ?)))`);
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }
  if (category) { where.push("c.slug = ?"); params.push(category); }
  if (school) { where.push("u.school_id = ?"); params.push(school); }
  if (city) { where.push("(p.city LIKE ? OR p.neighborhood LIKE ? OR p.service_area LIKE ?)"); params.push(`%${city}%`, `%${city}%`, `%${city}%`); }

  const base = `FROM professional_profiles p JOIN users u ON u.id = p.user_id
    LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN schools s ON s.id = u.school_id
    WHERE ${where.join(" AND ")}`;
  const having = minRating ? `WHERE rating >= ${minRating}` : "";
  const order =
    sort === "nome" ? "display_name COLLATE NOCASE" :
    sort === "avaliacao" ? "rating IS NULL, rating DESC, review_count DESC" :
    sort === "recentes" ? "id DESC" :
    "review_count DESC, rating DESC, id DESC";

  const inner = `SELECT ${CARD_FIELDS} ${base}`;
  const total = one(`SELECT COUNT(*) AS c FROM (${inner}) ${having}`, ...params)!.c;
  const items = all(`SELECT * FROM (${inner}) ${having} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, perPage, (page - 1) * perPage);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) });
}));

api.get("/professionals/:slug", h((req, res) => {
  const p = one(
    `SELECT ${CARD_FIELDS}, p.user_id, p.experience, p.service_area, p.contact_hours, p.whatsapp, c.id AS category_id
     FROM professional_profiles p JOIN users u ON u.id = p.user_id
     LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN schools s ON s.id = u.school_id
     WHERE p.slug = ? AND ${VISIBLE}`,
    req.params.slug
  );
  if (!p) return res.status(404).json({ error: "Perfil não encontrado." });
  const viewer = req.user;
  const canContact = viewer?.status === "approved";
  const services = all("SELECT id, title, description, price FROM services WHERE profile_id = ? ORDER BY id", p.id);
  const reviews = all(
    `SELECT r.id, r.rating, r.comment, r.created_at, r.author_id, u.name AS author_name
     FROM reviews r JOIN users u ON u.id = r.author_id
     WHERE r.profile_id = ? AND r.status = 'visible' ORDER BY r.created_at DESC`,
    p.id
  ).map((r): Row => ({ ...r, author_name: String(r.author_name).split(" ")[0] }));
  const myReview = viewer ? reviews.find((r) => r.author_id === viewer.id) || null : null;
  const { whatsapp, user_id, ...rest } = p;
  res.json({
    ...rest,
    services,
    reviews: reviews.map(({ author_id, ...r }) => r),
    is_owner: viewer?.id === user_id,
    can_contact: canContact,
    whatsapp: canContact ? whatsapp : null,
    has_whatsapp: !!whatsapp,
    my_review: myReview ? { id: myReview.id, rating: myReview.rating, comment: myReview.comment } : null,
  });
}));

api.get("/partnerships", h((req, res) => {
  const where = ["pp.status = 'active'", "u.status = 'approved'"];
  const params: any[] = [];
  const cat = String(req.query.categoria || "").trim();
  const region = String(req.query.regiao || "").trim();
  if (cat) { where.push("pp.categories LIKE ?"); params.push(`%${cat}%`); }
  if (region) { where.push("pp.region LIKE ?"); params.push(`%${region}%`); }
  const rows = all(
    `SELECT pp.id, pp.title, pp.description, pp.categories, pp.region, pp.deadline, pp.created_at, pp.author_id,
       u.name AS author_name, p.slug AS author_slug, p.profession AS author_profession, u.phone AS author_phone
     FROM partnership_posts pp JOIN users u ON u.id = pp.author_id
     LEFT JOIN professional_profiles p ON p.user_id = u.id
     WHERE ${where.join(" AND ")} ORDER BY pp.created_at DESC`,
    ...params
  );
  const approved = req.user?.status === "approved";
  res.json(rows.map(({ author_phone, author_id, ...r }) => ({ ...r, is_mine: req.user?.id === author_id, author_phone: approved ? author_phone : null })));
}));

api.post("/contact", formLimiter, h((req, res) => {
  const b = z.object({
    name: zText(120, 2),
    email: z.string().trim().email("E-mail inválido."),
    subject: zText(150, 3),
    message: zText(3000, 10),
  }).parse(req.body);
  run("INSERT INTO support_requests (name, email, subject, message) VALUES (?, ?, ?, ?)", b.name, b.email, b.subject, b.message);
  res.status(201).json({ ok: true });
}));

// ───────────────────────── Autenticação ─────────────────────────

const zPassword = z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(200);

const zProfessionalFields = z.object({
  profession: zText(80, 2),
  category_id: z.coerce.number().int().positive("Escolha uma categoria."),
  bio: zText(1500, 10),
  city: zText(80, 2),
  neighborhood: zText(80),
  service_area: zText(200),
  whatsapp: zOptPhone,
  contact_hours: zText(120),
  price_range: zText(80),
  experience: zText(1500),
});

// Cadastro básico: nome, e-mail, telefone e senha. O perfil profissional é criado depois, em Minha conta.
api.post("/auth/register", authLimiter, h((req, res) => {
  const b = z.object({
    name: zText(120, 3),
    email: z.string().trim().toLowerCase().email("E-mail inválido."),
    phone: zPhone,
    password: zPassword,
    school_id: z.coerce.number().int().positive().optional(),
    consent: z.literal(true, { message: "É preciso aceitar os termos e a política de privacidade." }),
  }).parse(req.body);

  if (one("SELECT id FROM users WHERE email = ?", b.email))
    return res.status(409).json({ error: "Já existe uma conta com este e-mail.", fields: { email: "E-mail já cadastrado. Tente entrar ou recuperar a senha." } });
  const school = b.school_id
    ? one("SELECT id FROM schools WHERE id = ? AND status = 'active'", b.school_id)
    : one("SELECT id FROM schools WHERE status = 'active' ORDER BY id LIMIT 1");
  if (!school) return res.status(400).json({ error: "Escola inválida.", fields: { school_id: "Escola inválida." } });

  const r = run(
    `INSERT INTO users (name, email, phone, password_hash, school_id, is_family, consent_at)
     VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`,
    b.name, b.email, b.phone, bcrypt.hashSync(b.password, 10), school.id
  );
  const userId = Number(r.lastInsertRowid);
  setSession(res, userId);
  res.status(201).json({ user: publicUser(one("SELECT * FROM users WHERE id = ?", userId)!) });
}));

api.post("/auth/login", authLimiter, h((req, res) => {
  const b = z.object({ email: z.string().trim().toLowerCase(), password: z.string() }).parse(req.body);
  const u = one("SELECT * FROM users WHERE email = ?", b.email);
  if (!u || !bcrypt.compareSync(b.password, u.password_hash))
    return res.status(401).json({ error: "E-mail ou senha incorretos." });
  setSession(res, u.id);
  res.json({ user: publicUser(u) });
}));

api.post("/auth/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

api.get("/auth/me", (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

// Recuperação de senha sem e-mail: a pessoa solicita, o admin gera um link de uso único e entrega a ela.
api.post("/auth/forgot", authLimiter, h((req, res) => {
  const { email } = z.object({ email: z.string().trim().toLowerCase().email("E-mail inválido.") }).parse(req.body);
  const u = one("SELECT id FROM users WHERE email = ?", email);
  if (u && !one("SELECT id FROM password_resets WHERE user_id = ? AND status = 'requested'", u.id))
    run("INSERT INTO password_resets (user_id) VALUES (?)", u.id);
  // Resposta igual exista ou não a conta, para não revelar e-mails cadastrados.
  res.json({ ok: true });
}));

api.post("/auth/reset", authLimiter, h((req, res) => {
  const b = z.object({ token: z.string().min(10), password: zPassword }).parse(req.body);
  const hash = crypto.createHash("sha256").update(b.token).digest("hex");
  const r = one("SELECT * FROM password_resets WHERE token = ? AND status = 'issued' AND expires_at > datetime('now')", hash);
  if (!r) return res.status(400).json({ error: "Link inválido ou expirado. Peça um novo à equipe da escola." });
  tx(() => {
    run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", bcrypt.hashSync(b.password, 10), r.user_id);
    run("UPDATE password_resets SET status = 'used' WHERE id = ?", r.id);
  });
  res.json({ ok: true });
}));

// ───────────────────────── Minha conta ─────────────────────────

api.get("/me", requireAuth, h((req, res) => {
  const u = req.user!;
  const school = u.school_id ? one("SELECT id, name FROM schools WHERE id = ?", u.school_id) : null;
  const profile = one("SELECT * FROM professional_profiles WHERE user_id = ?", u.id);
  const services = profile ? all("SELECT id, title, description, price FROM services WHERE profile_id = ? ORDER BY id", profile.id) : [];
  const sentQuotes = all(
    `SELECT q.id, q.description, q.status, q.created_at, p.display_name, p.slug
     FROM quote_requests q JOIN professional_profiles p ON p.id = q.profile_id WHERE q.family_id = ? ORDER BY q.created_at DESC`, u.id);
  const receivedQuotes = profile
    ? all(
        `SELECT q.id, q.description, q.status, q.created_at, u.name AS family_name, u.phone AS family_phone, u.email AS family_email
         FROM quote_requests q JOIN users u ON u.id = q.family_id WHERE q.profile_id = ? ORDER BY q.created_at DESC`, profile.id)
    : [];
  const partnerships = all("SELECT id, title, status, created_at FROM partnership_posts WHERE author_id = ? AND status != 'hidden' ORDER BY created_at DESC", u.id);
  res.json({ user: publicUser(u), school, profile: profile || null, services, sentQuotes, receivedQuotes, partnerships });
}));

api.put("/me", requireAuth, h((req, res) => {
  const b = z.object({ name: zText(120, 3), phone: zPhone, school_id: z.coerce.number().int().positive() }).parse(req.body);
  if (!one("SELECT id FROM schools WHERE id = ? AND status = 'active'", b.school_id))
    return res.status(400).json({ error: "Escola inválida." });
  const u = req.user!;
  // Trocar de escola exige nova verificação do vínculo.
  const schoolChanged = u.school_id !== b.school_id && !u.is_admin;
  run(
    `UPDATE users SET name = ?, phone = ?, school_id = ?, updated_at = datetime('now')${schoolChanged ? ", status = 'pending', status_reason = ''" : ""} WHERE id = ?`,
    b.name, b.phone, b.school_id, u.id
  );
  res.json({ ok: true, reverify: schoolChanged });
}));

api.put("/me/password", requireAuth, h((req, res) => {
  const b = z.object({ current: z.string(), password: zPassword }).parse(req.body);
  const u = one("SELECT password_hash FROM users WHERE id = ?", req.user!.id)!;
  if (!bcrypt.compareSync(b.current, u.password_hash)) return res.status(400).json({ error: "Senha atual incorreta.", fields: { current: "Senha atual incorreta." } });
  run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", bcrypt.hashSync(b.password, 10), req.user!.id);
  res.json({ ok: true });
}));

// Conta recusada pode corrigir os dados e reenviar para análise.
api.post("/me/resubmit", requireAuth, h((req, res) => {
  if (req.user!.status !== "rejected") return res.status(400).json({ error: "Só é possível reenviar cadastros recusados." });
  run("UPDATE users SET status = 'pending', updated_at = datetime('now') WHERE id = ?", req.user!.id);
  res.json({ ok: true });
}));

api.post("/me/become-family", requireAuth, h((req, res) => {
  run("UPDATE users SET is_family = 1 WHERE id = ?", req.user!.id);
  res.json({ ok: true });
}));

// Cria ou atualiza o perfil profissional (também ativa o papel profissional).
api.put("/me/profile", requireAuth, h((req, res) => {
  const b = zProfessionalFields.extend({ display_name: zText(120, 3), published: z.boolean().default(true) }).parse(req.body);
  if (!one("SELECT id FROM categories WHERE id = ? AND status = 'active'", b.category_id))
    return res.status(400).json({ error: "Categoria inválida.", fields: { category_id: "Categoria inválida." } });
  const u = req.user!;
  const existing = one("SELECT id FROM professional_profiles WHERE user_id = ?", u.id);
  tx(() => {
    if (existing) {
      run(
        `UPDATE professional_profiles SET display_name = ?, profession = ?, category_id = ?, bio = ?, experience = ?, city = ?, neighborhood = ?,
           service_area = ?, whatsapp = ?, contact_hours = ?, price_range = ?, published = ?, updated_at = datetime('now') WHERE id = ?`,
        b.display_name, b.profession, b.category_id, b.bio, b.experience, b.city, b.neighborhood, b.service_area,
        b.whatsapp, b.contact_hours, b.price_range, b.published ? 1 : 0, existing.id
      );
    } else {
      run(
        `INSERT INTO professional_profiles (user_id, slug, display_name, profession, category_id, bio, experience, city, neighborhood, service_area, whatsapp, contact_hours, price_range, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        u.id, uniqueSlug(b.display_name, "professional_profiles"), b.display_name, b.profession, b.category_id, b.bio, b.experience,
        b.city, b.neighborhood, b.service_area, b.whatsapp, b.contact_hours, b.price_range, b.published ? 1 : 0
      );
      run("UPDATE users SET is_professional = 1 WHERE id = ?", u.id);
    }
  });
  res.json({ ok: true });
}));

function myProfile(userId: number) {
  return one("SELECT id FROM professional_profiles WHERE user_id = ?", userId);
}

const zService = z.object({ title: zText(100, 2), description: zText(800), price: zText(60) });

api.post("/me/services", requireAuth, h((req, res) => {
  const p = myProfile(req.user!.id);
  if (!p) return res.status(400).json({ error: "Crie seu perfil profissional primeiro." });
  const b = zService.parse(req.body);
  const r = run("INSERT INTO services (profile_id, title, description, price) VALUES (?, ?, ?, ?)", p.id, b.title, b.description, b.price);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
}));

api.put("/me/services/:id", requireAuth, h((req, res) => {
  const p = myProfile(req.user!.id);
  const b = zService.parse(req.body);
  const r = run("UPDATE services SET title = ?, description = ?, price = ? WHERE id = ? AND profile_id = ?", b.title, b.description, b.price, int(req.params.id), p?.id ?? -1);
  if (!r.changes) return res.status(404).json({ error: "Serviço não encontrado." });
  res.json({ ok: true });
}));

api.delete("/me/services/:id", requireAuth, h((req, res) => {
  const p = myProfile(req.user!.id);
  run("DELETE FROM services WHERE id = ? AND profile_id = ?", int(req.params.id), p?.id ?? -1);
  res.json({ ok: true });
}));

api.patch("/me/quotes/:id", requireAuth, h((req, res) => {
  const { status } = z.object({ status: z.enum(["new", "answered", "closed"]) }).parse(req.body);
  const p = myProfile(req.user!.id);
  const r = run("UPDATE quote_requests SET status = ? WHERE id = ? AND profile_id = ?", status, int(req.params.id), p?.id ?? -1);
  if (!r.changes) return res.status(404).json({ error: "Solicitação não encontrada." });
  res.json({ ok: true });
}));

// ───────────────────────── Ações de membros aprovados ─────────────────────────

function visibleProfileBySlug(slug: string) {
  return one(`SELECT p.id, p.user_id FROM professional_profiles p JOIN users u ON u.id = p.user_id WHERE p.slug = ? AND ${VISIBLE}`, slug);
}

api.post("/professionals/:slug/quotes", requireApproved, formLimiter, h((req, res) => {
  const p = visibleProfileBySlug(String(req.params.slug));
  if (!p) return res.status(404).json({ error: "Perfil não encontrado." });
  if (p.user_id === req.user!.id) return res.status(400).json({ error: "Você não pode pedir orçamento a si mesmo." });
  const { description } = z.object({ description: zText(2000, 10) }).parse(req.body);
  run("INSERT INTO quote_requests (family_id, profile_id, description) VALUES (?, ?, ?)", req.user!.id, p.id, description);
  res.status(201).json({ ok: true });
}));

api.post("/professionals/:slug/reviews", requireApproved, formLimiter, h((req, res) => {
  const p = visibleProfileBySlug(String(req.params.slug));
  if (!p) return res.status(404).json({ error: "Perfil não encontrado." });
  if (p.user_id === req.user!.id) return res.status(400).json({ error: "Você não pode avaliar o próprio perfil." });
  const b = z.object({ rating: z.coerce.number().int().min(1, "Escolha uma nota.").max(5), comment: zText(1000) }).parse(req.body);
  const existing = one("SELECT id, status FROM reviews WHERE author_id = ? AND profile_id = ?", req.user!.id, p.id);
  if (existing) {
    if (existing.status === "hidden") return res.status(403).json({ error: "Sua avaliação foi ocultada pela moderação." });
    run("UPDATE reviews SET rating = ?, comment = ?, updated_at = datetime('now') WHERE id = ?", b.rating, b.comment, existing.id);
  } else {
    run("INSERT INTO reviews (author_id, profile_id, rating, comment) VALUES (?, ?, ?, ?)", req.user!.id, p.id, b.rating, b.comment);
  }
  res.json({ ok: true });
}));

api.delete("/professionals/:slug/reviews/mine", requireAuth, h((req, res) => {
  const p = one("SELECT id FROM professional_profiles WHERE slug = ?", req.params.slug);
  if (p) run("DELETE FROM reviews WHERE author_id = ? AND profile_id = ? AND status = 'visible'", req.user!.id, p.id);
  res.json({ ok: true });
}));

const zPartnership = z.object({
  title: zText(120, 5),
  description: zText(2000, 20),
  categories: zText(200, 2),
  region: zText(120, 2),
  deadline: zText(80),
});

function requireApprovedPro(u: Row) {
  return u.status === "approved" && u.is_professional;
}

api.post("/partnerships", requireApproved, formLimiter, h((req, res) => {
  if (!requireApprovedPro(req.user!)) return res.status(403).json({ error: "Apenas profissionais aprovados podem publicar no mural." });
  const b = zPartnership.parse(req.body);
  const r = run(
    "INSERT INTO partnership_posts (author_id, title, description, categories, region, deadline) VALUES (?, ?, ?, ?, ?, ?)",
    req.user!.id, b.title, b.description, b.categories, b.region, b.deadline
  );
  res.status(201).json({ id: Number(r.lastInsertRowid) });
}));

api.put("/partnerships/:id", requireApproved, h((req, res) => {
  const b = zPartnership.parse(req.body);
  const r = run(
    "UPDATE partnership_posts SET title = ?, description = ?, categories = ?, region = ?, deadline = ? WHERE id = ? AND author_id = ? AND status = 'active'",
    b.title, b.description, b.categories, b.region, b.deadline, int(req.params.id), req.user!.id
  );
  if (!r.changes) return res.status(404).json({ error: "Publicação não encontrada." });
  res.json({ ok: true });
}));

api.post("/partnerships/:id/close", requireAuth, h((req, res) => {
  const r = run("UPDATE partnership_posts SET status = 'closed' WHERE id = ? AND author_id = ? AND status = 'active'", int(req.params.id), req.user!.id);
  if (!r.changes) return res.status(404).json({ error: "Publicação não encontrada." });
  res.json({ ok: true });
}));

api.post("/reports", requireApproved, formLimiter, h((req, res) => {
  const b = z.object({
    target_type: z.enum(["profile", "review", "partnership"]),
    target_id: z.coerce.number().int().positive(),
    reason: zText(1000, 5),
  }).parse(req.body);
  run("INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)", req.user!.id, b.target_type, b.target_id, b.reason);
  res.status(201).json({ ok: true });
}));
