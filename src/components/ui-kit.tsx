import { Link, useRouter, type LinkProps } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";

export function Shell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`demo-shell shell pt-6 pb-48 overflow-x-clip ${className}`}>{children}</div>
  );
}

export type TopBarProps = {
  title?: string;
  /** Rota fixa para voltar (fluxo guiado). */
  back?: LinkProps["to"];
  backSearch?: LinkProps["search"];
  /** Usa histórico do navegador (página anterior). */
  useHistoryBack?: boolean;
  /** Callback customizado ao tocar voltar (prioridade sobre back/useHistoryBack). */
  onBack?: () => void;
  hideBack?: boolean;
  right?: ReactNode;
};

export function TopBar({
  title,
  back,
  backSearch,
  useHistoryBack = false,
  onBack,
  hideBack,
  right,
}: TopBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (back) {
      router.navigate({ to: back, search: backSearch });
      return;
    }
    if (useHistoryBack && typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    router.navigate({ to: "/" });
  };

  let backControl: ReactNode;
  if (hideBack) {
    backControl = <div className="size-10 shrink-0" />;
  } else if (useHistoryBack || back || onBack) {
    backControl = (
      <button
        type="button"
        onClick={handleBack}
        className="grid place-items-center size-10 rounded-full glass hover:bg-surface-2 transition shrink-0"
        aria-label="Voltar"
      >
        <ArrowLeft className="size-5" />
      </button>
    );
  } else {
    backControl = <div className="size-10 shrink-0" />;
  }

  return (
    <div className="mb-6 animate-rise">
      <div className="flex items-center justify-between gap-3">
        {backControl}
        <div className="flex-1 flex justify-center min-w-0">
          <Logo to="/" size="sm" className="shrink-0" />
        </div>
        <div className="min-w-10 shrink-0 flex justify-end items-center">{right}</div>
      </div>
      {title && (
        <div className="mt-4 text-center font-display font-semibold text-xs tracking-[0.2em] uppercase text-muted-foreground">
          {title}
        </div>
      )}
    </div>
  );
}

export function PrimaryButton({
  children, onClick, to, search, params, variant = "primary", className = "", type, target,
}: {
  children: ReactNode;
  onClick?: () => void;
  to?: LinkProps["to"];
  search?: LinkProps["search"];
  params?: LinkProps["params"];
  variant?: "primary" | "gold" | "ghost" | "outline";
  className?: string;
  type?: "button" | "submit";
  target?: string;
}) {
  const base =
    "w-full h-14 rounded-2xl font-display font-semibold text-base tracking-tight transition active:scale-[0.98] flex items-center justify-center gap-2";

  const variantClass: Record<string, string> = {
    primary: "hover:brightness-110 btn-glow-green",
    gold: "hover:brightness-110 btn-glow-gold",
    ghost: "bg-surface-2/60 text-foreground hover:bg-surface-2",
    outline: "border border-border bg-transparent text-foreground hover:bg-surface-2/60",
  };

  const variantStyle: Record<string, CSSProperties | undefined> = {
    primary: {
      background: "var(--gradient-green)",
      color: "var(--primary-foreground)",
    },
    gold: {
      background: "var(--gradient-gold)",
      color: "var(--gold-foreground)",
    },
    ghost: undefined,
    outline: undefined,
  };

  const cls = `${base} ${variantClass[variant]} ${className}`;

  if (to) {
    return (
      <Link
        to={to}
        search={search}
        params={params}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        className={cls}
        style={variantStyle[variant]}
      >
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} onClick={onClick} className={cls} style={variantStyle[variant]}>
      {children}
    </button>
  );
}

export function LiveDot({ ended = false }: { ended?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`size-2 rounded-full ${ended ? "bg-muted-foreground" : "bg-[var(--live)] animate-pulse-live"}`}
      />
      <span className={`${ended ? "text-muted-foreground" : "text-[var(--live)]"} text-xs font-bold tracking-[0.18em]`}>
        {ended ? "ENCERRADA" : "AO VIVO"}
      </span>
    </span>
  );
}
