import { Link } from "@tanstack/react-router";
import { VOTTII_DISPLAY_NAME } from "@/lib/votti/brand";
import { VottiLogoMark } from "@/components/votti-logo-mark";

type LogoProps = {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  to?: string;
  className?: string;
};

export function Logo({ size = "md", to, className = "" }: LogoProps) {
  const mark = <VottiLogoMark size={size} className={className} />;
  const wrapperClass = "inline-flex items-center";

  if (to) {
    return (
      <Link
        to={to}
        className={`${wrapperClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg`}
        aria-label={`${VOTTII_DISPLAY_NAME} — início`}
      >
        {mark}
      </Link>
    );
  }

  return <div className={wrapperClass}>{mark}</div>;
}
