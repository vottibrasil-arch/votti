import type { Score } from "./types";

export function scoreKey(score: Score): string {
  return `${score[0]}-${score[1]}`;
}

export function formatScore(score: Score, separator = "x"): string {
  return `${score[0]}${separator}${score[1]}`;
}

export function formatScoreDisplay(score: Score): string {
  return `${score[0]} x ${score[1]}`;
}

export function formatMoney(value: number, cents = false): string {
  if (cents) {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

export function calcPrize(approvedCount: number, stake: number, feePercent: number): number {
  const total = approvedCount * stake;
  return Math.round(total * (1 - feePercent / 100));
}
