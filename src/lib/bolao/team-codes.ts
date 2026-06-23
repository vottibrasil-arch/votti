const TEAM_CODES: Record<string, string> = {
  Brasil: "br",
  França: "fr",
  Argentina: "ar",
  Inglaterra: "gb-eng",
  Portugal: "pt",
  Espanha: "es",
  Alemanha: "de",
  Holanda: "nl",
  Croácia: "hr",
  Marrocos: "ma",
  Uruguai: "uy",
  Japão: "jp",
  México: "mx",
  "África do Sul": "za",
  "Coreia do Sul": "kr",
  "República Tcheca": "cz",
  Canadá: "ca",
  Bósnia: "ba",
  Qatar: "qa",
  Suíça: "ch",
  Haiti: "ht",
  Escócia: "gb-sct",
  EUA: "us",
  Paraguai: "py",
  Austrália: "au",
  Turquia: "tr",
  Curaçao: "cw",
  "Costa do Marfim": "ci",
  Equador: "ec",
  Suécia: "se",
  Tunísia: "tn",
  Bélgica: "be",
  Egito: "eg",
  Irã: "ir",
  "Nova Zelândia": "nz",
  "Cabo Verde": "cv",
  "Arábia Saudita": "sa",
  Senegal: "sn",
  Iraque: "iq",
  Noruega: "no",
  Argélia: "dz",
  Áustria: "at",
  Jordânia: "jo",
  "RD Congo": "cd",
  Uzbequistão: "uz",
  Colômbia: "co",
  Gana: "gh",
  Panamá: "pa",
};

const TEAM_ALIASES: Record<string, string> = {
  "estados unidos": "EUA",
  usa: "EUA",
  "costa do marfim": "Costa do Marfim",
  "c. do marfim": "Costa do Marfim",
  "r tcheca": "República Tcheca",
  "r. tcheca": "República Tcheca",
  rdc: "RD Congo",
  "r.d. congo": "RD Congo",
  "arabia saudita": "Arábia Saudita",
  curacao: "Curaçao",
  uzbequistao: "Uzbequistão",
  colombia: "Colômbia",
  austria: "Áustria",
  argelia: "Argélia",
  ira: "Irã",
  mexico: "México",
  "africa do sul": "África do Sul",
};

function normalizeTeamName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function teamNameToCode(name: string) {
  const direct = TEAM_CODES[name];
  if (direct) return direct;

  const normalized = normalizeTeamName(name);
  const canonical = TEAM_ALIASES[normalized];
  if (canonical && TEAM_CODES[canonical]) {
    return TEAM_CODES[canonical];
  }

  const matchByNormalized = Object.entries(TEAM_CODES).find(
    ([teamName]) => normalizeTeamName(teamName) === normalized,
  );
  return matchByNormalized?.[1] ?? "xx";
}
