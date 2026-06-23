import { Link } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";

type Props = {
  href?: string;
};

/** Fallback mínimo — só para providers que não sejam AdSense. */
export function FooterAdFallback({ href = "/apoiar" }: Props) {
  return (
    <div className="flex h-full w-full items-center justify-center gap-2 px-2 text-center">
      <Link
        to={href}
        className="inline-flex h-7 items-center gap-1 rounded-full border border-border/60 px-2.5 text-[10px] font-medium text-muted-foreground transition hover:text-foreground"
      >
        <Megaphone className="size-3" />
        Anunciar
      </Link>
    </div>
  );
}
