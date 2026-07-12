import { useState } from "react";
import { VOTTI_PRIVACY_POLICY, VOTTI_TERMS_OF_USE } from "@/lib/votti/legal-content";
import { LegalModal } from "@/components/votti/auth/legal-modal";

type LegalView = "terms" | "privacy" | null;

export function SignupLegalNotice() {
  const [view, setView] = useState<LegalView>(null);

  return (
    <>
      <p className="votti-auth__legal">
        Ao criar sua conta, você declara que leu e concorda com os{" "}
        <button type="button" className="votti-auth__legal-link" onClick={() => setView("terms")}>
          Termos de Uso
        </button>{" "}
        e a{" "}
        <button type="button" className="votti-auth__legal-link" onClick={() => setView("privacy")}>
          Política de Privacidade
        </button>{" "}
        do VOTTI.
      </p>

      {view === "terms" ? (
        <LegalModal legal={VOTTI_TERMS_OF_USE} onClose={() => setView(null)} />
      ) : null}
      {view === "privacy" ? (
        <LegalModal legal={VOTTI_PRIVACY_POLICY} onClose={() => setView(null)} />
      ) : null}
    </>
  );
}
