import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentBody } from "@/components/votti/legal/legal-document-body";
import { LegalPublicPage } from "@/components/votti/legal/legal-public-page";
import { VOTTI_PRIVACY_POLICY } from "@/lib/votti/legal-content";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "VOTTI — Política de Privacidade" },
      {
        name: "description",
        content: "Política de Privacidade do VOTTI — como tratamos seus dados.",
      },
    ],
    links: [{ rel: "canonical", href: "/politica-de-privacidade" }],
  }),
  component: PoliticaPrivacidadePage,
});

function PoliticaPrivacidadePage() {
  return (
    <LegalPublicPage title={VOTTI_PRIVACY_POLICY.title}>
      <LegalDocumentBody document={VOTTI_PRIVACY_POLICY} />
    </LegalPublicPage>
  );
}
