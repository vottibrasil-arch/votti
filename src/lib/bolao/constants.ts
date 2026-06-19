/** Sugestão padrão ao habilitar taxa na interface. */
export const PLATFORM_FEE_PERCENT = 10;

export function bolaoFeePercent(settings: { taxaPercent?: number }): number {
  const value = settings.taxaPercent ?? 0;
  return Math.min(100, Math.max(0, value));
}

export const STAKE_PRESETS = ["5", "10", "20", "50", "100"] as const;

export const SUPPORT_PRESETS = ["5", "10", "20", "50"] as const;

/** Copa do Mundo FIFA 2026 — demonstração e criação de bolão. */
export const WORLD_CUP_2026 = {
  title: "Copa do Mundo FIFA 2026",
  subtitle: "Estados Unidos · México · Canadá",
  period: "11 de junho — 19 de julho de 2026",
  hostCodes: ["us", "mx", "ca"] as const,
  venues: ["Los Angeles", "Dallas", "Miami", "Cidade do México", "Toronto"],
} as const;

/** Preset para campeonato personalizado (ex.: churrasco entre amigos). */
export const CHURRASCO_PRESET = {
  nome: "Churrasco da Galera",
  timeCasa: "Time da Picanha",
  timeFora: "Time da Cerveja",
} as const;

export const STAGES = [
  { id: "single", label: "Jogo único", icon: "🎯", desc: "Um jogo da Copa" },
  { id: "groups", label: "Fase de grupos", icon: "🌍", desc: "Jun 11 — Jul 2" },
  { id: "r16", label: "Oitavas de final", icon: "🔥", desc: "5 — 8 de julho" },
  { id: "qf", label: "Quartas de final", icon: "⚡", desc: "9 — 11 de julho" },
  { id: "sf", label: "Semifinais", icon: "🏅", desc: "14 — 15 de julho" },
  { id: "final", label: "Final", icon: "👑", desc: "19 de julho · NY/NJ" },
  { id: "full", label: "Copa completa", icon: "🏆", desc: "Todos os jogos" },
] as const;
