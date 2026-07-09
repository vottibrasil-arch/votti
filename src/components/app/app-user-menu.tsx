import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";

type AppUserMenuProps = {
  className?: string;
};

export function AppUserMenu({ className = "" }: AppUserMenuProps) {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (loading || !user) {
    return <div className={`votti-app-user votti-app-user--empty ${className}`.trim()} aria-hidden />;
  }

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate({ to: "/" });
  }

  const displayName = user.name?.trim() || user.email.split("@")[0] || "Conta";

  return (
    <div ref={rootRef} className={`votti-app-user ${className}`.trim()}>
      <span className="votti-app-user__name" title={user.email}>
        {displayName}
      </span>

      <div className="votti-app-user__menu">
        <button
          type="button"
          className="votti-app-user__trigger"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          Minha conta
          <ChevronDown className={`size-3.5 votti-app-user__chevron ${open ? "votti-app-user__chevron--open" : ""}`} />
        </button>

        {open ? (
          <div className="votti-app-user__dropdown" role="menu">
            <Link
              to="/minha-conta"
              className="votti-app-user__item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <UserRound className="size-3.5" aria-hidden />
              Meu perfil
            </Link>
            <div className="votti-app-user__divider" role="separator" />
            <button type="button" className="votti-app-user__item votti-app-user__item--danger" role="menuitem" onClick={() => void handleSignOut()}>
              <LogOut className="size-3.5" aria-hidden />
              Sair
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
