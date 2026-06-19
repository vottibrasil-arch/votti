import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/use-auth";
import { buildBolaoGuestJoinSearch } from "@/lib/bolao/share-url";

/** Redireciona convidados; retorna se o usuário é dono do bolão. */
export function useBolaoOwnerGuard(ownerId: string | null | undefined, _slug: string) {
  const { user, loading } = useAuth();
  const isOwner = Boolean(user?.id && ownerId && user.id === ownerId);

  return { user, loading, isOwner };
}

/** Rotas /join e /live público — nunca entram no painel admin sem ?admin=1. */
export function isBolaoAdminLiveMode(admin: string | undefined) {
  return admin === "1";
}

export function useRedirectGuestFromOwnerRoute(
  ownerId: string | null | undefined,
  slug: string,
  enabled: boolean,
) {
  const navigate = useNavigate();
  const { loading, isOwner, user } = useBolaoOwnerGuard(ownerId, slug);

  useEffect(() => {
    if (!enabled || loading || !slug || !ownerId) return;

    if (!user || !isOwner) {
      navigate({ to: "/join", search: buildBolaoGuestJoinSearch(slug), replace: true });
    }
  }, [enabled, loading, isOwner, ownerId, slug, user, navigate]);

  return { loading, isOwner, user };
}
