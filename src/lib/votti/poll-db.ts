import { getSupabaseBrowser } from "@/lib/api/supabase-browser";
import type { Poll, PollResult } from "@/lib/supabase/database.types";
import {
  DEFAULT_SETTINGS,
  type PollDraft,
  type PollOption,
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
    closeMode: s.closeMode ?? DEFAULT_SETTINGS.closeMode,
    backgroundColor: s.backgroundColor ?? DEFAULT_SETTINGS.backgroundColor,
    buttonColor: s.buttonColor ?? DEFAULT_SETTINGS.buttonColor,
    themePreset: s.themePreset ?? DEFAULT_SETTINGS.themePreset,
  };
}

function sumRegisteredVotes(questions: PollQuestion[]): number {
  return questions.reduce(
    (sum, q) => sum + q.options.reduce((s, o) => s + o.votes, 0),
    0,
  );
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
  participantCount = 0,
): StoredPoll {
  return {
    id: poll.id,
    slug: poll.slug,
    ownerId: poll.owner_id ?? "",
    ownerEmail,
    title: poll.title,
    description: poll.description ?? "",
    category: poll.category ?? "",
    logoUrl: poll.logo_url ?? "",
    coverUrl: (poll.photo_url ?? "").trim() || (poll.logo_url ?? "").trim(),
    primaryColor: poll.primary_color ?? "#4F8FD9",
    questions,
    settings: parseSettings(poll.settings),
    status: mapStatus(poll.status),
    createdAt: poll.created_at,
    participantCount,
    registeredVotes: sumRegisteredVotes(questions),
  };
}

function countParticipants(voterTokens: string[]): number {
  return new Set(voterTokens).size;
}

function participantCountByPoll(
  rows: { poll_id: string; voter_token: string }[],
): Map<string, number> {
  const sets = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = sets.get(row.poll_id) ?? new Set<string>();
    set.add(row.voter_token);
    sets.set(row.poll_id, set);
  }
  return new Map([...sets.entries()].map(([pollId, set]) => [pollId, set.size]));
}

async function fetchParticipantCountForPoll(pollId: string): Promise<number> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.from("votes").select("voter_token").eq("poll_id", pollId);
  if (error) throw error;
  return countParticipants((data ?? []).map((row) => row.voter_token));
}

async function fetchParticipantCountsForPolls(pollIds: string[]): Promise<Map<string, number>> {
  if (pollIds.length === 0) return new Map();
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("votes")
    .select("poll_id, voter_token")
    .in("poll_id", pollIds);
  if (error) throw error;
  return participantCountByPoll(data ?? []);
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

  const participantCount = await fetchParticipantCountForPoll(poll.id);
  return mapPollRow(poll, buildQuestions(questions ?? [], options, results ?? []), "", participantCount);
}

function randomSlug(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function generateSlug(): Promise<string> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.rpc("generate_poll_slug");

  if (!error && typeof data === "string" && data.length > 0) {
    return data;
  }

  if (error && !isSchemaMissingError(error)) {
    throw error;
  }

  return randomSlug();
}

export async function getPollBySlugDb(slug: string): Promise<StoredPoll | null> {
  return fetchPollBundle(slug);
}

export async function getPollByIdForOwnerDb(
  pollId: string,
  ownerId: string,
): Promise<StoredPoll | null> {
  const supabase = getSupabaseBrowser();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("*")
    .eq("id", pollId)
    .eq("owner_id", ownerId)
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

  const participantCount = await fetchParticipantCountForPoll(poll.id);
  return mapPollRow(poll, buildQuestions(questions ?? [], options, results ?? []), "", participantCount);
}

export async function updatePollDb(
  pollId: string,
  ownerId: string,
  draft: PollDraft,
  opts?: { status?: StoredPoll["status"] },
): Promise<StoredPoll> {
  const supabase = getSupabaseBrowser();

  const { data: existing, error: existingError } = await supabase
    .from("polls")
    .select("*")
    .eq("id", pollId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) throw new Error("Votação não encontrada.");

  let status: Poll["status"] = opts?.status ?? existing.status;
  if (draft.settings.autoClose && draft.settings.closeAt) {
    const closeAt = new Date(draft.settings.closeAt);
    if (!Number.isNaN(closeAt.getTime()) && closeAt <= new Date()) {
      status = "closed";
    }
  }

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .update({
      title: draft.title.trim() || "Votação sem título",
      description: draft.description.trim() || null,
      category: draft.category.trim() || null,
      logo_url: null,
      photo_url: draft.coverUrl.trim() || draft.logoUrl.trim() || null,
      primary_color: draft.primaryColor,
      settings: draft.settings,
      status,
    })
    .eq("id", pollId)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  if (pollError) throw pollError;

  const { data: dbQuestions, error: qFetchError } = await supabase
    .from("questions")
    .select("id, poll_id, text, sort_order")
    .eq("poll_id", pollId)
    .order("sort_order");

  if (qFetchError) throw qFetchError;

  const dbQuestionIds = new Set((dbQuestions ?? []).map((q) => q.id));

  const { data: results, error: rError } = await supabase
    .from("poll_results")
    .select("poll_id, question_id, option_id, option_text, sort_order, vote_count")
    .eq("poll_id", pollId);

  if (rError && !isSchemaMissingError(rError)) throw rError;

  const votesByOption = new Map<string, number>();
  for (const row of results ?? []) {
    votesByOption.set(row.option_id, Number(row.vote_count));
  }

  const builtQuestions: PollQuestion[] = [];

  for (const [qi, question] of draft.questions.entries()) {
    let questionId = question.id;
    const isExistingQuestion = dbQuestionIds.has(question.id);

    if (isExistingQuestion) {
      const { error: qUpdateError } = await supabase
        .from("questions")
        .update({
          text: question.text.trim() || `Pergunta ${qi + 1}`,
          sort_order: qi,
        })
        .eq("id", question.id)
        .eq("poll_id", pollId);

      if (qUpdateError) throw qUpdateError;
    } else {
      const { data: newQ, error: qInsertError } = await supabase
        .from("questions")
        .insert({
          poll_id: pollId,
          text: question.text.trim() || `Pergunta ${qi + 1}`,
          sort_order: qi,
        })
        .select("id")
        .single();

      if (qInsertError) throw qInsertError;
      questionId = newQ.id;
    }

    let dbOptions: DbOption[] = [];
    if (isExistingQuestion) {
      const { data: optRows, error: oFetchError } = await supabase
        .from("options")
        .select("id, question_id, text, sort_order")
        .eq("question_id", questionId)
        .order("sort_order");

      if (oFetchError) throw oFetchError;
      dbOptions = optRows ?? [];
    }

    const dbOptionIds = new Set(dbOptions.map((o) => o.id));
    const builtOptions: PollOption[] = [];
    const filledOptions = question.options.filter((o) => o.text.trim());

    if (filledOptions.length < 2) {
      throw new Error(`A pergunta ${qi + 1} precisa de ao menos 2 opções preenchidas.`);
    }

    for (const [oi, option] of filledOptions.entries()) {
      const isExistingOption = dbOptionIds.has(option.id);

      if (isExistingOption) {
        const { error: oUpdateError } = await supabase
          .from("options")
          .update({ text: option.text.trim(), sort_order: oi })
          .eq("id", option.id);

        if (oUpdateError) throw oUpdateError;
        builtOptions.push({
          id: option.id,
          text: option.text.trim(),
          votes: votesByOption.get(option.id) ?? 0,
        });
      } else {
        const { data: newO, error: oInsertError } = await supabase
          .from("options")
          .insert({
            question_id: questionId,
            text: option.text.trim(),
            sort_order: oi,
          })
          .select("id, text, sort_order")
          .single();

        if (oInsertError) throw oInsertError;
        builtOptions.push({ id: newO.id, text: newO.text, votes: 0 });
      }
    }

    for (const dbOpt of dbOptions) {
      if (!filledOptions.some((o) => o.id === dbOpt.id)) {
        const voteCount = votesByOption.get(dbOpt.id) ?? 0;
        if (voteCount === 0) {
          const { error: delError } = await supabase.from("options").delete().eq("id", dbOpt.id);
          if (delError) throw delError;
        }
      }
    }

    builtQuestions.push({
      id: questionId,
      text: question.text.trim() || `Pergunta ${qi + 1}`,
      options: builtOptions,
    });
  }

  for (const dbQ of dbQuestions ?? []) {
    if (!draft.questions.some((q) => q.id === dbQ.id)) {
      const hasVotes = (results ?? []).some(
        (r) => r.question_id === dbQ.id && Number(r.vote_count) > 0,
      );
      if (!hasVotes) {
        const { error: delError } = await supabase.from("questions").delete().eq("id", dbQ.id);
        if (delError) throw delError;
      }
    }
  }

  const participantCount = await fetchParticipantCountForPoll(pollId);
  return mapPollRow(poll, builtQuestions, "", participantCount);
}

export async function setPollStatusDb(
  pollId: string,
  ownerId: string,
  status: StoredPoll["status"],
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from("polls")
    .update({ status })
    .eq("id", pollId)
    .eq("owner_id", ownerId);

  if (error) throw error;
}

export async function managePollDb(
  pollId: string,
  ownerId: string,
  patch: { status?: StoredPoll["status"]; settings?: Partial<PollSettings> },
): Promise<StoredPoll> {
  const supabase = getSupabaseBrowser();

  const { data: existing, error: fetchError } = await supabase
    .from("polls")
    .select("*")
    .eq("id", pollId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Votação não encontrada.");

  const nextSettings = patch.settings
    ? { ...parseSettings(existing.settings), ...patch.settings }
    : parseSettings(existing.settings);

  let status: StoredPoll["status"] = patch.status ?? mapStatus(existing.status);

  if (nextSettings.autoClose && nextSettings.closeAt && status === "active") {
    const closeAt =
      nextSettings.closeMode === "scheduled_date"
        ? new Date(`${nextSettings.closeAt}T23:59:59`)
        : new Date(nextSettings.closeAt);
    if (!Number.isNaN(closeAt.getTime()) && closeAt <= new Date()) {
      status = "closed";
    }
  }

  const { error: updateError } = await supabase
    .from("polls")
    .update({ status, settings: nextSettings })
    .eq("id", pollId)
    .eq("owner_id", ownerId);

  if (updateError) throw updateError;

  const updated = await getPollByIdForOwnerDb(pollId, ownerId);
  if (!updated) throw new Error("Votação não encontrada.");
  return updated;
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

  const participantCounts = await fetchParticipantCountsForPolls(pollIds);

  return polls.map((poll) =>
    mapPollRow(
      poll,
      buildQuestions(questionsByPoll.get(poll.id) ?? [], options, resultsByPoll.get(poll.id) ?? []),
      "",
      participantCounts.get(poll.id) ?? 0,
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
      logo_url: null,
      photo_url: draft.coverUrl.trim() || draft.logoUrl.trim() || null,
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

  return mapPollRow(poll, builtQuestions, owner.email, 0);
}

export async function hasVotedPollDb(slug: string, voterToken: string): Promise<boolean> {
  const supabase = getSupabaseBrowser();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (pollError) throw pollError;
  if (!poll) return false;

  const { data: votes, error: votesError } = await supabase
    .from("votes")
    .select("id")
    .eq("poll_id", poll.id)
    .eq("voter_token", voterToken)
    .limit(1);

  if (votesError) throw votesError;
  return (votes?.length ?? 0) > 0;
}

export async function castVoteDb(
  slug: string,
  questionId: string,
  optionId: string,
  voterToken: string,
): Promise<void> {
  const supabase = getSupabaseBrowser();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id, status, settings")
    .eq("slug", slug)
    .maybeSingle();

  if (pollError) throw pollError;
  if (!poll || poll.status !== "active") {
    throw new Error("Votação não encontrada ou encerrada.");
  }

  const settings = parseSettings(poll.settings);
  if (settings.oneVotePerPerson) {
    const alreadyVoted = await hasVotedPollDb(slug, voterToken);
    if (alreadyVoted) {
      throw new Error("Você já votou nesta votação.");
    }
  } else {
    const { data: existingVote, error: existingError } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", poll.id)
      .eq("question_id", questionId)
      .eq("voter_token", voterToken)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingVote) {
      throw new Error("Você já votou nesta pergunta.");
    }
  }

  const { error } = await supabase.from("votes").insert({
    poll_id: poll.id,
    question_id: questionId,
    option_id: optionId,
    voter_token: voterToken,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Você já votou nesta votação.");
    }
    throw error;
  }
}

export async function castVotesDb(
  slug: string,
  selections: { questionId: string; optionId: string }[],
  voterToken: string,
): Promise<void> {
  if (selections.length === 0) {
    throw new Error("Selecione uma opção em cada pergunta.");
  }

  const supabase = getSupabaseBrowser();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id, status, settings")
    .eq("slug", slug)
    .maybeSingle();

  if (pollError) throw pollError;
  if (!poll || poll.status !== "active") {
    throw new Error("Votação não encontrada ou encerrada.");
  }

  const settings = parseSettings(poll.settings);
  if (settings.oneVotePerPerson) {
    const alreadyVoted = await hasVotedPollDb(slug, voterToken);
    if (alreadyVoted) {
      throw new Error("Você já votou nesta votação.");
    }
  }

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("id")
    .eq("poll_id", poll.id);

  if (qError) throw qError;

  const questionIds = new Set((questions ?? []).map((q) => q.id));
  for (const selection of selections) {
    if (!questionIds.has(selection.questionId)) {
      throw new Error("Pergunta inválida.");
    }
  }

  const { error } = await supabase.from("votes").insert(
    selections.map((selection) => ({
      poll_id: poll.id,
      question_id: selection.questionId,
      option_id: selection.optionId,
      voter_token: voterToken,
    })),
  );

  if (error) {
    if (error.code === "23505") {
      throw new Error("Você já votou nesta votação.");
    }
    throw error;
  }
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
    const e = error as { message: string; code?: string };
    if (e.code === "23505") {
      return "Você já votou nesta pergunta.";
    }
    const msg = String(e.message);
    if (/jwt|session|not authenticated|invalid claim/i.test(msg)) {
      return "Sessão expirada. Saia da conta e entre novamente.";
    }
    if (/permission denied|42501|row-level security|rls/i.test(msg)) {
      return "Permissão negada no banco. Confirme que executou docs/supabase/SETUP-COMPLETO.sql e entre de novo.";
    }
    if (/violates foreign key|owner_id/i.test(msg)) {
      return "Conta inválida ou sessão expirada. Saia da conta e entre novamente.";
    }
    if (/23505|duplicate key|unique constraint|já votou/i.test(msg)) {
      return "Você já votou nesta pergunta.";
    }
    return msg;
  }

  return "Não foi possível carregar suas votações.";
}
