import { Fingerprint, Gift, ShieldCheck } from "lucide-react";
import { SecurityBadge } from "@/components/votti/security-badge";

export { SecurityBadge };

const TRUST = [
  {
    icon: Gift,
    label: "Gratuito",
    hint: "sem plano, sem limite escondido",
  },
  {
    icon: Fingerprint,
    label: "1 voto por IP",
    hint: "cada pessoa vota uma vez",
  },
  {
    icon: ShieldCheck,
    label: "Proteção anti-fraude",
    hint: "votos duplicados bloqueados",
  },
] as const;

export function TrustStrip() {
  return (
    <section className="votti-trust" aria-label="Confiança e segurança">
      <div className="votti-trust__headline">
        <ShieldCheck className="votti-trust__headline-icon" strokeWidth={2} aria-hidden />
        <p className="votti-trust__headline-text">
          O sistema de votação <strong>mais seguro do Brasil</strong>
        </p>
      </div>

      <div className="votti-trust__row">
        {TRUST.map(({ icon: Icon, label, hint }) => (
          <div key={label} className="votti-trust__item">
            <Icon className="votti-trust__icon" strokeWidth={1.75} aria-hidden />
            <div>
              <p className="votti-trust__label">{label}</p>
              <p className="votti-trust__hint">{hint}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

