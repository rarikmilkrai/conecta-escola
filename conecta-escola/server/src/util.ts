import type { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { one } from "./db.js";

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "perfil";
}

export function uniqueSlug(base: string, table: string, ignoreId?: number) {
  let slug = slugify(base);
  let i = 1;
  while (one(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`, slug, ignoreId ?? -1)) {
    i += 1;
    slug = `${slugify(base)}-${i}`;
  }
  return slug;
}

export const digits = (s: string) => s.replace(/\D/g, "");

export const zPhone = z
  .string()
  .transform(digits)
  .refine((d) => /^\d{10,11}$/.test(d), "Telefone deve ter DDD + número (10 ou 11 dígitos).");

export const zOptPhone = z
  .string()
  .optional()
  .default("")
  .transform(digits)
  .refine((d) => d === "" || /^\d{10,11}$/.test(d), "WhatsApp deve ter DDD + número.");

export const zText = (max: number, min = 0) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .min(min, min > 1 ? `Mínimo de ${min} caracteres.` : "Campo obrigatório.");

// Envolve handlers assíncronos/síncronos e transforma erros em respostas JSON.
export const h =
  (fn: (req: Request, res: Response) => any) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const r = fn(req, res);
      if (r && typeof r.catch === "function") r.catch(next);
    } catch (e) {
      next(e);
    }
  };

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const i of err.issues) fields[i.path.join(".") || "_"] ??= i.message;
    return res.status(400).json({ error: "Verifique os campos destacados.", fields });
  }
  // Nunca registrar corpo da requisição (pode conter senha).
  console.error("[erro]", err?.message || err);
  res.status(500).json({ error: "Erro inesperado. Tente novamente." });
}

export const int = (v: unknown, def = 0) => {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : def;
};
