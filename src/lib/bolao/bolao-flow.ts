export type BolaoFlowRole = "owner" | "guest";

export type BolaoFlowStep = {
  id: number;
  path: string;
  label: string;
  short: string;
  searchKey?: string;
  searchValue?: number;
  ownerOnly?: boolean;
};

/** Criador do bolão — criar, compartilhar, administrar, ao vivo (controles), resultado */
export const BOLAO_OWNER_STEPS: BolaoFlowStep[] = [
  { id: 1, path: "/create", searchKey: "passo", searchValue: 1, label: "Campeonato", short: "Camp.", ownerOnly: true },
  { id: 2, path: "/create", searchKey: "passo", searchValue: 2, label: "Jogo", short: "Jogo", ownerOnly: true },
  { id: 3, path: "/create", searchKey: "passo", searchValue: 3, label: "Configurar", short: "Config", ownerOnly: true },
  { id: 4, path: "/admin", label: "Links", short: "Links", ownerOnly: true },
  { id: 5, path: "/admin", label: "Participantes", short: "Admin", ownerOnly: true },
  { id: 6, path: "/live", label: "Ao vivo", short: "Ao vivo" },
  { id: 7, path: "/final", label: "Resultado", short: "Fim" },
];

/** Convidado — convite, palpite, aguardar, ranking ao vivo, resultado */
export const BOLAO_GUEST_STEPS: BolaoFlowStep[] = [
  { id: 1, path: "/join", label: "Convite", short: "Convite" },
  { id: 2, path: "/pick", label: "Palpite", short: "Palpite" },
  { id: 3, path: "/aguardando", label: "Aguardando", short: "Aguarde" },
  { id: 4, path: "/live", label: "Ao vivo", short: "Ao vivo" },
  { id: 5, path: "/final", label: "Resultado", short: "Fim" },
];

/** @deprecated Use BOLAO_OWNER_STEPS ou BOLAO_GUEST_STEPS */
export const BOLAO_FLOW_STEPS = BOLAO_OWNER_STEPS;

export function bolaoSearch(slug: string, extra?: Record<string, string | number>) {
  return { bolao: slug, ...extra };
}

export function getBolaoStepIndex(pathname: string, role: BolaoFlowRole, createPasso?: number): number {
  const steps = role === "owner" ? BOLAO_OWNER_STEPS : BOLAO_GUEST_STEPS;

  if (role === "owner" && pathname === "/create" && createPasso) {
    return createPasso - 1;
  }

  const idx = steps.findIndex(
    (s) => s.path === pathname && !(s.searchValue != null && s.searchValue > 0),
  );

  if (role === "owner" && pathname === "/create") return 0;
  return idx === -1 ? 0 : idx;
}

export function stepsForRole(role: BolaoFlowRole) {
  return role === "owner" ? BOLAO_OWNER_STEPS : BOLAO_GUEST_STEPS;
}
