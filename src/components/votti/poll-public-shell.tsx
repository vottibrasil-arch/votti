import type { CSSProperties, ReactNode } from "react";
import type { StoredPoll } from "@/lib/votti/poll-types";

type PollPublicShellProps = {
  poll: StoredPoll;
  children: ReactNode;
};

export function PollPublicShell({ poll, children }: PollPublicShellProps) {
  const accent = poll.primaryColor || "#4F8FD9";

  return (
    <main
      className="votti-public-poll min-h-[100dvh] flex flex-col"
      style={{ "--poll-accent": accent } as CSSProperties}
    >
      {poll.coverUrl ? (
        <div
          className="votti-public-poll__bg"
          style={{ backgroundImage: `url(${poll.coverUrl})` }}
          aria-hidden
        />
      ) : null}
      <div
        className="votti-public-poll__overlay"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, ${accent} 28%, transparent) 0%, oklch(0.14 0.04 260 / 92%) 45%, oklch(0.12 0.04 260 / 98%) 100%)`,
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
