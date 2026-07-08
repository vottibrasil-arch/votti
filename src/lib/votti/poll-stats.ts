import type { PollQuestion, StoredPoll } from "@/lib/votti/poll-types";

export function sumRegisteredVotes(questions: PollQuestion[]): number {
  return questions.reduce(
    (sum, q) => sum + q.options.reduce((s, o) => s + o.votes, 0),
    0,
  );
}

export function formatPollStats(poll: Pick<StoredPoll, "participantCount" | "registeredVotes">) {
  const p = poll.participantCount;
  const v = poll.registeredVotes;
  const participant =
    p === 0 ? "0 participantes" : p === 1 ? "1 participante" : `${p} participantes`;
  const votes =
    v === 0 ? "0 votos registrados" : v === 1 ? "1 voto registrado" : `${v} votos registrados`;
  return `${participant} · ${votes}`;
}
