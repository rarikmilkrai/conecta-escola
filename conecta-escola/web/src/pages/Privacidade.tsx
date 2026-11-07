import { usePageTitle, useSite } from "../lib";
import { PageHeader } from "../ui";

export default function Privacidade() {
  usePageTitle("Termos e privacidade");
  const { school } = useSite();
  const s = school?.name || "escola";
  return (
    <>
      <PageHeader eyebrow="Transparência" title="Termos de uso e privacidade" />
      <div className="container-x py-10">
        <div className="card mx-auto max-w-3xl space-y-5 p-6 text-sm leading-relaxed text-ink-soft sm:p-8">
          <div className="rounded-xl bg-amber-50 p-4 text-amber-900">
            <b>Projeto escolar.</b> O Conecta Escola é um projeto desenvolvido por alunos da {s} para apresentação. Os dados cadastrados são usados apenas
            durante a demonstração e serão apagados ao final do projeto.
          </div>
          <section>
            <h2 className="mb-1.5 text-base font-bold text-ink">Quais dados coletamos</h2>
            <p>Nome, e-mail e telefone no cadastro. Profissionais podem adicionar, por vontade própria, profissão, descrição, cidade/bairro, serviços e WhatsApp de contato.</p>
          </section>
          <section>
            <h2 className="mb-1.5 text-base font-bold text-ink">Para que usamos</h2>
            <p>Para verificar o vínculo com a comunidade escolar, exibir perfis profissionais e permitir o contato entre membros aprovados. Não vendemos nem compartilhamos dados com terceiros.</p>
          </section>
          <section>
            <h2 className="mb-1.5 text-base font-bold text-ink">Quem vê seus dados</h2>
            <p>Visitantes veem apenas informações públicas do perfil profissional (nome, profissão, descrição e cidade aproximada). Telefone e WhatsApp só aparecem para membros aprovados. A equipe administradora vê os dados necessários para a verificação. Senhas são armazenadas de forma criptografada e ninguém tem acesso a elas.</p>
          </section>
          <section>
            <h2 className="mb-1.5 text-base font-bold text-ink">Seus direitos (LGPD)</h2>
            <p>Você pode corrigir seus dados em Minha conta e pedir a exclusão da sua conta a qualquer momento pela página de Contato.</p>
          </section>
          <section>
            <h2 className="mb-1.5 text-base font-bold text-ink">Responsabilidades</h2>
            <p>A plataforma facilita a descoberta e o contato, mas não intermedia contratação nem pagamento. Valores, prazos, qualidade do serviço e eventuais disputas são combinados diretamente entre as partes. Avaliações refletem a opinião de membros e não comprovam contratação.</p>
          </section>
        </div>
      </div>
    </>
  );
}
