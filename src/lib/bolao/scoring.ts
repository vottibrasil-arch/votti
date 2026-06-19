import type { Participant, ParticipantStatus, RankedParticipant, Score } from "./types";

export function isAlive(guess: Score, current: Score): boolean {
  return guess[0] >= current[0] && guess[1] >= current[1];
}

export function scoreDistance(guess: Score, current: Score): number {
  return Math.abs(guess[0] - current[0]) + Math.abs(guess[1] - current[1]);
}

export function rankParticipants(participants: Participant[], current: Score): RankedParticipant[] {
  return participants
    .map((p) => ({
      ...p,
      alive: isAlive(p.guess, current),
      distance: scoreDistance(p.guess, current),
    }))
    .sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return a.distance - b.distance;
    });
}

export function getParticipantStatus(
  you: RankedParticipant,
  leaders: RankedParticipant[],
  options: { isEnded: boolean },
): ParticipantStatus {
  const isPrizeLeader = leaders.some(
    (leader) =>
      leader.name === you.name && leader.guess[0] === you.guess[0] && leader.guess[1] === you.guess[1],
  );

  if (options.isEnded) {
    if (isPrizeLeader) {
      return {
        label: "VENCEU",
        emoji: "🏆",
        color: "oklch(0.85 0.18 90)",
        bg: "color-mix(in oklab, var(--gold) 18%, var(--surface))",
        border: "color-mix(in oklab, var(--gold) 50%, transparent)",
      };
    }
    return {
      label: "NÃO VENCEU",
      emoji: you.alive ? "😔" : "😭",
      color: "oklch(0.78 0.16 27)",
      bg: "color-mix(in oklab, var(--destructive) 16%, var(--surface))",
      border: "color-mix(in oklab, var(--destructive) 45%, transparent)",
    };
  }

  if (!you.alive) {
    return {
      label: "ELIMINADO",
      emoji: "😭",
      color: "oklch(0.78 0.16 27)",
      bg: "color-mix(in oklab, var(--destructive) 16%, var(--surface))",
      border: "color-mix(in oklab, var(--destructive) 45%, transparent)",
    };
  }

  if (isPrizeLeader) {
    return {
      label: "LIDERANDO",
      emoji: "😎",
      color: "oklch(0.85 0.18 90)",
      bg: "color-mix(in oklab, var(--gold) 18%, var(--surface))",
      border: "color-mix(in oklab, var(--gold) 50%, transparent)",
    };
  }

  return {
    label: "NA DISPUTA",
    emoji: "👀",
    color: "oklch(0.85 0.15 150)",
    bg: "color-mix(in oklab, var(--primary) 16%, var(--surface))",
    border: "color-mix(in oklab, var(--primary) 45%, transparent)",
  };
}
