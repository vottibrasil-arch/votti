import { createFileRoute, Link } from "@tanstack/react-router";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app/app-shell";

import { AppTopBar } from "@/components/app/app-top-bar";

import {
  getPollBySlug,
  getPollErrorMessage,
} from "@/lib/votti/poll-store";
import type { StoredPoll } from "@/lib/votti/poll-types";

import { usePollRealtime } from "@/lib/votti/use-poll-realtime";



export const Route = createFileRoute("/votacao/$slug/resultados")({

  head: () => ({ meta: [{ title: "VOTTI — Resultados" }] }),

  component: ResultadosPage,

});



function ResultadosPage() {

  const { slug } = Route.useParams();

  const [poll, setPoll] = useState<StoredPoll | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");



  const refreshPoll = useCallback(async () => {

    try {

      const data = await getPollBySlug(slug);

      setPoll(data);

      setError(data ? "" : "Votação não encontrada.");

    } catch (err) {

      setError(getPollErrorMessage(err));

    } finally {

      setLoading(false);

    }

  }, [slug]);



  useEffect(() => {

    void refreshPoll();

  }, [refreshPoll]);



  const { status } = usePollRealtime({

    pollId: poll?.id,

    enabled: Boolean(poll?.id),

    onRefresh: refreshPoll,

  });



  if (loading) {

    return (

      <AppShell feed={false}>

        <div className="votti-app-page flex-1 flex items-center justify-center px-5">

          <p className="votti-app-muted">Carregando resultados…</p>

        </div>

      </AppShell>

    );

  }



  if (!poll) {

    return (

      <AppShell feed={false}>

        <div className="votti-app-page flex-1 flex items-center justify-center px-5">

          <p className="votti-app-muted">{error || "Votação não encontrada."}</p>

        </div>

      </AppShell>

    );

  }



  const liveLabel =

    status === "connected" ? "ao vivo" : status === "connecting" ? "conectando…" : "atualizando";



  return (

    <AppShell>

      <div className="votti-app-page flex-1 px-5 pb-10 max-w-lg mx-auto w-full">

        <AppTopBar back="/minhas" title="Resultados ao vivo" />

        <div className="animate-rise">

          <h1 className="votti-results__title">{poll.title}</h1>

          <p className="votti-results__meta tabular-nums">

            {poll.totalVotes} votos · {liveLabel}

          </p>

        </div>

        <div className="votti-results__stack">

          {poll.questions.map((q) => {

            const total = q.options.reduce((s, o) => s + o.votes, 0) || 1;

            const sorted = [...q.options].sort((a, b) => b.votes - a.votes);

            return (

              <section key={q.id} className="votti-results__block animate-rise">

                <h2>{q.text || "Pergunta"}</h2>

                {sorted.map((o, i) => {

                  const pct = Math.round((o.votes / total) * 100);

                  return (

                    <div key={o.id} className="votti-result-bar">

                      <div className="votti-result-bar__meta">

                        <span>

                          {i === 0 ? "🥇 " : ""}

                          {o.text || "Opção"}

                        </span>

                        <span className="tabular-nums">

                          {o.votes} · {pct}%

                        </span>

                      </div>

                      <div className="votti-result-bar__track">

                        <div

                          className="votti-result-bar__fill"

                          style={{ width: `${pct}%`, background: poll.primaryColor }}

                        />

                      </div>

                    </div>

                  );

                })}

              </section>

            );

          })}

        </div>

        <Link to="/minhas" className="votti-outline-btn mt-6 mx-auto">

          Voltar para minhas votações

        </Link>

      </div>

    </AppShell>

  );

}

