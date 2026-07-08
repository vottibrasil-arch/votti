import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/landing-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VOTTI — Vote. Compartilhe. Acompanhe ao vivo." },
      {
        name: "description",
        content:
          "O sistema de votação mais seguro do Brasil. Crie enquetes em tempo real, compartilhe no WhatsApp e acompanhe ao vivo.",
      },
      { property: "og:title", content: "VOTTI — Sua votação em tempo real" },
      { property: "og:description", content: "Vote uma vez. Acompanhe ao vivo." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});
