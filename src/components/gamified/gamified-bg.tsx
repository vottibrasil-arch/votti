import { LiveActivityFeed } from "@/components/landing/live-activity";
import { SecurityBackdrop } from "@/components/landing/security-backdrop";

type GamifiedBgProps = {
  feed?: boolean;
  securityTags?: boolean;
};

export function GamifiedBg({ feed = true, securityTags = false }: GamifiedBgProps) {
  return (
    <>
      <div className="votti-landing__bg" aria-hidden />
      <div className="votti-landing__grid" aria-hidden />
      {securityTags ? <SecurityBackdrop /> : null}
      {feed ? <LiveActivityFeed /> : null}
    </>
  );
}
