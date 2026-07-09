import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout das rotas públicas /votacao/:slug/* (resultados, telão). */
export const Route = createFileRoute("/votacao/$slug")({
  component: VotacaoSlugLayout,
});

function VotacaoSlugLayout() {
  return <Outlet />;
}
