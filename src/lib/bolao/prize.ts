import type { Participant, RankedParticipant, Score } from "./types";
import { calcPrize } from "./format";
import { rankParticipants } from "./scoring";

/** Vencedor(es) com placar final — só quem cravou o placar exato e ainda está vivo. */
export function findFinalPrizeWinners(
  participants: Participant[],
  finalScore: Score,
  _exclusiveScore: boolean,
): RankedParticipant[] {
  const ranked = rankParticipants(participants, finalScore);
  return ranked.filter((p) => p.alive && guessMatchesScore(p.guess, finalScore));
}

/** Quem lidera ao vivo — só quem cravou o placar parcial atual. */
export function findLivePrizeLeaders(
  participants: Participant[],
  current: Score,
  _exclusiveScore: boolean,
): RankedParticipant[] {
  const ranked = rankParticipants(participants, current);
  return ranked.filter((p) => p.alive && guessMatchesScore(p.guess, current));
}

export function resolvePrizeLeaders(
  participants: Participant[],
  score: Score,
  exclusiveScore: boolean,
  isEnded: boolean,
): RankedParticipant[] {
  return isEnded
    ? findFinalPrizeWinners(participants, score, exclusiveScore)
    : findLivePrizeLeaders(participants, score, exclusiveScore);
}

export function calcPrizeShare(
  approvedCount: number,
  stake: number,
  feePercent: number,
  winnerCount: number,
) {
  const totalPrize = calcPrize(approvedCount, stake, feePercent);
  const perWinner = winnerCount > 0 ? Math.round(totalPrize / winnerCount) : totalPrize;
  return { totalPrize, perWinner, winnerCount };
}

export function guessMatchesScore(guess: Score, score: Score): boolean {
  return guess[0] === score[0] && guess[1] === score[1];
}
