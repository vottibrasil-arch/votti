import type { LegalDocument } from "@/lib/votti/legal-content";
import { LegalDocumentBody } from "@/components/votti/legal/legal-document-body";
import { LegalModalShell } from "@/components/votti/legal/legal-modal-shell";

type DocumentLegalModalProps = {
  document: LegalDocument;
  onClose: () => void;
};

export function DocumentLegalModal({ document, onClose }: DocumentLegalModalProps) {
  return (
    <LegalModalShell title={document.title} onClose={onClose}>
      <LegalDocumentBody document={document} />
    </LegalModalShell>
  );
}
