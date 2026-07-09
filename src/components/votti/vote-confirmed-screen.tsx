import { CheckCircle2 } from "lucide-react";

type VoteSuccessBannerProps = {
  className?: string;
};

/** Banner compacto após confirmar voto — ranking fica visível logo abaixo. */
export function VoteSuccessBanner({ className = "" }: VoteSuccessBannerProps) {
  return (
    <div className={`votti-vote-success-banner animate-rise ${className}`.trim()} role="status" aria-live="polite">
      <div className="votti-vote-success-banner__icon" aria-hidden>
        <CheckCircle2 className="size-5" strokeWidth={2.25} />
      </div>
      <div className="votti-vote-success-banner__copy">
        <p className="votti-vote-success-banner__title">Sua votação foi registrada com sucesso!</p>
        <p className="votti-vote-success-banner__hint">Confira seu voto no ranking ao vivo.</p>
      </div>
    </div>
  );
}

/** @deprecated Use VoteSuccessBanner — tela cheia removida do fluxo. */
export function VoteConfirmedScreen({
  subtitle = "Confira o ranking ao vivo abaixo.",
}: {
  subtitle?: string;
}) {
  return (
    <div className="votti-vote-success-banner animate-rise" role="status">
      <div className="votti-vote-success-banner__icon" aria-hidden>
        <CheckCircle2 className="size-5" strokeWidth={2.25} />
      </div>
      <div className="votti-vote-success-banner__copy">
        <p className="votti-vote-success-banner__title">Sua votação foi registrada com sucesso!</p>
        <p className="votti-vote-success-banner__hint">{subtitle}</p>
      </div>
    </div>
  );
}
