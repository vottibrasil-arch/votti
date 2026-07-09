import type { ReactNode } from "react";

/** Layout do app — fundo escuro alinhado à landing. */
export function AppShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main className={`votti-app min-h-[100dvh] flex flex-col ${className}`}>
      <div className="votti-landing__bg" aria-hidden />
      <div className="votti-landing__grid" aria-hidden />
      <div className="votti-app__inner flex-1 flex flex-col min-h-[100dvh]">{children}</div>
    </main>
  );
}
