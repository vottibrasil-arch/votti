import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, Copy, Pencil, QrCode, Share2, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { AppPageFrame } from "@/components/app/app-page-frame";
import { AppPageBar } from "@/components/app/app-top-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/lib/auth/use-auth";
import { buildPollShareWhatsAppText } from "@/lib/votti/poll-share-meta";
import {
  deletePoll,
  duplicatePoll,
  listPollsByOwner,
  pollPublicUrl,
  getPollErrorMessage,
} from "@/lib/votti/poll-store";
import { PollManagePanel } from "@/components/votti/poll-manage-panel";
import { downloadPollQrCode, pollQrCodeImageUrl } from "@/lib/votti/poll-qr";
import type { StoredPoll } from "@/lib/votti/poll-types";

export const Route = createFileRoute("/minhas")({
  head: () => ({ meta: [{ title: "VOTTII — Minhas votações" }] }),
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
      <AppShell>
        <div className="votti-app-page flex-1 flex items-center justify-center">
          <p className="votti-app-muted">Carregando…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppPageFrame>
        <AppPageBar title="Minhas votações" />

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
                ownerId={user.id}
                onRefresh={refreshPolls}
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
      </AppPageFrame>
    </AppShell>
  );
}

function formatPollSummary(poll: StoredPoll) {
  const p = poll.participantCount;
  const v = poll.registeredVotes;
  const participants = p === 1 ? "1 participante" : `${p} participantes`;
  const votes = v === 1 ? "1 voto" : `${v} votos`;
  return `${participants} · ${votes}`;
}

function PollCard({
  poll,
  ownerId,
  onRefresh,
  onDelete,
  onDuplicate,
}: {
  poll: StoredPoll;
  ownerId: string;
  onRefresh: () => Promise<void>;
  onDelete: () => Promise<void>;
  onDuplicate: () => Promise<void>;
}) {
  const url = pollPublicUrl(poll.slug);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function handleConfirmDelete() {
    setDeleteBusy(true);
    try {
      await onDelete();
      setDeleteOpen(false);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleShare() {
    const url = pollPublicUrl(poll.slug);
    const text = buildPollShareWhatsAppText({
      title: poll.title,
      description: poll.description,
      url,
      kind: "vote",
    });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: poll.title, text });
        return;
      } catch {
        /* cancelado ou indisponível */
      }
    }
    await navigator.clipboard.writeText(url);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function handleDownloadQr() {
    try {
      await downloadPollQrCode(url, `votti-${poll.slug}-qr.png`);
    } catch {
      window.open(pollQrCodeImageUrl(url), "_blank");
    }
  }

  return (
    <article className="votti-poll-card animate-rise">
      <div className="votti-poll-card__inner">
        <div className="votti-poll-card__head">
          <div className="votti-poll-card__title-block">
            <h3>{poll.title}</h3>
            <p>{formatPollSummary(poll)}</p>
          </div>
          <span className={`votti-poll-card__status votti-poll-card__status--${poll.status}`}>
            {poll.status === "active" ? "Ativa" : "Encerrada"}
          </span>
        </div>

        <PollManagePanel poll={poll} ownerId={ownerId} onUpdated={onRefresh} />

        <div className="votti-poll-card__toolbar">
          <Link to="/votacao/$slug/resultados" params={{ slug: poll.slug }} className="votti-poll-card__btn">
            <BarChart3 className="size-3.5" /> Resultados
          </Link>
          <button type="button" className="votti-poll-card__btn" onClick={() => void handleShare()}>
            <Share2 className="size-3.5" /> Compartilhar
          </button>
          <Link to="/criar" search={{ edit: poll.id }} className="votti-poll-card__btn">
            <Pencil className="size-3.5" /> Editar
          </Link>
          <button type="button" className="votti-poll-card__btn" onClick={() => void onDuplicate()}>
            <Copy className="size-3.5" /> Duplicar
          </button>
          <button type="button" className="votti-poll-card__btn" onClick={() => void handleDownloadQr()}>
            <QrCode className="size-3.5" /> Baixar QR Code
          </button>
          <button
            type="button"
            className="votti-poll-card__btn votti-poll-card__btn--danger"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" /> Excluir
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Excluir votação?"
        message={
          <>
            Tem certeza que deseja excluir <strong>{poll.title}</strong>? Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setDeleteOpen(false);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </article>
  );
}
