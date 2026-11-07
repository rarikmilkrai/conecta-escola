import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Copy, ExternalLink, QrCode, RefreshCw } from "lucide-react";
import { api, formatDateTime, maskPhone, useApi, usePageTitle, whatsappLink, type User } from "../lib";
import { Alert, Empty, ErrorState, Field, ICON_OPTIONS, CategoryIcon, Input, Modal, Spinner, StatusBadge, Textarea } from "../ui";

type Stats = Record<string, number>;

export default function Admin() {
  usePageTitle("Administração");
  const [params, setParams] = useSearchParams();
  const tab = params.get("aba") || "painel";
  const stats = useApi<Stats>("/admin/stats", [tab]);
  const s = stats.data || {};
  const tabs: [string, string, number?][] = [
    ["painel", "Painel"],
    ["cadastros", "Cadastros", s.users_pending],
    ["denuncias", "Denúncias", s.reports_open],
    ["avaliacoes", "Avaliações"],
    ["parcerias", "Parcerias"],
    ["suporte", "Suporte", s.support_open],
    ["senhas", "Senhas", s.resets_open],
    ["escolas", "Escolas"],
    ["categorias", "Categorias"],
    ["registro", "Registro"],
  ];
  return (
    <div className="container-x py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Área restrita</p>
          <h1 className="text-3xl font-extrabold">Administração</h1>
        </div>
        <a href="/qr" target="_blank" className="btn-ghost"><QrCode size={16} /> Abrir QR Code da apresentação</a>
      </div>
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {tabs.map(([id, label, n]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setParams({ aba: id })}
            className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-bold ${tab === id ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"}`}>
            {label}
            {!!n && <span className="rounded-full bg-coral px-1.5 text-[10px] text-white">{n}</span>}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "painel" && <Dashboard stats={stats} go={(t) => setParams({ aba: t })} />}
        {tab === "cadastros" && <Users onChange={stats.reload} />}
        {tab === "denuncias" && <Reports onChange={stats.reload} />}
        {tab === "avaliacoes" && <Reviews />}
        {tab === "parcerias" && <Partnerships />}
        {tab === "suporte" && <Support onChange={stats.reload} />}
        {tab === "senhas" && <Resets onChange={stats.reload} />}
        {tab === "escolas" && <Schools />}
        {tab === "categorias" && <Categories />}
        {tab === "registro" && <Log />}
      </div>
    </div>
  );
}

function Dashboard({ stats, go }: { stats: ReturnType<typeof useApi<Stats>>; go: (t: string) => void }) {
  if (stats.loading && !stats.data) return <Spinner />;
  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.reload} />;
  const s = stats.data!;
  const cards: [string, number, string?][] = [
    ["Cadastros pendentes", s.users_pending, "cadastros"],
    ["Membros aprovados", s.users_approved, "cadastros"],
    ["Contas cadastradas", s.users_total, "cadastros"],
    ["Profissionais visíveis", s.professionals],
    ["Pedidos de orçamento", s.quotes],
    ["Avaliações publicadas", s.reviews, "avaliacoes"],
    ["Parcerias ativas", s.partnerships, "parcerias"],
    ["Denúncias abertas", s.reports_open, "denuncias"],
    ["Mensagens de suporte", s.support_open, "suporte"],
  ];
  return (
    <div>
      <div className="mb-4 flex justify-end"><button onClick={stats.reload} className="btn-ghost btn-sm"><RefreshCw size={13} /> Atualizar</button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, n, t]) => (
          <button key={label} onClick={() => t && go(t)} disabled={!t} className="card p-5 text-left transition enabled:hover:border-brand/30">
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-1 font-display text-4xl font-extrabold text-brand">{n}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

type AdminUser = User & { school_name: string; created_at: string; reviewed_at: string | null; reviewed_by_name: string | null; profile_slug: string | null; profession: string | null; hidden_by_admin: number | null };

function Users({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const list = useApi<AdminUser[]>(`/admin/users?status=${status}&q=${encodeURIComponent(query)}`);
  const [decide, setDecide] = useState<{ u: AdminUser; status: string } | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  const act = async (u: AdminUser, st: string, r = "") => {
    setErr("");
    try {
      await api(`/admin/users/${u.id}/decision`, { body: { status: st, reason: r } });
      setDecide(null);
      list.reload();
      onChange();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select aria-label="Filtrar por status" className="input sm:max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Pendentes</option>
          <option value="approved">Aprovados</option>
          <option value="rejected">Recusados</option>
          <option value="suspended">Suspensos</option>
          <option value="">Todos</option>
        </select>
        <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(q); }}>
          <input aria-label="Buscar" className="input" placeholder="Buscar por nome, e-mail ou escola" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-ghost">Buscar</button>
        </form>
      </div>
      {err && <div className="mt-4"><Alert>{err}</Alert></div>}
      <div className="mt-5">
        {list.loading && !list.data ? <Spinner /> : list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data?.length ? (
          <Empty title={status === "pending" ? "Nenhum cadastro aguardando análise" : "Nenhum usuário encontrado"} />
        ) : (
          <ul className="space-y-3">
            {list.data.map((u) => (
              <li key={u.id} className="card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold">{u.name} <StatusBadge status={u.status} />
                      {u.is_professional ? <span className="rounded-full bg-mustard-light px-2 py-0.5 text-[11px]">Profissional{u.profession ? ` · ${u.profession}` : ""}</span> : null}
                      {u.is_family ? <span className="rounded-full bg-cream-2 px-2 py-0.5 text-[11px]">Família</span> : null}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">{u.email} · {maskPhone(u.phone)} · {u.school_name}</p>
                    <p className="mt-1 text-xs text-ink-mute">
                      Cadastro em {formatDateTime(u.created_at)}
                      {u.reviewed_at && ` · Última decisão ${formatDateTime(u.reviewed_at)} por ${u.reviewed_by_name}`}
                    </p>
                    {u.status_reason && <p className="mt-1 text-xs text-red-700">Motivo: {u.status_reason}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {u.phone && <a className="btn-ghost btn-sm" target="_blank" rel="noreferrer" href={whatsappLink(u.phone, `Olá, ${u.name.split(" ")[0]}! Aqui é da equipe do Conecta Escola.`)}>WhatsApp</a>}
                    {u.profile_slug && u.status === "approved" && <Link className="btn-ghost btn-sm" to={`/profissionais/${u.profile_slug}`} target="_blank"><ExternalLink size={12} /> Perfil</Link>}
                    {u.status !== "approved" && <button className="btn-primary btn-sm" onClick={() => act(u, "approved")}><Check size={13} /> Aprovar</button>}
                    {u.status === "pending" && <button className="btn-ghost btn-sm" onClick={() => { setReason(""); setDecide({ u, status: "rejected" }); }}>Pedir correção / Recusar</button>}
                    {u.status === "approved" && <button className="btn-danger btn-sm" onClick={() => { setReason(""); setDecide({ u, status: "suspended" }); }}>Suspender</button>}
                    {u.profile_slug && (
                      <button className="btn-ghost btn-sm" onClick={async () => { await api(`/admin/profiles/${u.id}/visibility`, { body: { hidden: !u.hidden_by_admin, reason: "" } }); list.reload(); }}>
                        {u.hidden_by_admin ? "Mostrar perfil" : "Ocultar perfil"}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Modal open={!!decide} onClose={() => setDecide(null)} title={decide?.status === "suspended" ? "Suspender conta" : "Recusar / pedir correção"}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); decide && act(decide.u, decide.status, reason); }}>
          {err && <Alert>{err}</Alert>}
          <Field id="dec-reason" label="Motivo ou instrução" hint="A pessoa verá esta mensagem em Minha conta.">
            <Textarea id="dec-reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: Não encontramos seu vínculo. Informe o nome do aluno e a turma no seu nome de cadastro." />
          </Field>
          <button className="btn-primary w-full">Confirmar</button>
        </form>
      </Modal>
    </div>
  );
}

function Reports({ onChange }: { onChange: () => void }) {
  const list = useApi<any[]>("/admin/reports");
  const [resolve, setResolve] = useState<{ r: any; action: "hide" | "dismiss" } | null>(null);
  const [decision, setDecision] = useState("");
  const [err, setErr] = useState("");
  const typeLabel: Record<string, string> = { profile: "Perfil", review: "Avaliação", partnership: "Parceria" };
  if (list.loading && !list.data) return <Spinner />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  return (
    <>
      {!list.data?.length ? <Empty title="Nenhuma denúncia recebida" /> : (
        <ul className="space-y-3">
          {list.data.map((r) => (
            <li key={r.id} className={`card p-5 ${r.status === "resolved" ? "opacity-70" : ""}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-coral">{typeLabel[r.target_type]} {r.target?.hidden ? "· oculto" : ""}</p>
                  <p className="mt-1 font-bold">
                    {r.target ? (r.target.slug ? <Link to={`/profissionais/${r.target.slug}`} target="_blank" className="hover:text-brand">{r.target.label || "(sem texto)"}</Link> : r.target.label) : "Conteúdo removido"}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">“{r.reason}”</p>
                  <p className="mt-1 text-xs text-ink-mute">Denunciado por {r.reporter_name} em {formatDateTime(r.created_at)}</p>
                  {r.status === "resolved" && <p className="mt-1 text-xs text-brand">{r.decision} · {r.resolved_by_name}, {formatDateTime(r.resolved_at)}</p>}
                </div>
                {r.status === "open" && (
                  <div className="flex shrink-0 gap-2">
                    <button className="btn-danger btn-sm" onClick={() => { setDecision(""); setErr(""); setResolve({ r, action: "hide" }); }}>Ocultar conteúdo</button>
                    <button className="btn-ghost btn-sm" onClick={() => { setDecision(""); setErr(""); setResolve({ r, action: "dismiss" }); }}>Manter</button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!resolve} onClose={() => setResolve(null)} title={resolve?.action === "hide" ? "Ocultar conteúdo denunciado" : "Manter conteúdo"}>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api(`/admin/reports/${resolve!.r.id}/resolve`, { body: { action: resolve!.action, decision } });
            setResolve(null); list.reload(); onChange();
          } catch (e: any) { setErr(e.message); }
        }}>
          {err && <Alert>{err}</Alert>}
          <Field id="rep-dec" label="Justificativa da decisão"><Textarea id="rep-dec" required value={decision} onChange={(e) => setDecision(e.target.value)} /></Field>
          <button className="btn-primary w-full">Confirmar</button>
        </form>
      </Modal>
    </>
  );
}

function Reviews() {
  const list = useApi<any[]>("/admin/reviews");
  if (list.loading && !list.data) return <Spinner />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (!list.data?.length) return <Empty title="Nenhuma avaliação ainda" />;
  return (
    <ul className="space-y-3">
      {list.data.map((r) => (
        <li key={r.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm"><b>{r.author_name}</b> avaliou <Link to={`/profissionais/${r.slug}`} target="_blank" className="font-bold text-brand">{r.display_name}</Link> com {r.rating}★</p>
            {r.comment && <p className="mt-1 text-sm text-ink-soft">“{r.comment}”</p>}
            <p className="mt-1 text-xs text-ink-mute">{formatDateTime(r.created_at)} · {r.status === "visible" ? "Visível" : "Oculta"}</p>
          </div>
          <button className={r.status === "visible" ? "btn-danger btn-sm" : "btn-ghost btn-sm"} onClick={async () => {
            await api(`/admin/reviews/${r.id}/status`, { body: { status: r.status === "visible" ? "hidden" : "visible", reason: "" } });
            list.reload();
          }}>{r.status === "visible" ? "Ocultar" : "Restaurar"}</button>
        </li>
      ))}
    </ul>
  );
}

function Partnerships() {
  const list = useApi<any[]>("/admin/partnerships");
  const label: Record<string, string> = { active: "Ativa", closed: "Encerrada", hidden: "Oculta" };
  if (list.loading && !list.data) return <Spinner />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (!list.data?.length) return <Empty title="Nenhuma publicação no mural" />;
  return (
    <ul className="space-y-3">
      {list.data.map((p) => (
        <li key={p.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">{p.title}</p>
            <p className="text-xs text-ink-mute">{p.author_name} · {p.region} · {formatDateTime(p.created_at)} · {label[p.status]}</p>
          </div>
          <button className={p.status === "hidden" ? "btn-ghost btn-sm" : "btn-danger btn-sm"} onClick={async () => {
            await api(`/admin/partnerships/${p.id}/status`, { body: { status: p.status === "hidden" ? "active" : "hidden", reason: "" } });
            list.reload();
          }}>{p.status === "hidden" ? "Restaurar" : "Ocultar"}</button>
        </li>
      ))}
    </ul>
  );
}

function Support({ onChange }: { onChange: () => void }) {
  const list = useApi<any[]>("/admin/support");
  if (list.loading && !list.data) return <Spinner />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (!list.data?.length) return <Empty title="Nenhuma mensagem de suporte" />;
  return (
    <ul className="space-y-3">
      {list.data.map((m) => (
        <li key={m.id} className={`card p-5 ${m.status === "closed" ? "opacity-60" : ""}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="min-w-0">
              <p className="font-bold">{m.subject}</p>
              <p className="text-xs text-ink-mute">{m.name} · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a> · {formatDateTime(m.created_at)}</p>
              <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{m.message}</p>
            </div>
            <button className="btn-ghost btn-sm shrink-0 self-start" onClick={async () => {
              await api(`/admin/support/${m.id}/status`, { body: { status: m.status === "open" ? "closed" : "open" } });
              list.reload(); onChange();
            }}>{m.status === "open" ? "Marcar como resolvida" : "Reabrir"}</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Resets({ onChange }: { onChange: () => void }) {
  const list = useApi<any[]>("/admin/password-resets");
  const [link, setLink] = useState<{ url: string; name: string; phone: string } | null>(null);
  const [copied, setCopied] = useState(false);
  if (list.loading && !list.data) return <Spinner />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  return (
    <>
      <div className="mb-4"><Alert kind="info">Como o projeto não envia e-mails, a recuperação de senha é feita assim: a pessoa pede pelo site, você confere a identidade, gera um link de uso único (válido por 2 horas) e envia para ela pelo WhatsApp.</Alert></div>
      {!list.data?.length ? <Empty title="Nenhum pedido de nova senha" /> : (
        <ul className="space-y-3">
          {list.data.map((r) => (
            <li key={r.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">{r.name}</p>
                <p className="text-xs text-ink-mute">{r.email} · {maskPhone(r.phone)} · pedido em {formatDateTime(r.created_at)}{r.status === "issued" && " · link já gerado"}</p>
              </div>
              <button className="btn-primary btn-sm" onClick={async () => {
                const { token } = await api<{ token: string }>(`/admin/password-resets/${r.id}/issue`, { method: "POST" });
                setCopied(false);
                setLink({ url: `${location.origin}/recuperar-senha?token=${token}`, name: r.name, phone: r.phone });
                list.reload(); onChange();
              }}>{r.status === "issued" ? "Gerar novo link" : "Gerar link"}</button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!link} onClose={() => setLink(null)} title="Link de nova senha">
        {link && (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">Envie este link para <b>{link.name}</b>. Ele funciona uma única vez e expira em 2 horas.</p>
            <div className="break-all rounded-xl bg-cream p-3 font-mono text-xs">{link.url}</div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(link.url); setCopied(true); }}><Copy size={13} /> {copied ? "Copiado!" : "Copiar"}</button>
              <a className="btn btn-sm bg-[#1f9d55] text-white" target="_blank" rel="noreferrer" href={whatsappLink(link.phone, `Olá, ${link.name.split(" ")[0]}! Aqui está o link para criar sua nova senha no Conecta Escola: ${link.url}`)}>Enviar por WhatsApp</a>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Schools() {
  const list = useApi<any[]>("/admin/schools");
  const [edit, setEdit] = useState<any | null>(null);
  const [f, setF] = useState({ name: "", city: "", status: "active" });
  const [err, setErr] = useState("");
  const open = (s: any) => { setErr(""); setF({ name: s?.name || "", city: s?.city || "", status: s?.status || "active" }); setEdit(s || {}); };
  if (list.loading && !list.data) return <Spinner />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  return (
    <>
      <div className="mb-4 flex justify-end"><button className="btn-primary btn-sm" onClick={() => open(null)}>Nova escola</button></div>
      <ul className="space-y-2">
        {list.data!.map((s) => (
          <li key={s.id} className="card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold">{s.name} {s.status === "inactive" && <span className="text-xs font-normal text-ink-mute">(inativa)</span>}</p>
              <p className="text-xs text-ink-mute">{s.city} · {s.members} membros</p>
            </div>
            <button className="btn-ghost btn-sm" onClick={() => open(s)}>Editar</button>
          </li>
        ))}
      </ul>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar escola" : "Nova escola"}>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api(edit.id ? `/admin/schools/${edit.id}` : "/admin/schools", { method: edit.id ? "PUT" : "POST", body: f });
            setEdit(null); list.reload();
          } catch (e: any) { setErr(e.message); }
        }}>
          {err && <Alert>{err}</Alert>}
          <Field id="sc-name" label="Nome"><Input id="sc-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
          <Field id="sc-city" label="Cidade"><Input id="sc-city" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
          <Field id="sc-st" label="Status">
            <select id="sc-st" className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="active">Ativa</option><option value="inactive">Inativa</option></select>
          </Field>
          <button className="btn-primary w-full">Salvar</button>
        </form>
      </Modal>
    </>
  );
}

function Categories() {
  const list = useApi<any[]>("/admin/categories");
  const [edit, setEdit] = useState<any | null>(null);
  const [f, setF] = useState({ name: "", description: "", icon: "tag", status: "active" });
  const [err, setErr] = useState("");
  const open = (c: any) => { setErr(""); setF({ name: c?.name || "", description: c?.description || "", icon: c?.icon || "tag", status: c?.status || "active" }); setEdit(c || {}); };
  if (list.loading && !list.data) return <Spinner />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  return (
    <>
      <div className="mb-4 flex justify-end"><button className="btn-primary btn-sm" onClick={() => open(null)}>Nova categoria</button></div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.data!.map((c) => (
          <li key={c.id} className="card flex items-center gap-3 p-4">
            <CategoryIcon icon={c.icon} />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{c.name} {c.status === "inactive" && <span className="text-xs font-normal text-ink-mute">(inativa)</span>}</p>
              <p className="truncate text-xs text-ink-mute">{c.profiles} perfis · {c.description}</p>
            </div>
            <button className="btn-ghost btn-sm" onClick={() => open(c)}>Editar</button>
          </li>
        ))}
      </ul>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar categoria" : "Nova categoria"}>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api(edit.id ? `/admin/categories/${edit.id}` : "/admin/categories", { method: edit.id ? "PUT" : "POST", body: f });
            setEdit(null); list.reload();
          } catch (e: any) { setErr(e.message); }
        }}>
          {err && <Alert>{err}</Alert>}
          <Field id="ca-name" label="Nome"><Input id="ca-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
          <Field id="ca-desc" label="Descrição"><Input id="ca-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div>
            <p className="label">Ícone</p>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((i) => (
                <button type="button" key={i} onClick={() => setF({ ...f, icon: i })} className={`rounded-full p-0.5 ring-2 ${f.icon === i ? "ring-brand" : "ring-transparent"}`} aria-label={`Ícone ${i}`}>
                  <CategoryIcon icon={i} />
                </button>
              ))}
            </div>
          </div>
          <Field id="ca-st" label="Status">
            <select id="ca-st" className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="active">Ativa</option><option value="inactive">Inativa</option></select>
          </Field>
          <button className="btn-primary w-full">Salvar</button>
        </form>
      </Modal>
    </>
  );
}

function Log() {
  const list = useApi<any[]>("/admin/log");
  if (list.loading && !list.data) return <Spinner />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (!list.data?.length) return <Empty title="Nenhuma ação registrada ainda" />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs uppercase text-ink-mute">
          <tr><th className="p-3">Quando</th><th className="p-3">Quem</th><th className="p-3">Ação</th><th className="p-3">Alvo</th><th className="p-3">Detalhe</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {list.data.map((l) => (
            <tr key={l.id}>
              <td className="whitespace-nowrap p-3 text-xs">{formatDateTime(l.created_at)}</td>
              <td className="p-3">{l.admin_name}</td>
              <td className="p-3 font-mono text-xs">{l.action}</td>
              <td className="p-3 text-xs">{l.target_type} #{l.target_id}</td>
              <td className="p-3 text-xs text-ink-soft">{l.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
