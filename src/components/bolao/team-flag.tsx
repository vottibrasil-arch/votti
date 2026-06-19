import { useEffect, useState } from "react";

const SIZES = {
  xs: "w-7 h-5",
  sm: "w-10 h-7",
  md: "w-14 h-10",
  lg: "w-16 h-12",
  xl: "w-20 h-14",
} as const;

const INITIAL_SIZES = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-base",
} as const;

type TeamFlagProps = {
  code: string;
  escudoUrl?: string | null;
  teamName?: string;
  size?: keyof typeof SIZES;
  className?: string;
};

function teamInitial(teamName?: string) {
  const trimmed = teamName?.trim();
  if (!trimmed) return "⚽";
  return trimmed.charAt(0).toUpperCase();
}

function TeamInitialBadge({
  teamName,
  size,
  className,
}: {
  teamName?: string;
  size: keyof typeof SIZES;
  className: string;
}) {
  return (
    <div
      className={`${SIZES[size]} ${INITIAL_SIZES[size]} object-cover rounded-[4px] shadow-sm border border-white/10 bg-surface-2 text-foreground font-bold flex items-center justify-center shrink-0 ${className}`}
      aria-hidden
    >
      {teamInitial(teamName)}
    </div>
  );
}

/** Escudo do time, bandeira conhecida ou inicial do nome. */
export function TeamFlag({ code, escudoUrl, teamName, size = "md", className = "" }: TeamFlagProps) {
  const [failedEscudo, setFailedEscudo] = useState(false);
  const [failedFlag, setFailedFlag] = useState(false);

  useEffect(() => {
    setFailedEscudo(false);
    setFailedFlag(false);
  }, [code, escudoUrl, teamName]);

  if (escudoUrl && !failedEscudo) {
    return (
      <img
        src={escudoUrl}
        alt=""
        className={`${SIZES[size]} object-cover rounded-[4px] shadow-sm border border-white/10 ${className}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailedEscudo(true)}
      />
    );
  }

  if (code && code !== "xx" && !failedFlag) {
    return (
      <img
        src={`/flags/${code}.png`}
        alt=""
        className={`${SIZES[size]} object-cover rounded-[4px] shadow-sm border border-white/10 ${className}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailedFlag(true)}
      />
    );
  }

  return <TeamInitialBadge teamName={teamName} size={size} className={className} />;
}
