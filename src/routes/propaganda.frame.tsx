import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ensureMonetagScriptLoaded } from "@/lib/monetag";

export const Route = createFileRoute("/propaganda/frame")({
  head: () => ({
    meta: [
      { title: "VOTTII — Propaganda" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PropagandaFramePage,
});

/** Página isolada para o Monetag — carregada só dentro do iframe do rodapé das votações. */
function PropagandaFramePage() {
  useEffect(() => {
    ensureMonetagScriptLoaded();
  }, []);

  return (
    <div className="votti-propaganda-frame" aria-label="Área de propaganda">
      <p className="votti-propaganda-frame__hint">Conteúdo patrocinado</p>
    </div>
  );
}
