import type { SupporterProfile } from "@/lib/footer-ad";

type Props = {
  supporter: SupporterProfile;
};

export function SupporterProfilePanel({ supporter }: Props) {
  return (
    <div className="flex h-full flex-col justify-start gap-1 px-2.5 py-2 md:px-3">
      <div className="text-[11px] font-semibold leading-none text-emerald-400">🟢 Deixe seu recado</div>

      <div className="mt-0.5 flex items-center gap-1.5">
        {supporter.avatarUrl ? (
          <img
            src={supporter.avatarUrl}
            alt=""
            className="size-[34px] shrink-0 rounded-md border border-border/60 object-cover"
          />
        ) : (
          <div
            className="grid size-[34px] shrink-0 place-items-center rounded-md font-display text-xs font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${supporter.color}, color-mix(in oklab, ${supporter.color} 45%, var(--surface)))`,
            }}
          >
            {supporter.initial}
          </div>
        )}

        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[11px] font-semibold text-foreground md:text-[12px]">{supporter.name}</div>
          <div className="truncate text-[9px] text-muted-foreground md:text-[10px]">{supporter.city}</div>
        </div>
      </div>

      <div className="mt-1 flex-1 rounded-lg bg-[color-mix(in_oklab,var(--surface-2)_72%,transparent)] px-2 py-1.5 text-[10px] leading-relaxed text-foreground/92 md:text-[11px]">
        <p className="line-clamp-3">
        {supporter.message?.trim()
          ? `“${supporter.message.trim()}”`
          : "Boa sorte a todos os participantes."}
        </p>
      </div>
    </div>
  );
}
