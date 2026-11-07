import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarClock, Handshake, MapPin, MessageCircle, Plus } from "lucide-react";
import { api, formatDate, useApi, useAuth, usePageTitle, whatsappLink } from "../lib";
import { Alert, Empty, ErrorState, Field, Input, Modal, PageHeader, ReportButton, Spinner, Textarea } from "../ui";

type Post = {
  id: number; title: string; description: string; categories: string; region: string; deadline: string; created_at: string;
  author_name: string; author_slug: string | null; author_profession: string | null; author_phone: string | null; is_mine: boolean;
};

export default function Parcerias() {
  usePageTitle("Parcerias");
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data, error, loading, reload } = useApi<Post[]>(`/partnerships?${params.toString()}`, [user?.id]);
  const [cat, setCat] = useState(params.get("categoria") || "");
  const [region, setRegion] = useState(params.get("regiao") || "");
  const [editing, setEditing] = useState<Post | "new" | null>(null);
  const canPost = user?.status === "approved" && user.is_professional;

  return (
    <>
      <PageHeader eyebrow="Mural de parcerias" title="Trabalhando juntos, a comunidade vai mais longe">
        Profissionais aprovados divulgam projetos e procuram parceiros para trabalhos em conjunto. A parceria é combinada diretamente entre vocês.
      </PageHeader>
      <div className="container-x py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <form
            className="flex flex-1 flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const n = new URLSearchParams();
              if (cat.trim()) n.set("categoria", cat.trim());
              if (region.trim()) n.set("regiao", region.trim());
              setParams(n);
            }}
          >
            <input aria-label="Categoria procurada" className="input sm:max-w-[220px]" placeholder="Categoria (ex.: Pintura)" value={cat} onChange={(e) => setCat(e.target.value)} />
            <input aria-label="Região" className="input sm:max-w-[200px]" placeholder="Região" value={region} onChange={(e) => setRegion(e.target.value)} />
            <button className="btn-ghost">Filtrar</button>
            {params.toString() && <button type="button" className="text-xs font-bold text-ink-soft underline" onClick={() => { setCat(""); setRegion(""); setParams({}); }}>Limpar</button>}
          </form>
          {canPost ? (
            <button className="btn-primary" onClick={() => setEditing("new")}><Plus size={16} /> Nova publicação</button>
          ) : !user ? (
            <Link to="/entrar?voltar=/parcerias" className="btn-ghost">Entrar para publicar</Link>
          ) : null}
        </div>
        {user && !canPost && (
          <div className="mt-4">
            <Alert kind="info">
              {user.status !== "approved" ? "Quando seu cadastro for aprovado pela escola, " : ""}
              {user.is_professional ? "você poderá publicar no mural." : <>Para publicar no mural, crie seu <Link to="/minha-conta?aba=perfil" className="font-bold underline">perfil profissional</Link>.</>}
            </Alert>
          </div>
        )}

        <div className="mt-8">
          {loading && !data ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : !data?.length ? (
            <Empty title={params.toString() ? "Nenhuma publicação com esses filtros" : "O mural ainda está vazio"}>
              {params.toString() ? "Tente outros termos." : "As oportunidades de parceria publicadas por profissionais aprovados aparecem aqui."}
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.map((p) => (
                <article key={p.id} className="card flex flex-col p-6">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mustard-light text-ink/70"><Handshake size={18} /></span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold leading-snug">{p.title}</h2>
                      <p className="text-xs text-ink-soft">
                        por {p.author_slug ? <Link to={`/profissionais/${p.author_slug}`} className="font-bold hover:text-brand">{p.author_name}</Link> : p.author_name}
                        {p.author_profession && ` · ${p.author_profession}`} · {formatDate(p.created_at)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{p.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {p.categories.split(",").map((c) => c.trim()).filter(Boolean).map((c) => (
                      <span key={c} className="rounded-full bg-brand-light px-2.5 py-1 font-bold text-brand">{c}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                    <span className="inline-flex items-center gap-1"><MapPin size={12} /> {p.region}</span>
                    {p.deadline && <span className="inline-flex items-center gap-1"><CalendarClock size={12} /> {p.deadline}</span>}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    {p.is_mine ? (
                      <div className="flex gap-2">
                        <button className="btn-ghost btn-sm" onClick={() => setEditing(p)}>Editar</button>
                        <button className="btn-ghost btn-sm" onClick={async () => { if (confirm("Encerrar esta publicação?")) { await api(`/partnerships/${p.id}/close`, { method: "POST" }); reload(); } }}>Encerrar</button>
                      </div>
                    ) : p.author_phone ? (
                      <a className="btn btn-sm bg-[#1f9d55] text-white hover:bg-[#188046]" target="_blank" rel="noreferrer" href={whatsappLink(p.author_phone, `Olá! Vi sua publicação "${p.title}" no mural do Conecta Escola e tenho interesse na parceria.`)}>
                        <MessageCircle size={14} /> Falar com o autor
                      </a>
                    ) : (
                      <span className="text-xs text-ink-mute">{user ? "Contato liberado após aprovação do cadastro." : "Entre para falar com o autor."}</span>
                    )}
                    <ReportButton type="partnership" id={p.id} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      <PostModal post={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
    </>
  );
}

function PostModal({ post, onClose, onSaved }: { post: Post | "new" | null; onClose: () => void; onSaved: () => void }) {
  const editing = post && post !== "new" ? post : null;
  const empty = { title: "", description: "", categories: "", region: "", deadline: "" };
  const [f, setF] = useState(empty);
  const [st, setSt] = useState<{ busy?: boolean; err?: string; fields?: Record<string, string> }>({});
  const [last, setLast] = useState<typeof post>(null);
  if (post !== last) {
    setLast(post);
    setSt({});
    setF(editing ? { title: editing.title, description: editing.description, categories: editing.categories, region: editing.region, deadline: editing.deadline } : empty);
  }
  const fe = st.fields || {};
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={!!post} onClose={onClose} title={editing ? "Editar publicação" : "Nova publicação no mural"}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSt({ busy: true });
          try {
            await api(editing ? `/partnerships/${editing.id}` : "/partnerships", { method: editing ? "PUT" : "POST", body: f });
            onSaved();
          } catch (e: any) {
            setSt({ err: e.message, fields: e.fields });
          }
        }}
      >
        {st.err && <Alert>{st.err}</Alert>}
        <Field id="pp-title" label="Título" error={fe.title}>
          <Input id="pp-title" placeholder="Ex.: Procuro eletricista para reforma de salão" value={f.title} onChange={set("title")} error={fe.title} />
        </Field>
        <Field id="pp-desc" label="Descrição" error={fe.description}>
          <Textarea id="pp-desc" rows={5} value={f.description} onChange={set("description")} error={fe.description} placeholder="Explique o projeto e o que você procura em um parceiro." />
        </Field>
        <Field id="pp-cats" label="Categorias procuradas" error={fe.categories} hint="Separe por vírgula.">
          <Input id="pp-cats" placeholder="Elétrica, Pintura" value={f.categories} onChange={set("categories")} error={fe.categories} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pp-region" label="Região" error={fe.region}>
            <Input id="pp-region" placeholder="Ex.: Cotia" value={f.region} onChange={set("region")} error={fe.region} />
          </Field>
          <Field id="pp-deadline" label="Prazo (opcional)">
            <Input id="pp-deadline" placeholder="Ex.: até dezembro" value={f.deadline} onChange={set("deadline")} />
          </Field>
        </div>
        <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? "Salvando…" : editing ? "Salvar" : "Publicar"}</button>
      </form>
    </Modal>
  );
}
