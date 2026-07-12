import { VOTTII_DISPLAY_NAME, VOTTII_WORDMARK_PREFIX, VOTTII_WORDMARK_SUFFIX } from "@/lib/votti/brand";

type VottiLogoMarkProps = {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  showTagline?: boolean;
  className?: string;
};

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 108"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M18 18h72a10 10 0 0 1 10 10v44a10 10 0 0 1-10 10H52l-16 14v-14H18a10 10 0 0 1-10-10V28a10 10 0 0 1 10-10Z"
        stroke="url(#votti-bubble)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M34 58 50 74 86 38"
        stroke="url(#votti-check)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="votti-bubble" x1="12" y1="14" x2="98" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F8FD9" />
          <stop offset="1" stopColor="#7CB8FF" />
        </linearGradient>
        <linearGradient id="votti-check" x1="34" y1="38" x2="86" y2="74" gradientUnits="userSpaceOnUse">
          <stop stopColor="#39D98A" />
          <stop offset="1" stopColor="#B8F04A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function WordmarkSuffix() {
  return (
    <span className="votti-wordmark__suffix" aria-hidden>
      {VOTTII_WORDMARK_SUFFIX.split("").map((letter, index) => (
        <span key={index} className="votti-wordmark__i">
          {letter}
          <span className="votti-wordmark__dot" />
        </span>
      ))}
    </span>
  );
}

export function VottiLogoMark({ size = "md", showTagline, className = "" }: VottiLogoMarkProps) {
  const withTagline = showTagline ?? (size === "hero" || size === "xl" || size === "lg");

  return (
    <div
      className={`votti-logo votti-logo--${size} ${className}`.trim()}
      role="img"
      aria-label={`${VOTTII_DISPLAY_NAME} — Vote. Compartilhe. Acompanhe ao vivo.`}
    >
      <LogoIcon className="votti-logo__icon" />
      <div className="votti-logo__text">
        <p className="votti-wordmark">
          <span className="votti-wordmark__prefix">{VOTTII_WORDMARK_PREFIX}</span>
          <WordmarkSuffix />
        </p>
        {withTagline ? (
          <>
            <div className="votti-logo__divider" aria-hidden>
              <span className="votti-logo__divider-line votti-logo__divider-line--blue" />
              <span className="votti-logo__divider-dot votti-logo__divider-dot--blue" />
              <span className="votti-logo__divider-dot votti-logo__divider-dot--cyan" />
              <span className="votti-logo__divider-dot votti-logo__divider-dot--green" />
              <span className="votti-logo__divider-line votti-logo__divider-line--green" />
            </div>
            <p className="votti-logo__tagline">
              <span className="votti-logo__tagline-blue">Vote.</span>{" "}
              <span className="votti-logo__tagline-white">Compartilhe.</span>{" "}
              <span className="votti-logo__tagline-green">Acompanhe ao vivo.</span>
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
