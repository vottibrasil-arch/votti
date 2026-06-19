import { rankParticipants } from "@/lib/bolao/scoring";
import { resolvePrizeLeaders } from "@/lib/bolao/prize";
import type { Participant } from "@/lib/bolao/types";

type ParticipanteRow = {
  nome: string;
  palpite_casa: number;
  palpite_fora: number;
};

export function rankingLiderFromParticipantes(
  participantes: ParticipanteRow[],
  placar: [number, number],
  options?: { partidaStatus?: string | null; modoExclusivo?: boolean },
): string | null {
  if (participantes.length === 0) return null;

  const mapped: Participant[] = participantes.map((p) => ({
    name: p.nome,
    avatar: "⚽",
    guess: [p.palpite_casa, p.palpite_fora] as [number, number],
    isYou: false,
  }));

  const isEnded =
    options?.partidaStatus === "encerrado" || options?.partidaStatus === "finalizado";
  const leaders = resolvePrizeLeaders(
    mapped,
    placar,
    options?.modoExclusivo ?? true,
    isEnded,
  );

  if (leaders.length === 0) return isEnded ? "Sem vencedor" : null;
  if (leaders.length === 1) return leaders[0].name;
  return `${leaders.length} vencedores`;
}

export function resolveBannerStyle(bannerUrl: string | null | undefined) {
  if (!bannerUrl) {
    return {
      background: "linear-gradient(135deg, color-mix(in oklab, var(--gold) 22%, var(--surface)), var(--surface-2))",
    };
  }
  if (bannerUrl.startsWith("preset:")) {
    const id = bannerUrl.replace("preset:", "");
    const presets: Record<string, string> = {
      gold: "linear-gradient(135deg, color-mix(in oklab, var(--gold) 35%, var(--surface)), var(--surface-2))",
      churrasco: "linear-gradient(135deg, #7c2d12, #451a03)",
      pelada: "linear-gradient(135deg, color-mix(in oklab, var(--primary) 30%, var(--surface)), var(--surface-2))",
      festa: "linear-gradient(135deg, #6d28d9, #312e81)",
    };
    return { background: presets[id] ?? presets.gold };
  }
  return { background: `url(${bannerUrl}) center/cover` };
}
