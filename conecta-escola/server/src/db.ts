import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

const DATA_DIR = process.env.DATA_DIR || path.resolve("data");
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, "conecta-escola.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

// Migrações versionadas: cada item roda uma única vez, em ordem.
const migrations: string[] = [
  `
  CREATE TABLE schools (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT 'tag',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive'))
  );
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    school_id INTEGER REFERENCES schools(id),
    is_family INTEGER NOT NULL DEFAULT 0,
    is_professional INTEGER NOT NULL DEFAULT 0,
    is_admin INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
    status_reason TEXT NOT NULL DEFAULT '',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TEXT,
    consent_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE professional_profiles (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    profession TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    bio TEXT NOT NULL DEFAULT '',
    experience TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    neighborhood TEXT NOT NULL DEFAULT '',
    service_area TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '',
    contact_hours TEXT NOT NULL DEFAULT '',
    price_range TEXT NOT NULL DEFAULT '',
    published INTEGER NOT NULL DEFAULT 1,
    hidden_by_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE services (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE reviews (
    id INTEGER PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (author_id, profile_id)
  );
  CREATE TABLE quote_requests (
    id INTEGER PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','answered','closed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE partnership_posts (
    id INTEGER PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    categories TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL DEFAULT '',
    deadline TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','hidden')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE reports (
    id INTEGER PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('profile','review','partnership')),
    target_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
    decision TEXT NOT NULL DEFAULT '',
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE support_requests (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE password_resets (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','issued','used')),
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE admin_log (
    id INTEGER PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_users_status ON users(status);
  CREATE INDEX idx_profiles_category ON professional_profiles(category_id);
  CREATE INDEX idx_reviews_profile ON reviews(profile_id);
  `,
];

db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))");
const current = (db.prepare("SELECT COALESCE(MAX(version),0) AS v FROM schema_migrations").get() as { v: number }).v;
migrations.forEach((sql, i) => {
  const version = i + 1;
  if (version <= current) return;
  db.exec("BEGIN");
  try {
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(version);
    db.exec("COMMIT");
    console.log(`[db] migração ${version} aplicada`);
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
});

// Dados iniciais: apenas escola(s), categorias e o administrador. Nada de perfis fictícios.
const DEFAULT_CATEGORIES: [string, string, string, string][] = [
  ["Elétrica", "eletrica", "Instalações, reparos e manutenção elétrica", "zap"],
  ["Hidráulica", "hidraulica", "Vazamentos, encanamento e instalações", "droplet"],
  ["Pintura", "pintura", "Pintura residencial, textura e acabamentos", "paintbrush"],
  ["Jardinagem", "jardinagem", "Cuidado de jardins, poda e paisagismo", "flower"],
  ["Aulas Particulares", "aulas-particulares", "Reforço escolar, idiomas, música e preparatórios", "book"],
  ["Tecnologia", "tecnologia", "Computadores, fotografia, sites e redes sociais", "laptop"],
  ["Beleza", "beleza", "Cabelo, manicure, estética e bem-estar", "sparkles"],
  ["Alimentação", "alimentacao", "Bolos, doces, marmitas e buffet", "cake"],
  ["Festas e Eventos", "festas-e-eventos", "Decoração, recreação e animação", "party"],
  ["Transporte", "transporte", "Transporte escolar, fretes e mudanças", "bus"],
];

export function seed() {
  const schoolCount = (db.prepare("SELECT COUNT(*) AS c FROM schools").get() as { c: number }).c;
  if (schoolCount === 0) {
    const names = (process.env.SCHOOLS || "E.E VILA SÃO JOAQUIM II").split(";").map((s) => s.trim()).filter(Boolean);
    const city = process.env.SCHOOL_CITY || "Cotia";
    const ins = db.prepare("INSERT INTO schools (name, city) VALUES (?, ?)");
    names.forEach((n) => ins.run(n, city));
    console.log(`[seed] escolas: ${names.join(", ")}`);
  }
  const catCount = (db.prepare("SELECT COUNT(*) AS c FROM categories").get() as { c: number }).c;
  if (catCount === 0) {
    const ins = db.prepare("INSERT INTO categories (name, slug, description, icon) VALUES (?, ?, ?, ?)");
    DEFAULT_CATEGORIES.forEach((c) => ins.run(...c));
    console.log(`[seed] ${DEFAULT_CATEGORIES.length} categorias criadas`);
  }
  const adminCount = (db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_admin = 1").get() as { c: number }).c;
  if (adminCount === 0) {
    const email = process.env.ADMIN_EMAIL || "admin@conectaescola.local";
    const password = process.env.ADMIN_PASSWORD || "conecta123";
    const school = db.prepare("SELECT id FROM schools ORDER BY id LIMIT 1").get() as { id: number };
    db.prepare(
      `INSERT INTO users (name, email, password_hash, school_id, is_admin, status, consent_at)
       VALUES ('Administrador', ?, ?, ?, 1, 'approved', datetime('now'))`
    ).run(email, bcrypt.hashSync(password, 10), school.id);
    console.log(`[seed] administrador criado: ${email} (troque a senha em Minha conta)`);
  }
}

export type Row = Record<string, any>;
export const one = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as Row | undefined;
export const all = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as Row[];
export const run = (sql: string, ...p: any[]) => db.prepare(sql).run(...p);

export function tx<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
