import { useCallback, useEffect, useRef, useState } from "react";

import { fetchPollRanking, type PollRankingLiveStatus } from "@/lib/votti/ranking/client";
import type { PollRankingState } from "@/lib/votti/ranking/types";

const POLL_MS = 1_500;

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
    setState((prev) => {
      if (
        prev &&
        prev.version === next.version &&
        prev.updatedAt === next.updatedAt &&
        prev.registeredVotes === next.registeredVotes
      ) {
        return prev;
      }
      versionRef.current = next.version;
      return next;
    });
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
    versionRef.current = 0;

    const poll = () => {
      void fetchPollRanking(slug)
        .then((data) => {
          if (cancelled) return;
          if (!data) {
            setError("Aguardando snapshot do ranking…");
            setStatus("connecting");
            return;
          }
          applyState(data);
          setStatus("live");
        })
        .catch(() => {
          if (!cancelled) {
            setError("Aguardando ranking público…");
            setStatus("connecting");
          }
        });
    };

    setStatus("connecting");
    poll();
    const kickTimer = setTimeout(poll, 400);
    pollTimer = setInterval(poll, POLL_MS);

    const handleVisibility = () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      void refreshManual();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearTimeout(kickTimer);
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      setStatus("idle");
    };
  }, [slug, enabled, applyState, refreshManual]);

  return { state, status, error, refreshManual };
}

export type { PollRankingLiveStatus };
