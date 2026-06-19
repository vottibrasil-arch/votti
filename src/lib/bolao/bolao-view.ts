import type { DbPartidaRow } from "./db-types";
import { dbPartidaToCard } from "./db-match";
import { resolveBolaoEffectiveStatus, resolvePartidaRow } from "./bolao-status";
import type { Bolao, Match, ParticipantRequest, RecentGuess } from "./types";
import { formatScore, calcPrize } from "./format";
import { PLATFORM_FEE_PERCENT } from "./constants";
import { scoreKey } from "./format";

export type BolaoDbRow = {
  id: string;
  slug: string;
  usuario_id: string | null;
  partida_id: number | null;
  stake: number;
  modo_exclusivo: boolean;
  taxa_percent?: number | null;
  cobra_taxa?: boolean;
  status: string;
  partidas: DbPartidaRow | DbPartidaRow[] | null;
  participantes?: Array<{
    id: string;
    nome: string;
    cidade: string | null;
    palpite_casa: number;
    palpite_fora: number;
    status: string;
    created_at: string;
  }>;
};

function resolvePartida(row: BolaoDbRow): DbPartidaRow | null {
  return resolvePartidaRow(row.partidas);
}

export function partidaToMatch(partida: DbPartidaRow): Match {
  const card = dbPartidaToCard(partida);
  return {
    id: String(partida.id),
    home: card.home,
    homeFlag: card.homeCode,
    homeCode: card.homeCode,
    away: card.away,
    awayFlag: card.awayCode,
    awayCode: card.awayCode,
    date: card.date,
    stage: partida.fase?.trim() || card.stage,
    isPersonalizado: card.isPersonalizado,
  };
}

function resolveTaxaPercent(row: BolaoDbRow): number {
  if (row.taxa_percent != null && row.taxa_percent !== undefined) {
    return Math.min(100, Math.max(0, Number(row.taxa_percent)));
  }
  return row.cobra_taxa ? PLATFORM_FEE_PERCENT : 0;
}

export function mapDbBolaoToFlowView(row: BolaoDbRow, shareUrl: string): Bolao {
  const partida = resolvePartida(row);
  const participantes = row.participantes ?? [];
  const approved = participantes.filter((p) => p.status === "aprovado" || p.status === "approved");
  const placar: [number, number] = partida
    ? [partida.placar_casa ?? 0, partida.placar_fora ?? 0]
    : [0, 0];

  const takenScores: Record<string, string> = {};
  for (const p of participantes) {
    if (row.modo_exclusivo) {
      takenScores[scoreKey([p.palpite_casa, p.palpite_fora])] = p.nome;
    }
  }

  const requests: ParticipantRequest[] = participantes.map((p) => ({
    name: p.nome,
    guess: formatScore([p.palpite_casa, p.palpite_fora]),
    status:
      p.status === "aprovado" || p.status === "approved"
        ? "approved"
        : p.status === "rejeitado" || p.status === "rejected"
          ? "rejected"
          : "pending",
  }));

  const recentGuesses: RecentGuess[] = participantes.slice(0, 5).map((p) => ({
    name: p.nome,
    guess: formatScore([p.palpite_casa, p.palpite_fora]),
    time: new Date(p.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  }));

  const feePercent = resolveTaxaPercent(row);
  const prize = calcPrize(approved.length, Number(row.stake), feePercent);
  const partidaStatus = partida?.status ?? "agendado";
  const bolaoStatus = resolveBolaoEffectiveStatus(row.status, partidaStatus);
  const isStarted = bolaoStatus === "ao_vivo" || bolaoStatus === "encerrado";

  return {
    slug: row.slug,
    status: bolaoStatus,
    partidaStatus,
    isStarted,
    match: partida ? partidaToMatch(partida) : {
      id: "0",
      home: "Time A",
      homeFlag: "br",
      homeCode: "br",
      away: "Time B",
      awayFlag: "ar",
      awayCode: "ar",
      date: "—",
      stage: "Bolão",
      isPersonalizado: false,
    },
    stake: Number(row.stake),
    settings: {
      exclusiveScore: row.modo_exclusivo,
      participantsVisible: true,
      showWinningNow: true,
      taxaPercent: feePercent,
    },
    liveScore: placar,
    finalScore: placar,
    minute: partida?.status === "ao_vivo" ? 45 : 0,
    prize,
    prizeDelta: 0,
    participantCount: participantes.length,
    participants: approved.map((p) => ({
      name: p.nome,
      avatar: p.nome[0]?.toUpperCase() ?? "?",
      guess: [p.palpite_casa, p.palpite_fora] as [number, number],
    })),
    takenScores,
    requests,
    recentGuesses,
    sharePath: shareUrl.replace(/^https?:\/\//, ""),
    winnerGuess: approved[0]
      ? ([approved[0].palpite_casa, approved[0].palpite_fora] as [number, number])
      : ([0, 0] as [number, number]),
  };
}
