import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useApi, usePageTitle } from "../lib";
import { Empty, ErrorState, PageHeader, ProfessionalCard, Spinner, type ProCard } from "../ui";

type Cat = { id: number; name: string; slug: string };
type School = { id: number; name: string };
type Result = { items: ProCard[]; total: number; page: number; pages: number };

const SORTS: Record<string, string> = { relevancia: "Relevância", avaliacao: "Melhor avaliados", recentes: "Mais recentes", nome: "Nome (A–Z)" };

export default function Profissionais() {
  usePageTitle("Profissionais");
  const [params, setParams] = useSearchParams();
  const qs = params.toString();
  const { data, error, loading, reload } = useApi<Result>(`/professionals?${qs}`);
  const cats = useApi<Cat[]>("/categories");
  const schools = useApi<School[]>("/schools");
  const [q, setQ] = useState(params.get("q") || "");
  const [city, setCity] = useState(params.get("cidade") || "");
  useEffect(() => {
    setQ(params.get("q") || "");
    setCity(params.get("cidade") || "");
  }, [qs]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "pagina") next.delete("pagina");
    setParams(next);
  };

  const chips: { key: string; label: string }[] = [];
  if (params.get("q")) chips.push({ key: "q", label: `“${params.get("q")}”` });
  if (params.get("categoria")) chips.push({ key: "categoria", label: cats.data?.find((c) => c.slug === params.get("categoria"))?.name || params.get("categoria")! });
  if (params.get("escola")) chips.push({ key: "escola", label: schools.data?.find((s) => String(s.id) === params.get("escola"))?.name || "Escola" });
  if (params.get("cidade")) chips.push({ key: "cidade", label: params.get("cidade")! });
  if (params.get("nota")) chips.push({ key: "nota", label: `${params.get("nota")}+ estrelas` });

  return (
    <>
      <PageHeader eyebrow="Diretório" title="Profissionais da comunidade">
        Somente profissionais com vínculo aprovado pela escola aparecem aqui.
      </PageHeader>
      <div className="container-x py-10">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const next = new URLSearchParams(params);
            q.trim() ? next.set("q", q.trim()) : next.delete("q");
            city.trim() ? next.set("cidade", city.trim()) : next.delete("cidade");
            next.delete("pagina");
            setParams(next);
          }}
          className="card grid gap-3 p-4 md:grid-cols-[2fr_1.2fr_auto]"
        >
          <div className="relative">
            <label htmlFor="f-q" className="sr-only">Buscar</label>
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input id="f-q" className="input pl-10" placeholder="Nome, profissão ou serviço" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <label htmlFor="f-city" className="sr-only">Cidade ou bairro</label>
            <input id="f-city" className="input" placeholder="Cidade ou bairro" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <button className="btn-primary">Buscar</button>
          <div className="grid gap-3 sm:grid-cols-2 md:col-span-3 md:grid-cols-4">
            <select aria-label="Categoria" className="input" value={params.get("categoria") || ""} onChange={(e) => set("categoria", e.target.value)}>
              <option value="">Todas as categorias</option>
              {cats.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <select aria-label="Escola" className="input" value={params.get("escola") || ""} onChange={(e) => set("escola", e.target.value)}>
              <option value="">Todas as escolas</option>
              {schools.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select aria-label="Avaliação mínima" className="input" value={params.get("nota") || ""} onChange={(e) => set("nota", e.target.value)}>
              <option value="">Qualquer avaliação</option>
              <option value="4">4+ estrelas</option>
              <option value="3">3+ estrelas</option>
            </select>
            <select aria-label="Ordenar" className="input" value={params.get("ordem") || "relevancia"} onChange={(e) => set("ordem", e.target.value === "relevancia" ? "" : e.target.value)}>
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <p className="mr-2 text-sm text-ink-soft" aria-live="polite">
            {data ? `${data.total} ${data.total === 1 ? "profissional encontrado" : "profissionais encontrados"}` : " "}
          </p>
          {chips.map((c) => (
            <button key={c.key} onClick={() => set(c.key, "")} className="inline-flex items-center gap-1 rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand hover:bg-brand/15" aria-label={`Remover filtro ${c.label}`}>
              {c.label} <X size={12} />
            </button>
          ))}
          {chips.length > 0 && (
            <Link to="/profissionais" className="text-xs font-bold text-ink-soft underline">Limpar filtros</Link>
          )}
        </div>

        <div className="mt-6">
          {loading && !data ? (
            <Spinner />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : !data?.items.length ? (
            <Empty title="Nenhum profissional encontrado" action={chips.length ? <Link to="/profissionais" className="btn-ghost">Limpar filtros</Link> : <Link to="/cadastro" className="btn-primary">Cadastrar meu serviço</Link>}>
              {chips.length ? "Tente remover algum filtro ou buscar por outro termo." : "Ainda não há profissionais aprovados. Que tal ser o primeiro?"}
            </Empty>
          ) : (
            <>
              <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
                {data.items.map((p) => <ProfessionalCard key={p.id} p={p} />)}
              </div>
              {data.pages > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Paginação">
                  <button className="btn-ghost btn-sm" disabled={data.page <= 1} onClick={() => set("pagina", String(data.page - 1))}>Anterior</button>
                  <span className="px-3 text-sm text-ink-soft">Página {data.page} de {data.pages}</span>
                  <button className="btn-ghost btn-sm" disabled={data.page >= data.pages} onClick={() => set("pagina", String(data.page + 1))}>Próxima</button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
