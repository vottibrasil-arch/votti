import { useEffect, useState } from "react";
import type { StoredPoll } from "@/lib/votti/poll-types";
import { getPollCoverUrl } from "@/lib/votti/poll-types";

type PollCoverHeroProps = {
  poll: StoredPoll;
  children: React.ReactNode;
  className?: string;
};

function CoverImage({ src, className }: { src: string; className: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return <div className={`${className} votti-vote-hero__cover--accent`} aria-hidden />;
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/** Cabeçalho da votação com capa visível no topo e conteúdo abaixo. */
export function PollCoverHero({ poll, children, className = "" }: PollCoverHeroProps) {
  const coverUrl = getPollCoverUrl(poll);

  return (
    <div
      className={`votti-vote-hero votti-vote-hero--branded ${coverUrl ? "votti-vote-hero--cover" : "votti-vote-hero--minimal"} animate-rise ${className}`.trim()}
    >
      {coverUrl ? (
        <CoverImage src={coverUrl} className="votti-vote-hero__cover" />
      ) : (
        <div className="votti-vote-hero__cover votti-vote-hero__cover--accent" aria-hidden />
      )}
      <div className="votti-vote-hero__body">{children}</div>
    </div>
  );
}
