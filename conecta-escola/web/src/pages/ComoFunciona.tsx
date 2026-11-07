import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Handshake, MessageCircle, Search, ShieldAlert, UserPlus } from "lucide-react";
import { usePageTitle, useSite } from "../lib";
import { PageHeader } from "../ui";

export default function ComoFunciona() {
  usePageTitle("Como funciona");
  const { school } = useSite();
  const steps = [
    { icon: UserPlus, title: "1. Crie sua conta", text: "Informe nome, e-mail e telefone. Sua conta fica vinculada à escola com status pendente." },
    { icon: BadgeCheck, title: "2. Verificação pela escola", text: `A equipe da ${school?.name || "escola"} confirma seu vínculo com a comunidade. Só depois disso o selo de verificado aparece.` },
    { icon: Search, title: "3. Encontre profissionais", text: "Busque por nome, profissão ou serviço e filtre por categoria, cidade e avaliação." },
    { icon: MessageCircle, title: "4. Entre em contato", text: "Membros aprovados veem o WhatsApp do profissional e podem enviar pedidos de orçamento." },
    { icon: Handshake, title: "5. Parcerias entre profissionais", text: "Profissionais aprovados usam o mural para encontrar parceiros para projetos em conjunto." },
  ];
  return (
    <>
      <PageHeader eyebrow="Passo a passo" title="Como funciona">
        O Conecta Escola aproxima famílias e profissionais que já fazem parte da mesma comunidade escolar.
      </PageHeader>
      <div className="container-x py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="card p-6">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-mustard-light text-ink/70"><s.icon size={18} /></span>
              <h2 className="mt-4 text-lg font-bold">{s.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.text}</p>
            </div>
          ))}
          <div className="card border-amber-200 bg-amber-50/60 p-6">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-900"><ShieldAlert size={18} /></span>
            <h2 className="mt-4 text-lg font-bold">Limites da plataforma</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              O Conecta Escola não cobra comissão nem processa pagamentos. Orçamento, contratação, pagamento e eventuais disputas são combinados diretamente entre as partes.
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/cadastro" className="btn-primary">Criar minha conta <ArrowRight size={14} /></Link>
          <Link to="/profissionais" className="btn-ghost">Ver profissionais</Link>
        </div>
      </div>
    </>
  );
}
