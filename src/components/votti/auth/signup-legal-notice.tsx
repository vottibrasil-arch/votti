import { useLegalModals } from "@/lib/votti/use-legal-modals";

type SignupLegalNoticeProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function SignupLegalNotice({ checked, onCheckedChange }: SignupLegalNoticeProps) {
  const { open } = useLegalModals();

  return (
    <label className="votti-auth__legal-check">
      <input
        type="checkbox"
        className="votti-auth__legal-checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <span className="votti-auth__legal-check-text">
        Ao criar sua conta, você declara que leu e concorda com os{" "}
        <button
          type="button"
          className="votti-auth__legal-link"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            open("terms");
          }}
        >
          Termos de Uso
        </button>{" "}
        e a{" "}
        <button
          type="button"
          className="votti-auth__legal-link"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            open("privacy");
          }}
        >
          Política de Privacidade
        </button>{" "}
        do VOTTI.
      </span>
    </label>
  );
}
