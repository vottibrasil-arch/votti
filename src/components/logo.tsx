import { Link } from "@tanstack/react-router";
import { VOTTII_DISPLAY_NAME } from "@/lib/votti/brand";

/** Altura máxima — melhor para logo vertical (ícone + nome + slogan). */
const HEIGHT = {
  xs: "h-9 sm:h-10",
  sm: "h-11 sm:h-12",
  md: "h-16 sm:h-[4.5rem]",
  lg: "h-24 sm:h-28",
  xl: "h-32 sm:h-36 max-h-[38vh]",
  hero: "h-48 sm:h-56 md:h-64 w-auto max-w-[min(100%,22rem)]",
} as const;

type LogoProps = {
  size?: keyof typeof HEIGHT;
  to?: string;
  className?: string;
};

export function Logo({ size = "md", to, className = "" }: LogoProps) {
  const img = (
    <img
      src="/logo-full.png"
      alt={`${VOTTII_DISPLAY_NAME} — Vote. Compartilhe. Acompanhe ao vivo.`}
      className={`${HEIGHT[size]} w-auto object-contain object-center logo-img`}
      draggable={false}
    />
  );

  const wrapperClass = `inline-flex items-center ${className}`;

  if (to) {
    return (
      <Link
        to={to}
        className={`${wrapperClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg`}
        aria-label={`${VOTTII_DISPLAY_NAME} — início`}
      >
        {img}
      </Link>
    );
  }

  return <div className={wrapperClass}>{img}</div>;
}
