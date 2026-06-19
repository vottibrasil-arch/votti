export type TimeParticipante = {
  nome: string;
  escudoUrl?: string;
};

export type CampeonatoMeta = {
  texto?: string;
  times?: TimeParticipante[];
};

export function encodeCampeonatoDescricao(meta: CampeonatoMeta): string | null {
  const texto = meta.texto?.trim();
  const times = meta.times?.filter((t) => t.nome.trim()) ?? [];
  if (!texto && times.length === 0) return null;
  if (times.length === 0) return texto || null;
  return JSON.stringify({ texto: texto || undefined, times });
}

export function decodeCampeonatoDescricao(raw: string | null | undefined): CampeonatoMeta {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as CampeonatoMeta;
    if (typeof parsed === "object" && parsed !== null) return parsed;
  } catch {
    return { texto: raw };
  }
  return { texto: raw };
}

export function campeonatoDescricaoTexto(raw: string | null | undefined): string | null {
  const meta = decodeCampeonatoDescricao(raw);
  return meta.texto?.trim() || (raw && !raw.startsWith("{") ? raw : null);
}

export function resolveApostasAbertas(camp: { ativo: boolean; apostas_abertas?: boolean }): boolean {
  if (typeof camp.apostas_abertas === "boolean") return camp.apostas_abertas;
  return camp.ativo;
}
