import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PrimaryButton } from "@/components/ui-kit";
import { SettingsToggle, FormField } from "@/components/bolao/form-primitives";
import { PlacarRulePicker } from "@/components/bolao/placar-rule-picker";
import { TeamFlag } from "@/components/bolao/team-flag";
import { WorldCup2026Banner } from "@/components/bolao/world-cup-2026";
import { useAuth } from "@/lib/auth/use-auth";
import {
  getOfficialCatalogStatusMap,
  resolveOfficialCatalogMatch,
} from "@/lib/api/matches-list.server";
import { createBolao } from "@/lib/api/boloes.server";
import { formatPartidaDate } from "@/lib/bolao/db-match";
import { WORLD_CUP_2026_CATALOG, type OfficialCatalogMatch } from "@/lib/bolao/official-catalog";
import { teamNameToCode } from "@/lib/bolao/team-codes";
import { STAKE_PRESETS } from "@/lib/bolao/constants";
import type { BolaoSettings } from "@/lib/bolao/types";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Link2, Trophy, Users } from "lucide-react";

const DEFAULT_SETTINGS: BolaoSettings = {
  exclusiveScore: true,
  participantsVisible: true,
  showWinningNow: true,
  taxaPercent: 0,
};

type CampOption = {
  id: string;
  nome: string;
  tipo: "oficial";
};

type CatalogMatchCard = {
  id: string;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  date: string;
  stage: string;
  raw: OfficialCatalogMatch;
};

const AUTO_CLOSE_DELAY_MS = 2 * 24 * 60 * 60 * 1000;

function isAutoClosedByTime(dataPartida: string, nowMs = Date.now()) {
  const partidaMs = new Date(dataPartida).getTime();
  if (!Number.isFinite(partidaMs)) return false;
  return nowMs >= partidaMs + AUTO_CLOSE_DELAY_MS;
}

function toLocalDayKey(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDayLabel(dayKey: string) {
  const date = new Date(`${dayKey}T00:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export function CriarBolaoWizard({
  passo,
  prefillCatalogMatchId,
  onRequireAuth,
}: {
  passo: number;
  prefillCatalogMatchId?: string;
  onRequireAuth?: (mode?: "signup" | "login") => Promise<boolean>;
}) {
  const navigate = useNavigate();
  const { loading, getAccessToken } = useAuth();
  const getStatusMapFn = useServerFn(getOfficialCatalogStatusMap);
  const resolveCatalogMatchFn = useServerFn(resolveOfficialCatalogMatch);
  const createBolaoFn = useServerFn(createBolao);
  const [campeonatoId, setCampeonatoId] = useState<string>("copa-2026");
  const [matchId, setMatchId] = useState<string | null>(prefillCatalogMatchId ?? null);
  const [stake, setStake] = useState(10);
  const [settings, setSettings] = useState<BolaoSettings>(DEFAULT_SETTINGS);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusByMatchId, setStatusByMatchId] = useState<Record<string, string>>({});
  const [selectedDayKey, setSelectedDayKey] = useState<string>("all");
  const dayChipsRef = useRef<HTMLDivElement | null>(null);
  const didApplyPrefillRef = useRef(false);
  const didAutoSelectDayRef = useRef(false);
  const goTo = (next: 1 | 2 | 3 | 4) =>
    navigate({
      to: "/create",
      search: {
        aba: "bolao",
        passo: next,
        catalogMatchId: matchId ?? undefined,
      },
    });

  useEffect(() => {
    if (didApplyPrefillRef.current) return;
    didApplyPrefillRef.current = true;

    if (prefillCatalogMatchId) {
      setMatchId(prefillCatalogMatchId);
      return;
    }
    if (WORLD_CUP_2026_CATALOG.length > 0) {
      setMatchId(WORLD_CUP_2026_CATALOG[0].id);
    }
  }, [prefillCatalogMatchId]);

  useEffect(() => {
    let cancelled = false;
    async function loadStatuses() {
      try {
        const token = getAccessToken();
        const map = await getStatusMapFn({ data: { accessToken: token ?? undefined } });
        if (!cancelled) setStatusByMatchId(map);
      } catch {
        // Se falhar, mantém sem bloqueio de UI.
      }
    }
    void loadStatuses();
    return () => {
      cancelled = true;
    };
  }, [getStatusMapFn, getAccessToken]);

  const campOptions: CampOption[] = [
    {
      id: "copa-2026",
      nome: "Copa do Mundo 2026",
      tipo: "oficial" as const,
    },
  ];

  const matches: CatalogMatchCard[] = WORLD_CUP_2026_CATALOG.map((m) => ({
    id: m.id,
    home: m.timeCasa,
    away: m.timeFora,
    homeCode: teamNameToCode(m.timeCasa),
    awayCode: teamNameToCode(m.timeFora),
    date: formatPartidaDate(m.dataPartida),
    stage: m.grupo,
    raw: m,
  })).sort((a, b) => a.raw.ordem - b.raw.ordem);

  const selectedCamp = campOptions.find((c) => c.id === campeonatoId);
  const selectedMatch = matches.find((m) => m.id === matchId) ?? null;
  const availableDays = [...new Set(matches.map((m) => toLocalDayKey(m.raw.dataPartida)))].sort();
  const isMatchClosed = useMemo(
    () => (m: CatalogMatchCard) => {
      const fromAdmin = statusByMatchId[m.id] === "encerrado";
      const byDate = isAutoClosedByTime(m.raw.dataPartida);
      return fromAdmin || byDate;
    },
    [statusByMatchId],
  );

  useEffect(() => {
    if (selectedDayKey === "all") return;
    if (!availableDays.includes(selectedDayKey)) {
      setSelectedDayKey(availableDays[0] ?? "all");
    }
  }, [availableDays, selectedDayKey]);

  const matchesForDay =
    selectedDayKey === "all"
      ? matches
      : matches.filter((m) => toLocalDayKey(m.raw.dataPartida) === selectedDayKey);
  const dayMeta = availableDays.map((dayKey) => {
    const dayMatches = matches.filter((m) => toLocalDayKey(m.raw.dataPartida) === dayKey);
    const openCount = dayMatches.filter((m) => !isMatchClosed(m)).length;
    return { dayKey, openCount, total: dayMatches.length };
  });
  const selectedMatchClosed = selectedMatch ? isMatchClosed(selectedMatch) : false;

  useEffect(() => {
    if (availableDays.length === 0) return;
    if (didAutoSelectDayRef.current) return;
    didAutoSelectDayRef.current = true;

    if (prefillCatalogMatchId) {
      const prefilled = matches.find((m) => m.id === prefillCatalogMatchId);
      if (prefilled) {
        setSelectedDayKey(toLocalDayKey(prefilled.raw.dataPartida));
        return;
      }
    }

    const todayKey = toLocalDayKey(new Date());
    const todayMeta = dayMeta.find((d) => d.dayKey === todayKey);
    if (todayMeta && todayMeta.openCount > 0) {
      setSelectedDayKey(todayKey);
      return;
    }

    const nextOpen = dayMeta.find((d) => d.dayKey >= todayKey && d.openCount > 0);
    if (nextOpen) {
      setSelectedDayKey(nextOpen.dayKey);
      return;
    }

    const firstOpen = dayMeta.find((d) => d.openCount > 0);
    if (firstOpen) {
      setSelectedDayKey(firstOpen.dayKey);
      return;
    }

    if (todayMeta) {
      setSelectedDayKey(todayKey);
      return;
    }

    setSelectedDayKey(availableDays[0]);
  }, [availableDays, dayMeta, matches, prefillCatalogMatchId]);

  useEffect(() => {
    if (matchesForDay.length === 0) return;
    if (!matchId || !matchesForDay.some((m) => m.id === matchId)) {
      setMatchId(matchesForDay[0].id);
    }
  }, [matchesForDay, matchId]);

  const scrollDays = (direction: "left" | "right") => {
    const node = dayChipsRef.current;
    if (!node) return;
    node.scrollBy({ left: direction === "left" ? -220 : 220, behavior: "smooth" });
  };

  useEffect(() => {
    if (passo !== 2) return;
    const container = dayChipsRef.current;
    if (!container) return;

    const selector =
      selectedDayKey === "all" ? '[data-day-chip="all"]' : `[data-day-chip="${selectedDayKey}"]`;
    const chip = container.querySelector(selector);
    if (!(chip instanceof HTMLElement)) return;

    const targetLeft = chip.offsetLeft - (container.clientWidth - chip.clientWidth) / 2;
    const nextLeft = Math.max(0, targetLeft);
    const rafId = window.requestAnimationFrame(() => {
      container.scrollTo({ left: nextLeft, behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [passo, selectedDayKey, dayMeta.length]);

  const handleCreate = async () => {
    const authOk = onRequireAuth ? await onRequireAuth("signup") : true;
    const token = getAccessToken();
    if (!authOk || !token || !selectedMatch) return;
    if (isMatchClosed(selectedMatch)) {
      setError("Esta partida está encerrada e não pode ser usada para criar bolão.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const resolved = await resolveCatalogMatchFn({
        data: {
          timeCasa: selectedMatch.raw.timeCasa,
          timeFora: selectedMatch.raw.timeFora,
          dataPartida: selectedMatch.raw.dataPartida,
          accessToken: token,
        },
      });
      const result = await createBolaoFn({
        data: {
          accessToken: token,
          partidaId: resolved.partidaId,
          stake,
          modoExclusivo: settings.exclusiveScore,
          taxaPercent: settings.taxaPercent,
        },
      });
      navigate({ to: "/admin", search: { bolao: result.slug, aba: "convite" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar bolão");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground">Carregando...</p>;
  }

  const handleContinueFromMatchStep = () => {
    if (!selectedMatch) return;
    if (isMatchClosed(selectedMatch)) {
      setError("Partida encerrada: escolha um jogo em aberto para continuar.");
      return;
    }
    setError(null);
    goTo(3);
  };

  const handleContinueFromConfigStep = async () => {
    if (stake < 1) return;
    const authOk = onRequireAuth ? await onRequireAuth("signup") : Boolean(getAccessToken());
    if (!authOk) return;
    goTo(4);
  };

  return (
    <div className="animate-rise space-y-5">
      {passo === 1 && (
        <>
          <WorldCup2026Banner />

          <div>
            <h1 className="font-display text-xl font-bold">Campeonatos oficiais</h1>
          </div>

          {error && passo === 1 && (
            <div className="glass rounded-2xl p-4 text-center text-sm text-red-400">{error}</div>
          )}

          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Trophy className="size-3" /> Oficiais
            </h2>
            {campOptions.map((camp) => (
              <CampButton
                key={camp.id}
                nome={camp.nome}
                badge="Oficial"
                sub="Estados Unidos · México · Canadá"
                selected={campeonatoId === camp.id}
                onClick={() => setCampeonatoId(camp.id)}
              />
            ))}
          </div>

          {campOptions.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground space-y-3">
              <p>Nenhum campeonato oficial disponível no momento.</p>
              <p className="text-xs">Verifique a configuração do catálogo oficial.</p>
            </div>
          )}

          <PrimaryButton
            onClick={() => goTo(2)}
            variant="primary"
            className={!campeonatoId ? "opacity-50 pointer-events-none" : ""}
          >
            Continuar <ChevronRight className="size-5" />
          </PrimaryButton>
        </>
      )}

      {passo === 2 && (
        <>
          <div>
            <h1 className="font-display text-xl font-bold">Escolha o jogo</h1>
          </div>

          {error && (
            <div className="glass rounded-2xl p-4 text-center text-sm text-red-400">{error}</div>
          )}

          {!error && matches.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground space-y-3">
              <p>Nenhum jogo neste campeonato oficial.</p>
              <p className="text-xs">Verifique o catálogo ou rode o seed da Copa no Supabase.</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollDays("left")}
              className="h-8 w-8 shrink-0 rounded-full border border-border bg-background/40 text-foreground"
              aria-label="Voltar datas"
            >
              <ChevronLeft className="mx-auto size-4" />
            </button>
            <div
              ref={dayChipsRef}
              className="flex flex-1 gap-2 overflow-x-auto pb-1 scrollbar-none"
            >
              <button
                type="button"
                onClick={() => setSelectedDayKey("all")}
                data-day-chip="all"
                className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition ${
                  selectedDayKey === "all"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background/40 text-foreground"
                }`}
              >
                Todas as datas
              </button>
              {dayMeta.map(({ dayKey, openCount, total }) => {
                const hasOpenGames = openCount > 0;
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setSelectedDayKey(dayKey)}
                    data-day-chip={dayKey}
                    className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition ${
                      selectedDayKey === dayKey
                        ? "bg-primary text-primary-foreground"
                        : hasOpenGames
                          ? "border border-primary/50 bg-primary/10 text-primary"
                          : "border border-border bg-background/40 text-foreground"
                    }`}
                    title={
                      hasOpenGames
                        ? `${openCount} jogo(s) em aberto`
                        : `Todos os ${total} jogo(s) encerrados`
                    }
                  >
                    {formatDayLabel(dayKey)}
                    {hasOpenGames ? ` • ${openCount}` : ""}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => scrollDays("right")}
              className="h-8 w-8 shrink-0 rounded-full border border-border bg-background/40 text-foreground"
              aria-label="Avançar datas"
            >
              <ChevronRight className="mx-auto size-4" />
            </button>
          </div>

          <div className="space-y-2">
            {matches.length > 0 && matchesForDay.length === 0 && (
              <div className="glass rounded-2xl p-4 text-center text-sm text-muted-foreground">
                Nenhum jogo para a data selecionada.
              </div>
            )}
            {matchesForDay.map((m) =>
              (() => {
                const isClosed = isMatchClosed(m);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMatchId(m.id);
                    }}
                    className={`relative w-full rounded-2xl p-3.5 border transition ${
                      matchId === m.id ? "border-primary/60 bg-primary/10" : "glass border-border"
                    }`}
                  >
                    <div className="mx-auto flex w-full max-w-md items-center justify-center gap-3">
                      <TeamFlag code={m.homeCode} teamName={m.home} size="sm" />
                      <div className="min-w-0 text-center">
                        <div className="font-semibold text-sm truncate">
                          {m.home} × {m.away}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {m.date}
                          {isClosed ? " · Encerrado" : ""}
                        </div>
                      </div>
                      <TeamFlag code={m.awayCode} teamName={m.away} size="sm" />
                    </div>
                    {matchId === m.id && (
                      <Check className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-primary shrink-0" />
                    )}
                  </button>
                );
              })(),
            )}
          </div>

          <div className="flex gap-2">
            <PrimaryButton onClick={() => goTo(1)} variant="outline" className="flex-1">
              <ChevronLeft className="size-5" /> Voltar
            </PrimaryButton>
            <PrimaryButton
              onClick={handleContinueFromMatchStep}
              variant="primary"
              className={`flex-[2] ${!matchId || selectedMatchClosed ? "opacity-50 pointer-events-none" : ""}`}
            >
              Continuar <ChevronRight className="size-5" />
            </PrimaryButton>
          </div>
        </>
      )}

      {passo === 3 && (
        <>
          {selectedMatch && (
            <div className="rounded-2xl glass p-4">
              <div className="mx-auto flex w-full max-w-md items-center justify-center gap-3">
              <TeamFlag code={selectedMatch.homeCode} teamName={selectedMatch.home} size="sm" />
                <div className="max-w-[240px] text-center font-semibold text-sm truncate">
                {selectedMatch.home} × {selectedMatch.away}
              </div>
              <TeamFlag code={selectedMatch.awayCode} teamName={selectedMatch.away} size="sm" />
              </div>
            </div>
          )}

          <div>
            <h1 className="font-display text-xl font-bold">Configure o bolão</h1>
            <p className="text-muted-foreground mt-1 text-sm">Mesmo fluxo da demonstração.</p>
          </div>

          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            <span className="font-display text-gradient-gold text-2xl font-bold">R$</span>
            <input
              value={String(stake)}
              onChange={(e) => setStake(Number(e.target.value.replace(/\D/g, "")) || 0)}
              inputMode="numeric"
              className="bg-transparent flex-1 font-display text-3xl font-bold outline-none tabular-nums"
            />
            <span className="text-xs text-muted-foreground">/ pessoa</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {STAKE_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setStake(Number(v))}
                className="chip"
                style={
                  String(stake) === v
                    ? {
                        background: "var(--gradient-green)",
                        color: "var(--primary-foreground)",
                        border: "none",
                      }
                    : undefined
                }
              >
                R$ {v}
              </button>
            ))}
          </div>

          <PlacarRulePicker
            exclusive={settings.exclusiveScore}
            onChange={(exclusiveScore) => setSettings((s) => ({ ...s, exclusiveScore }))}
          />

          <div>
            <h2 className="font-display font-semibold mb-3 text-sm text-muted-foreground">
              Mais opções
            </h2>
            <div className="space-y-2">
              <SettingsToggle
                icon={<Users className="size-4" />}
                label="Mostrar participantes"
                sub="Todos veem quem está participando"
                value={settings.participantsVisible}
                onChange={(v) => setSettings((s) => ({ ...s, participantsVisible: v }))}
              />
              <SettingsToggle
                icon={
                  settings.showWinningNow ? (
                    <Eye className="size-4" />
                  ) : (
                    <EyeOff className="size-4" />
                  )
                }
                label="Ranking ao vivo"
                sub="Mostrar quem está ganhando em tempo real"
                value={settings.showWinningNow}
                onChange={(v) => setSettings((s) => ({ ...s, showWinningNow: v }))}
              />
              <FormField label="Taxa da plataforma (%)">
                <input
                  value={String(settings.taxaPercent)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    const next = raw === "" ? 0 : Math.min(100, Number(raw));
                    setSettings((s) => ({ ...s, taxaPercent: next }));
                  }}
                  inputMode="numeric"
                  className="w-full bg-transparent outline-none font-display text-2xl font-bold tabular-nums"
                  placeholder="0"
                />
              </FormField>
              <p className="text-xs text-muted-foreground -mt-2 px-1">
                0 = sem taxa. O prêmio (arrecadado − taxa) vai para quem vencer.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <PrimaryButton onClick={() => goTo(2)} variant="outline" className="flex-1">
              <ChevronLeft className="size-5" /> Voltar
            </PrimaryButton>
            <PrimaryButton
              onClick={() => void handleContinueFromConfigStep()}
              variant="primary"
              className={`flex-[2] ${stake < 1 ? "opacity-50 pointer-events-none" : ""}`}
            >
              Continuar <ChevronRight className="size-5" />
            </PrimaryButton>
          </div>
        </>
      )}

      {passo === 4 && (
        <>
          {selectedMatch && (
            <div className="rounded-2xl glass p-4 space-y-2">
              <div className="mx-auto flex w-full max-w-md items-center justify-center gap-3">
                <TeamFlag code={selectedMatch.homeCode} teamName={selectedMatch.home} size="sm" />
                <div className="max-w-[240px] text-center font-semibold text-sm">
                  {selectedMatch.home} × {selectedMatch.away}
                </div>
                <TeamFlag code={selectedMatch.awayCode} teamName={selectedMatch.away} size="sm" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl bg-surface-2/60 p-2.5">
                  <div className="text-muted-foreground">Entrada</div>
                  <div className="font-semibold">R$ {stake}</div>
                </div>
                <div className="rounded-xl bg-surface-2/60 p-2.5">
                  <div className="text-muted-foreground">Palpites</div>
                  <div className="font-semibold">
                    {settings.exclusiveScore ? "Exclusivo" : "Repetido"}
                  </div>
                </div>
                <div className="rounded-xl bg-surface-2/60 p-2.5">
                  <div className="text-muted-foreground">Taxa</div>
                  <div className="font-semibold">
                    {settings.taxaPercent > 0 ? `${settings.taxaPercent}% plataforma` : "Sem taxa"}
                  </div>
                </div>
              </div>
              {selectedCamp && (
                <div className="text-xs text-muted-foreground">
                  Campeonato:{" "}
                  <span className="text-foreground font-medium">{selectedCamp.nome}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <h1 className="font-display text-xl font-bold">Criar bolão</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Depois você compartilha o link com a galera.
            </p>
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <div className="flex gap-2">
            <PrimaryButton onClick={() => goTo(3)} variant="outline" className="flex-1">
              <ChevronLeft className="size-5" /> Voltar
            </PrimaryButton>
            <PrimaryButton
              onClick={handleCreate}
              variant="gold"
              className={`flex-[2] ${creating || !matchId || selectedMatchClosed ? "opacity-50 pointer-events-none" : ""}`}
            >
              <Link2 className="size-5" /> {creating ? "Criando..." : "Criar bolão"}
            </PrimaryButton>
          </div>
        </>
      )}
    </div>
  );
}

function CampButton({
  nome,
  badge,
  sub,
  selected,
  onClick,
}: {
  nome: string;
  badge: string;
  sub?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl p-4 text-left border transition ${
        selected ? "border-primary/60 bg-primary/10" : "glass border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display font-bold truncate">{nome}</div>
          {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        <span className="chip text-[9px] shrink-0">{badge}</span>
      </div>
    </button>
  );
}
