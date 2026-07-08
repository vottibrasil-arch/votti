import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";

type AppUserMenuProps = {
  className?: string;
};

export function AppUserMenu({ className = "" }: AppUserMenuProps) {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  if (loading || !user) {
    return <div className={`votti-app-user votti-app-user--empty ${className}`.trim()} aria-hidden />;
  }

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  const displayName = user.name?.trim() || user.email.split("@")[0] || "Conta";

  return (
    <div className={`votti-app-user ${className}`.trim()}>
      <span className="votti-app-user__name" title={user.email}>
        {displayName}
      </span>
      <button type="button" className="votti-app-user__out" onClick={() => void handleSignOut()}>
        <LogOut className="size-3" aria-hidden />
        Sair
      </button>
    </div>
  );
}
