function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildBolaoSlug(homeTeam: string, awayTeam: string) {
  const home = normalizeToken(homeTeam).slice(0, 12) || "home";
  const away = normalizeToken(awayTeam).slice(0, 12) || "away";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${home}-${away}-${suffix}`;
}

export function buildCampeonatoSlug(nome: string) {
  const base = normalizeToken(nome).slice(0, 24) || "campeonato";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
