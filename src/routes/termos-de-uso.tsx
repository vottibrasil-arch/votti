import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentBody } from "@/components/votti/legal/legal-document-body";
import { LegalPublicPage } from "@/components/votti/legal/legal-public-page";
import { VOTTI_TERMS_OF_USE } from "@/lib/votti/legal-content";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "VOTTI — Termos de Uso" },
      {
        name: "description",
        content: "Termos de Uso do VOTTI — plataforma de votações online em tempo real.",
      },
    ],
    links: [{ rel: "canonical", href: "/termos-de-uso" }],
  }),
  component: TermosDeUsoPage,
});

function TermosDeUsoPage() {
  return (
    <LegalPublicPage title={VOTTI_TERMS_OF_USE.title}>
      <LegalDocumentBody document={VOTTI_TERMS_OF_USE} />
    </LegalPublicPage>
  );
}
