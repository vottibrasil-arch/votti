import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentBody } from "@/components/votti/legal/legal-document-body";
import { LegalPublicPage } from "@/components/votti/legal/legal-public-page";
import { VOTTII_TERMS_OF_USE } from "@/lib/votti/legal-content";
import { parseLegalReturnPath, validateLegalReturnSearch } from "@/lib/votti/legal-return";

export const Route = createFileRoute("/termos-de-uso")({
  validateSearch: validateLegalReturnSearch,
  head: () => ({
    meta: [
      { title: "VOTTII — Termos de Uso" },
      {
        name: "description",
        content: "Termos de Uso do VOTTII — plataforma de votações online em tempo real.",
      },
    ],
    links: [{ rel: "canonical", href: "/termos-de-uso" }],
  }),
  component: TermosDeUsoPage,
});

function TermosDeUsoPage() {
  const { from } = Route.useSearch();
  const backTo = parseLegalReturnPath(from) ?? "/";

  return (
    <LegalPublicPage title={VOTTII_TERMS_OF_USE.title} backTo={backTo}>
      <LegalDocumentBody document={VOTTII_TERMS_OF_USE} />
    </LegalPublicPage>
  );
}
