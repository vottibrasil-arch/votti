import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/api/supabase-browser";

const FALLBACK_REFRESH_MS = 60_000;

export type PollRealtimeStatus = "idle" | "connecting" | "connected" | "disconnected";

type UsePollRealtimeOptions = {
  pollId: string | null | undefined;
  enabled: boolean;
  onRefresh: () => void | Promise<void>;
};

export function usePollRealtime({ pollId, enabled, onRefresh }: UsePollRealtimeOptions) {
  const [status, setStatus] = useState<PollRealtimeStatus>("idle");
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const refreshManual = useCallback(() => {
    void onRefreshRef.current();
  }, []);

  useEffect(() => {
    if (!enabled || !pollId || !isSupabaseBrowserConfigured()) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;

    const setup = async () => {
      setStatus("connecting");

      try {
        const supabase = getSupabaseBrowser();
        channel = supabase
          .channel(`poll:${pollId}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "votes", filter: `poll_id=eq.${pollId}` },
            () => {
              void onRefreshRef.current();
            },
          )
          .subscribe((state) => {
            if (cancelled) return;
            if (state === "SUBSCRIBED") setStatus("connected");
            if (state === "CLOSED" || state === "CHANNEL_ERROR") setStatus("disconnected");
          });

        fallbackTimer = setInterval(() => {
          void onRefreshRef.current();
        }, FALLBACK_REFRESH_MS);
      } catch {
        if (!cancelled) setStatus("disconnected");
      }
    };

    void setup();

    return () => {
      cancelled = true;
      if (fallbackTimer) clearInterval(fallbackTimer);
      if (channel) void channel.unsubscribe();
      setStatus("idle");
    };
  }, [pollId, enabled]);

  return { status, refreshManual };
}
