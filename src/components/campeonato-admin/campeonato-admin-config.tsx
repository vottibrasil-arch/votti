import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ImageUploadField } from "@/components/image-upload-field";
import { FormField } from "@/components/bolao/form-primitives";
import { PrimaryButton } from "@/components/ui-kit";
import {
  deleteCampeonatoPersonalizado,
  toggleCampeonatoApostas,
  updateCampeonatoPersonalizado,
} from "@/lib/api/campeonato-admin.server";
import { resolveApostasAbertas } from "@/lib/bolao/campeonato-meta";
import { useAuth } from "@/lib/auth/use-auth";
import { uploadCampeonatoImage } from "@/lib/storage/upload-campeonato-image";
import type { CampeonatoOwnerRef } from "@/lib/bolao/campeonato-owner-ref";
import { ownerRefPayload } from "@/lib/bolao/campeonato-owner-ref";
import { formatUserFacingError } from "@/lib/errors";
import type { CampeonatoAdminData } from "@/lib/bolao/db-types";
import { Lock, LockOpen, Trash2 } from "lucide-react";

type Props = {
  campRef: CampeonatoOwnerRef;
  data: CampeonatoAdminData;
  onReload: () => void;
  onDeleted?: () => void;
};

export function CampeonatoAdminConfig({ campRef, data, onReload, onDeleted }: Props) {
  const navigate = useNavigate();
  const { user, getAccessToken } = useAuth();
  const updateFn = useServerFn(updateCampeonatoPersonalizado);
  const toggleFn = useServerFn(toggleCampeonatoApostas);
  const deleteFn = useServerFn(deleteCampeonatoPersonalizado);

  const [nome, setNome] = useState(data.campeonato.nome);
  const [descricao, setDescricao] = useState(data.campeonato.descricao ?? "");
  const [cidade, setCidade] = useState(data.campeonato.cidade ?? "");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [escudoFile, setEscudoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apostasAbertas = resolveApostasAbertas(data.campeonato);

  useEffect(() => {
    setNome(data.campeonato.nome);
    setDescricao(data.campeonato.descricao ?? "");
    setCidade(data.campeonato.cidade ?? "");
  }, [data.campeonato.nome, data.campeonato.descricao, data.campeonato.cidade]);

  const handleSave = async () => {
    const token = getAccessToken();
    if (!token || !user?.id) return;
    if (nome.trim().length < 2) {
      setError("Nome deve ter pelo menos 2 caracteres.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const [bannerUrl, escudoUrl] = await Promise.all([
        bannerFile ? uploadCampeonatoImage(bannerFile, "banners", user.id) : Promise.resolve(undefined),
        escudoFile ? uploadCampeonatoImage(escudoFile, "logos", user.id) : Promise.resolve(undefined),
      ]);

      await updateFn({
        data: {
          ...ownerRefPayload(campRef, token),
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          cidade: cidade.trim() || null,
          ...(bannerUrl !== undefined ? { bannerUrl } : {}),
          ...(escudoUrl !== undefined ? { escudoUrl } : {}),
        },
      });

      setBannerFile(null);
      setEscudoFile(null);
      setSuccess("Alterações salvas.");
      onReload();
    } catch (err) {
      setError(formatUserFacingError(err, "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleApostas = async () => {
    const token = getAccessToken();
    if (!token) return;

    setToggling(true);
    setError(null);
    try {
      await toggleFn({ data: { ...ownerRefPayload(campRef, token), abertas: !apostasAbertas } });
      onReload();
    } catch (err) {
      setError(formatUserFacingError(err, "Erro ao alterar apostas"));
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    const token = getAccessToken();
    if (!token) return;
    if (!confirm(`Excluir "${data.campeonato.nome}" permanentemente? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteFn({ data: ownerRefPayload(campRef, token) });
      if (onDeleted) {
        onDeleted();
      } else {
        navigate({ to: "/create", search: { aba: "meus" } });
      }
    } catch (err) {
      setError(formatUserFacingError(err, "Erro ao excluir"));
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Edite nome, descrição, cidade e imagens do seu campeonato personalizado.
      </p>

      <FormField label="Nome do campeonato">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full bg-transparent outline-none font-semibold text-sm"
        />
      </FormField>

      <FormField label="Cidade (opcional)">
        <input
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          placeholder="Ex.: Divinópolis"
          className="w-full bg-transparent outline-none text-sm"
        />
      </FormField>

      <FormField label="Descrição (opcional)">
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          placeholder="Conte sobre o campeonato..."
          className="w-full bg-transparent outline-none text-sm resize-none"
        />
      </FormField>

      <ImageUploadField
        label="Banner"
        hint="Substitui o banner atual"
        file={bannerFile}
        existingUrl={data.campeonato.banner_url}
        onChange={setBannerFile}
        previewHeight="h-28"
      />

      <ImageUploadField
        label="Escudo / logo"
        file={escudoFile}
        existingUrl={data.campeonato.escudo_url}
        onChange={setEscudoFile}
        previewHeight="h-24"
      />

      <PrimaryButton
        onClick={handleSave}
        variant="primary"
        className={`h-12 ${saving ? "opacity-50 pointer-events-none" : ""}`}
      >
        {saving ? "Salvando..." : "Salvar alterações"}
      </PrimaryButton>

      <div className="pt-2 space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Apostas
        </h2>
        <PrimaryButton
          onClick={handleToggleApostas}
          variant="outline"
          className={`h-12 ${toggling ? "opacity-50 pointer-events-none" : ""}`}
        >
          {apostasAbertas ? (
            <>
              <Lock className="size-5" /> Fechar apostas
            </>
          ) : (
            <>
              <LockOpen className="size-5" /> Abrir apostas
            </>
          )}
        </PrimaryButton>
      </div>

      <div className="pt-4 border-t border-border space-y-2">
        <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wide">Zona de perigo</h2>
        <p className="text-xs text-muted-foreground">
          Exclui o campeonato, todos os jogos, bolões vinculados e participantes. Use só se criou por engano.
        </p>
        <PrimaryButton
          onClick={handleDelete}
          variant="outline"
          className={`h-12 border-red-400/40 text-red-400 ${deleting ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Trash2 className="size-5" /> {deleting ? "Excluindo..." : "Excluir campeonato"}
        </PrimaryButton>
      </div>

      {success && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary text-center">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
