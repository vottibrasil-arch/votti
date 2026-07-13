import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentBody } from "@/components/votti/legal/legal-document-body";
import { LegalPublicPage } from "@/components/votti/legal/legal-public-page";
import { VOTTII_PRIVACY_POLICY } from "@/lib/votti/legal-content";
import { parseLegalReturnPath, validateLegalReturnSearch } from "@/lib/votti/legal-return";

export const Route = createFileRoute("/politica-de-privacidade")({
  validateSearch: validateLegalReturnSearch,
  head: () => ({
    meta: [
      { title: "VOTTII — Política de Privacidade" },
      {
        name: "description",
        content: "Política de Privacidade do VOTTII — como tratamos seus dados.",
      },
    ],
    links: [{ rel: "canonical", href: "/politica-de-privacidade" }],
  }),
  component: PoliticaPrivacidadePage,
});

function PoliticaPrivacidadePage() {
  const { from } = Route.useSearch();
  const backTo = parseLegalReturnPath(from) ?? "/";

  return (
    <LegalPublicPage title={VOTTII_PRIVACY_POLICY.title} backTo={backTo}>
      <LegalDocumentBody document={VOTTII_PRIVACY_POLICY} />
    </LegalPublicPage>
  );
}
