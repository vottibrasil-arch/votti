import { useCallback, useEffect, useRef, useState } from "react";

import { fetchPollRanking, type PollRankingLiveStatus } from "@/lib/votti/ranking/client";
import type { PollRankingState } from "@/lib/votti/ranking/types";

const POLL_MS = 2_000;

type UsePollRankingLiveOptions = {
  slug: string;
  enabled?: boolean;
};

export function usePollRankingLive({ slug, enabled = true }: UsePollRankingLiveOptions) {
  const [state, setState] = useState<PollRankingState | null>(null);
  const [status, setStatus] = useState<PollRankingLiveStatus>("idle");
  const [error, setError] = useState("");
  const versionRef = useRef(0);

  const applyState = useCallback((next: PollRankingState) => {
    if (next.version === versionRef.current) return;
    versionRef.current = next.version;
    setState(next);
    setError("");
  }, []);

  const refreshManual = useCallback(async () => {
    const data = await fetchPollRanking(slug);
    if (data) applyState(data);
    return data;
  }, [slug, applyState]);

  useEffect(() => {
    if (!enabled || !slug.trim()) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const poll = () => {
      void fetchPollRanking(slug)
        .then((data) => {
          if (cancelled) return;
          if (!data) {
            setError("Votação não encontrada.");
            setStatus("error");
            return;
          }
          applyState(data);
          setStatus("live");
        })
        .catch(() => {
          if (!cancelled) {
            setError("Não foi possível carregar o ranking.");
            setStatus("error");
          }
        });
    };

    setStatus("connecting");
    poll();
    pollTimer = setInterval(poll, POLL_MS);

    const handleVisibility = () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      void refreshManual();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      setStatus("idle");
    };
  }, [slug, enabled, applyState, refreshManual]);

  return { state, status, error, refreshManual };
}

export type { PollRankingLiveStatus };
