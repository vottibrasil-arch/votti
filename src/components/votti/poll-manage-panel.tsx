import { useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
import type { CloseMode, StoredPoll } from "@/lib/votti/poll-types";
import {
  activatePoll,
  deactivatePoll,
  getPollErrorMessage,
  managePoll,
  schedulePollClose,
} from "@/lib/votti/poll-store";

type PollManagePanelProps = {
  poll: StoredPoll;
  ownerId: string;
  onUpdated: () => Promise<void>;
};

export function PollManagePanel({ poll, ownerId, onUpdated }: PollManagePanelProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scheduleMode, setScheduleMode] = useState<CloseMode>("scheduled_datetime");
  const [closeAt, setCloseAt] = useState(poll.settings.closeAt || "");

  async function run(action: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await action();
      await onUpdated();
      setOpen(false);
    } catch (err) {
      setError(getPollErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="votti-poll-manage">
      <button type="button" className="votti-pill-btn votti-pill-btn--accent" onClick={() => setOpen((v) => !v)}>
        <Settings2 className="size-3.5" /> Gerenciar
      </button>

      {open ? (
        <div className="votti-poll-manage__panel">
          <p className="votti-poll-manage__hint">Controle quando a votação fica aberta ou encerra.</p>
          <div className="votti-poll-manage__actions">
            <button
              type="button"
              className="votti-pill-btn"
              disabled={busy || poll.status === "active"}
              onClick={() => void run(() => activatePoll(poll.id, ownerId))}
            >
              🟢 Ativar
            </button>
            <button
              type="button"
              className="votti-pill-btn votti-pill-btn--danger"
              disabled={busy || poll.status === "closed"}
              onClick={() => void run(() => deactivatePoll(poll.id, ownerId))}
            >
              🔴 Desativar agora
            </button>
            <button
              type="button"
              className="votti-pill-btn"
              disabled={busy}
              onClick={() => {
                setScheduleMode("scheduled_date");
                setCloseAt("");
              }}
            >
              📅 Agendar (data)
            </button>
            <button
              type="button"
              className="votti-pill-btn"
              disabled={busy}
              onClick={() => {
                setScheduleMode("scheduled_datetime");
                setCloseAt("");
              }}
            >
              ⏰ Agendar (data e hora)
            </button>
            <button
              type="button"
              className="votti-pill-btn"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  managePoll(poll.id, ownerId, {
                    status: "active",
                    settings: { closeMode: "until_admin", autoClose: false, closeAt: "" },
                  }),
                )
              }
            >
              ♾️ Ativa até eu encerrar
            </button>
          </div>

          {scheduleMode === "scheduled_date" || scheduleMode === "scheduled_datetime" ? (
            <div className="votti-poll-manage__schedule">
              <label className="votti-field">
                <span className="votti-field__label">
                  {scheduleMode === "scheduled_date" ? "Data de encerramento" : "Data e hora"}
                </span>
                <input
                  type={scheduleMode === "scheduled_date" ? "date" : "datetime-local"}
                  className="votti-field__input"
                  value={closeAt}
                  onChange={(e) => setCloseAt(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="votti-mega-btn votti-mega-btn--sm w-full max-w-none"
                disabled={busy || !closeAt}
                onClick={() =>
                  void run(() => schedulePollClose(poll.id, ownerId, closeAt, scheduleMode))
                }
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Salvar agendamento"}
              </button>
            </div>
          ) : null}

          {poll.settings.autoClose && poll.settings.closeAt ? (
            <p className="votti-poll-manage__meta">
              Encerramento:{" "}
              {new Date(
                poll.settings.closeMode === "scheduled_date"
                  ? `${poll.settings.closeAt}T23:59:59`
                  : poll.settings.closeAt,
              ).toLocaleString("pt-BR")}
            </p>
          ) : poll.settings.closeMode === "until_admin" && poll.status === "active" ? (
            <p className="votti-poll-manage__meta">Ativa até encerramento manual.</p>
          ) : null}

          {error ? <p className="votti-auth__error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
