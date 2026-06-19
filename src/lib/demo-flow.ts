export type DemoFlowStep = {
  id: number;
  path: "/demonstracao";
  passo: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  label: string;
  short: string;
};

/** Fluxo 100% front — todos os passos ficam em /demonstracao?passo=N */
export const DEMO_FLOW_STEPS: DemoFlowStep[] = [
  { id: 1, path: "/demonstracao", passo: 1, label: "Copa do Mundo 2026", short: "Copa 2026" },
  { id: 2, path: "/demonstracao", passo: 2, label: "Escolha o jogo", short: "Jogo" },
  { id: 3, path: "/demonstracao", passo: 3, label: "Configure o bolão", short: "Config" },
  { id: 4, path: "/demonstracao", passo: 4, label: "Compartilhe o link", short: "Link" },
  { id: 5, path: "/demonstracao", passo: 5, label: "Receba o convite", short: "Convite" },
  { id: 6, path: "/demonstracao", passo: 6, label: "Escolha seu placar", short: "Palpite" },
  { id: 7, path: "/demonstracao", passo: 7, label: "Aprove participantes", short: "Aprovar" },
  { id: 8, path: "/demonstracao", passo: 8, label: "Acompanhe ao vivo", short: "Ao vivo" },
  { id: 9, path: "/demonstracao", passo: 9, label: "Veja o resultado", short: "Fim" },
];

export const DEMO_FLOW_PATHS = new Set<string>(["/demonstracao"]);

export function getDemoStepIndex(passo: number): number {
  const idx = DEMO_FLOW_STEPS.findIndex((s) => s.passo === passo);
  return idx === -1 ? 0 : idx;
}

export function getDemoStep(passo: number): DemoFlowStep {
  return DEMO_FLOW_STEPS[getDemoStepIndex(passo)] ?? DEMO_FLOW_STEPS[0];
}

export function demoPassoSearch(passo: DemoFlowStep["passo"]) {
  return { passo };
}
