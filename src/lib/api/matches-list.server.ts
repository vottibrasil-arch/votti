import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAsUser, getSupabaseForRead } from "./supabase.server";
import type { DbPartidaRow } from "../bolao/db-types";

const listPartidasInput = z.object({
  campeonatoId: z.number().int().positive(),
  accessToken: z.string().min(1).optional(),
});

const PARTIDA_SELECT = `
  id,
  campeonato_id,
  time_casa,
  time_fora,
  placar_casa,
  placar_fora,
  status,
  data_partida,
  fase,
  escudo_casa,
  escudo_fora,
  ordem,
  created_at,
  campeonatos (
    id,
    nome,
    api_league_id,
    ativo,
    owner_id,
    tipo,
    banner_url,
    descricao
  )
`;

export const listMatches = createServerFn({ method: "GET" })
  .validator((data: unknown) => listPartidasInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    // Campeonatos personalizados exigem JWT do dono (RLS partidas_select_own).
    const supabase = data.accessToken
      ? getSupabaseAsUser(data.accessToken)
      : getSupabaseForRead();

    const { data: rows, error } = await supabase
      .from("partidas")
      .select(PARTIDA_SELECT)
      .eq("campeonato_id", data.campeonatoId)
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("data_partida", { ascending: true });

    if (error) {
      throw new Error(`Erro ao carregar partidas: ${error.message} (${error.code ?? "sem código"})`);
    }

    return (rows ?? []) as DbPartidaRow[];
  });
