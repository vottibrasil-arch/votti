export function formatUserFacingError(err: unknown, fallback = "Algo deu errado. Tente de novo."): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : fallback;

  if (/<!doctype|<html[\s>]/i.test(raw)) {
    return "Servidor indisponível no momento. Atualize a página ou tente de novo em instantes.";
  }

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { error?: string; message?: string };
      const nested = parsed.error ?? parsed.message;
      if (nested && typeof nested === "string") return nested;
    } catch {
      // ignore invalid JSON
    }
  }

  if (raw.length > 300) return `${raw.slice(0, 300)}…`;
  return raw || fallback;
}
