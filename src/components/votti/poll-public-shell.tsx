import type { CSSProperties, ReactNode } from "react";
import { PublicLegalFooter } from "@/components/votti/legal/public-legal-footer";
import { getPollCoverUrl } from "@/lib/votti/poll-types";
import { pollPublicUrl } from "@/lib/votti/poll-store";
import type { StoredPoll } from "@/lib/votti/poll-types";

type PollPublicShellProps = {
  poll: StoredPoll;
  children: ReactNode;
  /** page = capa blur em tela cheia; minimal = só cor de fundo (capa no conteúdo) */
  coverStyle?: "page" | "minimal";
};

export function PollPublicShell({ poll, children, coverStyle = "page" }: PollPublicShellProps) {
  const accent = poll.primaryColor || "#4F8FD9";
  const button = poll.settings.buttonColor || accent;
  const bgColor = poll.settings.backgroundColor || "#0f1729";
  const coverUrl = getPollCoverUrl(poll);
  const showPageCover = coverStyle === "page" && Boolean(coverUrl);

  return (
    <main
      className={`votti-public-poll min-h-[100dvh] flex flex-col ${showPageCover ? "votti-public-poll--has-cover" : ""} ${coverStyle === "minimal" ? "votti-public-poll--minimal-cover" : ""}`}
      style={
        {
          "--poll-accent": accent,
          "--poll-button": button,
          "--poll-bg": bgColor,
          backgroundColor: bgColor,
        } as CSSProperties
      }
    >
      {showPageCover ? (
        <div
          className="votti-public-poll__bg"
          style={{ backgroundImage: `url(${coverUrl})` }}
          aria-hidden
        />
      ) : null}
      <div
        className="votti-public-poll__overlay"
        style={{
          background: showPageCover
            ? `linear-gradient(180deg, color-mix(in oklab, ${accent} 6%, transparent) 0%, color-mix(in oklab, ${bgColor} 35%, transparent) 52%, color-mix(in oklab, ${bgColor} 62%, transparent) 100%)`
            : coverStyle === "minimal" && coverUrl
              ? `linear-gradient(180deg, color-mix(in oklab, ${accent} 14%, ${bgColor}) 0%, color-mix(in oklab, ${bgColor} 96%, transparent) 100%)`
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
      <div className="votti-public-poll__inner flex-1 flex flex-col">
        {children}
        <PublicLegalFooter pollUrl={pollPublicUrl(poll.slug)} className="mt-auto" />
      </div>
    </main>
  );
}
