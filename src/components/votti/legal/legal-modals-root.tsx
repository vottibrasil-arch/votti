import { VOTTII_PRIVACY_POLICY, VOTTII_TERMS_OF_USE } from "@/lib/votti/legal-content";
import { useLegalModals } from "@/lib/votti/use-legal-modals";
import { ContactLegalModal } from "@/components/votti/legal/contact-legal-modal";
import { DocumentLegalModal } from "@/components/votti/legal/document-legal-modal";
import { ReportLegalModal } from "@/components/votti/legal/report-legal-modal";

export function LegalModalsRoot() {
  const { view, reportPollUrl, close } = useLegalModals();

  if (!view) return null;

  if (view === "terms") {
    return <DocumentLegalModal document={VOTTII_TERMS_OF_USE} onClose={close} />;
  }

  if (view === "privacy") {
    return <DocumentLegalModal document={VOTTII_PRIVACY_POLICY} onClose={close} />;
  }

  if (view === "contact") {
    return <ContactLegalModal onClose={close} />;
  }

  return <ReportLegalModal pollUrl={reportPollUrl} onClose={close} />;
}
