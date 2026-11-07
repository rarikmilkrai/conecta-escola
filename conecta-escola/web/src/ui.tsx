import { useEffect, useState, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle, ArrowRight, BookOpen, Bus, Cake, CheckCircle2, Droplet, Flag, Flower2, Laptop, Loader2, MapPin, Paintbrush,
  PartyPopper, Sparkles, Star, Tag, X, Zap,
} from "lucide-react";
import { api, ApiError, initials, STATUS_LABEL, useAuth, type User } from "./lib";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Conecta Escola, página inicial">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand font-display text-sm font-bold text-white">C</span>
      <span className={`font-display text-[15px] font-bold ${light ? "text-white" : "text-ink"}`}>Conecta Escola</span>
    </Link>
  );
}

const ICONS: Record<string, typeof Tag> = {
  zap: Zap, droplet: Droplet, paintbrush: Paintbrush, flower: Flower2, book: BookOpen, laptop: Laptop,
  sparkles: Sparkles, cake: Cake, party: PartyPopper, bus: Bus, tag: Tag,
};
export const ICON_OPTIONS = Object.keys(ICONS);

export function CategoryIcon({ icon, className = "" }: { icon?: string; className?: string }) {
  const I = ICONS[icon || "tag"] || Tag;
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mustard-light text-ink/70 ${className}`}>
      <I size={16} strokeWidth={1.8} />
    </span>
  );
}

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-soft" role="status">
      <Loader2 className="animate-spin" size={18} /> {label}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info" | "warn"; children: ReactNode }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-brand/20 bg-brand-50 text-brand-dark",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
  }[kind];
  const Icon = kind === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${styles}`} role={kind === "error" ? "alert" : "status"}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError | Error; onRetry?: () => void }) {
  return (
    <div className="py-10">
      <Alert>
        {error.message}{" "}
        {onRetry && (
          <button onClick={onRetry} className="ml-1 font-bold underline">
            Tentar novamente
          </button>
        )}
      </Alert>
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-mustard-light text-ink/60">
        <Sparkles size={20} />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <p className="mt-1.5 max-w-md text-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

type FieldProps = { label: string; error?: string; hint?: string; children: ReactNode; id: string };
export function Field({ label, error, hint, children, id }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-mute">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ error, ...p }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input {...p} aria-invalid={!!error} aria-describedby={error ? `${p.id}-err` : undefined} className={`input ${error ? "input-error" : ""} ${p.className || ""}`} />;
}
export function Textarea({ error, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return <textarea rows={4} {...p} aria-invalid={!!error} aria-describedby={error ? `${p.id}-err` : undefined} className={`input ${error ? "input-error" : ""} ${p.className || ""}`} />;
}

export function StatusBadge({ status }: { status: User["status"] }) {
  const s = {
    pending: "bg-amber-100 text-amber-900",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    suspended: "bg-zinc-200 text-zinc-800",
  }[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${s}`}>{STATUS_LABEL[status]}</span>;
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? "fill-mustard-dark text-mustard-dark" : "text-line"} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Nota">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          type="button"
          key={i}
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} estrela${i > 1 ? "s" : ""}`}
          onClick={() => onChange(i)}
          className="rounded p-0.5"
        >
          <Star size={26} className={i <= value ? "fill-mustard-dark text-mustard-dark" : "text-line"} />
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-pop sm:max-w-lg sm:rounded-3xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-soft hover:bg-cream-2" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export type ProCard = {
  id: number;
  slug: string;
  display_name: string;
  profession: string;
  bio: string;
  city: string;
  neighborhood: string;
  price_range: string;
  category_name: string | null;
  rating: number | null;
  review_count: number;
};

export function ProfessionalCard({ p }: { p: ProCard }) {
  const place = [p.neighborhood, p.city].filter(Boolean).join(", ");
  return (
    <article className="card flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-pop">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-light font-display text-sm font-bold text-brand">{initials(p.display_name)}</span>
        <div className="min-w-0">
          {p.category_name && <p className="eyebrow !text-[10px] !tracking-[0.1em]">{p.category_name}</p>}
          <h3 className="truncate font-display text-[15px] font-bold">{p.display_name}</h3>
          <p className="truncate text-xs text-ink-soft">{p.profession}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-ink-soft">{p.bio}</p>
      {p.review_count > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
          <Stars value={p.rating || 0} size={12} /> {p.rating?.toFixed(1)} ({p.review_count})
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs">
        <span className="flex min-w-0 items-center gap-1 text-ink-soft">
          {place && (
            <>
              <MapPin size={12} className="shrink-0" /> <span className="truncate">{place}</span>
            </>
          )}
        </span>
        {p.price_range && <span className="shrink-0 font-bold text-brand">{p.price_range}</span>}
      </div>
      <Link to={`/profissionais/${p.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline">
        Ver perfil <ArrowRight size={13} />
      </Link>
    </article>
  );
}

// Botão de denúncia: só membros aprovados conseguem enviar.
export function ReportButton({ type, id, label = "Denunciar" }: { type: "profile" | "review" | "partnership"; id: number; label?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<{ err?: string; ok?: boolean; busy?: boolean }>({});
  if (!user || user.status !== "approved") return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      await api("/reports", { body: { target_type: type, target_id: id, reason } });
      setState({ ok: true });
    } catch (e: any) {
      setState({ err: e.message });
    }
  };
  return (
    <>
      <button onClick={() => { setOpen(true); setState({}); setReason(""); }} className="inline-flex items-center gap-1 text-xs text-ink-mute hover:text-red-700">
        <Flag size={12} /> {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Denunciar conteúdo">
        {state.ok ? (
          <div className="space-y-4">
            <Alert kind="success">Denúncia enviada. A equipe da escola vai analisar.</Alert>
            <button className="btn-ghost w-full" onClick={() => setOpen(false)}>Fechar</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {state.err && <Alert>{state.err}</Alert>}
            <Field id="report-reason" label="O que está acontecendo?">
              <Textarea id="report-reason" required minLength={5} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o problema" />
            </Field>
            <button className="btn-primary w-full" disabled={state.busy}>{state.busy ? "Enviando…" : "Enviar denúncia"}</button>
          </form>
        )}
      </Modal>
    </>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <section className="border-b border-line bg-gradient-to-br from-cream-2 via-cream to-mustard-light/40">
      <div className="container-x py-10 sm:py-14">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-ink-soft">{children}</div>}
      </div>
    </section>
  );
}
