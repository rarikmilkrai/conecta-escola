import { useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { api, maskPhone, useAuth, usePageTitle, useSite, type User } from "../lib";
import { Alert, Field, Input } from "../ui";

function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-gradient-to-br from-cream-2 via-cream to-mustard-light/50">
      <div className="container-x flex justify-center py-12 sm:py-16">
        <div className="card w-full max-w-md p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ id, value, onChange, error, autoComplete }: { id: string; value: string; onChange: (v: string) => void; error?: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} error={error} autoComplete={autoComplete} required className="pr-11" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-mute hover:text-ink" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

const safeBack = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/minha-conta");

export function Cadastro() {
  usePageTitle("Criar conta");
  const { user, setUser } = useAuth();
  const { school } = useSite();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const wantsPro = params.get("profissional") === "1";
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", consent: false });
  const [st, setSt] = useState<{ busy?: boolean; err?: string; fields?: Record<string, string> }>({});
  if (user) return <Navigate to="/minha-conta" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSt({ busy: true });
    try {
      const r = await api<{ user: User }>("/auth/register", { body: f });
      setUser(r.user);
      nav(wantsPro ? "/minha-conta?aba=perfil&novo=1" : "/minha-conta?novo=1");
    } catch (e: any) {
      setSt({ err: e.message, fields: e.fields });
    }
  };
  const fe = st.fields || {};

  return (
    <AuthShell
      title="Criar conta"
      subtitle={<>Leva menos de um minuto. {school ? <>Sua conta fica vinculada à <b>{school.name}</b> e</> : "Sua conta"} passa por uma aprovação rápida da equipe da escola.</>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {st.err && <Alert>{st.err}</Alert>}
        <Field id="c-name" label="Nome completo" error={fe.name}>
          <Input id="c-name" autoComplete="name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={fe.name} />
        </Field>
        <Field id="c-email" label="E-mail" error={fe.email}>
          <Input id="c-email" type="email" autoComplete="email" inputMode="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={fe.email} />
        </Field>
        <Field id="c-phone" label="Telefone / WhatsApp" error={fe.phone}>
          <Input id="c-phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(11) 91234-5678" required value={f.phone} onChange={(e) => setF({ ...f, phone: maskPhone(e.target.value) })} error={fe.phone} />
        </Field>
        <Field id="c-pass" label="Crie uma senha" error={fe.password} hint="Mínimo de 8 caracteres.">
          <PasswordInput id="c-pass" value={f.password} onChange={(v) => setF({ ...f, password: v })} error={fe.password} autoComplete="new-password" />
        </Field>
        <div>
          <label className="flex items-start gap-2.5 text-sm text-ink-soft">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-brand" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
            <span>
              Li e aceito os <Link to="/privacidade" target="_blank" className="link">termos de uso e a política de privacidade</Link>.
            </span>
          </label>
          {fe.consent && <p className="mt-1 text-xs font-medium text-red-700">{fe.consent}</p>}
        </div>
        <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? "Criando conta…" : "Criar conta"}</button>
        <p className="text-center text-xs text-ink-soft">
          É profissional? Depois de criar a conta, é só preencher seu perfil em <b>Minha conta</b>.
        </p>
      </form>
      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-soft">
        Já tem conta? <Link to="/entrar" className="link">Entrar</Link>
      </p>
    </AuthShell>
  );
}

export function Entrar() {
  usePageTitle("Entrar");
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const back = safeBack(params.get("voltar"));
  const [f, setF] = useState({ email: "", password: "" });
  const [st, setSt] = useState<{ busy?: boolean; err?: string }>({});
  if (user) return <Navigate to={back} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSt({ busy: true });
    try {
      const r = await api<{ user: User }>("/auth/login", { body: f });
      setUser(r.user);
      nav(r.user.is_admin && back === "/minha-conta" ? "/admin" : back, { replace: true });
    } catch (e: any) {
      setSt({ err: e.message });
    }
  };

  return (
    <AuthShell title="Entrar" subtitle="Acesse sua conta do Conecta Escola.">
      <form onSubmit={submit} className="space-y-4">
        {st.err && <Alert>{st.err}</Alert>}
        <Field id="l-email" label="E-mail">
          <Input id="l-email" type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field id="l-pass" label="Senha">
          <PasswordInput id="l-pass" value={f.password} onChange={(v) => setF({ ...f, password: v })} autoComplete="current-password" />
        </Field>
        <div className="text-right">
          <Link to="/recuperar-senha" className="text-xs font-bold text-brand hover:underline">Esqueci minha senha</Link>
        </div>
        <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? "Entrando…" : "Entrar"}</button>
      </form>
      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-soft">
        Ainda não tem conta? <Link to="/cadastro" className="link">Criar conta</Link>
      </p>
    </AuthShell>
  );
}

export function RecuperarSenha() {
  usePageTitle("Recuperar senha");
  const [params] = useSearchParams();
  const token = params.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [st, setSt] = useState<{ busy?: boolean; err?: string; ok?: boolean; field?: string }>({});

  if (token) {
    return (
      <AuthShell title="Definir nova senha" subtitle="Escolha uma nova senha para sua conta.">
        {st.ok ? (
          <div className="space-y-4">
            <Alert kind="success">Senha alterada com sucesso.</Alert>
            <Link to="/entrar" className="btn-primary w-full">Entrar</Link>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setSt({ busy: true });
              try {
                await api("/auth/reset", { body: { token, password } });
                setSt({ ok: true });
              } catch (e: any) {
                setSt({ err: e.message, field: e.fields?.password });
              }
            }}
          >
            {st.err && <Alert>{st.err}</Alert>}
            <Field id="n-pass" label="Nova senha" hint="Mínimo de 8 caracteres." error={st.field}>
              <PasswordInput id="n-pass" value={password} onChange={setPassword} error={st.field} autoComplete="new-password" />
            </Field>
            <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? "Salvando…" : "Salvar nova senha"}</button>
          </form>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Recuperar senha" subtitle="Informe o e-mail da sua conta. A equipe da escola vai gerar um link seguro para você criar uma nova senha.">
      {st.ok ? (
        <div className="space-y-4">
          <Alert kind="success">
            Pedido registrado. Se existir uma conta com este e-mail, a equipe da escola entrará em contato pelo seu telefone com o link para criar uma nova senha.
          </Alert>
          <Link to="/entrar" className="btn-ghost w-full">Voltar para entrar</Link>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSt({ busy: true });
            try {
              await api("/auth/forgot", { body: { email } });
              setSt({ ok: true });
            } catch (e: any) {
              setSt({ err: e.message });
            }
          }}
        >
          {st.err && <Alert>{st.err}</Alert>}
          <Field id="f-email" label="E-mail">
            <Input id="f-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? "Enviando…" : "Solicitar nova senha"}</button>
        </form>
      )}
    </AuthShell>
  );
}
