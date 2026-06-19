import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shell, TopBar } from "@/components/ui-kit";
import { buildBolaoGuestJoinSearch } from "@/lib/bolao/share-url";

export const Route = createFileRoute("/pick")({
  validateSearch: (search: Record<string, unknown>) => ({
    bolao: typeof search.bolao === "string" ? search.bolao : undefined,
  }),
  head: () => ({ meta: [{ title: "Escolha seu placar" }] }),
  component: Pick,
});

function Pick() {
  const { bolao: slug } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    navigate({ to: "/join", search: buildBolaoGuestJoinSearch(slug), replace: true });
  }, [navigate, slug]);

  return (
    <Shell>
      <TopBar title="Bolão" useHistoryBack />
      <p className="text-sm text-muted-foreground text-center py-8">Abrindo link do bolão...</p>
    </Shell>
  );
}
