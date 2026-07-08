import type { CSSProperties, ReactNode } from "react";
import { getPollCoverUrl } from "@/lib/votti/poll-types";
import type { StoredPoll } from "@/lib/votti/poll-types";

type PollPublicShellProps = {
  poll: StoredPoll;
  children: ReactNode;
};

export function PollPublicShell({ poll, children }: PollPublicShellProps) {
  const accent = poll.primaryColor || "#4F8FD9";
  const button = poll.settings.buttonColor || accent;
  const bgColor = poll.settings.backgroundColor || "#0f1729";
  const coverUrl = getPollCoverUrl(poll);

  return (
    <main
      className={`votti-public-poll min-h-[100dvh] flex flex-col ${coverUrl ? "votti-public-poll--has-cover" : ""}`}
      style={
        {
          "--poll-accent": accent,
          "--poll-button": button,
          backgroundColor: bgColor,
        } as CSSProperties
      }
    >
      {coverUrl ? (
        <div
          className="votti-public-poll__bg"
          style={{ backgroundImage: `url(${coverUrl})` }}
          aria-hidden
        />
      ) : null}
      <div
        className="votti-public-poll__overlay"
        style={{
          background: coverUrl
            ? `linear-gradient(180deg, color-mix(in oklab, ${accent} 6%, transparent) 0%, color-mix(in oklab, ${bgColor} 35%, transparent) 52%, color-mix(in oklab, ${bgColor} 62%, transparent) 100%)`
            : `linear-gradient(180deg, color-mix(in oklab, ${accent} 28%, transparent) 0%, color-mix(in oklab, ${bgColor} 92%, transparent) 45%, color-mix(in oklab, ${bgColor} 98%, transparent) 100%)`,
        }}
        aria-hidden
      />
      <div
        className="votti-public-poll__glow"
        style={{
          background: `radial-gradient(ellipse at 50% -10%, color-mix(in oklab, ${accent} 45%, transparent), transparent 65%)`,
        }}
        aria-hidden
      />
      <div className="votti-public-poll__grid" aria-hidden />
      <div className="votti-public-poll__inner flex-1 flex flex-col">{children}</div>
    </main>
  );
}
