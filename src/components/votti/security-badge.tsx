import { ShieldCheck } from "lucide-react";

type SecurityBadgeProps = {
  className?: string;
  compact?: boolean;
};

export function SecurityBadge({ className = "", compact = false }: SecurityBadgeProps) {
  return (
    <p
      className={[
        "votti-security-badge",
        compact ? "votti-security-badge--compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ShieldCheck className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
      <span>O mais seguro do Brasil</span>
    </p>
  );
}
