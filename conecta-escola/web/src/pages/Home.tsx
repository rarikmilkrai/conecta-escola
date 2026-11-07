import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search, Sparkles, Users } from "lucide-react";
import { useApi, usePageTitle, useSite } from "../lib";
import { CategoryIcon, ProfessionalCard, type ProCard } from "../ui";

type Cat = { id: number; name: string; slug: string; icon: string; count: number };

export default function Home() {
  usePageTitle("");
  const { school } = useSite();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const cats = useApi<Cat[]>("/categories");
  const pros = useApi<{ items: ProCard[] }>("/professionals?ordem=recentes");
  const schoolName = school?.name || "nossa escola";

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cream-2 via-cream to-mustard-light/70">
        <div className="container-x grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1.5 text-[11px] font-bold text-brand">
              <Sparkles size={12} /> Da escola, para a comunidade
            </span>
            <h1 className="mt-6 text-[44px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-6xl">
              Talentos
              <br />
              próximos.
              <br />
              <span className="text-brand">Laços mais fortes.</span>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Um espaço para famílias da {schoolName} encontrarem serviços e profissionais da própria comunidade.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                nav(`/profissionais${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
              }}
              className="mt-8 flex max-w-[480px] items-center gap-2 rounded-full border border-line bg-white p-1.5 pl-4 shadow-pop"
              role="search"
            >
              <Search size={16} className="shrink-0 text-ink-mute" />
              <label htmlFor="home-q" className="sr-only">O que você está procurando?</label>
              <input
                id="home-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="O que você está procurando?"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-ink-mute"
              />
              <button className="btn-primary !py-2.5">
                Buscar <ArrowRight size={14} />
              </button>
            </form>
            <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-soft">
              <span className="inline-flex items-center gap-1.5"><Users size={13} /> Rede escolar local</span>
              <span>Sem avaliações inventadas. Só conexões reais.</span>
            </p>
          </div>

          {/* Cartão ilustrativo */}
          <div className="relative mx-auto w-full max-w-[400px] lg:mx-0 lg:ml-auto">
            <div className="dots relative overflow-hidden rounded-[28px] bg-brand p-5 pt-28 shadow-pop">
              <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full border border-white/15" />
              <div className="pointer-events-none absolute right-6 top-8 h-36 w-36 rounded-full border border-white/15" />
              <div className="relative rounded-2xl bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink-mute">
                  <span className="text-coral">{schoolName}</span>
                </p>
                <p className="mt-2 font-display text-xl font-bold leading-snug">O próximo bom encontro pode começar aqui.</p>
                <div className="mt-6 flex items-end justify-between gap-3">
                  <p className="text-[10px] text-ink-soft">Uma rede feita de confiança e proximidade.</p>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mustard text-ink"><Users size={16} /></span>
                </div>
              </div>
            </div>
            <span className="absolute -left-4 top-7 -rotate-6 rounded-lg bg-mustard px-3.5 py-2 font-display text-[12px] font-bold leading-tight text-brand-dark shadow-card">
              Comunidade que
              <br />
              se fortalece junto
            </span>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="py-16 sm:py-20">
        <div className="container-x">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Explore por especialidade</p>
              <h2 className="text-2xl font-bold sm:text-[28px]">O que você precisa?</h2>
            </div>
            <Link to="/categorias" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline">
              Todas as categorias <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(cats.data || Array.from({ length: 6 }).map(() => null)).slice(0, 6).map((c, i) =>
              c ? (
                <Link key={c.id} to={`/profissionais?categoria=${c.slug}`} className="card group flex items-center gap-3 p-3.5 transition hover:border-brand/30">
                  <CategoryIcon icon={c.icon} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{c.name}</p>
                    <p className="text-[11px] text-ink-soft">{c.count} {c.count === 1 ? "profissional" : "profissionais"}</p>
                  </div>
                  <ArrowRight size={14} className="text-ink-soft transition group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <div key={i} className="card h-[66px] animate-pulse bg-cream-2/50" />
              )
            )}
          </div>
        </div>
      </section>

      {/* Profissionais */}
      <section className="bg-cream-2 py-16 sm:py-20">
        <div className="container-x">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Conheça a rede</p>
              <h2 className="text-2xl font-bold sm:text-[28px]">Profissionais da comunidade</h2>
            </div>
            <Link to="/profissionais" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline">
              Explorar diretório <ArrowRight size={13} />
            </Link>
          </div>
          {pros.data && pros.data.items.length === 0 ? (
            <div className="card px-6 py-10 text-center">
              <p className="font-display text-lg font-bold">A rede está começando agora.</p>
              <p className="mt-1 text-sm text-ink-soft">Seja o primeiro profissional da comunidade a aparecer aqui.</p>
              <Link to="/cadastro" className="btn-primary mt-5">Criar conta <ArrowRight size={14} /></Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(pros.data?.items || []).slice(0, 8).map((p) => (
                <ProfessionalCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA profissionais */}
      <section className="py-16 sm:py-20">
        <div className="container-x">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] bg-brand px-7 py-10 sm:flex-row sm:items-center sm:px-9">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-mustard">Para profissionais</p>
              <h2 className="text-2xl font-bold text-white sm:text-[28px]">Seu trabalho merece ser encontrado.</h2>
              <p className="mt-2 max-w-lg text-sm text-white/75">
                Crie seu perfil, apresente seus serviços e conheça oportunidades de parceria dentro da rede escolar.
              </p>
            </div>
            <Link to="/cadastro?profissional=1" className="btn-mustard shrink-0">
              Fazer meu cadastro <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
