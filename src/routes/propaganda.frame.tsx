import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ensureMonetagScriptLoaded } from "@/lib/monetag";

export const Route = createFileRoute("/propaganda/frame")({
  head: () => ({
    meta: [
      { title: "VOTTII — Patrocinadores" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PropagandaFramePage,
});

/** Página isolada para o Monetag — carregada só dentro do iframe da Central de Patrocinadores. */
function PropagandaFramePage() {
  useEffect(() => {
    ensureMonetagScriptLoaded();
  }, []);

  return (
    <div className="votti-propaganda-frame" aria-label="Patrocinadores do VOTTI">
      <p className="votti-propaganda-frame__hint">Conteúdo patrocinado</p>
    </div>
  );
}
