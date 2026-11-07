import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Clock, FileText, Lock, MapPin, MessageCircle, Wallet } from "lucide-react";
import { api, formatDate, initials, useApi, useAuth, usePageTitle, whatsappLink } from "../lib";
import { Alert, ErrorState, Field, Modal, ReportButton, Spinner, StarInput, Stars, Textarea } from "../ui";
import NotFound from "./NotFound";

type Profile = {
  id: number; slug: string; display_name: string; profession: string; bio: string; experience: string;
  city: string; neighborhood: string; service_area: string; contact_hours: string; price_range: string;
  category_name: string | null; category_slug: string | null; school_name: string | null;
  rating: number | null; review_count: number;
  services: { id: number; title: string; description: string; price: string }[];
  reviews: { id: number; rating: number; comment: string; created_at: string; author_name: string }[];
  is_owner: boolean; can_contact: boolean; whatsapp: string | null; has_whatsapp: boolean;
  my_review: { id: number; rating: number; comment: string } | null;
};

export default function Perfil() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data: p, error, loading, reload } = useApi<Profile>(`/professionals/${slug}`, [user?.id]);
  usePageTitle(p?.display_name || "Perfil");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  if (loading && !p) return <Spinner />;
  if (error?.status === 404) return <NotFound title="Perfil não encontrado" text="Este perfil não existe ou não está disponível no momento." />;
  if (error || !p) return <div className="container-x"><ErrorState error={error!} onRetry={reload} /></div>;

  const place = [p.neighborhood, p.city].filter(Boolean).join(", ");
  const canAct = p.can_contact && !p.is_owner;

  return (
    <div className="container-x py-8 sm:py-12">
      <Link to="/profissionais" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-brand">
        <ArrowLeft size={14} /> Voltar ao diretório
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-light font-display text-xl font-bold text-brand">{initials(p.display_name)}</span>
              <div className="min-w-0 flex-1">
                {p.category_name && (
                  <Link to={`/profissionais?categoria=${p.category_slug}`} className="eyebrow hover:underline">{p.category_name}</Link>
                )}
                <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{p.display_name}</h1>
                <p className="text-ink-soft">{p.profession}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
                  {p.school_name && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 font-bold text-brand">
                      <BadgeCheck size={13} /> Vínculo verificado · {p.school_name}
                    </span>
                  )}
                  {place && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {place}</span>}
                  {p.review_count > 0 ? (
                    <span className="inline-flex items-center gap-1.5"><Stars value={p.rating || 0} size={13} /> {p.rating?.toFixed(1)} · {p.review_count} {p.review_count === 1 ? "avaliação" : "avaliações"}</span>
                  ) : (
                    <span>Ainda sem avaliações</span>
                  )}
                </div>
              </div>
            </div>
            {p.bio && <p className="mt-6 whitespace-pre-line leading-relaxed text-ink">{p.bio}</p>}
            {p.experience && (
              <div className="mt-6">
                <h2 className="mb-1.5 text-sm font-bold">Experiência</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{p.experience}</p>
              </div>
            )}
          </section>

          <section className="card p-6 sm:p-8">
            <h2 className="text-lg font-bold">Serviços</h2>
            {p.services.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">O profissional ainda não detalhou os serviços.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {p.services.map((s) => (
                  <li key={s.id} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div>
                      <p className="font-bold">{s.title}</p>
                      {s.description && <p className="mt-0.5 text-sm text-ink-soft">{s.description}</p>}
                    </div>
                    {s.price && <span className="shrink-0 text-sm font-bold text-brand">{s.price}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Avaliações</h2>
              {canAct && (
                <button className="btn-ghost btn-sm" onClick={() => setReviewOpen(true)}>
                  {p.my_review ? "Editar minha avaliação" : "Avaliar"}
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-ink-mute">
              Avaliações são feitas por membros aprovados da comunidade. Como a contratação acontece fora da plataforma, elas não comprovam pagamento ou contratação.
            </p>
            {p.reviews.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">Nenhuma avaliação publicada ainda.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {p.reviews.map((r) => (
                  <li key={r.id} className="rounded-xl bg-cream p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-bold">{r.author_name} <Stars value={r.rating} size={12} /></span>
                      <span className="text-[11px] text-ink-mute">{formatDate(r.created_at)}</span>
                    </div>
                    {r.comment && <p className="mt-1.5 text-sm text-ink-soft">{r.comment}</p>}
                    <div className="mt-2"><ReportButton type="review" id={r.id} /></div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Lateral de contato */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-6">
            <h2 className="text-lg font-bold">Fale com {p.display_name.split(" ")[0]}</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
              {p.service_area && <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0" /> Atende: {p.service_area}</li>}
              {p.contact_hours && <li className="flex gap-2"><Clock size={16} className="mt-0.5 shrink-0" /> {p.contact_hours}</li>}
              {p.price_range && <li className="flex gap-2"><Wallet size={16} className="mt-0.5 shrink-0" /> {p.price_range}</li>}
            </ul>

            <div className="mt-5 space-y-2.5">
              {p.is_owner ? (
                <Link to="/minha-conta" className="btn-primary w-full">Editar meu perfil</Link>
              ) : !user ? (
                <>
                  <div className="flex items-start gap-2 rounded-xl bg-cream p-3 text-xs text-ink-soft">
                    <Lock size={14} className="mt-0.5 shrink-0" /> Os contatos ficam visíveis apenas para membros aprovados da comunidade.
                  </div>
                  <Link to={`/entrar?voltar=/profissionais/${p.slug}`} className="btn-primary w-full">Entrar para contatar</Link>
                  <Link to="/cadastro" className="btn-ghost w-full">Criar conta</Link>
                </>
              ) : !p.can_contact ? (
                <Alert kind="warn">
                  Seu cadastro está em análise pela escola. Assim que for aprovado, você poderá ver os contatos e pedir orçamentos.
                </Alert>
              ) : (
                <>
                  {p.whatsapp && (
                    <a
                      href={whatsappLink(p.whatsapp, `Olá, ${p.display_name.split(" ")[0]}! Encontrei seu perfil no Conecta Escola e gostaria de conversar sobre seus serviços.`)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn w-full bg-[#1f9d55] text-white hover:bg-[#188046]"
                    >
                      <MessageCircle size={16} /> Chamar no WhatsApp
                    </a>
                  )}
                  <button className="btn-primary w-full" onClick={() => setQuoteOpen(true)}>
                    <FileText size={16} /> Solicitar orçamento
                  </button>
                </>
              )}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-ink-mute">
              O Conecta Escola não intermedia contratação nem pagamento. Valores, prazos e condições são combinados diretamente entre vocês.
            </p>
          </div>
          <div className="px-2"><ReportButton type="profile" id={p.id} label="Denunciar este perfil" /></div>
        </aside>
      </div>

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} slug={p.slug} name={p.display_name} />
      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} slug={p.slug} current={p.my_review} onSaved={reload} />
    </div>
  );
}

function QuoteModal({ open, onClose, slug, name }: { open: boolean; onClose: () => void; slug: string; name: string }) {
  const [desc, setDesc] = useState("");
  const [st, setSt] = useState<{ busy?: boolean; err?: string; field?: string; ok?: boolean }>({});
  const close = () => { onClose(); setTimeout(() => { setSt({}); setDesc(""); }, 200); };
  return (
    <Modal open={open} onClose={close} title={`Solicitar orçamento a ${name.split(" ")[0]}`}>
      {st.ok ? (
        <div className="space-y-4">
          <Alert kind="success">Solicitação enviada! Ela aparece no painel do profissional e no seu histórico em Minha conta.</Alert>
          <button className="btn-ghost w-full" onClick={close}>Fechar</button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSt({ busy: true });
            try {
              await api(`/professionals/${slug}/quotes`, { body: { description: desc } });
              setSt({ ok: true });
            } catch (e: any) {
              setSt({ err: e.message, field: e.fields?.description });
            }
          }}
        >
          {st.err && <Alert>{st.err}</Alert>}
          <Field id="q-desc" label="Descreva o que você precisa" error={st.field} hint="Inclua detalhes como local, prazo e quantidade. O profissional receberá seu nome, e-mail e telefone para responder.">
            <Textarea id="q-desc" required minLength={10} rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} error={st.field} />
          </Field>
          <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? "Enviando…" : "Enviar solicitação"}</button>
        </form>
      )}
    </Modal>
  );
}

function ReviewModal({ open, onClose, slug, current, onSaved }: { open: boolean; onClose: () => void; slug: string; current: Profile["my_review"]; onSaved: () => void }) {
  const [rating, setRating] = useState(current?.rating || 0);
  const [comment, setComment] = useState(current?.comment || "");
  const [st, setSt] = useState<{ busy?: boolean; err?: string }>({});
  const [last, setLast] = useState(open);
  if (open !== last) {
    setLast(open);
    if (open) { setRating(current?.rating || 0); setComment(current?.comment || ""); setSt({}); }
  }
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return setSt({ err: "Escolha uma nota de 1 a 5." });
    setSt({ busy: true });
    try {
      await api(`/professionals/${slug}/reviews`, { body: { rating, comment } });
      onSaved();
      onClose();
    } catch (e: any) {
      setSt({ err: e.message });
    }
  };
  const remove = async () => {
    setSt({ busy: true });
    try {
      await api(`/professionals/${slug}/reviews/mine`, { method: "DELETE" });
      onSaved();
      onClose();
    } catch (e: any) {
      setSt({ err: e.message });
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={current ? "Editar avaliação" : "Avaliar profissional"}>
      <form onSubmit={save} className="space-y-4">
        {st.err && <Alert>{st.err}</Alert>}
        <div>
          <p className="label">Sua nota</p>
          <StarInput value={rating} onChange={setRating} />
        </div>
        <Field id="r-comment" label="Comentário (opcional)">
          <Textarea id="r-comment" value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} placeholder="Como foi sua experiência?" />
        </Field>
        <div className="flex gap-2">
          {current && <button type="button" className="btn-danger" onClick={remove} disabled={st.busy}>Remover</button>}
          <button className="btn-primary flex-1" disabled={st.busy}>{st.busy ? "Salvando…" : "Publicar avaliação"}</button>
        </div>
      </form>
    </Modal>
  );
}
