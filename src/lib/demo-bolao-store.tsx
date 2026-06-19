import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEMO_BOLAO,
  MATCHES,
  PLATFORM_FEE_PERCENT,
  bolaoFeePercent,
  calcPrize,
  type Bolao,
  type BolaoSettings,
  type ParticipantRequest,
  type Score,
} from "@/lib/bolao";

const STORAGE_KEY = "palpite-gol-demo";

export type DemoDraft = {
  stageId: string;
  matchId: string;
  stake: number;
  settings: BolaoSettings;
  userGuess: Score;
  liveScore: Score;
  finalScore: Score;
  minute: number;
  isEnded: boolean;
  requests: ParticipantRequest[];
};

function defaultDraft(): DemoDraft {
  return {
    stageId: "qf",
    matchId: DEMO_BOLAO.match.id,
    stake: DEMO_BOLAO.stake,
    settings: { ...DEMO_BOLAO.settings },
    userGuess: [2, 2],
    liveScore: [0, 0],
    finalScore: [0, 0],
    minute: 0,
    isEnded: false,
    requests: DEMO_BOLAO.requests.map((r) => ({ ...r })),
  };
}

function normalizeSettings(settings: BolaoSettings & { applyPlatformFee?: boolean }): BolaoSettings {
  const taxaPercent =
    settings.taxaPercent != null
      ? settings.taxaPercent
      : settings.applyPlatformFee
        ? PLATFORM_FEE_PERCENT
        : 0;

  return {
    exclusiveScore: settings.exclusiveScore ?? true,
    participantsVisible: settings.participantsVisible ?? true,
    showWinningNow: settings.showWinningNow ?? true,
    taxaPercent,
  };
}

function loadDraft(): DemoDraft {
  if (typeof window === "undefined") return defaultDraft();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDraft();
    const parsed = JSON.parse(raw) as DemoDraft & { settings?: BolaoSettings & { applyPlatformFee?: boolean } };
    if (!parsed.matchId || !MATCHES.some((m) => m.id === parsed.matchId)) return defaultDraft();
    const merged = { ...defaultDraft(), ...parsed, isEnded: parsed.isEnded ?? false };
    merged.settings = normalizeSettings(merged.settings);
    return merged;
  } catch {
    return defaultDraft();
  }
}

function buildBolao(draft: DemoDraft): Bolao {
  const match = MATCHES.find((m) => m.id === draft.matchId) ?? MATCHES[0];
  const slug = `${match.homeCode}-${match.awayCode}-copa2026`;
  const approved = draft.requests.filter((r) => r.status === "approved").length;
  const poolCount = approved > 0 ? approved : DEMO_BOLAO.participantCount;
  const feePercent = bolaoFeePercent(draft.settings);
  const prize = calcPrize(poolCount, draft.stake, feePercent);

  const participants = DEMO_BOLAO.participants.map((p) =>
    p.isYou ? { ...p, guess: draft.userGuess } : { ...p },
  );

  return {
    ...DEMO_BOLAO,
    slug,
    match,
    stake: draft.stake,
    settings: draft.settings,
    status: draft.isEnded ? "encerrado" : draft.minute > 0 ? "ao_vivo" : "aberto",
    partidaStatus: draft.isEnded ? "encerrado" : draft.minute > 0 ? "ao_vivo" : "agendado",
    isStarted: draft.isEnded || draft.minute > 0,
    liveScore: draft.liveScore,
    finalScore: draft.finalScore,
    minute: draft.minute,
    prize,
    prizeDelta: Math.max(10, Math.round(draft.stake * 2)),
    participants,
    requests: draft.requests,
    sharePath: `bolao.live/${slug}`,
    winnerGuess: draft.userGuess,
  };
}

type DemoBolaoContextValue = {
  draft: DemoDraft;
  bolao: Bolao;
  setStageId: (id: string) => void;
  setMatchId: (id: string) => void;
  setStake: (stake: number) => void;
  setSettings: (settings: BolaoSettings) => void;
  setUserGuess: (guess: Score) => void;
  setLiveScore: (score: Score) => void;
  setFinalScore: (score: Score) => void;
  setMinute: (minute: number) => void;
  markDemoEnded: () => void;
  incrementMinute: () => void;
  setRequests: (requests: ParticipantRequest[]) => void;
  updateRequestStatus: (index: number, status: ParticipantRequest["status"]) => void;
  resetDemo: () => void;
};

const DemoBolaoContext = createContext<DemoBolaoContextValue | null>(null);

export function DemoBolaoProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<DemoDraft>(loadDraft);

  const persist = useCallback((next: DemoDraft) => {
    setDraft(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const patch = useCallback(
    (partial: Partial<DemoDraft> | ((current: DemoDraft) => Partial<DemoDraft>)) => {
      setDraft((current) => {
        const update = typeof partial === "function" ? partial(current) : partial;
        const next = { ...current, ...update };
        if (typeof window !== "undefined") {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    },
    [],
  );

  const bolao = useMemo(() => buildBolao(draft), [draft]);

  const incrementMinute = useCallback(() => {
    patch((c) => ({ minute: Math.min(90, c.minute + 1) }));
  }, [patch]);

  const value = useMemo<DemoBolaoContextValue>(
    () => ({
      draft,
      bolao,
      setStageId: (stageId) => patch({ stageId }),
      setMatchId: (matchId) => patch({ matchId }),
      setStake: (stake) => patch({ stake }),
      setSettings: (settings) => patch({ settings }),
      setUserGuess: (userGuess) => patch({ userGuess }),
      setLiveScore: (liveScore) => patch({ liveScore }),
      setFinalScore: (finalScore) => patch({ finalScore }),
      setMinute: (minute) => patch({ minute }),
      markDemoEnded: () => patch({ isEnded: true }),
      incrementMinute,
      setRequests: (requests) => patch({ requests }),
      updateRequestStatus: (index, status) => {
        patch((current) => ({
          requests: current.requests.map((r, i) => (i === index ? { ...r, status } : r)),
        }));
      },
      resetDemo: () => persist(defaultDraft()),
    }),
    [draft, bolao, patch, persist, incrementMinute],
  );

  return <DemoBolaoContext.Provider value={value}>{children}</DemoBolaoContext.Provider>;
}

export function useDemoBolao() {
  const ctx = useContext(DemoBolaoContext);
  if (!ctx) throw new Error("useDemoBolao must be used within DemoBolaoProvider");
  return ctx;
}

/** Para telas que funcionam com ou sem contexto (landing preview). */
export function useDemoBolaoOptional() {
  return useContext(DemoBolaoContext);
}

export { buildBolao };
