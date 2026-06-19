import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shell, TopBar, PrimaryButton } from "@/components/ui-kit";
import { SignOutButton } from "@/components/auth-sign-out";
import { buildBolaoGuestJoinSearch } from "@/lib/bolao/share-url";

export const Route = createFileRoute("/share")({
  validateSearch: (search: Record<string, unknown>) => ({
    bolao: typeof search.bolao === "string" ? search.bolao : undefined,
  }),
  loader: async ({ location }) => {
    const slug = location.search.bolao as string | undefined;
    return { slug: slug ?? null };
  },
  head: () => ({ meta: [{ title: "Compartilhar — Palpite Gol" }] }),
  component: Share,
});

function Share() {
  const { slug } = Route.useLoaderData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    navigate({ to: "/join", search: buildBolaoGuestJoinSearch(slug), replace: true });
  }, [navigate, slug]);

  return (
    <Shell>
      <TopBar title="Compartilhar" back="/create" backSearch={{ aba: "meus" }} right={<SignOutButton compact />} />
      {slug ? (
        <p className="text-sm text-muted-foreground text-center py-8">Abrindo link de convidado...</p>
      ) : (
        <>
          <div className="glass rounded-2xl p-6 text-center text-sm text-red-400">
            Link inválido. Crie ou abra um bolão primeiro.
          </div>
          <PrimaryButton to="/create" search={{ aba: "meus" }} variant="primary" className="mt-4">
            Ir para meus bolões
          </PrimaryButton>
        </>
      )}
    </Shell>
  );
}
