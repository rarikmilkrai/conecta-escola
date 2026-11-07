import { useState } from "react";
import { api, useAuth, usePageTitle } from "../lib";
import { Alert, Field, Input, PageHeader, Textarea } from "../ui";

export default function Contato() {
  usePageTitle("Contato");
  const { user } = useAuth();
  const [f, setF] = useState({ name: user?.name || "", email: user?.email || "", subject: "", message: "" });
  const [st, setSt] = useState<{ busy?: boolean; err?: string; ok?: boolean; fields?: Record<string, string> }>({});
  const fe = st.fields || {};
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <PageHeader eyebrow="Fale com a equipe" title="Contato">
        Dúvidas sobre o cadastro, sugestões ou problemas? Envie uma mensagem para a equipe da escola.
      </PageHeader>
      <div className="container-x py-10">
        <div className="card mx-auto max-w-xl p-6 sm:p-8">
          {st.ok ? (
            <div className="space-y-4">
              <Alert kind="success">Mensagem enviada! A equipe vai responder pelo e-mail informado.</Alert>
              <button className="btn-ghost" onClick={() => { setSt({}); setF({ ...f, subject: "", message: "" }); }}>Enviar outra mensagem</button>
            </div>
          ) : (
            <form
              className="space-y-4"
              noValidate
              onSubmit={async (e) => {
                e.preventDefault();
                setSt({ busy: true });
                try {
                  await api("/contact", { body: f });
                  setSt({ ok: true });
                } catch (e: any) {
                  setSt({ err: e.message, fields: e.fields });
                }
              }}
            >
              {st.err && <Alert>{st.err}</Alert>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="ct-name" label="Nome" error={fe.name}><Input id="ct-name" value={f.name} onChange={set("name")} error={fe.name} autoComplete="name" /></Field>
                <Field id="ct-email" label="E-mail" error={fe.email}><Input id="ct-email" type="email" value={f.email} onChange={set("email")} error={fe.email} autoComplete="email" /></Field>
              </div>
              <Field id="ct-subj" label="Assunto" error={fe.subject}><Input id="ct-subj" value={f.subject} onChange={set("subject")} error={fe.subject} /></Field>
              <Field id="ct-msg" label="Mensagem" error={fe.message}><Textarea id="ct-msg" rows={6} value={f.message} onChange={set("message")} error={fe.message} /></Field>
              <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? "Enviando…" : "Enviar mensagem"}</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
