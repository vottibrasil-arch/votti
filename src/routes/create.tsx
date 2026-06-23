import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell, TopBar } from "@/components/ui-kit";
import { SignOutButton } from "@/components/auth-sign-out";
import { AppNavTabs, type AppTab, type CreateAba } from "@/components/app-nav-tabs";
import { CriarCampeonatoWizard, type ModoCriacao } from "@/components/criar-campeonato-wizard";
import { CriarBolaoWizard } from "@/components/criar-bolao-wizard";
import { MeusDashboard } from "@/components/meus-dashboard";
import { CampeonatoJogosPanel } from "@/components/campeonato-jogos-panel";
import { useAuth } from "@/lib/auth/use-auth";
import { checkSuperAdmin } from "@/lib/api/super-admin.server";
import { resolveCreateTopBarBack } from "@/lib/create-topbar-back";

export const Route = createFileRoute("/create")({
  validateSearch: (search: Record<string, unknown>) => {
    const abaRaw = search.aba;
    const aba: CreateAba =
      abaRaw === "criar" || abaRaw === "bolao" || abaRaw === "meus" || abaRaw === "campeonato"
        ? abaRaw
        : abaRaw === "gerenciar"
          ? "campeonato"
          : "bolao";
    const passoRaw = Number(search.passo);
    const passo = aba === "bolao" && passoRaw >= 1 && passoRaw <= 4 ? passoRaw : 1;
    const etapaRaw = Number(search.etapa);
    const etapa = aba === "criar" && etapaRaw >= 1 && etapaRaw <= 2 ? etapaRaw : 1;
    const modo: ModoCriacao = search.modo === "jogo-unico" ? "jogo-unico" : "campeonato";
    const campeonatoId = Number(search.campeonatoId);
    const partidaId = Number(search.partidaId);
    const catalogMatchIdRaw = search.catalogMatchId;
    const catalogMatchId =
      typeof catalogMatchIdRaw === "string" && catalogMatchIdRaw.trim().length > 0
        ? catalogMatchIdRaw.trim()
        : undefined;
    return {
      aba,
      passo: passo as 1 | 2 | 3 | 4,
      etapa: etapa as 1 | 2,
      modo,
      campeonatoId: campeonatoId > 0 ? campeonatoId : undefined,
      partidaId: partidaId > 0 ? partidaId : undefined,
      catalogMatchId,
    };
  },
  head: () => ({ meta: [{ title: "Palpite Gol — Campeonatos e Bolões" }] }),
  component: Create,
});

function BolaoStepDots({ passo }: { passo: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`h-1.5 rounded-full transition-all ${
            n === passo ? "w-8 bg-primary" : n < passo ? "w-4 bg-primary/50" : "w-4 bg-surface-2"
          }`}
        />
      ))}
    </div>
  );
}

function Create() {
  const { aba, passo, etapa, modo, campeonatoId, partidaId, catalogMatchId } = Route.useSearch();
  const navigate = useNavigate();
  const checkSuperAdminFn = useServerFn(checkSuperAdmin);
  const { user, loading, getAccessToken } = useAuth();
  const [checkingSuperAdmin, setCheckingSuperAdmin] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate({
        to: "/login",
        search: { redirect: `/create?aba=${aba}` },
      });
    }
  }, [loading, user, navigate, aba]);

  useEffect(() => {
    if (loading || !user) {
      setCheckingSuperAdmin(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setCheckingSuperAdmin(false);
      return;
    }

    let cancelled = false;
    async function checkPermission() {
      setCheckingSuperAdmin(true);
      try {
        const result = await checkSuperAdminFn({ data: { accessToken: token } });
        const canOpenBolaoFromCatalog = aba === "bolao" && Boolean(catalogMatchId);
        if (!cancelled && result.isSuperAdmin && !canOpenBolaoFromCatalog) {
          navigate({ to: "/super-admin", replace: true });
          return;
        }
      } catch {
        // Se a checagem falhar, mantém o app comum funcionando.
      } finally {
        if (!cancelled) setCheckingSuperAdmin(false);
      }
    }

    void checkPermission();
    return () => {
      cancelled = true;
    };
  }, [loading, navigate, user?.id, aba, catalogMatchId]);

  useEffect(() => {
    if (aba === "campeonato" && !campeonatoId && !loading && user) {
      navigate({ to: "/create", search: { aba: "meus" } });
    }
  }, [aba, campeonatoId, loading, user, navigate]);

  if (loading || !user || checkingSuperAdmin) {
    return (
      <Shell>
        <TopBar title="Palpite Gol" useHistoryBack />
        <p className="text-center text-sm text-muted-foreground">Carregando...</p>
      </Shell>
    );
  }

  const topBarBack = resolveCreateTopBarBack(
    aba,
    passo,
    etapa,
    modo,
    campeonatoId,
    partidaId,
    catalogMatchId,
  );
  const navActive: AppTab = aba === "campeonato" ? "meus" : aba;
  const campeonatoTitle =
    aba === "campeonato" && partidaId
      ? "Configurar bolão"
      : aba === "campeonato"
        ? "Jogos do campeonato"
        : "Palpite Gol";

  return (
    <Shell className="pb-32">
      <TopBar title={campeonatoTitle} right={<SignOutButton compact />} {...topBarBack} />
      {aba !== "campeonato" && <AppNavTabs active={navActive} />}
      {aba === "bolao" && <BolaoStepDots passo={passo} />}

      {aba === "meus" && <MeusDashboard />}

      {aba === "criar" && <CriarCampeonatoWizard etapa={etapa} modo={modo} />}

      {aba === "bolao" && <CriarBolaoWizard passo={passo} prefillCatalogMatchId={catalogMatchId} />}

      {aba === "campeonato" && campeonatoId && (
        <CampeonatoJogosPanel campeonatoId={campeonatoId} partidaId={partidaId} />
      )}
    </Shell>
  );
}
