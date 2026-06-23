import type { CreateAba } from "@/components/app-nav-tabs";
import type { ModoCriacao } from "@/components/criar-campeonato-wizard";
import type { TopBarProps } from "@/components/ui-kit";

export function resolveCreateTopBarBack(
  aba: CreateAba,
  passo: number,
  etapa: number,
  modo: ModoCriacao,
  campeonatoId?: number,
  partidaId?: number,
  catalogMatchId?: string,
): Pick<TopBarProps, "back" | "backSearch" | "useHistoryBack" | "hideBack"> {
  if (aba === "campeonato") {
    if (partidaId && campeonatoId) {
      return {
        back: "/create",
        backSearch: { aba: "campeonato", campeonatoId },
      };
    }
    return {
      back: "/create",
      backSearch: { aba: "meus" },
    };
  }

  if (aba === "bolao") {
    if (passo <= 1) {
      return { useHistoryBack: true };
    }
    return {
      back: "/create",
      backSearch: {
        aba: "bolao",
        passo: (passo - 1) as 1 | 2 | 3 | 4,
        campeonatoId,
        catalogMatchId,
      },
    };
  }

  if (aba === "criar") {
    if (etapa <= 1) {
      return { useHistoryBack: true };
    }
    return {
      back: "/create",
      backSearch: { aba: "criar", etapa: 1 as 1 | 2, modo },
    };
  }

  if (aba === "meus") {
    return { hideBack: true };
  }

  return { useHistoryBack: true };
}
