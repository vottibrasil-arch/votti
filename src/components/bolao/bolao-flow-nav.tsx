import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type BolaoFlowRole,
  bolaoSearch,
  getBolaoStepIndex,
  stepsForRole,
} from "@/lib/bolao/bolao-flow";

type Props = {
  slug: string;
  role: BolaoFlowRole;
  createPasso?: number;
};

export function BolaoFlowNav({ slug, role, createPasso }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const steps = stepsForRole(role);
  const index = getBolaoStepIndex(pathname, role, createPasso);

  const current = steps[Math.max(0, index)] ?? steps[0];
  const prev = index > 0 ? steps[index - 1] : null;
  const next = index < steps.length - 1 ? steps[index + 1] : null;

  const linkSearch = (step: (typeof steps)[number]) => {
    if (role === "owner" && step.searchValue != null && step.path === "/create") {
      return { aba: "bolao" as const, passo: step.searchValue };
    }
    return bolaoSearch(slug);
  };

  const navLabel = role === "owner" ? "Painel do criador" : "Seu bolão";

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)] border-t border-border/80 bg-background sm:backdrop-blur-xl sm:bg-[color-mix(in_oklab,var(--background)_92%,transparent)]">
      <div className="mx-auto max-w-md px-4 pt-2 pb-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          <span>{navLabel}</span>
          <span>
            Passo {current.id} de {steps.length} · {current.short}
          </span>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
          {steps.map((step, i) => {
            const active = i === index;
            const done = i < index;
            return (
              <Link
                key={`${role}-${step.id}`}
                to={step.path}
                search={linkSearch(step)}
                className={`shrink-0 size-8 rounded-full grid place-items-center font-display font-bold text-xs transition ${
                  active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                }`}
                style={
                  active || done
                    ? { background: "var(--gradient-green)", color: "var(--primary-foreground)" }
                    : {
                        background: "var(--surface-2)",
                        color: "var(--muted-foreground)",
                        border: "1px solid var(--border)",
                      }
                }
              >
                {step.id}
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {prev ? (
            <Link
              to={prev.path}
              search={linkSearch(prev)}
              className="min-h-11 px-3 rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-1 border border-border bg-surface/60"
            >
              <ChevronLeft className="size-4" /> Anterior
            </Link>
          ) : (
            <span className="min-h-11 rounded-xl opacity-30 border border-border grid place-items-center text-sm">
              Anterior
            </span>
          )}
          {next ? (
            <Link
              to={next.path}
              search={linkSearch(next)}
              className="min-h-11 px-3 rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-1"
              style={{ background: "var(--gradient-green)", color: "var(--primary-foreground)" }}
            >
              Próximo <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className="min-h-11 rounded-xl opacity-30 grid place-items-center text-sm border border-border">
              Próximo
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
