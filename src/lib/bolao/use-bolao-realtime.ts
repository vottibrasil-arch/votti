import { useCallback, useEffect, useRef, useState } from "react";

import type { RealtimeChannel } from "@supabase/supabase-js";



const FALLBACK_REFRESH_MS = 60_000;



export type BolaoRealtimeStatus = "idle" | "connecting" | "connected" | "disconnected";



type UseBolaoRealtimeOptions = {

  slug: string | null | undefined;

  bolaoId: string | null | undefined;

  partidaId: number | null | undefined;

  enabled: boolean;

  onRefresh: () => void | Promise<void>;

};



export function useBolaoRealtime({

  slug,

  bolaoId,

  partidaId,

  enabled,

  onRefresh,

}: UseBolaoRealtimeOptions) {

  const [status, setStatus] = useState<BolaoRealtimeStatus>("idle");

  const onRefreshRef = useRef(onRefresh);

  onRefreshRef.current = onRefresh;



  const refreshManual = useCallback(() => {

    void onRefreshRef.current();

  }, []);



  useEffect(() => {

    if (!enabled || !slug || !bolaoId) {

      setStatus("idle");

      return;

    }



    let cancelled = false;

    let channel: RealtimeChannel | null = null;

    let fallbackTimer: ReturnType<typeof setInterval> | null = null;



    const stopFallback = () => {

      if (fallbackTimer !== null) {

        clearInterval(fallbackTimer);

        fallbackTimer = null;

      }

    };



    const startFallback = () => {

      stopFallback();

      fallbackTimer = setInterval(() => {

        if (!cancelled) void onRefreshRef.current();

      }, FALLBACK_REFRESH_MS);

    };



    const triggerRefresh = () => {

      if (!cancelled) void onRefreshRef.current();

    };



    async function setup() {

      setStatus("connecting");



      try {

        const { getSupabaseBrowser, isSupabaseBrowserConfigured } = await import("@/lib/api/supabase-browser");

        if (cancelled) return;



        if (!isSupabaseBrowserConfigured()) {

          setStatus("disconnected");

          startFallback();

          return;

        }



        const supabase = getSupabaseBrowser();

        channel = supabase.channel(`bolao-${slug}-${bolaoId}`);



        const participantesFilter = `bolao_id=eq.${bolaoId}`;



        for (const event of ["INSERT", "UPDATE", "DELETE"] as const) {

          channel.on(

            "postgres_changes",

            { event, schema: "public", table: "participantes", filter: participantesFilter },

            triggerRefresh,

          );

        }



        if (partidaId != null) {

          channel.on(

            "postgres_changes",

            { event: "UPDATE", schema: "public", table: "partidas", filter: `id=eq.${partidaId}` },

            triggerRefresh,

          );

        }



        channel.on(

          "postgres_changes",

          { event: "UPDATE", schema: "public", table: "boloes", filter: `id=eq.${bolaoId}` },

          triggerRefresh,

        );



        channel.subscribe((subscribeStatus) => {

          if (cancelled) return;



          if (subscribeStatus === "SUBSCRIBED") {

            setStatus("connected");

            stopFallback();

            return;

          }



          if (

            subscribeStatus === "CLOSED" ||

            subscribeStatus === "CHANNEL_ERROR" ||

            subscribeStatus === "TIMED_OUT"

          ) {

            setStatus("disconnected");

            startFallback();

          }

        });

      } catch {

        if (!cancelled) {

          setStatus("disconnected");

          startFallback();

        }

      }

    }



    void setup();



    return () => {

      cancelled = true;

      stopFallback();



      if (channel) {

        void import("@/lib/api/supabase-browser").then(({ getSupabaseBrowser }) => {

          void getSupabaseBrowser().removeChannel(channel!);

        });

      }



      setStatus("idle");

    };

  }, [enabled, slug, bolaoId, partidaId]);



  return { status, refreshManual };

}

