import { createServerFn } from "@tanstack/react-start";

import { getSupabaseAnonServer } from "@/lib/api/supabase.server";
import { getSupabaseEnvStatus } from "@/lib/supabase-env";
import {
  getSupabaseProjectRef,
  isVottiSupabaseProject,
  VOTTI_SUPABASE_PROJECT_REF,
} from "@/lib/votti/supabase-project";

export type SupabaseHealthResult = {
  configured: boolean;
  connected: boolean;
  missing: string[];
  error?: string;
};

export const checkSupabaseHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<SupabaseHealthResult> => {
    const status = getSupabaseEnvStatus();
    if (!status.ok) {
      return { configured: false, connected: false, missing: status.missing };
    }

    try {
      const supabase = getSupabaseAnonServer();
      const projectRef = getSupabaseProjectRef(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL);
      if (projectRef && !isVottiSupabaseProject(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)) {
        console.warn(
          `[VOTTI] Projeto Supabase errado (${projectRef}). Use ${VOTTI_SUPABASE_PROJECT_REF} no .env.`,
        );
      }
      const { error } = await supabase.from("polls").select("id").limit(1);
      if (error) {
        return {
          configured: true,
          connected: false,
          missing: [],
          error: error.message,
        };
      }
      return { configured: true, connected: true, missing: [] };
    } catch (err) {
      return {
        configured: true,
        connected: false,
        missing: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
);

export async function runSupabaseConnectionTest() {
  const status = getSupabaseEnvStatus();
  if (!status.ok) {
    console.warn(`[VOTTI] Supabase não configurado (${status.missing.join(", ")})`);
    return;
  }

  try {
    const supabase = getSupabaseAnonServer();
    const { error } = await supabase.from("polls").select("id").limit(1);
    if (error) {
      console.warn("[VOTTI] Supabase configurado, mas a tabela polls não responde:", error.message);
      console.warn("[VOTTI] Execute docs/supabase/SETUP-COMPLETO.sql no SQL Editor do Supabase.");
      return;
    }
    console.info("[VOTTI] Supabase conectado.");
  } catch (err) {
    console.warn("[VOTTI] Erro ao testar Supabase:", err);
  }
}
