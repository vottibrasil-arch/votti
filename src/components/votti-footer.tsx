import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ensureMonetagScriptLoaded } from "@/lib/monetag";

/** Páginas com anúncio Monetag (script invisível — sem barra fixa). */
function shouldLoadVoteAds(pathname: string) {
  if (pathname.endsWith("/telao")) return false;
  return pathname.startsWith("/v/") || pathname.startsWith("/votacao/");
}

/** Carrega Monetag só nas páginas públicas de votação — sem UI fixa no rodapé. */
export function VottiFooter() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = shouldLoadVoteAds(pathname);

  useEffect(() => {
    if (!active) return;
    ensureMonetagScriptLoaded();
  }, [active]);

  return null;
}
