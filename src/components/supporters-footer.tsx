import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SupporterMonetizationCard } from "@/components/footer/supporter-monetization-card";
import { getPublicApoiadoresData } from "@/lib/api/apoiadores.server";
import { getFooterAdConfig } from "@/lib/footer-ad";
import { SUPPORTERS, type Supporter } from "@/lib/bolao";

import { DEMO_FLOW_PATHS } from "@/lib/demo-flow";

const HIDE_ON = new Set<string>(["/", "/super-admin"]);
const REFRESH_MS = 30_000;
const ROTATION_MS = 6_000;
const COPYRIGHT =
  "Palpite Gol · Feito para a galera que ama viver cada lance.";

function toSupporterProfile(s: Supporter) {
  return {
    id: s.id,
    name: s.name,
    city: s.city,
    initial: s.initial,
    color: s.color,
    message: s.message,
  };
}

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
  const [adsenseFooterSlot, setAdsenseFooterSlot] = useState<string | null>(null);

  const loadFooterData = useCallback(async () => {
    try {
      const data = await getPublicDataFn();
      setVisible(data.propagandaRodapeVisivel);
      setAdsenseFooterSlot(data.adsenseFooterSlot ?? null);
      if (data.apoiadores.length > 0) {
        setSupporters(data.apoiadores);
      }
    } catch {
      setVisible(true);
      setSupporters(SUPPORTERS);
      setAdsenseFooterSlot(null);
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
    const t = setInterval(() => setIdx((i) => (i + 1) % rotation.length), ROTATION_MS);
    return () => clearInterval(t);
  }, [rotation.length]);

  if (HIDE_ON.has(pathname) || DEMO_FLOW_PATHS.has(pathname)) return null;

  if (!visible) return <CopyrightFooter />;

  const supporter = rotation[idx % rotation.length];

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)] pointer-events-none"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--background) 90%, transparent) 30%, var(--background) 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-md px-2 pb-2 pointer-events-auto md:max-w-2xl">
        <SupporterMonetizationCard
          supporter={toSupporterProfile(supporter)}
          adConfig={getFooterAdConfig(undefined, adsenseFooterSlot)}
        />
      </div>
    </div>
  );
}
