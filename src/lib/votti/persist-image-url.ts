import { uploadPollAsset } from "@/lib/votti/upload-poll-asset";
import type { PollDraft } from "@/lib/votti/poll-types";

export function isBlobImageUrl(url: string | undefined | null): boolean {
  return Boolean(url?.trim().startsWith("blob:"));
}

export function isPersistableImageUrl(url: string | undefined | null): boolean {
  const value = url?.trim() ?? "";
  if (!value || isBlobImageUrl(value)) return false;
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/");
}

export function normalizeImageUrl(url: string | undefined | null): string {
  const value = url?.trim() ?? "";
  if (!value || isBlobImageUrl(value)) return "";
  return value;
}

async function blobUrlToFile(url: string, name: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Não foi possível processar a imagem local. Envie a foto novamente.");
  }
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

export async function persistImageUrl(
  url: string | undefined | null,
  ownerId: string,
  kind: "logo" | "cover" | "option",
): Promise<string> {
  const normalized = normalizeImageUrl(url);
  if (normalized) return normalized;
  if (!isBlobImageUrl(url) || !url?.trim()) return "";

  const file = await blobUrlToFile(url.trim(), `${kind}.jpg`);
  return uploadPollAsset(file, ownerId, kind);
}

export async function resolveDraftImages(draft: PollDraft, ownerId: string): Promise<PollDraft> {
  const [logoUrl, coverUrl, questions] = await Promise.all([
    persistImageUrl(draft.logoUrl, ownerId, "logo"),
    persistImageUrl(draft.coverUrl || draft.logoUrl, ownerId, "cover"),
    Promise.all(
      draft.questions.map(async (question) => ({
        ...question,
        options: await Promise.all(
          question.options.map(async (option) => ({
            ...option,
            imageUrl: await persistImageUrl(option.imageUrl, ownerId, "option"),
          })),
        ),
      })),
    ),
  ]);

  return {
    ...draft,
    logoUrl,
    coverUrl: coverUrl || logoUrl,
    questions,
  };
}

export function sanitizeDraftImages(draft: PollDraft): PollDraft {
  return {
    ...draft,
    logoUrl: normalizeImageUrl(draft.logoUrl),
    coverUrl: normalizeImageUrl(draft.coverUrl),
    questions: draft.questions.map((question) => ({
      ...question,
      options: question.options.map((option) => ({
        ...option,
        imageUrl: normalizeImageUrl(option.imageUrl),
      })),
    })),
  };
}

export function findInvalidDraftImages(draft: PollDraft): string | null {
  if (isBlobImageUrl(draft.logoUrl) || isBlobImageUrl(draft.coverUrl)) {
    return "Uma imagem ainda não foi enviada. Abra o passo Visual e envie a foto de novo.";
  }

  for (const [qi, question] of draft.questions.entries()) {
    for (const [oi, option] of question.options.entries()) {
      if (isBlobImageUrl(option.imageUrl)) {
        return `A foto da opção ${oi + 1} (pergunta ${qi + 1}) não foi salva. Envie novamente antes de publicar.`;
      }
    }
  }

  return null;
}
