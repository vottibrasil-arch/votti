import { ImageUploadField } from "@/components/image-upload-field";
import { FormField } from "@/components/bolao/form-primitives";
import { PrimaryButton } from "@/components/ui-kit";
import { formatPartidaDateTime } from "@/lib/bolao/partidas-ui";
import { PARTIDA_STATUS_LABELS, type DbPartidaRow } from "@/lib/bolao/db-types";
import { buildBolaoJoinUrl } from "@/lib/bolao/share-url";
import { Plus, Share2 } from "lucide-react";
import { useState } from "react";

export type JogoDraft = {
  id: string;
  fase: string;
  timeCasa: string;
  escudoCasaFile: File | null;
  escudoCasaUrl: string | null;
  timeFora: string;
  escudoForaFile: File | null;
  escudoForaUrl: string | null;
  data: string;
  horario: string;
};

export const EMPTY_JOGO = (): JogoDraft => ({
  id: crypto.randomUUID(),
  fase: "",
  timeCasa: "",
  escudoCasaFile: null,
  escudoCasaUrl: null,
  timeFora: "",
  escudoForaFile: null,
  escudoForaUrl: null,
  data: "",
  horario: "",
});

export function buildDataPartidaIso(data: string, horario: string) {
  if (!data) return undefined;
  const time = horario || "12:00";
  return new Date(`${data}T${time}`).toISOString();
}

export function parseIsoToDateTime(iso: string | null | undefined) {
  if (!iso) return { data: "", horario: "" };
  const d = new Date(iso);
  const data = d.toISOString().slice(0, 10);
  const horario = d.toTimeString().slice(0, 5);
  return { data, horario };
}

export function partidaToJogoDraft(partida: DbPartidaRow): JogoDraft {
  const { data, horario } = parseIsoToDateTime(partida.data_partida);
  return {
    id: String(partida.id),
    fase: partida.fase ?? "",
    timeCasa: partida.time_casa,
    escudoCasaFile: null,
    escudoCasaUrl: partida.escudo_casa,
    timeFora: partida.time_fora,
    escudoForaFile: null,
    escudoForaUrl: partida.escudo_fora,
    data,
    horario,
  };
}

type JogoFormProps = {
  value: JogoDraft;
  onChange: (next: JogoDraft) => void;
  onSubmit: () => void;
  submitLabel?: string;
  showFase?: boolean;
  saving?: boolean;
  onCancel?: () => void;
};

export function JogoForm({
  value,
  onChange,
  onSubmit,
  submitLabel = "Salvar jogo",
  showFase = true,
  saving = false,
  onCancel,
}: JogoFormProps) {
  const canSave = value.timeCasa.trim().length >= 1 && value.timeFora.trim().length >= 1;

  return (
    <div className="glass rounded-2xl p-4 space-y-4 border border-border">
      {showFase && (
        <FormField label="Fase (opcional)">
          <input
            value={value.fase}
            onChange={(e) => onChange({ ...value, fase: e.target.value })}
            placeholder="Ex: Grupo A, Oitavas, Final..."
            className="w-full bg-transparent outline-none text-sm"
          />
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <FormField label="Time casa *">
            <input
              value={value.timeCasa}
              onChange={(e) => onChange({ ...value, timeCasa: e.target.value })}
              placeholder="Cruzeiro FC"
              className="w-full bg-transparent outline-none font-semibold text-sm"
            />
          </FormField>
          <ImageUploadField
            label="Escudo (opcional)"
            file={value.escudoCasaFile}
            existingUrl={value.escudoCasaUrl}
            onChange={(file) =>
              onChange({ ...value, escudoCasaFile: file, escudoCasaUrl: file ? value.escudoCasaUrl : null })
            }
            previewHeight="h-20"
          />
        </div>
        <div className="space-y-2">
          <FormField label="Time visitante *">
            <input
              value={value.timeFora}
              onChange={(e) => onChange({ ...value, timeFora: e.target.value })}
              placeholder="União FC"
              className="w-full bg-transparent outline-none font-semibold text-sm"
            />
          </FormField>
          <ImageUploadField
            label="Escudo (opcional)"
            file={value.escudoForaFile}
            existingUrl={value.escudoForaUrl}
            onChange={(file) =>
              onChange({ ...value, escudoForaFile: file, escudoForaUrl: file ? value.escudoForaUrl : null })
            }
            previewHeight="h-20"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Data (opcional)">
          <input
            type="date"
            value={value.data}
            onChange={(e) => onChange({ ...value, data: e.target.value })}
            className="w-full bg-transparent outline-none text-sm"
          />
        </FormField>
        <FormField label="Horário (opcional)">
          <input
            type="time"
            value={value.horario}
            onChange={(e) => onChange({ ...value, horario: e.target.value })}
            className="w-full bg-transparent outline-none text-sm"
          />
        </FormField>
      </div>

      <PrimaryButton
        onClick={onSubmit}
        variant="outline"
        className={`h-11 ${!canSave || saving ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Plus className="size-4" /> {saving ? "Salvando..." : submitLabel}
      </PrimaryButton>

      {onCancel && (
        <button type="button" onClick={onCancel} className="w-full text-xs text-muted-foreground py-1">
          Cancelar
        </button>
      )}
    </div>
  );
}

export function JogoAdminRow({
  partida,
  onEdit,
  onDelete,
  onCriarBolao,
  onCopiarLinkBolao,
  bolaoSlug,
  bolaoCount = 0,
  showBolaoCopyLink = true,
  deleting,
}: {
  partida: DbPartidaRow;
  onEdit: () => void;
  onDelete: () => void;
  onCriarBolao?: () => void;
  onCopiarLinkBolao?: () => void;
  bolaoSlug?: string | null;
  bolaoCount?: number;
  showBolaoCopyLink?: boolean;
  deleting?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const statusLabel = PARTIDA_STATUS_LABELS[partida.status] ?? partida.status;

  const copiar = () => {
    if (onCopiarLinkBolao) {
      onCopiarLinkBolao();
      return;
    }
    if (!bolaoSlug) return;
    const url = buildBolaoJoinUrl(bolaoSlug);
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border/80 bg-surface/40">
      <div className="relative p-4">
        <div className="absolute inset-0 opacity-30 demo-pitch-bg pointer-events-none" style={{ background: "var(--gradient-pitch)" }} />
        <div className="relative flex items-center gap-3">
          <TeamEscudo escudo={partida.escudo_casa} nome={partida.time_casa} />
          <div className="min-w-0 flex-1 text-center px-1">
            <div className="font-display font-bold text-sm truncate">{partida.time_casa}</div>
            <div className="text-[10px] font-bold text-gold my-1">VS</div>
            <div className="font-display font-bold text-sm truncate">{partida.time_fora}</div>
          </div>
          <TeamEscudo escudo={partida.escudo_fora} nome={partida.time_fora} />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 bg-background/60">
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          {partida.fase && (
            <span className="chip text-gold border-gold/30 text-[9px] font-bold uppercase">
              {partida.fase}
            </span>
          )}
          <span
            className={`chip text-[9px] font-bold uppercase ${
              partida.status === "encerrado" ? "border-red-400/30 text-red-400" : ""
            }`}
          >
            {statusLabel}
          </span>
          {bolaoCount > 0 && (
            <span className="chip text-[9px] font-bold uppercase">
              {bolaoCount} bolão{bolaoCount !== 1 ? "ões" : ""}
            </span>
          )}
          <span>{formatPartidaDateTime(partida.data_partida) ?? "Sem data definida"}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {bolaoSlug && showBolaoCopyLink && (
            <button
              type="button"
              onClick={copiar}
              className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 text-primary border border-primary/30 bg-primary/10 active:scale-95 transition"
            >
              <Share2 className="size-3" />
              {copied ? "Copiado!" : "Copiar link"}
            </button>
          )}
          {onCriarBolao && (
            <button
              type="button"
              onClick={onCriarBolao}
              className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 active:scale-95 transition"
              style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
            >
              {bolaoCount > 0 ? "+ Novo bolão" : "Criar bolão"}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="h-8 px-3 rounded-lg text-xs font-semibold text-primary border border-primary/30 bg-primary/10 active:scale-95 transition"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="h-8 px-3 rounded-lg text-xs font-semibold text-red-400 border border-red-400/30 bg-red-400/10 active:scale-95 transition disabled:opacity-50"
          >
            {deleting ? "..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamEscudo({ escudo, nome }: { escudo: string | null; nome: string }) {
  if (escudo) {
    return (
      <img
        src={escudo}
        alt={nome}
        className="size-11 rounded-xl object-cover shrink-0 ring-2 ring-background shadow"
      />
    );
  }
  return (
    <div className="size-11 rounded-xl bg-surface-2 grid place-items-center text-lg shrink-0 ring-2 ring-background">
      ⚽
    </div>
  );
}
