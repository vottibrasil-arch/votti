import { ImagePlus, Loader2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { ImageFocusEditor } from "@/components/votti/image-focus-editor";
import { cropImageCover } from "@/lib/votti/crop-image";
import { uploadPollAsset } from "@/lib/votti/upload-poll-asset";

type PollImageFieldProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  variant: "logo" | "cover";
  ownerId?: string;
};

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function PollImageField({
  label,
  hint,
  value,
  onChange,
  variant,
  ownerId,
}: PollImageFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState("");

  const displayUrl = preview || value;

  function clearPending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview("");
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      if (ownerId) {
        const publicUrl = await uploadPollAsset(file, ownerId, variant);
        onChange(publicUrl);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
      } else {
        onChange(URL.createObjectURL(file));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem (PNG, JPG ou WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande. Máximo 5 MB.");
      return;
    }

    if (variant === "cover") {
      clearPending();
      setPendingFile(file);
      setPendingPreview(URL.createObjectURL(file));
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    await uploadFile(file);
  }

  async function confirmCoverFocus(focus: { x: number; y: number }) {
    if (!pendingFile) return;
    setError("");
    setUploading(true);

    try {
      const cropped = await cropImageCover(pendingFile, focus);
      clearPending();
      await uploadFile(cropped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ajustar a capa.");
      setUploading(false);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clearImage(e: React.MouseEvent) {
    e.stopPropagation();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onChange("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <div className="votti-image-field">
        <span className="votti-field__label">{label}</span>
        {hint ? <p className="votti-image-field__hint">{hint}</p> : null}

        <label
          htmlFor={inputId}
          className={`votti-image-box votti-image-box--${variant} ${displayUrl ? "votti-image-box--filled" : ""}`}
        >
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={uploading}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />

          {uploading ? (
            <span className="votti-image-box__placeholder">
              <Loader2 className="size-8 animate-spin opacity-70" />
              <span>Enviando…</span>
            </span>
          ) : displayUrl ? (
            <>
              <img src={displayUrl} alt="" className="votti-image-box__preview" />
              <span className="votti-image-box__overlay">Trocar imagem</span>
            </>
          ) : (
            <span className="votti-image-box__placeholder">
              <ImagePlus className="size-8 opacity-60" />
              <span>Clique para escolher</span>
            </span>
          )}
        </label>

        {displayUrl && !uploading ? (
          <button type="button" className="votti-image-field__remove" onClick={clearImage}>
            <X className="size-3.5" /> Remover
          </button>
        ) : null}

        {error ? <p className="votti-auth__error">{error}</p> : null}
      </div>

      {pendingFile && pendingPreview ? (
        <ImageFocusEditor
          previewUrl={pendingPreview}
          variant="landscape"
          title="Ajustar foto de capa"
          onCancel={() => {
            clearPending();
            if (inputRef.current) inputRef.current.value = "";
          }}
          onConfirm={(focus) => void confirmCoverFocus(focus)}
        />
      ) : null}
    </>
  );
}
