export type PollOption = { id: string; text: string; votes: number };
export type PollQuestion = { id: string; text: string; options: PollOption[] };

export type PollSettings = {
  oneVotePerPerson: boolean;
  showResultBeforeVote: boolean;
  showResultAfterVote: boolean;
  autoClose: boolean;
  closeAt: string;
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
  totalVotes: number;
};

export const DEFAULT_SETTINGS: PollSettings = {
  oneVotePerPerson: true,
  showResultBeforeVote: false,
  showResultAfterVote: true,
  autoClose: false,
  closeAt: "",
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

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
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
