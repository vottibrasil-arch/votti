import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Heart } from "lucide-react";
import { getPublicApoiadoresData } from "@/lib/api/apoiadores.server";
import { SUPPORTERS, type Supporter } from "@/lib/bolao";

import { DEMO_FLOW_PATHS } from "@/lib/demo-flow";

const HIDE_ON = new Set<string>(["/", "/super-admin"]);
const REFRESH_MS = 30_000;
const COPYRIGHT =
  "Palpite Gol · Feito para a galera que ama viver cada lance.";

function CopyrightFooter() {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)] pointer-events-none"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--background) 85%, transparent) 40%, var(--background) 100%)",
      }}
    >
      <p className="mx-auto max-w-md px-4 pb-3 text-center text-[11px] text-foreground/65 leading-relaxed">
        © {new Date().getFullYear()} {COPYRIGHT}
      </p>
    </div>
  );
}

export function SupportersFooter() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const getPublicDataFn = useServerFn(getPublicApoiadoresData);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [supporters, setSupporters] = useState<Supporter[]>(SUPPORTERS);

  const loadFooterData = useCallback(async () => {
    try {
      const data = await getPublicDataFn();
      setVisible(data.propagandaRodapeVisivel);
      if (data.apoiadores.length > 0) {
        setSupporters(data.apoiadores);
      }
    } catch {
      setVisible(true);
      setSupporters(SUPPORTERS);
    }
  }, [getPublicDataFn]);

  useEffect(() => {
    void loadFooterData();
  }, [loadFooterData, pathname]);

  useEffect(() => {
    const t = setInterval(() => void loadFooterData(), REFRESH_MS);
    return () => clearInterval(t);
  }, [loadFooterData]);

  const rotation = useMemo(() => (supporters.length > 0 ? supporters : SUPPORTERS), [supporters]);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % rotation.length), 30_000);
    return () => clearInterval(t);
  }, [rotation.length]);

  if (HIDE_ON.has(pathname) || DEMO_FLOW_PATHS.has(pathname)) return null;

  if (!visible) return <CopyrightFooter />;
  const s = rotation[idx % rotation.length];

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      style={{ background: "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--background) 80%, transparent) 25%, var(--background) 70%)" }}
    >
      <div className="mx-auto max-w-md px-3 pb-3">
        <div className="flex items-center justify-between text-[11px] mb-1.5 px-1">
          <span key={`msg-${s.id}`} className="text-muted-foreground truncate animate-rise">
            💬 <span className="text-foreground/90 font-medium">{s.message}</span>
          </span>
          <Link to="/apoiar" className="inline-flex items-center gap-1 font-semibold text-primary shrink-0">
            <Heart className="size-3 fill-current" /> Apoie o Palpite Gol
          </Link>
        </div>

        <div className="rounded-2xl glass overflow-hidden grid grid-cols-[35%_65%]">
          <div key={s.id} className="flex items-center gap-2 p-2 animate-rise border-r border-border/70">
            <div
              className="size-10 rounded-xl grid place-items-center font-display font-bold text-base shrink-0"
              style={{ background: `linear-gradient(135deg, ${s.color}, color-mix(in oklab, ${s.color} 50%, var(--surface)))`, color: "white" }}
            >
              {s.initial}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs truncate">{s.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{s.city}</div>
            </div>
          </div>

          <Link
            to="/apoiar"
            className="relative flex items-center justify-center px-3 py-2 overflow-hidden"
            style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--gold) 22%, var(--surface)), color-mix(in oklab, var(--primary) 18%, var(--surface)))" }}
          >
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-[0.18em] text-gold font-bold">Espaço do apoiador</div>
              <div className="font-display font-bold text-xs mt-0.5">Seu nome aqui ✨</div>
              <div className="text-[10px] text-muted-foreground">A cada 30s um apoiador</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
