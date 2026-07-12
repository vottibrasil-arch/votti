import { VOTTII_DISPLAY_NAME, VOTTI_LOGO_PATH } from "@/lib/votti/brand";
import { getServerPublicOrigin } from "@/lib/votti/app-url";

export type PollShareKind = "vote" | "results";

export type PollShareMeta = {
  slug: string;
  pollId: string;
  title: string;
  description: string;
  coverUrl: string;
};

export const DEFAULT_OG_LOGO_PATH = VOTTI_LOGO_PATH;

export function resolveShareImageUrl(coverUrl: string, origin = getServerPublicOrigin()): string {
  const cover = coverUrl.trim();
  if (cover) {
    if (/^https?:\/\//i.test(cover)) return cover;
    if (cover.startsWith("/")) return `${origin}${cover}`;
    return cover;
  }
  return `${origin}${DEFAULT_OG_LOGO_PATH}`;
}

export function buildPollShareDescription(poll: Pick<PollShareMeta, "title" | "description">): string {
  const title = poll.title.trim();
  const description = poll.description.trim();
  const parts: string[] = [];

  if (title) parts.push(title);
  if (description) parts.push(description);
  parts.push("🇧🇷 Votação segura no Brasil — 1 voto por pessoa. Acompanhe ao vivo no VOTTII.");

  return parts.join(" · ");
}

export function buildPollShareWhatsAppText(opts: {
  title: string;
  description: string;
  url: string;
  kind: PollShareKind;
}): string {
  const title = opts.title.trim() || "Votação VOTTII";
  const description = opts.description.trim();
  const lines = [`🗳️ *${title}*`];

  if (description) lines.push(description);
  lines.push("🇧🇷 Mais seguro do Brasil — VOTTII");
  lines.push(opts.url.trim());

  return lines.join("\n\n");
}

export function buildPollShareHead(
  share: PollShareMeta,
  pageUrl: string,
  kind: PollShareKind,
  origin = getServerPublicOrigin(),
) {
  const title = share.title.trim() || VOTTII_DISPLAY_NAME;
  const description = buildPollShareDescription(share);
  const image = resolveShareImageUrl(share.coverUrl, origin);
  const ogTitle =
    kind === "results" ? `${title} — Ranking ao vivo | VOTTII` : `${title} | VOTTII`;

  return {
    meta: [
      { title: ogTitle },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: VOTTII_DISPLAY_NAME },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:title", content: ogTitle },
      { property: "og:description", content: description },
      { property: "og:url", content: pageUrl },
      { property: "og:image", content: image },
      { property: "og:image:alt", content: title },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: ogTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
  };
}
