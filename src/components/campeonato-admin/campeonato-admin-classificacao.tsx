import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCampeonatoClassificacao, type ClassificacaoEntry } from "@/lib/api/campeonato-admin.server";
import { useAuth } from "@/lib/auth/use-auth";
import { formatScore } from "@/lib/bolao";
import type { CampeonatoAdminData } from "@/lib/bolao/db-types";
import { Crown } from "lucide-react";

type Props = {
  slug: string;
  data: CampeonatoAdminData;
};

export function CampeonatoAdminClassificacao({ slug, data }: Props) {
  const { getAccessToken } = useAuth();
  const classifFn = useServerFn(getCampeonatoClassificacao);

  const [partidaId, setPartidaId] = useState<number | null>(data.partidas[0]?.id ?? null);
  const [entries, setEntries] = useState<ClassificacaoEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partidaId) {
      setEntries([]);
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    classifFn({ data: { accessToken: token, slug, partidaId } })
      .then(setEntries)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [partidaId, slug, classifFn, getAccessToken]);

  if (data.partidas.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
        Adicione jogos para ver a classificação.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.partidas.length > 1 && (
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
            Jogo
          </label>
          <select
            value={partidaId ?? ""}
            onChange={(e) => setPartidaId(Number(e.target.value))}
            className="w-full rounded-xl glass border border-border px-3 py-2.5 text-sm bg-transparent outline-none"
          >
            {data.partidas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.time_casa} × {p.time_fora}
                {p.fase ? ` — ${p.fase}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Sem participantes aprovados neste jogo. A classificação aparece quando houver palpites confirmados.
        </div>
      )}

      {entries.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <span>#</span>
            <span>Nome</span>
            <span className="text-right">Pts</span>
            <span className="text-right">Acertos</span>
          </div>
          <ul>
            {entries.map((e) => (
              <li
                key={`${e.nome}-${e.posicao}`}
                className={`grid grid-cols-[2.5rem_1fr_4rem_4rem] gap-2 px-4 py-3 items-center border-b border-border/50 last:border-0 ${
                  e.posicao === 1 ? "bg-gold/5" : ""
                }`}
              >
                <span className="font-display font-bold text-muted-foreground">{e.posicao}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold truncate">{e.nome}</span>
                    {e.posicao === 1 && e.vivo && (
                      <Crown className="size-3.5 text-gold shrink-0" fill="currentColor" />
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Palpite {formatScore(e.palpite)}
                    {!e.vivo && " · eliminado"}
                  </div>
                </div>
                <span className="font-display font-bold text-right tabular-nums">{e.pontuacao}</span>
                <span className="font-display font-bold text-right tabular-nums text-gold">{e.acertos}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
