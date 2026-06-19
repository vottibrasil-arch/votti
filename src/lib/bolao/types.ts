export type Score = [number, number];

export type Match = {
  id: string;
  home: string;
  homeFlag: string;
  homeCode: string;
  away: string;
  awayFlag: string;
  awayCode: string;
  date: string;
  stage: string;
  isPersonalizado?: boolean;
};

export type BolaoSettings = {
  exclusiveScore: boolean;
  participantsVisible: boolean;
  showWinningNow: boolean;
  /** Percentual da taxa da plataforma (0–100). Padrão: 0 = sem taxa; prêmio líquido vai para o(s) vencedor(es). */
  taxaPercent: number;
};

export type Participant = {
  name: string;
  avatar: string;
  guess: Score;
  isYou?: boolean;
};

export type ParticipantRequest = {
  name: string;
  guess: string;
  status: "pending" | "approved" | "rejected";
};

export type RecentGuess = {
  name: string;
  guess: string;
  time: string;
};

export type Supporter = {
  id: string;
  name: string;
  city: string;
  initial: string;
  message: string;
  color: string;
};

export type Bolao = {
  slug: string;
  status: string;
  partidaStatus: string;
  isStarted: boolean;
  match: Match;
  stake: number;
  settings: BolaoSettings;
  liveScore: Score;
  finalScore: Score;
  minute: number;
  prize: number;
  prizeDelta: number;
  participantCount: number;
  participants: Participant[];
  takenScores: Record<string, string>;
  requests: ParticipantRequest[];
  recentGuesses: RecentGuess[];
  sharePath: string;
  winnerGuess: Score;
};

export type RankedParticipant = Participant & {
  alive: boolean;
  distance: number;
};

export type ParticipantStatus = {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
};
