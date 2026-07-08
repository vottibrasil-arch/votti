export type PollOption = { id: string; text: string; votes: number };
export type PollQuestion = { id: string; text: string; options: PollOption[] };

export type CloseMode = "until_admin" | "scheduled_date" | "scheduled_datetime";

export type PollSettings = {
  oneVotePerPerson: boolean;
  showResultBeforeVote: boolean;
  showResultAfterVote: boolean;
  autoClose: boolean;
  closeAt: string;
  closeMode: CloseMode;
  backgroundColor: string;
  buttonColor: string;
  themePreset: string;
};

export type PollDraft = {
  title: string;
  description: string;
  category: string;
  logoUrl: string;
  primaryColor: string;
  coverUrl: string;
  questions: PollQuestion[];
  settings: PollSettings;
};

export type StoredPoll = PollDraft & {
  id: string;
  slug: string;
  ownerId: string;
  ownerEmail: string;
  status: "active" | "closed";
  createdAt: string;
  /** Pessoas únicas que votaram. */
  participantCount: number;
  /** Soma de todos os votos em todas as perguntas. */
  registeredVotes: number;
};

export type VoteSelection = {
  questionId: string;
  optionId: string;
};

export const THEME_PRESETS = [
  { id: "votti-blue", label: "VOTTI Azul", primaryColor: "#4F8FD9", backgroundColor: "#0f1729", buttonColor: "#4F8FD9" },
  { id: "forest", label: "Verde vivo", primaryColor: "#22c55e", backgroundColor: "#0a1a12", buttonColor: "#22c55e" },
  { id: "sunset", label: "Pôr do sol", primaryColor: "#f97316", backgroundColor: "#1a1008", buttonColor: "#fb923c" },
  { id: "royal", label: "Roxo real", primaryColor: "#a855f7", backgroundColor: "#140f1f", buttonColor: "#c084fc" },
  { id: "clean", label: "Neutro claro", primaryColor: "#64748b", backgroundColor: "#1e293b", buttonColor: "#94a3b8" },
] as const;

export const DEFAULT_SETTINGS: PollSettings = {
  oneVotePerPerson: true,
  showResultBeforeVote: false,
  showResultAfterVote: true,
  autoClose: false,
  closeAt: "",
  closeMode: "until_admin",
  backgroundColor: "#0f1729",
  buttonColor: "#4F8FD9",
  themePreset: "votti-blue",
};

export const EMPTY_DRAFT: PollDraft = {
  title: "",
  description: "",
  category: "",
  logoUrl: "",
  primaryColor: "#4F8FD9",
  coverUrl: "",
  questions: [
    {
      id: "q1",
      text: "",
      options: [
        { id: "o1", text: "", votes: 0 },
        { id: "o2", text: "", votes: 0 },
      ],
    },
  ],
  settings: DEFAULT_SETTINGS,
};

export function storedPollToDraft(poll: StoredPoll): PollDraft {
  return {
    title: poll.title,
    description: poll.description,
    category: poll.category,
    logoUrl: poll.logoUrl,
    primaryColor: poll.primaryColor,
    coverUrl: poll.coverUrl,
    questions: poll.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options.map((o) => ({ id: o.id, text: o.text, votes: o.votes })),
    })),
    settings: { ...poll.settings },
  };
}

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function validatePublishDraft(draft: PollDraft): string | null {
  if (!draft.title.trim()) return "Digite um título para a votação.";
  if (draft.questions.length === 0) return "Adicione ao menos uma pergunta.";

  for (const [i, question] of draft.questions.entries()) {
    if (!question.text.trim()) return `Preencha a pergunta ${i + 1}.`;
    const filled = question.options.filter((o) => o.text.trim());
    if (filled.length < 2) return `A pergunta ${i + 1} precisa de ao menos 2 opções preenchidas.`;
  }

  return null;
}

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "votacao"
  );
}
