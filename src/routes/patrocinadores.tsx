import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { MonetagAdSlot } from "@/lib/patrocinadores";

export const Route = createFileRoute("/patrocinadores")({
  head: () => ({
    meta: [
      { title: "Patrocinadores — VOTTI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PatrocinadoresPage,
});

function PatrocinadoresPage() {
  return (
    <main className="votti-patrocinadores-page" data-votti-patrocinadores-page>
      <header className="votti-patrocinadores-page__head">
        <div className="votti-patrocinadores-page__title-row">
          <Megaphone className="votti-patrocinadores-page__icon" aria-hidden />
          <h1 className="votti-patrocinadores-page__title">Patrocinadores do VOTTI</h1>
        </div>
        <p className="votti-patrocinadores-page__subtitle">
          Este espaço ajuda a manter o VOTTI gratuito.
        </p>
      </header>

      <div className="votti-patrocinadores-page__slot">
        <p className="votti-patrocinadores-page__loading" aria-live="polite">
          Carregando patrocinadores…
        </p>
        <MonetagAdSlot />
      </div>
    </main>
  );
}
