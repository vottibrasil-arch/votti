import { createFileRoute } from "@tanstack/react-router";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { PollRankingPreview } from "@/components/votti/poll-ranking-preview";

import { LiveDot } from "@/components/ui-kit";

import { getPollBySlug, getPollErrorMessage } from "@/lib/votti/poll-store";

import type { StoredPoll } from "@/lib/votti/poll-types";

import { usePollRealtime } from "@/lib/votti/use-poll-realtime";



export const Route = createFileRoute("/votacao/$slug/telao")({

  head: () => ({ meta: [{ title: "VOTTI — Modo Telão" }] }),

  component: TelaoPage,

});



function TelaoPage() {

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

      <div className="votti-telao votti-telao--loading">

        <p>Carregando ranking…</p>

      </div>

    );

  }



  if (!poll) {

    return (

      <div className="votti-telao votti-telao--loading">

        <p>{error || "Votação não encontrada."}</p>

      </div>

    );

  }



  const liveLabel =

    status === "connected" ? "ao vivo" : status === "connecting" ? "conectando…" : "atualizando";



  return (

    <div

      className="votti-telao"

      style={

        {

          "--votti-brand": poll.primaryColor,

        } as CSSProperties

      }

    >

      <header className="votti-telao__header">

        <div className="votti-telao__brand">

          {poll.logoUrl ? <img src={poll.logoUrl} alt="" className="votti-telao__logo" /> : null}

          <div>

            <h1 className="votti-telao__title">{poll.title}</h1>

            {poll.description ? <p className="votti-telao__desc">{poll.description}</p> : null}

          </div>

        </div>

        <div className="votti-telao__meta">

          <span className="votti-telao__live">

            <LiveDot />

            Ranking {liveLabel}

          </span>

          <p className="votti-telao__votes tabular-nums">

            {poll.totalVotes} {poll.totalVotes === 1 ? "pessoa votou" : "pessoas votaram"}

          </p>

        </div>

      </header>



      <div className="votti-telao__stack">

        {poll.questions.map((question) => (

          <section key={question.id} className="votti-telao__block">

            <PollRankingPreview

              title={poll.title}

              question={question}

              primaryColor={poll.primaryColor}

              live

            />

          </section>

        ))}

      </div>

    </div>

  );

}


