import { useEffect, useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
import type { StoredPoll } from "@/lib/votti/poll-types";
import { PollCloseScheduleFields, type CloseScheduleValue } from "@/components/votti/poll-close-schedule-fields";
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
  const [schedule, setSchedule] = useState<CloseScheduleValue>({
    closeMode: poll.settings.closeMode,
    closeAt: poll.settings.closeAt,
    autoClose: poll.settings.autoClose,
  });

  useEffect(() => {
    setSchedule({
      closeMode: poll.settings.closeMode,
      closeAt: poll.settings.closeAt,
      autoClose: poll.settings.autoClose,
    });
  }, [poll.settings.closeMode, poll.settings.closeAt, poll.settings.autoClose]);

  async function run(action: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await action();
      await onUpdated();
    } catch (err) {
      setError(getPollErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveSchedule() {
    if (schedule.autoClose && schedule.closeMode !== "until_admin") {
      if (!schedule.closeAt.trim()) {
        setError("Informe a data de encerramento.");
        return;
      }
      await run(() => schedulePollClose(poll.id, ownerId, schedule.closeAt, schedule.closeMode));
      return;
    }

    await run(() =>
      managePoll(poll.id, ownerId, {
        status: "active",
        settings: { closeMode: "until_admin", autoClose: false, closeAt: "" },
      }),
    );
  }

  const scheduleDirty =
    schedule.closeMode !== poll.settings.closeMode ||
    schedule.closeAt !== poll.settings.closeAt ||
    schedule.autoClose !== poll.settings.autoClose;

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
          </div>

          <PollCloseScheduleFields value={schedule} onChange={setSchedule} className="votti-close-schedule--embedded" />

          <button
            type="button"
            className="votti-mega-btn votti-mega-btn--sm w-full max-w-none"
            disabled={busy || !scheduleDirty || (schedule.autoClose && !schedule.closeAt.trim())}
            onClick={() => void saveSchedule()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Salvar encerramento"}
          </button>

          {poll.settings.autoClose && poll.settings.closeAt ? (
            <p className="votti-poll-manage__meta">
              Encerramento atual:{" "}
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
