import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { DEMO_FLOW_STEPS, getDemoStepIndex, demoPassoSearch } from "@/lib/demo-flow";
import { FreeHighlight } from "@/components/free-highlight";
import { useAuth } from "@/lib/auth/use-auth";

export function DemoFlowNav({ passo }: { passo: number }) {
  const { user } = useAuth();
  const index = getDemoStepIndex(passo);
  const current = DEMO_FLOW_STEPS[index];
  const prev = index > 0 ? DEMO_FLOW_STEPS[index - 1] : null;
  const next = index < DEMO_FLOW_STEPS.length - 1 ? DEMO_FLOW_STEPS[index + 1] : null;

  return (
    <div className="demo-flow-nav fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)] border-t border-border/80 bg-background sm:backdrop-blur-xl sm:bg-[color-mix(in_oklab,var(--background)_92%,transparent)]">
      <div className="mx-auto max-w-md px-4 pt-2 pb-3">
        <FreeHighlight variant="compact" className="mb-2" />
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          <span>Demonstração</span>
          <span>
            Passo {current.id} de {DEMO_FLOW_STEPS.length} · {current.short}
          </span>
        </div>

        <div className="flex gap-1 overflow-x-auto overflow-y-visible pb-2 scrollbar-none max-sm:overflow-x-clip max-sm:pr-0">
          {DEMO_FLOW_STEPS.map((step, i) => {
            const active = i === index;
            const done = i < index;
            return (
              <Link
                key={step.id}
                to="/demonstracao"
                search={demoPassoSearch(step.passo)}
                className={`shrink-0 size-8 rounded-full grid place-items-center font-display font-bold text-xs transition ${
                  active
                    ? "ring-2 ring-primary max-sm:ring-offset-0 sm:ring-offset-2 ring-offset-background"
                    : ""
                }`}
                style={
                  active || done
                    ? { background: "var(--gradient-green)", color: "var(--primary-foreground)" }
                    : { background: "var(--surface-2)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }
                }
                aria-label={step.label}
                aria-current={active ? "step" : undefined}
              >
                {step.id}
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {prev ? (
            <Link
              to="/demonstracao"
              search={demoPassoSearch(prev.passo)}
              className="min-h-11 px-3 rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-1 border border-border bg-surface/60 active:scale-[0.98] transition"
            >
              <ChevronLeft className="size-4 shrink-0" />
              <span>Anterior</span>
            </Link>
          ) : (
            <span className="min-h-11 rounded-xl opacity-30 border border-border grid place-items-center text-sm">
              Anterior
            </span>
          )}

          {next ? (
            <Link
              to="/demonstracao"
              search={demoPassoSearch(next.passo)}
              className="min-h-11 px-3 rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-1 active:scale-[0.98] transition"
              style={{ background: "var(--gradient-green)", color: "var(--primary-foreground)" }}
            >
              <span>Próximo</span>
              <ChevronRight className="size-4 shrink-0" />
            </Link>
          ) : (
            <span className="min-h-11 rounded-xl opacity-30 grid place-items-center text-sm border border-border">
              Próximo
            </span>
          )}
        </div>

        <Link
          to={user ? "/create" : "/"}
          search={user ? { aba: "meus" } : undefined}
          className="mt-2 min-h-10 w-full rounded-xl border border-border/80 bg-surface/40 text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
        >
          <LogOut className="size-3.5" />
          {user ? "Sair da demonstração" : "Sair para o início"}
        </Link>
      </div>
    </div>
  );
}
