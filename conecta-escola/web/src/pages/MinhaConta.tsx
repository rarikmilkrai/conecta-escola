import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Clock, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { api, formatDate, maskPhone, useApi, useAuth, usePageTitle, whatsappLink, type User } from "../lib";
import { Alert, Empty, ErrorState, Field, Input, Modal, Spinner, StatusBadge, Textarea } from "../ui";

type Service = { id: number; title: string; description: string; price: string };
type Me = {
  user: User;
  school: { id: number; name: string } | null;
  profile: null | {
    slug: string; display_name: string; profession: string; category_id: number; bio: string; experience: string; city: string;
    neighborhood: string; service_area: string; whatsapp: string; contact_hours: string; price_range: string; published: number; hidden_by_admin: number;
  };
  services: Service[];
  sentQuotes: { id: number; description: string; status: string; created_at: string; display_name: string; slug: string }[];
  receivedQuotes: { id: number; description: string; status: string; created_at: string; family_name: string; family_phone: string; family_email: string }[];
  partnerships: { id: number; title: string; status: string; created_at: string }[];
};

const QUOTE_STATUS: Record<string, string> = { new: "Nova", answered: "Respondida", closed: "Encerrada" };

export default function MinhaConta() {
  usePageTitle("Minha conta");
  const { refresh } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("aba") || "conta";
  const me = useApi<Me>("/me");
  const reload = () => { me.reload(); refresh(); };

  if (me.loading && !me.data) return <Spinner />;
  if (me.error || !me.data) return <div className="container-x"><ErrorState error={me.error!} onRetry={me.reload} /></div>;
  const d = me.data;

  const tabs = [
    { id: "conta", label: "Minha conta" },
    { id: "perfil", label: d.profile ? "Perfil profissional" : "Sou profissional" },
    { id: "orcamentos", label: "Orçamentos" },
    ...(d.profile ? [{ id: "parcerias", label: "Minhas parcerias" }] : []),
  ];

  return (
    <div className="container-x py-8 sm:py-12">
      <h1 className="text-3xl font-extrabold">Olá, {d.user.name.split(" ")[0]}!</h1>
      <StatusCard me={d} onChange={reload} isNew={params.get("novo") === "1"} />

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams({ aba: t.id })}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-bold transition ${tab === t.id ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "conta" && <AccountTab me={d} onSaved={reload} />}
        {tab === "perfil" && <ProfileTab me={d} onSaved={reload} />}
        {tab === "orcamentos" && <QuotesTab me={d} onChange={me.reload} />}
        {tab === "parcerias" && <PartnershipsTab me={d} />}
      </div>
    </div>
  );
}

function StatusCard({ me, onChange, isNew }: { me: Me; onChange: () => void; isNew: boolean }) {
  const { user, school } = me;
  const [busy, setBusy] = useState(false);
  if (user.is_admin) return <div className="mt-4"><Alert kind="info">Você é administrador. <Link to="/admin" className="font-bold underline">Abrir painel de administração</Link></Alert></div>;
  return (
    <div className="card mt-5 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          Vínculo com <b>{school?.name || "escola"}</b> <StatusBadge status={user.status} />
        </p>
        <p className="mt-1.5 text-sm text-ink-soft">
          {user.status === "pending" && (isNew ? "Conta criada! " : "") + "A equipe da escola vai analisar seu cadastro. Enquanto isso, você já pode navegar e preencher seu perfil."}
          {user.status === "approved" && "Tudo certo! Você tem acesso aos contatos, orçamentos, avaliações e ao mural de parcerias."}
          {user.status === "rejected" && <>Seu cadastro precisa de ajustes: <b>{user.status_reason}</b></>}
          {user.status === "suspended" && <>Sua conta está suspensa: <b>{user.status_reason}</b>. Fale com a equipe da escola.</>}
        </p>
      </div>
      {user.status === "rejected" && (
        <button
          className="btn-primary shrink-0"
          disabled={busy}
          onClick={async () => { setBusy(true); await api("/me/resubmit", { method: "POST" }).catch(() => {}); setBusy(false); onChange(); }}
        >
          Corrigi, reenviar para análise
        </button>
      )}
    </div>
  );
}

function AccountTab({ me, onSaved }: { me: Me; onSaved: () => void }) {
  const [f, setF] = useState({ name: me.user.name, phone: maskPhone(me.user.phone) });
  const [st, setSt] = useState<{ busy?: boolean; err?: string; ok?: string; fields?: Record<string, string> }>({});
  const [pw, setPw] = useState({ current: "", password: "" });
  const [pst, setPst] = useState<{ busy?: boolean; err?: string; ok?: boolean; fields?: Record<string, string> }>({});
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="card space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setSt({ busy: true });
          try {
            await api("/me", { method: "PUT", body: { ...f, school_id: me.user.school_id } });
            setSt({ ok: "Dados atualizados." });
            onSaved();
          } catch (e: any) {
            setSt({ err: e.message, fields: e.fields });
          }
        }}
      >
        <h2 className="text-lg font-bold">Dados da conta</h2>
        {st.err && <Alert>{st.err}</Alert>}
        {st.ok && <Alert kind="success">{st.ok}</Alert>}
        <Field id="a-name" label="Nome completo" error={st.fields?.name}>
          <Input id="a-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={st.fields?.name} />
        </Field>
        <Field id="a-email" label="E-mail" hint="Para trocar o e-mail, fale com a equipe da escola.">
          <Input id="a-email" value={me.user.email} disabled className="bg-cream-2" />
        </Field>
        <Field id="a-phone" label="Telefone / WhatsApp" error={st.fields?.phone}>
          <Input id="a-phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: maskPhone(e.target.value) })} error={st.fields?.phone} />
        </Field>
        <button className="btn-primary" disabled={st.busy}>{st.busy ? "Salvando…" : "Salvar"}</button>
      </form>

      <form
        className="card space-y-4 p-6 lg:self-start"
        onSubmit={async (e) => {
          e.preventDefault();
          setPst({ busy: true });
          try {
            await api("/me/password", { method: "PUT", body: pw });
            setPst({ ok: true });
            setPw({ current: "", password: "" });
          } catch (e: any) {
            setPst({ err: e.message, fields: e.fields });
          }
        }}
      >
        <h2 className="text-lg font-bold">Trocar senha</h2>
        {pst.err && <Alert>{pst.err}</Alert>}
        {pst.ok && <Alert kind="success">Senha alterada.</Alert>}
        <Field id="p-cur" label="Senha atual" error={pst.fields?.current}>
          <Input id="p-cur" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} error={pst.fields?.current} />
        </Field>
        <Field id="p-new" label="Nova senha" hint="Mínimo de 8 caracteres." error={pst.fields?.password}>
          <Input id="p-new" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} error={pst.fields?.password} />
        </Field>
        <button className="btn-ghost" disabled={pst.busy}>Alterar senha</button>
      </form>
    </div>
  );
}

type Cat = { id: number; name: string };

function ProfileTab({ me, onSaved }: { me: Me; onSaved: () => void }) {
  const cats = useApi<Cat[]>("/categories");
  const p = me.profile;
  const [f, setF] = useState({
    display_name: p?.display_name || me.user.name,
    profession: p?.profession || "",
    category_id: p?.category_id ? String(p.category_id) : "",
    bio: p?.bio || "",
    experience: p?.experience || "",
    city: p?.city || "",
    neighborhood: p?.neighborhood || "",
    service_area: p?.service_area || "",
    whatsapp: maskPhone(p ? p.whatsapp : me.user.phone),
    contact_hours: p?.contact_hours || "",
    price_range: p?.price_range || "",
    published: p ? !!p.published : true,
  });
  const [st, setSt] = useState<{ busy?: boolean; err?: string; ok?: boolean; fields?: Record<string, string> }>({});
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const fe = st.fields || {};

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <form
        className="card space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setSt({ busy: true });
          try {
            await api("/me/profile", { method: "PUT", body: f });
            setSt({ ok: true });
            onSaved();
          } catch (e: any) {
            setSt({ err: e.message, fields: e.fields });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{p ? "Editar perfil profissional" : "Criar meu perfil profissional"}</h2>
          {p && me.user.status === "approved" && f.published && !p.hidden_by_admin && (
            <Link to={`/profissionais/${p.slug}`} className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">Ver perfil público <ExternalLink size={12} /></Link>
          )}
        </div>
        {!p && <p className="text-sm text-ink-soft">Preencha seus dados para aparecer no diretório. Seu perfil fica visível assim que a escola aprovar seu cadastro.</p>}
        {p && me.user.status !== "approved" && <Alert kind="warn">Seu perfil está salvo, mas só aparece no diretório depois que a escola aprovar seu cadastro.</Alert>}
        {p?.hidden_by_admin ? <Alert>Seu perfil foi ocultado pela moderação. Fale com a equipe da escola.</Alert> : null}
        {st.err && <Alert>{st.err}</Alert>}
        {st.ok && <Alert kind="success">Perfil salvo!</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pf-name" label="Nome de exibição" error={fe.display_name}>
            <Input id="pf-name" value={f.display_name} onChange={set("display_name")} error={fe.display_name} />
          </Field>
          <Field id="pf-prof" label="Profissão" error={fe.profession}>
            <Input id="pf-prof" placeholder="Ex.: Eletricista, Professora de inglês" value={f.profession} onChange={set("profession")} error={fe.profession} />
          </Field>
        </div>
        <Field id="pf-cat" label="Categoria principal" error={fe.category_id}>
          <select id="pf-cat" className={`input ${fe.category_id ? "input-error" : ""}`} value={f.category_id} onChange={set("category_id")}>
            <option value="">Selecione…</option>
            {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field id="pf-bio" label="Sobre você e seu trabalho" error={fe.bio}>
          <Textarea id="pf-bio" value={f.bio} onChange={set("bio")} error={fe.bio} placeholder="Conte o que você faz, há quanto tempo e o que te diferencia." />
        </Field>
        <Field id="pf-exp" label="Experiência (opcional)" error={fe.experience}>
          <Textarea id="pf-exp" rows={3} value={f.experience} onChange={set("experience")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pf-city" label="Cidade" error={fe.city}>
            <Input id="pf-city" value={f.city} onChange={set("city")} error={fe.city} />
          </Field>
          <Field id="pf-nb" label="Bairro (opcional)" hint="Não informe seu endereço residencial.">
            <Input id="pf-nb" value={f.neighborhood} onChange={set("neighborhood")} />
          </Field>
        </div>
        <Field id="pf-area" label="Região de atendimento (opcional)">
          <Input id="pf-area" placeholder="Ex.: Cotia e Carapicuíba" value={f.service_area} onChange={set("service_area")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pf-wa" label="WhatsApp para contato" error={fe.whatsapp} hint="Visível só para membros aprovados. Deixe vazio para não exibir.">
            <Input id="pf-wa" type="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: maskPhone(e.target.value) })} error={fe.whatsapp} />
          </Field>
          <Field id="pf-hours" label="Horário de atendimento (opcional)">
            <Input id="pf-hours" placeholder="Ex.: Seg a sex, 8h às 18h" value={f.contact_hours} onChange={set("contact_hours")} />
          </Field>
        </div>
        <Field id="pf-price" label="Faixa de preço (opcional)">
          <Input id="pf-price" placeholder="Ex.: a partir de R$ 80" value={f.price_range} onChange={set("price_range")} />
        </Field>
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-brand" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />
          Exibir meu perfil no diretório
        </label>
        <button className="btn-primary" disabled={st.busy}>{st.busy ? "Salvando…" : p ? "Salvar alterações" : "Criar perfil"}</button>
      </form>

      <div className="lg:self-start">{p ? <ServicesEditor services={me.services} onChange={onSaved} /> : (
        <div className="card p-6 text-sm text-ink-soft">
          <h2 className="text-lg font-bold text-ink">Serviços</h2>
          <p className="mt-2">Depois de criar seu perfil, você poderá cadastrar cada serviço com descrição e preço.</p>
        </div>
      )}</div>
    </div>
  );
}

function ServicesEditor({ services, onChange }: { services: Service[]; onChange: () => void }) {
  const [edit, setEdit] = useState<Service | null>(null);
  const [f, setF] = useState({ title: "", description: "", price: "" });
  const [st, setSt] = useState<{ busy?: boolean; err?: string; fields?: Record<string, string> }>({});
  useEffect(() => {
    if (edit) { setF({ title: edit.title, description: edit.description, price: edit.price }); setSt({}); }
  }, [edit]);
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Serviços</h2>
        <button className="btn-ghost btn-sm" onClick={() => setEdit({ id: 0, title: "", description: "", price: "" })}><Plus size={14} /> Adicionar</button>
      </div>
      {services.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">Nenhum serviço cadastrado ainda.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {services.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-bold">{s.title}</p>
                {s.price && <p className="text-xs font-bold text-brand">{s.price}</p>}
                {s.description && <p className="mt-0.5 text-xs text-ink-soft">{s.description}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button className="rounded-full p-2 text-ink-soft hover:bg-cream-2" onClick={() => setEdit(s)} aria-label={`Editar ${s.title}`}><Pencil size={14} /></button>
                <button
                  className="rounded-full p-2 text-ink-soft hover:bg-red-50 hover:text-red-700"
                  aria-label={`Excluir ${s.title}`}
                  onClick={async () => { if (confirm(`Excluir o serviço "${s.title}"?`)) { await api(`/me/services/${s.id}`, { method: "DELETE" }); onChange(); } }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar serviço" : "Novo serviço"}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSt({ busy: true });
            try {
              await api(edit!.id ? `/me/services/${edit!.id}` : "/me/services", { method: edit!.id ? "PUT" : "POST", body: f });
              setEdit(null);
              onChange();
            } catch (e: any) {
              setSt({ err: e.message, fields: e.fields });
            }
          }}
        >
          {st.err && <Alert>{st.err}</Alert>}
          <Field id="s-title" label="Nome do serviço" error={st.fields?.title}>
            <Input id="s-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={st.fields?.title} />
          </Field>
          <Field id="s-desc" label="Descrição (opcional)">
            <Textarea id="s-desc" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          <Field id="s-price" label="Preço (opcional)">
            <Input id="s-price" placeholder="Ex.: R$ 120 ou a combinar" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          </Field>
          <button className="btn-primary w-full" disabled={st.busy}>Salvar serviço</button>
        </form>
      </Modal>
    </div>
  );
}

function QuotesTab({ me, onChange }: { me: Me; onChange: () => void }) {
  return (
    <div className="space-y-8">
      {me.profile && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Recebidos</h2>
          {me.receivedQuotes.length === 0 ? (
            <Empty title="Nenhum pedido de orçamento ainda">Quando uma família pedir um orçamento pelo seu perfil, ele aparece aqui.</Empty>
          ) : (
            <ul className="space-y-3">
              {me.receivedQuotes.map((q) => (
                <li key={q.id} className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">{q.family_name}</p>
                    <span className="flex items-center gap-1 text-xs text-ink-mute"><Clock size={12} /> {formatDate(q.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{q.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {q.family_phone && (
                      <a className="btn btn-sm bg-[#1f9d55] text-white hover:bg-[#188046]" target="_blank" rel="noreferrer" href={whatsappLink(q.family_phone, `Olá, ${q.family_name.split(" ")[0]}! Recebi seu pedido de orçamento pelo Conecta Escola.`)}>WhatsApp</a>
                    )}
                    <a className="btn-ghost btn-sm" href={`mailto:${q.family_email}`}>E-mail</a>
                    <select
                      aria-label="Situação do pedido"
                      className="input !w-auto !py-1.5 text-xs"
                      value={q.status}
                      onChange={async (e) => { await api(`/me/quotes/${q.id}`, { method: "PATCH", body: { status: e.target.value } }); onChange(); }}
                    >
                      {Object.entries(QUOTE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section>
        <h2 className="mb-3 text-lg font-bold">Enviados por mim</h2>
        {me.sentQuotes.length === 0 ? (
          <Empty title="Você ainda não pediu orçamentos" action={<Link to="/profissionais" className="btn-primary">Encontrar profissionais</Link>} />
        ) : (
          <ul className="space-y-3">
            {me.sentQuotes.map((q) => (
              <li key={q.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/profissionais/${q.slug}`} className="font-bold hover:text-brand">{q.display_name}</Link>
                  <span className="text-xs text-ink-mute">{formatDate(q.created_at)} · {QUOTE_STATUS[q.status]}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{q.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PartnershipsTab({ me }: { me: Me }) {
  const label: Record<string, string> = { active: "Ativa", closed: "Encerrada", hidden: "Oculta" };
  return me.partnerships.length === 0 ? (
    <Empty title="Nenhuma publicação no mural" action={<Link to="/parcerias" className="btn-primary">Ir para o mural</Link>}>Publique uma oportunidade de parceria para encontrar outros profissionais da comunidade.</Empty>
  ) : (
    <ul className="space-y-3">
      {me.partnerships.map((p) => (
        <li key={p.id} className="card flex items-center justify-between gap-3 p-4">
          <span className="font-bold">{p.title}</span>
          <span className="text-xs text-ink-soft">{label[p.status]} · {formatDate(p.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}
