import type { CloseMode } from "@/lib/votti/poll-types";

export type CloseScheduleValue = {
  closeMode: CloseMode;
  closeAt: string;
  autoClose: boolean;
};

type PollCloseScheduleFieldsProps = {
  value: CloseScheduleValue;
  onChange: (value: CloseScheduleValue) => void;
  className?: string;
};

function resolveScheduleMode(value: CloseScheduleValue): CloseMode {
  if (!value.autoClose || value.closeMode === "until_admin") return "until_admin";
  return value.closeMode;
}

function formatCloseSummary(value: CloseScheduleValue) {
  if (!value.autoClose || !value.closeAt) return null;
  const date =
    value.closeMode === "scheduled_date"
      ? new Date(`${value.closeAt}T23:59:59`)
      : new Date(value.closeAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("pt-BR");
}

export function PollCloseScheduleFields({ value, onChange, className = "" }: PollCloseScheduleFieldsProps) {
  const mode = resolveScheduleMode(value);
  const summary = formatCloseSummary(value);

  return (
    <div className={`votti-close-schedule ${className}`.trim()}>
      <span className="votti-field__label">Encerramento da votação</span>
      <p className="votti-close-schedule__hint">Escolha se fica aberta até você encerrar ou se fecha sozinha em uma data.</p>

      <div className="votti-close-schedule__actions">
        <button
          type="button"
          className={`votti-pill-btn ${mode === "until_admin" ? "votti-pill-btn--accent" : ""}`}
          onClick={() => onChange({ closeMode: "until_admin", autoClose: false, closeAt: "" })}
        >
          ♾️ Ativa até eu encerrar
        </button>
        <button
          type="button"
          className={`votti-pill-btn ${mode === "scheduled_date" ? "votti-pill-btn--accent" : ""}`}
          onClick={() =>
            onChange({
              closeMode: "scheduled_date",
              autoClose: true,
              closeAt: value.closeAt,
            })
          }
        >
          📅 Agendar (data)
        </button>
        <button
          type="button"
          className={`votti-pill-btn ${mode === "scheduled_datetime" ? "votti-pill-btn--accent" : ""}`}
          onClick={() =>
            onChange({
              closeMode: "scheduled_datetime",
              autoClose: true,
              closeAt: value.closeAt,
            })
          }
        >
          ⏰ Agendar (data e hora)
        </button>
      </div>

      {mode === "scheduled_date" || mode === "scheduled_datetime" ? (
        <label className="votti-field">
          <span className="votti-field__label">
            {mode === "scheduled_date" ? "Data de encerramento" : "Data e hora de encerramento"}
          </span>
          <input
            type={mode === "scheduled_date" ? "date" : "datetime-local"}
            className="votti-field__input"
            value={value.closeAt}
            onChange={(e) =>
              onChange({
                closeMode: mode,
                autoClose: true,
                closeAt: e.target.value,
              })
            }
          />
        </label>
      ) : (
        <p className="votti-close-schedule__meta">A votação permanece aberta até você encerrar manualmente.</p>
      )}

      {summary ? <p className="votti-close-schedule__meta">Encerramento programado: {summary}</p> : null}
    </div>
  );
}
