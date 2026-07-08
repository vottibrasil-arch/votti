import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { useCallback, useEffect, useState } from "react";

import {

  BarChart3,

  Copy,

  ExternalLink,

  Pencil,

  Share2,

  Trash2,

} from "lucide-react";

import { AppShell } from "@/components/app/app-shell";

import { AppTopBar } from "@/components/app/app-top-bar";

import { useAuth } from "@/lib/auth/use-auth";

import {

  deletePoll,

  duplicatePoll,

  listPollsByOwner,

  pollPublicUrl,
  getPollErrorMessage,
} from "@/lib/votti/poll-store";
import type { StoredPoll } from "@/lib/votti/poll-types";



export const Route = createFileRoute("/minhas")({

  head: () => ({ meta: [{ title: "VOTTI — Minhas votações" }] }),

  component: MinhasPage,

});



function MinhasPage() {

  const navigate = useNavigate();

  const { user, loading } = useAuth();

  const [polls, setPolls] = useState<StoredPoll[]>([]);

  const [loadingPolls, setLoadingPolls] = useState(true);

  const [error, setError] = useState("");



  const refreshPolls = useCallback(async () => {

    if (!user) return;

    setLoadingPolls(true);

    setError("");

    try {

      setPolls(await listPollsByOwner(user.id));

    } catch (err) {

      setError(getPollErrorMessage(err));

    } finally {

      setLoadingPolls(false);

    }

  }, [user]);



  useEffect(() => {

    if (!loading && !user) {

      navigate({ to: "/login", search: { redirect: "/minhas" }, replace: true });

    }

  }, [loading, user, navigate]);



  useEffect(() => {

    if (user) void refreshPolls();

  }, [user, refreshPolls]);



  if (loading || !user) {

    return (

      <AppShell feed={false}>

        <div className="votti-app-page flex-1 flex items-center justify-center">

          <p className="votti-app-muted">Carregando…</p>

        </div>

      </AppShell>

    );

  }



  return (

    <AppShell feed={false}>

      <div className="votti-app-page flex-1 px-5 pb-10 max-w-lg mx-auto w-full">

        <AppTopBar back="/" title="Minhas votações" />

        {error ? <p className="votti-auth__error mb-4">{error}</p> : null}

        {loadingPolls ? (

          <p className="votti-app-muted text-center">Carregando votações…</p>

        ) : polls.length === 0 ? (

          <div className="votti-empty animate-rise">

            <p>Nenhuma votação ainda.</p>

            <Link to="/criar" className="votti-mega-btn votti-mega-btn--sm mt-4">

              Criar votação

            </Link>

          </div>

        ) : (

          <div className="votti-poll-list">

            {polls.map((poll) => (

              <PollCard

                key={poll.id}

                poll={poll}

                onDelete={async () => {

                  await deletePoll(poll.id, user.id);

                  await refreshPolls();

                }}

                onDuplicate={async () => {

                  await duplicatePoll(poll.id, user.id);

                  await refreshPolls();

                }}

              />

            ))}

          </div>

        )}

      </div>

    </AppShell>

  );

}



function PollCard({

  poll,

  onDelete,

  onDuplicate,

}: {

  poll: StoredPoll;

  onDelete: () => Promise<void>;

  onDuplicate: () => Promise<void>;

}) {

  const url = pollPublicUrl(poll.slug);

  const date = new Date(poll.createdAt).toLocaleDateString("pt-BR");



  return (

    <article className="votti-poll-card animate-rise">

      <div className="votti-poll-card__head">

        {poll.logoUrl ? <img src={poll.logoUrl} alt="" className="votti-poll-card__logo" /> : <span className="votti-poll-card__dot" style={{ background: poll.primaryColor }} />}

        <div>

          <h3>{poll.title}</h3>

          <p>{poll.questions.length} perguntas · {poll.totalVotes} {poll.totalVotes === 1 ? "pessoa" : "pessoas"} · {date}</p>

        </div>

        <span className={`votti-poll-card__status votti-poll-card__status--${poll.status}`}>

          {poll.status === "active" ? "Ativa" : "Encerrada"}

        </span>

      </div>

      <div className="votti-poll-card__actions">

        <Link to="/votacao/$slug/resultados" params={{ slug: poll.slug }} className="votti-pill-btn">

          <BarChart3 className="size-3.5" /> Resultados

        </Link>

        <a href={url} className="votti-pill-btn" target="_blank" rel="noreferrer">

          <ExternalLink className="size-3.5" /> Abrir

        </a>

        <Link to="/criar" search={{ edit: poll.id }} className="votti-pill-btn">

          <Pencil className="size-3.5" /> Editar

        </Link>

        <button type="button" className="votti-pill-btn" onClick={() => void navigator.clipboard.writeText(url)}>

          <Copy className="size-3.5" /> Copiar

        </button>

        <button type="button" className="votti-pill-btn" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank")}>

          <Share2 className="size-3.5" /> Compartilhar

        </button>

        <button type="button" className="votti-pill-btn" onClick={() => void onDuplicate()}>

          Duplicar

        </button>

        <button type="button" className="votti-pill-btn votti-pill-btn--danger" onClick={() => void onDelete()}>

          <Trash2 className="size-3.5" /> Excluir

        </button>

      </div>

    </article>

  );

}

