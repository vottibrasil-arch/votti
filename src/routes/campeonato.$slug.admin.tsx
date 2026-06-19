import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { CampeonatoAdminTab } from "@/components/campeonato-admin/campeonato-admin-shell";

function mapAdminTab(aba: string | undefined): "jogos" | "bolao" | "campeonato" {
  if (aba === "configuracoes" || aba === "campeonato") return "campeonato";
  if (aba === "bolao") return "bolao";
  return "jogos";
}

export const Route = createFileRoute("/campeonato/$slug/admin")({
  validateSearch: (search: Record<string, unknown>) => {
    const abaRaw = search.aba;
    const aba: CampeonatoAdminTab =
      typeof abaRaw === "string" &&
      ["jogos", "participantes", "classificacao", "configuracoes"].includes(abaRaw)
        ? (abaRaw as CampeonatoAdminTab)
        : "jogos";
    return { aba };
  },
  component: CampeonatoAdminRedirect,
});

/** Redireciona para a página unificada do campeonato. */
function CampeonatoAdminRedirect() {
  const { slug } = Route.useParams();
  const { aba } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    navigate({
      to: "/campeonato/$slug",
      params: { slug },
      search: { aba: mapAdminTab(aba) },
      replace: true,
    });
  }, [navigate, slug, aba]);

  return (
    <p className="text-sm text-muted-foreground text-center py-12">Abrindo campeonato...</p>
  );
}
