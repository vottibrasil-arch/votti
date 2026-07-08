import { getSupabaseBrowser } from "@/lib/api/supabase-browser";
import type { Poll, PollResult } from "@/lib/supabase/database.types";
import {
  DEFAULT_SETTINGS,
  type PollDraft,
  type PollQuestion,
  type PollSettings,
  type StoredPoll,
} from "@/lib/votti/poll-types";

type DbQuestion = { id: string; poll_id: string; text: string; sort_order: number };
type DbOption = { id: string; question_id: string; text: string; sort_order: number };

function parseSettings(raw: unknown): PollSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const s = raw as Partial<PollSettings>;
  return {
    oneVotePerPerson: s.oneVotePerPerson ?? DEFAULT_SETTINGS.oneVotePerPerson,
    showResultBeforeVote: s.showResultBeforeVote ?? DEFAULT_SETTINGS.showResultBeforeVote,
    showResultAfterVote: s.showResultAfterVote ?? DEFAULT_SETTINGS.showResultAfterVote,
    autoClose: s.autoClose ?? DEFAULT_SETTINGS.autoClose,
    closeAt: s.closeAt ?? DEFAULT_SETTINGS.closeAt,
  };
}

function mapStatus(status: Poll["status"]): StoredPoll["status"] {
  return status === "closed" ? "closed" : "active";
}

function buildQuestions(
  questions: DbQuestion[],
  options: DbOption[],
  results: PollResult[],
): PollQuestion[] {
  const votesByOption = new Map<string, number>();
  for (const row of results) {
    votesByOption.set(row.option_id, Number(row.vote_count));
  }

  return questions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((q) => ({
      id: q.id,
      text: q.text,
      options: options
        .filter((o) => o.question_id === q.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({
          id: o.id,
          text: o.text,
          votes: votesByOption.get(o.id) ?? 0,
        })),
    }));
}

function mapPollRow(
  poll: Poll,
  questions: PollQuestion[],
  ownerEmail = "",
): StoredPoll {
  const totalVotes = questions.reduce(
    (sum, q) => sum + q.options.reduce((s, o) => s + o.votes, 0),
    0,
  );

  return {
    id: poll.id,
    slug: poll.slug,
    ownerId: poll.owner_id ?? "",
    ownerEmail,
    title: poll.title,
    description: poll.description ?? "",
    category: poll.category ?? "",
    logoUrl: poll.logo_url ?? "",
    coverUrl: poll.photo_url ?? "",
    primaryColor: poll.primary_color ?? "#4F8FD9",
    questions,
    settings: parseSettings(poll.settings),
    status: mapStatus(poll.status),
    createdAt: poll.created_at,
    totalVotes,
  };
}

async function fetchPollBundle(slug: string) {
  const supabase = getSupabaseBrowser();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (pollError) throw pollError;
  if (!poll) return null;

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("id, poll_id, text, sort_order")
    .eq("poll_id", poll.id)
    .order("sort_order");

  if (qError) throw qError;

  const questionIds = (questions ?? []).map((q) => q.id);
  let options: DbOption[] = [];

  if (questionIds.length > 0) {
    const { data: optionRows, error: oError } = await supabase
      .from("options")
      .select("id, question_id, text, sort_order")
      .in("question_id", questionIds)
      .order("sort_order");

    if (oError) throw oError;
    options = optionRows ?? [];
  }

  const { data: results, error: rError } = await supabase
    .from("poll_results")
    .select("poll_id, question_id, option_id, option_text, sort_order, vote_count")
    .eq("poll_id", poll.id);

  if (rError && !isSchemaMissingError(rError)) throw rError;

  return mapPollRow(poll, buildQuestions(questions ?? [], options, results ?? []));
}

async function generateSlug(): Promise<string> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.rpc("generate_poll_slug");
  if (error) throw error;
  if (!data || typeof data !== "string") {
    throw new Error("Não foi possível gerar o slug da votação");
  }
  return data;
}

export async function getPollBySlugDb(slug: string): Promise<StoredPoll | null> {
  return fetchPollBundle(slug);
}

export async function listPollsByOwnerDb(ownerId: string): Promise<StoredPoll[]> {
  const supabase = getSupabaseBrowser();

  const { data: polls, error: pollError } = await supabase
    .from("polls")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (pollError) throw pollError;
  if (!polls?.length) return [];

  const pollIds = polls.map((p) => p.id);

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("id, poll_id, text, sort_order")
    .in("poll_id", pollIds)
    .order("sort_order");

  if (qError) throw qError;

  const questionIds = (questions ?? []).map((q) => q.id);
  let options: DbOption[] = [];

  if (questionIds.length > 0) {
    const { data: optionRows, error: oError } = await supabase
      .from("options")
      .select("id, question_id, text, sort_order")
      .in("question_id", questionIds)
      .order("sort_order");

    if (oError) throw oError;
    options = optionRows ?? [];
  }

  const { data: results, error: rError } = await supabase
    .from("poll_results")
    .select("poll_id, question_id, option_id, option_text, sort_order, vote_count")
    .in("poll_id", pollIds);

  if (rError && !isSchemaMissingError(rError)) throw rError;

  const questionsByPoll = new Map<string, DbQuestion[]>();
  for (const q of questions ?? []) {
    const list = questionsByPoll.get(q.poll_id) ?? [];
    list.push(q);
    questionsByPoll.set(q.poll_id, list);
  }

  const resultsByPoll = new Map<string, PollResult[]>();
  for (const row of results ?? []) {
    const list = resultsByPoll.get(row.poll_id) ?? [];
    list.push(row);
    resultsByPoll.set(row.poll_id, list);
  }

  return polls.map((poll) =>
    mapPollRow(
      poll,
      buildQuestions(questionsByPoll.get(poll.id) ?? [], options, resultsByPoll.get(poll.id) ?? []),
    ),
  );
}

export async function publishPollDb(
  draft: PollDraft,
  owner: { id: string; email: string },
): Promise<StoredPoll> {
  const supabase = getSupabaseBrowser();
  const slug = await generateSlug();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      slug,
      owner_id: owner.id,
      title: draft.title.trim() || "Votação sem título",
      description: draft.description.trim() || null,
      category: draft.category.trim() || null,
      logo_url: draft.logoUrl.trim() || null,
      photo_url: draft.coverUrl.trim() || null,
      primary_color: draft.primaryColor,
      status: "active",
      settings: draft.settings,
    })
    .select("*")
    .single();

  if (pollError) throw pollError;

  const builtQuestions: PollQuestion[] = [];

  for (const [qi, question] of draft.questions.entries()) {
    const { data: qRow, error: qError } = await supabase
      .from("questions")
      .insert({
        poll_id: poll.id,
        text: question.text.trim() || `Pergunta ${qi + 1}`,
        sort_order: qi,
      })
      .select("id")
      .single();

    if (qError) throw qError;

    const optionRows = question.options
      .filter((o) => o.text.trim())
      .map((o, oi) => ({
        question_id: qRow.id,
        text: o.text.trim(),
        sort_order: oi,
      }));

    if (optionRows.length === 0) {
      throw new Error("Cada pergunta precisa ter ao menos uma opção preenchida");
    }

    const { data: insertedOptions, error: oError } = await supabase
      .from("options")
      .insert(optionRows)
      .select("id, text, sort_order");

    if (oError) throw oError;

    builtQuestions.push({
      id: qRow.id,
      text: question.text.trim() || `Pergunta ${qi + 1}`,
      options: (insertedOptions ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({ id: o.id, text: o.text, votes: 0 })),
    });
  }

  return mapPollRow(poll, builtQuestions, owner.email);
}

export async function deletePollDb(pollId: string, ownerId: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.from("polls").delete().eq("id", pollId).eq("owner_id", ownerId);
  if (error) throw error;
}

export async function duplicatePollDb(pollId: string, ownerId: string): Promise<StoredPoll | null> {
  const supabase = getSupabaseBrowser();

  const { data: source, error: sourceError } = await supabase
    .from("polls")
    .select("*")
    .eq("id", pollId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (sourceError) throw sourceError;
  if (!source) return null;

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("id, text, sort_order")
    .eq("poll_id", source.id)
    .order("sort_order");

  if (qError) throw qError;

  const questionIds = (questions ?? []).map((q) => q.id);
  let options: DbOption[] = [];

  if (questionIds.length > 0) {
    const { data: optionRows, error: oError } = await supabase
      .from("options")
      .select("id, question_id, text, sort_order")
      .in("question_id", questionIds)
      .order("sort_order");

    if (oError) throw oError;
    options = optionRows ?? [];
  }

  const slug = await generateSlug();

  const { data: copy, error: copyError } = await supabase
    .from("polls")
    .insert({
      slug,
      owner_id: ownerId,
      title: `${source.title} (cópia)`,
      description: source.description,
      category: source.category,
      logo_url: source.logo_url,
      photo_url: source.photo_url,
      primary_color: source.primary_color,
      status: "active",
      settings: parseSettings(source.settings),
    })
    .select("*")
    .single();

  if (copyError) throw copyError;

  for (const q of questions ?? []) {
    const { data: newQ, error: nqError } = await supabase
      .from("questions")
      .insert({
        poll_id: copy.id,
        text: q.text,
        sort_order: q.sort_order,
      })
      .select("id")
      .single();

    if (nqError) throw nqError;

    const qOptions = options
      .filter((o) => o.question_id === q.id)
      .map((o) => ({
        question_id: newQ.id,
        text: o.text,
        sort_order: o.sort_order,
      }));

    if (qOptions.length > 0) {
      const { error: noError } = await supabase.from("options").insert(qOptions);
      if (noError) throw noError;
    }
  }

  return fetchPollBundle(copy.slug);
}

export function isSchemaMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string };
  const haystack = `${e.message ?? ""} ${e.details ?? ""}`.toLowerCase();
  return (
    e.code === "PGRST205" ||
    e.code === "PGRST202" ||
    haystack.includes("schema cache") ||
    haystack.includes("could not find the table") ||
    haystack.includes("could not find the function")
  );
}

export const SCHEMA_SETUP_HINT =
  "Banco de dados incompleto. No Supabase → SQL Editor, execute docs/supabase/SETUP-COMPLETO.sql (não use o schema automático do Table Editor) e recarregue a página.";

function getSchemaSetupHint(error: unknown): string {
  const e = error as { code?: string; message?: string };
  const msg = `${e.message ?? ""}`.toLowerCase();

  if (e.code === "PGRST202" || msg.includes("generate_poll_slug")) {
    return "Falta a função generate_poll_slug. Execute docs/supabase/SETUP-COMPLETO.sql no SQL Editor e recarregue a página.";
  }

  if (msg.includes("poll_results")) {
    return "Falta a view poll_results. Execute docs/supabase/SETUP-COMPLETO.sql no SQL Editor e recarregue a página.";
  }

  if (msg.includes("polls") || msg.includes("questions") || msg.includes("options")) {
    return SCHEMA_SETUP_HINT;
  }

  return SCHEMA_SETUP_HINT;
}

export function getPollErrorMessage(error: unknown): string {
  if (isSchemaMissingError(error)) return getSchemaSetupHint(error);

  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message: string }).message);
    if (/jwt|session|not authenticated|invalid claim/i.test(msg)) {
      return "Sessão expirada. Saia da conta e entre novamente.";
    }
    if (/permission denied|42501|row-level security|rls/i.test(msg)) {
      return "Permissão negada no banco. Confirme que executou docs/supabase/SETUP-COMPLETO.sql e entre de novo.";
    }
    if (/violates foreign key|owner_id/i.test(msg)) {
      return "Conta inválida ou sessão expirada. Saia da conta e entre novamente.";
    }
    return msg;
  }

  return "Não foi possível carregar suas votações.";
}
