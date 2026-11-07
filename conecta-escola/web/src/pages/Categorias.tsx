import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useApi, usePageTitle } from "../lib";
import { CategoryIcon, Empty, ErrorState, PageHeader, Spinner } from "../ui";

type Cat = { id: number; name: string; slug: string; description: string; icon: string; count: number };

export default function Categorias() {
  usePageTitle("Categorias");
  const { data, error, loading, reload } = useApi<Cat[]>("/categories");
  return (
    <>
      <PageHeader eyebrow="Explore por especialidade" title="Categorias">
        Escolha uma área para ver os profissionais aprovados da comunidade.
      </PageHeader>
      <div className="container-x py-12">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data?.length ? (
          <Empty title="Nenhuma categoria ativa">A equipe da escola ainda não cadastrou categorias.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((c) => (
              <Link key={c.id} to={`/profissionais?categoria=${c.slug}`} className="card group flex gap-3 p-4 transition hover:border-brand/30">
                <CategoryIcon icon={c.icon} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{c.name}</p>
                  {c.description && <p className="mt-0.5 text-xs text-ink-soft">{c.description}</p>}
                  <p className="mt-2 text-[11px] font-bold text-brand">
                    {c.count} {c.count === 1 ? "profissional" : "profissionais"}
                  </p>
                </div>
                <ArrowRight size={14} className="mt-1 text-ink-soft transition group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
