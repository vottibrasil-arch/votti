import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import {
  EMPTY_JOGO,
  JogoAdminRow,
  JogoForm,
  buildDataPartidaIso,
  partidaToJogoDraft,
  type JogoDraft,
} from "@/components/jogo-form";
import {
  addPartidaToCampeonato,
  deletePartidaFromCampeonato,
  updatePartidaInCampeonato,
} from "@/lib/api/campeonato-admin.server";
import { useAuth } from "@/lib/auth/use-auth";
import { uploadCampeonatoImage } from "@/lib/storage/upload-campeonato-image";
import { formatUserFacingError } from "@/lib/errors";
import type { CampeonatoOwnerRef } from "@/lib/bolao/campeonato-owner-ref";
import { ownerRefPayload } from "@/lib/bolao/campeonato-owner-ref";
import type { CampeonatoAdminData, CampeonatoBolaoStats, DbPartidaRow } from "@/lib/bolao/db-types";
import { CampeonatoBolaoStatsBar } from "@/components/campeonato-bolao-stats-bar";
import { groupPartidasByFase } from "@/lib/bolao/partidas-ui";

type Props = {
  campRef: CampeonatoOwnerRef;
  data: CampeonatoAdminData;
  onReload: () => void;
  showBolaoAction?: boolean;
  bolaoStats?: CampeonatoBolaoStats;
  bolaoSlugByPartidaId?: Record<number, string | null>;
  bolaoCountByPartidaId?: Record<number, number>;
  showBolaoCopyLink?: boolean;
  onOpenBolao?: (partida: DbPartidaRow) => void;
};

async function resolveEscudos(
  jogo: JogoDraft,
  userId: string,
): Promise<{ escudoCasaUrl: string | null; escudoForaUrl: string | null }> {
  const [escudoCasaUrl, escudoForaUrl] = await Promise.all([
    jogo.escudoCasaFile
      ? uploadCampeonatoImage(jogo.escudoCasaFile, "times", userId)
      : Promise.resolve(jogo.escudoCasaUrl),
    jogo.escudoForaFile
      ? uploadCampeonatoImage(jogo.escudoForaFile, "times", userId)
      : Promise.resolve(jogo.escudoForaUrl),
  ]);
  return { escudoCasaUrl: escudoCasaUrl ?? null, escudoForaUrl: escudoForaUrl ?? null };
}

export function CampeonatoAdminJogos({
  campRef,
  data,
  onReload,
  showBolaoAction,
  bolaoStats,
  bolaoSlugByPartidaId,
  bolaoCountByPartidaId,
  showBolaoCopyLink = true,
  onOpenBolao,
}: Props) {
  const navigate = useNavigate();
  const { user, getAccessToken } = useAuth();
  const addFn = useServerFn(addPartidaToCampeonato);
  const updateFn = useServerFn(updatePartidaInCampeonato);
  const deleteFn = useServerFn(deletePartidaFromCampeonato);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [jogoDraft, setJogoDraft] = useState<JogoDraft>(EMPTY_JOGO());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grupos = groupPartidasByFase(data.partidas);

  const abrirAdicionar = () => {
    setEditingId(null);
    setJogoDraft(EMPTY_JOGO());
    setShowForm(true);
    setError(null);
  };

  const abrirEditar = (partida: DbPartidaRow) => {
    setEditingId(partida.id);
    setJogoDraft(partidaToJogoDraft(partida));
    setShowForm(true);
    setError(null);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditingId(null);
    setJogoDraft(EMPTY_JOGO());
  };

  const handleSubmit = async () => {
    const token = getAccessToken();
    if (!token || !user?.id) return;

    setSaving(true);
    setError(null);

    try {
      const escudos = await resolveEscudos(jogoDraft, user.id);
      const ordem = editingId
        ? (data.partidas.find((p) => p.id === editingId)?.ordem ?? data.partidas.length)
        : data.partidas.length + 1;

      const jogo = {
        fase: jogoDraft.fase.trim() || undefined,
        timeCasa: jogoDraft.timeCasa.trim(),
        timeFora: jogoDraft.timeFora.trim(),
        escudoCasaUrl: escudos.escudoCasaUrl,
        escudoForaUrl: escudos.escudoForaUrl,
        dataPartida: buildDataPartidaIso(jogoDraft.data, jogoDraft.horario) ?? null,
        ordem,
      };

      if (editingId) {
        await updateFn({ data: { ...ownerRefPayload(campRef, token), partidaId: editingId, jogo } });
      } else {
        await addFn({ data: { ...ownerRefPayload(campRef, token), jogo } });
      }

      fecharForm();
      onReload();
    } catch (err) {
      setError(formatUserFacingError(err, "Erro ao salvar jogo"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (partidaId: number) => {
    const token = getAccessToken();
    if (!token) return;
    if (!confirm("Excluir este jogo?")) return;

    setDeletingId(partidaId);
    setError(null);
    try {
      await deleteFn({ data: { ...ownerRefPayload(campRef, token), partidaId } });
      if (editingId === partidaId) fecharForm();
      onReload();
    } catch (err) {
      setError(formatUserFacingError(err, "Erro ao excluir jogo"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {bolaoStats && <CampeonatoBolaoStatsBar stats={bolaoStats} />}

      {!showForm && (
        <button
          type="button"
          onClick={abrirAdicionar}
          className="w-full rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 py-4 text-sm font-semibold text-primary flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <Plus className="size-5" /> Adicionar jogo
        </button>
      )}

      {showForm && (
        <JogoForm
          value={jogoDraft}
          onChange={setJogoDraft}
          onSubmit={handleSubmit}
          submitLabel={editingId ? "Atualizar jogo" : "Salvar jogo"}
          saving={saving}
          onCancel={fecharForm}
        />
      )}

      {grupos.length === 0 && !showForm && (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Nenhum jogo ainda. Toque em Adicionar jogo para começar.
        </div>
      )}

      {grupos.map((grupo, gi) => (
        <div key={gi} className="space-y-2">
          {grupo.fase && (
            <h2 className="text-xs font-bold uppercase tracking-wide text-gold px-1">[{grupo.fase}]</h2>
          )}
          {grupo.partidas.map((p) => {
            const bolaoSlug = bolaoSlugByPartidaId?.[p.id] ?? null;
            const bolaoCount = bolaoCountByPartidaId?.[p.id] ?? (bolaoSlug ? 1 : 0);
            return (
              <JogoAdminRow
                key={p.id}
                partida={p}
                bolaoSlug={bolaoSlug}
                bolaoCount={bolaoCount}
                showBolaoCopyLink={showBolaoCopyLink}
                onEdit={() => abrirEditar(p)}
                onDelete={() => handleDelete(p.id)}
                onCriarBolao={
                  showBolaoAction
                    ? () => {
                        if (onOpenBolao) {
                          onOpenBolao(p);
                          return;
                        }
                        navigate({
                          to: "/create",
                          search: {
                            aba: "campeonato",
                            campeonatoId: data.campeonato.id,
                            partidaId: p.id,
                          },
                        });
                      }
                    : undefined
                }
                deleting={deletingId === p.id}
              />
            );
          })}
        </div>
      ))}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
