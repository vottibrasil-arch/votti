import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { normalizeImageUrl } from "@/lib/votti/persist-image-url";

type RankingOptionAvatarProps = {
  src: string | undefined | null;
  size: number;
  className?: string;
  lead?: boolean;
  style?: React.CSSProperties;
  title?: string;
};

export function RankingOptionAvatar({
  src,
  size,
  className = "",
  lead = false,
  style,
  title,
}: RankingOptionAvatarProps) {
  const [failed, setFailed] = useState(false);
  const url = normalizeImageUrl(src);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (!url || failed) {
    return (
      <span
        className={`ranking-option-avatar ranking-option-avatar--fallback ${lead ? "ranking-option-avatar--lead" : ""} ${className}`.trim()}
        style={{ width: size, height: size, ...style }}
        title={title}
        aria-hidden={title ? undefined : true}
      >
        <UserRound className="size-[55%]" strokeWidth={2} />
      </span>
    );
  }

  return (
    <img
      src={url}
      alt=""
      title={title}
      width={size}
      height={size}
      className={`ranking-option-avatar ${lead ? "ranking-option-avatar--lead" : ""} ${className}`.trim()}
      style={{ width: size, height: size, ...style }}
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
