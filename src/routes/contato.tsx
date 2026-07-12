import { createFileRoute } from "@tanstack/react-router";
import { LegalPublicPage } from "@/components/votti/legal/legal-public-page";
import { VOTTI_CONTACT_EMAIL } from "@/lib/votti/legal-emails";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "VOTTI — Contato" },
      {
        name: "description",
        content: "Entre em contato com o VOTTI — dúvidas, sugestões e suporte.",
      },
    ],
    links: [{ rel: "canonical", href: "/contato" }],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  const mailto = `mailto:${VOTTI_CONTACT_EMAIL}`;

  return (
    <LegalPublicPage
      title="Contato"
      action={
        <a href={mailto} className="votti-legal-modal__action">
          Enviar e-mail
        </a>
      }
    >
      <p className="votti-legal-modal__text">Para dúvidas, sugestões ou suporte:</p>
      <a href={mailto} className="votti-legal-modal__email">
        {VOTTI_CONTACT_EMAIL}
      </a>
    </LegalPublicPage>
  );
}
