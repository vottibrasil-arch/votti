import { createContext, useContext, type ReactNode } from "react";

type PatrocinadoresShellContextValue = {
  visible: boolean;
  dismiss: () => void;
};

const PatrocinadoresShellContext = createContext<PatrocinadoresShellContextValue | null>(
  null,
);

export function PatrocinadoresShellProvider({
  value,
  children,
}: {
  value: PatrocinadoresShellContextValue;
  children: ReactNode;
}) {
  return (
    <PatrocinadoresShellContext.Provider value={value}>
      {children}
    </PatrocinadoresShellContext.Provider>
  );
}

export function usePatrocinadoresShell() {
  const ctx = useContext(PatrocinadoresShellContext);
  if (!ctx) {
    throw new Error("usePatrocinadoresShell must be used within PollPublicShell");
  }
  return ctx;
}

/** Opcional — fora do shell retorna visible false. */
export function usePatrocinadoresShellOptional() {
  return useContext(PatrocinadoresShellContext);
}
