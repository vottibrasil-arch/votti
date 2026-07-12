import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LegalModalView = "terms" | "privacy" | "contact" | "report";

type LegalModalsContextValue = {
  view: LegalModalView | null;
  reportPollUrl: string | undefined;
  open: (view: LegalModalView, options?: { pollUrl?: string }) => void;
  close: () => void;
};

const LegalModalsContext = createContext<LegalModalsContextValue | null>(null);

export function LegalModalsProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<LegalModalView | null>(null);
  const [reportPollUrl, setReportPollUrl] = useState<string | undefined>();

  const open = useCallback((next: LegalModalView, options?: { pollUrl?: string }) => {
    if (next === "report") {
      const pollUrl =
        options?.pollUrl ??
        (typeof window !== "undefined" ? window.location.href : undefined);
      setReportPollUrl(pollUrl);
    }
    setView(next);
  }, []);

  const close = useCallback(() => {
    setView(null);
    setReportPollUrl(undefined);
  }, []);

  const value = useMemo(
    () => ({ view, reportPollUrl, open, close }),
    [view, reportPollUrl, open, close],
  );

  return <LegalModalsContext.Provider value={value}>{children}</LegalModalsContext.Provider>;
}

export function useLegalModals() {
  const ctx = useContext(LegalModalsContext);
  if (!ctx) {
    throw new Error("useLegalModals deve ser usado dentro de LegalModalsProvider");
  }
  return ctx;
}
