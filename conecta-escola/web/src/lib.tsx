import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// ───────── Cliente HTTP ─────────
export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method || (opts.body ? "POST" : "GET"),
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "Sem conexão com o servidor. Verifique a rede e tente novamente.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || "Erro inesperado.", data.fields || {});
  return data as T;
}

// Hook simples de carregamento de dados.
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    setLoading(true);
    setError(null);
    api<T>(path)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}

// ───────── Sessão ─────────
export type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  school_id: number | null;
  is_family: boolean;
  is_professional: boolean;
  is_admin: boolean;
  status: "pending" | "approved" | "rejected" | "suspended";
  status_reason: string;
};

type AuthCtx = { user: User | null; ready: boolean; refresh: () => Promise<void>; setUser: (u: User | null) => void; logout: () => Promise<void> };
const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: User | null }>("/auth/me");
      setUser(r.user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);
  return <Ctx.Provider value={{ user, ready, refresh, setUser, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);

// ───────── Dados do site (escola) ─────────
type Site = { school: { id: number; name: string; city: string } | null; publicUrl: string };
const SiteCtx = createContext<Site>({ school: null, publicUrl: "" });
export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<Site>({ school: null, publicUrl: "" });
  useEffect(() => {
    api<Site>("/site").then(setSite).catch(() => {});
  }, []);
  return <SiteCtx.Provider value={site}>{children}</SiteCtx.Provider>;
}
export const useSite = () => useContext(SiteCtx);

// ───────── Utilidades ─────────
export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export function formatDate(s: string) {
  // SQLite grava em UTC sem fuso: "2026-11-02 14:00:00"
  const d = new Date(s.replace(" ", "T") + "Z");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatDateTime(s: string) {
  const d = new Date(s.replace(" ", "T") + "Z");
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function whatsappLink(phone: string, text: string) {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/55${d}?text=${encodeURIComponent(text)}`;
}

export const STATUS_LABEL: Record<User["status"], string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  suspended: "Suspenso",
};

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Conecta Escola` : "Conecta Escola";
  }, [title]);
}
