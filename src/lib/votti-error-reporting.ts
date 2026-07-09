type AppErrorReporter = (
  error: unknown,
  context?: Record<string, unknown>,
) => void;

declare global {
  interface Window {
    __vottiReportError?: AppErrorReporter;
  }
}

/** Relata erros do cliente (console + hook opcional para monitoramento). */
export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[VOTTI]", error, {
    route: window.location.pathname,
    ...context,
  });
  window.__vottiReportError?.(error, {
    route: window.location.pathname,
    ...context,
  });
}
