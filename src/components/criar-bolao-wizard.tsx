import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PrimaryButton } from "@/components/ui-kit";
import { SettingsToggle, FormField } from "@/components/bolao/form-primitives";
import { PlacarRulePicker } from "@/components/bolao/placar-rule-picker";
import { TeamFlag } from "@/components/bolao/team-flag";
import { WorldCup2026Banner } from "@/components/bolao/world-cup-2026";
import { useAuth } from "@/lib/auth/use-auth";
import { formatUserFacingError } from "@/lib/errors";
import { listCampeonatosOficiais } from "@/lib/api/campeonatos.server";
import { listMatches } from "@/lib/api/matches-list.server";
import { createBolao } from "@/lib/api/boloes.server";
import { dbPartidaToCard, type MatchCard } from "@/lib/bolao/db-match";
import { STAKE_PRESETS } from "@/lib/bolao/constants";
import type { BolaoSettings } from "@/lib/bolao/types";
import type { DbCampeonatoRow } from "@/lib/bolao/db-types";
import {
  Check, ChevronLeft, ChevronRight, Eye, EyeOff, Link2, Trophy, Users,
} from "lucide-react";

const DEFAULT_SETTINGS: BolaoSettings = {
  exclusiveScore: true,
  participantsVisible: true,
  showWinningNow: true,
  taxaPercent: 0,
};

type CampOption = {
  id: number;
  nome: string;
  tipo: "oficial";
};

export function CriarBolaoWizard({
  passo,
  prefillCampeonatoId,
  prefillPartidaId,
}: {
  passo: number;
  prefillCampeonatoId?: number;
  prefillPartidaId?: number;
}) {
  const navigate = useNavigate();
  const { user, loading, getAccessToken } = useAuth();
  const listMatchesFn = useServerFn(listMatches);
  const createBolaoFn = useServerFn(createBolao);
  const [oficiais, setOficiais] = useState<DbCampeonatoRow[]>([]);
  const [campeonatoId, setCampeonatoId] = useState<number | null>(prefillCampeonatoId ?? null);
  const [matches, setMatches] = useState<MatchCard[]>([]);
  const [matchId, setMatchId] = useState<number | null>(prefillPartidaId ?? null);
  const [stake, setStake] = useState(10);
  const [settings, setSettings] = useState<BolaoSettings>(DEFAULT_SETTINGS);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const goTo = (next: 1 | 2 | 3 | 4) =>
    navigate({
      to: "/create",
      search: { aba: "bolao", passo: next, campeonatoId: campeonatoId ?? undefined },
    });

  useEffect(() => {
    if (loading || !user) return;
    if (passo !== 1 && passo !== 2) return;

    setLoadingCamps(true);
    listCampeonatosOficiais()
      .then((off) => {
        setOficiais(off);
        if (prefillCampeonatoId) {
          setCampeonatoId(prefillCampeonatoId);
        } else if (!campeonatoId && off[0]) {
          setCampeonatoId(off[0].id);
        }
      })
      .catch((err: unknown) => setError(formatUserFacingError(err)))
      .finally(() => setLoadingCamps(false));
  }, [loading, user, getAccessToken, prefillCampeonatoId, passo, campeonatoId]);

  useEffect(() => {
    if (passo !== 2 || !campeonatoId) return;
    const token = getAccessToken();
    if (!token) return;

    setError(null);
    setLoadingMatches(true);
    listMatchesFn({ data: { campeonatoId, accessToken: token } })
      .then((rows) => {
        const cards = rows.map(dbPartidaToCard);
        setMatches(cards);
        setMatchId((cur) => {
          if (cur && cards.some((c) => c.id === cur)) return cur;
          if (prefillPartidaId && cards.some((c) => c.id === prefillPartidaId)) return prefillPartidaId;
          return cards[0]?.id ?? null;
        });
      })
      .catch((err: unknown) => setError(formatUserFacingError(err)))
      .finally(() => setLoadingMatches(false));
  }, [passo, campeonatoId, listMatchesFn, getAccessToken, prefillPartidaId]);

  useEffect(() => {
    if (prefillCampeonatoId) setCampeonatoId(prefillCampeonatoId);
    if (prefillPartidaId) setMatchId(prefillPartidaId);
  }, [prefillCampeonatoId, prefillPartidaId]);

  const campOptions: CampOption[] = oficiais.map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: "oficial" as const,
  }));

  const selectedCamp = campOptions.find((c) => c.id === campeonatoId);
  const selectedMatch = matches.find((m) => m.id === matchId) ?? null;

  const handleCreate = async () => {
    const token = getAccessToken();
    if (!token || !matchId) return;

    setCreating(true);
    setError(null);
    try {
      const result = await createBolaoFn({
        data: {
          accessToken: token,
          partidaId: matchId,
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

  if (loading || !user) {
    return <p className="text-center text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="animate-rise space-y-5">
      {passo === 1 && (
        <>
          <div>
            <h1 className="font-display text-xl font-bold">Campeonatos oficiais</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Jogos e campeonatos cadastrados pelo Palpite Gol.
            </p>
          </div>

          {loadingCamps && <p className="text-sm text-muted-foreground text-center">Carregando...</p>}

          {error && passo === 1 && (
            <div className="glass rounded-2xl p-4 text-center text-sm text-red-400">{error}</div>
          )}

          {oficiais.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Trophy className="size-3" /> Oficiais
              </h2>
              {oficiais.map((camp) => (
                <CampButton
                  key={camp.id}
                  nome={camp.nome}
                  badge="Oficial"
                  selected={campeonatoId === camp.id}
                  onClick={() => setCampeonatoId(camp.id)}
                />
              ))}
            </div>
          )}

          {!loadingCamps && campOptions.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground space-y-3">
              <p>Nenhum campeonato oficial disponível no momento.</p>
              <p className="text-xs">Os campeonatos do sistema aparecem aqui quando forem cadastrados.</p>
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
          <WorldCup2026Banner compact />
          <div>
            <h1 className="font-display text-xl font-bold">Escolha o jogo</h1>
            <p className="text-muted-foreground mt-1 text-sm">{selectedCamp?.nome ?? "Campeonato"}</p>
          </div>

          {loadingMatches && (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando jogos...</p>
          )}

          {error && (
            <div className="glass rounded-2xl p-4 text-center text-sm text-red-400">{error}</div>
          )}

          {!loadingMatches && !error && matches.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground space-y-3">
              <p>Nenhum jogo neste campeonato oficial.</p>
              <p className="text-xs">Escolha outro campeonato ou rode o seed da Copa no Supabase.</p>
            </div>
          )}

          <div className="space-y-2">
            {matches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMatchId(m.id)}
                className={`w-full rounded-2xl p-3.5 flex items-center justify-between border transition ${
                  matchId === m.id ? "border-primary/60 bg-primary/10" : "glass border-border"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TeamFlag code={m.homeCode} escudoUrl={m.homeEscudo} teamName={m.home} size="sm" />
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-sm truncate">{m.home} × {m.away}</div>
                    <div className="text-xs text-muted-foreground">{m.date}</div>
                  </div>
                  <TeamFlag code={m.awayCode} escudoUrl={m.awayEscudo} teamName={m.away} size="sm" />
                </div>
                {matchId === m.id && <Check className="size-5 text-primary shrink-0" />}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <PrimaryButton onClick={() => goTo(1)} variant="outline" className="flex-1">
              <ChevronLeft className="size-5" /> Voltar
            </PrimaryButton>
            <PrimaryButton
              onClick={() => goTo(3)}
              variant="primary"
              className={`flex-[2] ${!matchId ? "opacity-50 pointer-events-none" : ""}`}
            >
              Continuar <ChevronRight className="size-5" />
            </PrimaryButton>
          </div>
        </>
      )}

      {passo === 3 && (
        <>
          {selectedMatch && (
            <div className="rounded-2xl glass p-4 flex items-center gap-3">
              <TeamFlag code={selectedMatch.homeCode} escudoUrl={selectedMatch.homeEscudo} teamName={selectedMatch.home} size="sm" />
              <div className="flex-1 font-semibold text-sm truncate">
                {selectedMatch.home} × {selectedMatch.away}
              </div>
              <TeamFlag code={selectedMatch.awayCode} escudoUrl={selectedMatch.awayEscudo} teamName={selectedMatch.away} size="sm" />
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
                    ? { background: "var(--gradient-green)", color: "var(--primary-foreground)", border: "none" }
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
            <h2 className="font-display font-semibold mb-3 text-sm text-muted-foreground">Mais opções</h2>
            <div className="space-y-2">
          <SettingsToggle
            icon={<Users className="size-4" />}
            label="Mostrar participantes"
            sub="Todos veem quem está participando"
            value={settings.participantsVisible}
            onChange={(v) => setSettings((s) => ({ ...s, participantsVisible: v }))}
          />
          <SettingsToggle
            icon={settings.showWinningNow ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
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
              onClick={() => goTo(4)}
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
              <div className="flex items-center gap-3">
                <TeamFlag code={selectedMatch.homeCode} escudoUrl={selectedMatch.homeEscudo} teamName={selectedMatch.home} size="sm" />
                <div className="flex-1 font-semibold text-sm">{selectedMatch.home} × {selectedMatch.away}</div>
                <TeamFlag code={selectedMatch.awayCode} escudoUrl={selectedMatch.awayEscudo} teamName={selectedMatch.away} size="sm" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl bg-surface-2/60 p-2.5">
                  <div className="text-muted-foreground">Entrada</div>
                  <div className="font-semibold">R$ {stake}</div>
                </div>
                <div className="rounded-xl bg-surface-2/60 p-2.5">
                  <div className="text-muted-foreground">Palpites</div>
                  <div className="font-semibold">{settings.exclusiveScore ? "Exclusivo" : "Repetido"}</div>
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
                  Campeonato: <span className="text-foreground font-medium">{selectedCamp.nome}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <h1 className="font-display text-xl font-bold">Criar bolão</h1>
            <p className="text-muted-foreground mt-1 text-sm">Depois você compartilha o link com a galera.</p>
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <div className="flex gap-2">
            <PrimaryButton onClick={() => goTo(3)} variant="outline" className="flex-1">
              <ChevronLeft className="size-5" /> Voltar
            </PrimaryButton>
            <PrimaryButton
              onClick={handleCreate}
              variant="gold"
              className={`flex-[2] ${creating || !matchId ? "opacity-50 pointer-events-none" : ""}`}
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
