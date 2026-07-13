import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { LegalPublicPage } from "@/components/votti/legal/legal-public-page";
import { useLegalModals } from "@/lib/votti/use-legal-modals";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "VOTTII — Contato" },
      {
        name: "description",
        content: "Entre em contato com o VOTTII — dúvidas, sugestões e suporte.",
      },
    ],
    links: [{ rel: "canonical", href: "/contato" }],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  const { open } = useLegalModals();

  useEffect(() => {
    open("contact");
  }, [open]);

  return (
    <LegalPublicPage title="Contato">
      <p className="votti-legal-modal__text">
        Use o formulário de contato para enviar sua mensagem à equipe VOTTII.
      </p>
    </LegalPublicPage>
  );
}
