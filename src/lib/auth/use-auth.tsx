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

import { deleteOwnAccount } from "@/lib/auth/auth-account.server";



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

  updateProfileName: (name: string) => Promise<void>;

  updateEmail: (email: string) => Promise<void>;

  updatePassword: (newPassword: string) => Promise<void>;

  deleteAccount: () => Promise<void>;

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



  const updateProfileName = useCallback(
    async (name: string) => {
      assertSupabaseConfigured(configured);
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Digite um nome válido.");
      const { error } = await getSupabaseBrowser().auth.updateUser({
        data: { nome: trimmed, name: trimmed },
      });
      if (error) throw error;
      const { data } = await getSupabaseBrowser().auth.getUser();
      if (data.user) setUser(mapUser(data.user));
    },
    [configured],
  );

  const updateEmail = useCallback(
    async (email: string) => {
      assertSupabaseConfigured(configured);
      const trimmed = email.trim();
      if (!trimmed) throw new Error("Digite um e-mail válido.");
      const { error } = await getSupabaseBrowser().auth.updateUser({ email: trimmed });
      if (error) throw error;
    },
    [configured],
  );

  const updatePassword = useCallback(

    async (newPassword: string) => {

      assertSupabaseConfigured(configured);

      if (newPassword.length < 6) {

        throw new Error("A senha deve ter pelo menos 6 caracteres");

      }

      const { error } = await getSupabaseBrowser().auth.updateUser({ password: newPassword });

      if (error) throw error;

    },

    [configured],

  );



  const deleteAccount = useCallback(async () => {

    assertSupabaseConfigured(configured);

    const supabase = getSupabaseBrowser();

    const { data, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !data.session?.access_token) {

      throw new Error("Sessão expirada. Entre novamente.");

    }

    await deleteOwnAccount({ data: { accessToken: data.session.access_token } });

    await supabase.auth.signOut();

    setUser(null);

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

    () => ({
      user,
      loading,
      configured,
      signIn,
      signUp,
      signInWithGoogle,
      updateProfileName,
      updateEmail,
      updatePassword,
      deleteAccount,
      signOut,
    }),

    [user, loading, configured, signIn, signUp, signInWithGoogle, updateProfileName, updateEmail, updatePassword, deleteAccount, signOut],

  );



  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

}



export function useAuth() {

  const ctx = useContext(AuthContext);

  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");

  return ctx;

}


