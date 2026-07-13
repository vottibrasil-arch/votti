type PollLiveBadgeProps = {
  label?: string;
  syncing?: boolean;
  className?: string;
};

/** Badge único “AO VIVO” — vermelho e piscando quando ativo. */
export function PollLiveBadge({
  label,
  syncing = false,
  className = "",
}: PollLiveBadgeProps) {
  const text = label ?? (syncing ? "CONECTANDO…" : "AO VIVO");

  return (
    <span
      className={`votti-live-badge ${syncing ? "votti-live-badge--sync" : "votti-live-badge--on"} ${className}`.trim()}
    >
      <span className="votti-live-badge__dot" aria-hidden />
      {text}
    </span>
  );
}
