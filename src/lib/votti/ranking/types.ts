import type { PollQuestion } from "@/lib/votti/poll-types";

export type PollRankingMeta = {
  title: string;
  description: string;
  primaryColor: string;
  coverUrl: string;
  logoUrl: string;
  status: "active" | "closed";
};

export type PollRankingState = {
  slug: string;
  pollId: string;
  version: number;
  updatedAt: string;
  participantCount: number;
  registeredVotes: number;
  meta: PollRankingMeta;
  questions: PollQuestion[];
};

export function sumRankingVotes(questions: PollRankingState["questions"]): number {
  return questions.reduce(
    (sum, q) => sum + q.options.reduce((s, o) => s + Number(o.votes), 0),
    0,
  );
}
