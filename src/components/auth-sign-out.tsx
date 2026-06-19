import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";

const compactButtonClass =
  "text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive transition px-1";

export function LeaveToMeusButton({ compact }: { compact?: boolean }) {
  const navigate = useNavigate();

  const handleLeave = () => {
    navigate({ to: "/create", search: { aba: "meus" } });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleLeave}
        className={compactButtonClass}
        aria-label="Sair para meus bolões"
      >
        Sair
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLeave}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-2 transition"
      aria-label="Sair para meus bolões"
    >
      Sair
    </button>
  );
}

export function SignOutButton({ compact }: { compact?: boolean }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive transition px-1"
        aria-label="Sair da conta"
      >
        Sair
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
      aria-label="Sair da conta"
    >
      <LogOut className="size-3.5" />
      Sair
    </button>
  );
}
