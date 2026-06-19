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
};

export function teamNameToCode(name: string) {
  return TEAM_CODES[name] ?? "xx";
}
