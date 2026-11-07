import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { usePageTitle } from "../lib";

export default function NotFound({ title = "Página não encontrada", text = "O endereço que você procurou não existe ou foi removido." }: { title?: string; text?: string }) {
  usePageTitle(title);
  return (
    <div className="container-x flex flex-col items-center py-24 text-center">
      <p className="font-display text-7xl font-extrabold text-brand/20">404</p>
      <h1 className="mt-2 text-2xl font-extrabold">{title}</h1>
      <p className="mt-2 max-w-md text-ink-soft">{text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary"><ArrowLeft size={14} /> Voltar ao início</Link>
        <Link to="/profissionais" className="btn-ghost">Ver profissionais</Link>
      </div>
    </div>
  );
}
