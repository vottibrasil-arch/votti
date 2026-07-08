import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useState,

  type ReactNode,

} from "react";

import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/api/supabase-browser";

import {
  AUTH_SIGNUP_NOT_CREATED_MSG,
} from "@/lib/auth/auth-errors";

import type { VottiUser } from "@/lib/auth/types";



const LEGACY_MOCK_SESSION_KEY = "votti_mock_session";



export const AUTH_NOT_CONFIGURED_MSG =

  "Supabase não está conectado neste navegador. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env e reinicie o servidor (npm run dev).";



export type SignUpResult = {

  needsEmailConfirmation: boolean;

  duplicateSuspected: boolean;

};



type AuthContextValue = {

  user: VottiUser | null;

  loading: boolean;

  configured: boolean;

  signIn: (email: string, password: string) => Promise<void>;

  signUp: (email: string, password: string, name?: string) => Promise<SignUpResult>;

  signInWithGoogle: () => Promise<void>;

  signOut: () => Promise<void>;

};



const AuthContext = createContext<AuthContextValue | null>(null);



function mapUser(user: User): VottiUser {

  return {

    id: user.id,

    email: user.email ?? "",

    name:

      (user.user_metadata?.nome as string | undefined) ??

      (user.user_metadata?.name as string | undefined) ??

      user.email?.split("@")[0] ??

      "Usuário",

  };

}



function clearLegacyMockSession() {

  if (typeof window === "undefined") return;

  localStorage.removeItem(LEGACY_MOCK_SESSION_KEY);

}



function assertSupabaseConfigured(configured: boolean) {

  if (!configured) throw new Error(AUTH_NOT_CONFIGURED_MSG);

}



export function AuthProvider({ children }: { children: ReactNode }) {

  const configured = isSupabaseBrowserConfigured();

  const [user, setUser] = useState<VottiUser | null>(null);

  const [loading, setLoading] = useState(true);



  useEffect(() => {

    clearLegacyMockSession();



    if (!configured) {

      setUser(null);

      setLoading(false);

      return;

    }



    const supabase = getSupabaseBrowser();



    supabase.auth.getSession().then(({ data }) => {

      setUser(data.session?.user ? mapUser(data.session.user) : null);

      setLoading(false);

    });



    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {

      setUser(session?.user ? mapUser(session.user) : null);

      setLoading(false);

    });



    return () => sub.subscription.unsubscribe();

  }, [configured]);



  const signIn = useCallback(

    async (email: string, password: string) => {

      assertSupabaseConfigured(configured);

      const { error } = await getSupabaseBrowser().auth.signInWithPassword({ email, password });

      if (error) throw error;

    },

    [configured],

  );



  const signUp = useCallback(

    async (email: string, password: string, name?: string): Promise<SignUpResult> => {

      assertSupabaseConfigured(configured);



      const displayName = name?.trim() || "";

      const { data, error } = await getSupabaseBrowser().auth.signUp({

        email,

        password,

        options: { data: { nome: displayName, name: displayName } },

      });

      if (error) throw error;

      const duplicateSuspected = Boolean(
        data.user && (!data.user.identities || data.user.identities.length === 0),
      );

      if (!data.user?.id && !duplicateSuspected) {
        throw new Error(AUTH_SIGNUP_NOT_CREATED_MSG);
      }

      return {
        needsEmailConfirmation: Boolean(data.user && !data.session && !duplicateSuspected),
        duplicateSuspected,
      };

    },

    [configured],

  );



  const signInWithGoogle = useCallback(async () => {

    assertSupabaseConfigured(configured);

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await getSupabaseBrowser().auth.signInWithOAuth({

      provider: "google",

      options: { redirectTo },

    });

    if (error) throw error;

  }, [configured]);



  const signOut = useCallback(async () => {

    clearLegacyMockSession();

    if (!configured) {

      setUser(null);

      return;

    }

    await getSupabaseBrowser().auth.signOut();

    setUser(null);

  }, [configured]);



  const value = useMemo(

    () => ({ user, loading, configured, signIn, signUp, signInWithGoogle, signOut }),

    [user, loading, configured, signIn, signUp, signInWithGoogle, signOut],

  );



  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

}



export function useAuth() {

  const ctx = useContext(AuthContext);

  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");

  return ctx;

}


