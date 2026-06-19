import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PrimaryButton } from "@/components/ui-kit";
import { SettingsToggle, FormField } from "@/components/bolao/form-primitives";
import { PlacarRulePicker } from "@/components/bolao/placar-rule-picker";
import { TeamFlag } from "@/components/bolao/team-flag";
import { useAuth } from "@/lib/auth/use-auth";
import { getSupabaseBrowser } from "@/lib/api/supabase-browser";
import { createBolao } from "@/lib/api/boloes.server";
import { STAKE_PRESETS } from "@/lib/bolao/constants";
import type { BolaoSettings } from "@/lib/bolao/types";
import type { DbPartidaRow } from "@/lib/bolao/db-types";
import { dbPartidaToCard } from "@/lib/bolao/db-match";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Link2, Users } from "lucide-react";

const DEFAULT_SETTINGS: BolaoSettings = {
  exclusiveScore: true,
  participantsVisible: true,
  showWinningNow: true,
  taxaPercent: 0,
};

type Props = {
  campeonatoId: number;
  campeonatoNome: string;
  partida: DbPartidaRow;
  boloesExistentes?: number;
  onBack: () => void;
};

export function CriarBolaoPersonalConfig({
  campeonatoId,
  campeonatoNome,
  partida,
  boloesExistentes = 0,
  onBack,
}: Props) {
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const createBolaoFn = useServerFn(createBolao);

  const match = dbPartidaToCard(partida);
  const [step, setStep] = useState<1 | 2>(1);
  const [stake, setStake] = useState(10);
  const [settings, setSettings] = useState<BolaoSettings>(DEFAULT_SETTINGS);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    let token = getAccessToken();
    if (!token) {
      const supabase = getSupabaseBrowser();
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.access_token ?? getAccessToken();
    }
    if (!token) {
      setError("Sessão expirada. Entre de novo.");
      setCreating(false);
      return;
    }

    try {
      const result = await createBolaoFn({
        data: {
          accessToken: token,
          partidaId: partida.id,
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

  if (step === 1) {
    return (
      <div className="space-y-5 animate-rise">
        <div className="rounded-2xl glass p-4 flex items-center gap-3">
          <TeamFlag code={match.homeCode} escudoUrl={match.homeEscudo} teamName={match.home} size="sm" />
          <div className="flex-1 font-semibold text-sm truncate">
            {match.home} × {match.away}
          </div>
          <TeamFlag code={match.awayCode} escudoUrl={match.awayEscudo} teamName={match.away} size="sm" />
        </div>

        <div>
          <h2 className="font-display text-xl font-bold">
            {boloesExistentes > 0 ? "Novo bolão deste jogo" : "Configure o bolão"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">{campeonatoNome}</p>
          {boloesExistentes > 0 && (
            <p className="text-xs text-gold mt-2">
              Este jogo já tem {boloesExistentes} bolão{boloesExistentes !== 1 ? "ões" : ""}. Cada um terá link e participantes próprios.
            </p>
          )}
          {(partida.status === "encerrado" || partida.status === "finalizado") && (
            <p className="text-xs text-primary mt-2">
              Este jogo já foi encerrado antes, mas o novo bolão começa aberto — com link e convites próprios.
            </p>
          )}
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
          </div>
        </div>

        <div className="flex gap-2">
          <PrimaryButton onClick={onBack} variant="outline" className="flex-1">
            <ChevronLeft className="size-5" /> Voltar
          </PrimaryButton>
          <PrimaryButton
            onClick={() => setStep(2)}
            variant="primary"
            className={`flex-[2] ${stake < 1 ? "opacity-50 pointer-events-none" : ""}`}
          >
            Continuar <ChevronRight className="size-5" />
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <div className="rounded-2xl glass p-4 space-y-2">
        <div className="flex items-center gap-3">
          <TeamFlag code={match.homeCode} escudoUrl={match.homeEscudo} teamName={match.home} size="sm" />
          <div className="flex-1 font-semibold text-sm">{match.home} × {match.away}</div>
          <TeamFlag code={match.awayCode} escudoUrl={match.awayEscudo} teamName={match.away} size="sm" />
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
        <div className="text-xs text-muted-foreground">
          Campeonato: <span className="text-foreground font-medium">{campeonatoNome}</span>
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold">Criar bolão</h2>
        <p className="text-muted-foreground mt-1 text-sm">Depois você compartilha o link com a galera.</p>
      </div>

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      <div className="flex gap-2">
        <PrimaryButton onClick={() => setStep(1)} variant="outline" className="flex-1">
          <ChevronLeft className="size-5" /> Voltar
        </PrimaryButton>
        <PrimaryButton
          onClick={handleCreate}
          variant="gold"
          className={`flex-[2] ${creating ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Link2 className="size-5" /> {creating ? "Criando..." : "Criar bolão"}
        </PrimaryButton>
      </div>
    </div>
  );
}
