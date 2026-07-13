import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ImageFocusEditor } from "@/components/votti/image-focus-editor";
import {
  formatImageProcessError,
  isAcceptedImageFile,
  normalizeImageFile,
} from "@/lib/votti/crop-image";
import { normalizeImageUrl } from "@/lib/votti/persist-image-url";
import {
  autoProcessPickedImage,
  isCoarsePointerDevice,
  processPickedImageWithFocus,
} from "@/lib/votti/process-picked-image";
import { uploadPollAsset } from "@/lib/votti/upload-poll-asset";

type PollImageFieldProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  variant: "logo" | "cover";
  ownerId?: string;
  onBusyChange?: (busy: boolean) => void;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/*";

export function PollImageField({
  label,
  hint,
  value,
  onChange,
  variant,
  ownerId,
  onBusyChange,
}: PollImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState("");

  const displayUrl = normalizeImageUrl(preview) || normalizeImageUrl(value);
  const busy = uploading || Boolean(pendingFile);
  const onBusyChangeRef = useRef(onBusyChange);
  onBusyChangeRef.current = onBusyChange;

  useEffect(() => {
    onBusyChangeRef.current?.(busy);
  }, [busy]);

  function clearPending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview("");
  }

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  async function uploadProcessed(file: File) {
    if (!ownerId) {
      setError("Entre na conta para salvar a imagem.");
      setUploading(false);
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadPollAsset(file, ownerId, variant);
      onChange(publicUrl);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");

    if (!isAcceptedImageFile(file)) {
      setError("Selecione JPG, PNG ou WebP.");
      resetInput();
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Imagem muito grande. Máximo 8 MB.");
      resetInput();
      return;
    }

    const normalized = normalizeImageFile(file);

    if (variant === "cover") {
      if (isCoarsePointerDevice()) {
        const localUrl = URL.createObjectURL(normalized);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(localUrl);
        setUploading(true);
        try {
          clearPending();
          const processed = await autoProcessPickedImage(normalized, "cover");
          await uploadProcessed(processed);
        } catch (err) {
          if (preview) URL.revokeObjectURL(preview);
          setPreview(null);
          setError(formatImageProcessError(err));
          setUploading(false);
        } finally {
          resetInput();
        }
        return;
      }

      try {
        clearPending();
        setPendingFile(normalized);
        setPendingPreview(URL.createObjectURL(normalized));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível abrir a imagem.");
        resetInput();
      }
      return;
    }

    const localUrl = URL.createObjectURL(normalized);
    setPreview(localUrl);
    await uploadProcessed(normalized);
    resetInput();
  }

  async function confirmCoverFocus(focus: { x: number; y: number }) {
    if (!pendingFile) return;
    setError("");
    setUploading(true);

    try {
      const processed = await processPickedImageWithFocus(pendingFile, "cover", focus);
      clearPending();
      await uploadProcessed(processed);
    } catch (err) {
      setError(formatImageProcessError(err));
      setUploading(false);
    } finally {
      resetInput();
    }
  }

  function handleCancelFocus() {
    clearPending();
    resetInput();
  }

  function clearImage(event: React.MouseEvent) {
    event.stopPropagation();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onChange("");
    setError("");
    resetInput();
  }

  const focusEditor =
    pendingFile && pendingPreview ? (
      <ImageFocusEditor
        previewUrl={pendingPreview}
        variant="landscape"
        title="Ajustar foto de capa"
        onCancel={handleCancelFocus}
        onConfirm={(focus) => void confirmCoverFocus(focus)}
      />
    ) : null;

  const showPicker = !uploading && !pendingFile;

  return (
    <>
      <div className="votti-image-field">
        <span className="votti-field__label">{label}</span>
        {hint ? <p className="votti-image-field__hint">{hint}</p> : null}

        <div
          className={`votti-image-box votti-image-box--${variant} votti-image-box--picker ${displayUrl ? "votti-image-box--filled" : ""} ${uploading ? "votti-image-box--busy" : ""}`}
        >
          {showPicker ? (
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="votti-file-overlay"
              aria-label={displayUrl ? "Trocar imagem" : "Escolher imagem"}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          ) : null}

          {uploading && !displayUrl ? (
            <span className="votti-image-box__placeholder">
              <Loader2 className="size-8 animate-spin opacity-70" />
              <span>{variant === "cover" ? "Salvando capa…" : "Enviando…"}</span>
            </span>
          ) : displayUrl ? (
            <>
              <img
                src={displayUrl}
                alt=""
                className="votti-image-box__preview"
                onError={() => {
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(null);
                  onChange("");
                  setError("Não foi possível carregar a imagem. Envie novamente.");
                }}
              />
              {uploading ? (
                <span className="votti-image-box__overlay votti-image-box__overlay--busy">
                  <Loader2 className="size-5 animate-spin" />
                  {variant === "cover" ? "Salvando capa…" : "Enviando…"}
                </span>
              ) : (
                <span className="votti-image-box__overlay">Trocar imagem</span>
              )}
            </>
          ) : (
            <span className="votti-image-box__placeholder">
              <ImagePlus className="size-8 opacity-60" />
              <span>Toque para escolher</span>
            </span>
          )}
        </div>

        {displayUrl && !uploading ? (
          <button type="button" className="votti-image-field__remove" onClick={clearImage}>
            <X className="size-3.5" /> Remover
          </button>
        ) : null}

        {error ? <p className="votti-auth__error">{error}</p> : null}
      </div>

      {focusEditor}
    </>
  );
}
