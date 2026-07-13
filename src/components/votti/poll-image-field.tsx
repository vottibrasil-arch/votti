import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ImageFocusEditor } from "@/components/votti/image-focus-editor";
import {
  cropImageCover,
  formatImageProcessError,
  isAcceptedImageFile,
  normalizeImageFile,
} from "@/lib/votti/crop-image";
import { normalizeImageUrl } from "@/lib/votti/persist-image-url";
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

const ACCEPT = "image/*,.heic,.heif";

function stopPointerEvent(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export function PollImageField({
  label,
  hint,
  value,
  onChange,
  variant,
  ownerId,
  onBusyChange,
}: PollImageFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerOpenRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState("");

  const displayUrl = normalizeImageUrl(preview) || normalizeImageUrl(value);
  const busy = uploading || pickerOpen || Boolean(pendingFile);
  const onBusyChangeRef = useRef(onBusyChange);
  onBusyChangeRef.current = onBusyChange;

  useEffect(() => {
    onBusyChangeRef.current?.(busy);
  }, [busy]);

  useEffect(() => {
    if (!pickerOpen) return;

    const timeoutId = window.setTimeout(() => {
      pickerOpenRef.current = false;
      setPickerOpen(false);
    }, 120_000);

    function onWindowFocus() {
      window.setTimeout(() => {
        if (pickerOpenRef.current && !pendingFile && !uploading) {
          pickerOpenRef.current = false;
          setPickerOpen(false);
        }
      }, 400);
    }

    window.addEventListener("focus", onWindowFocus);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [pickerOpen, pendingFile, uploading]);

  function clearPending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview("");
  }

  async function uploadFile(file: File) {
    if (!ownerId) {
      setError("Entre na conta para salvar a imagem.");
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadPollAsset(file, ownerId, variant);
      onChange(publicUrl);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(file: File | undefined) {
    pickerOpenRef.current = false;
    setPickerOpen(false);

    if (!file) return;
    setError("");

    if (!isAcceptedImageFile(file)) {
      setError("Selecione uma imagem (PNG, JPG, WebP ou HEIC).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande. Máximo 5 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    try {
      const normalized = normalizeImageFile(file);

      if (variant === "cover") {
        clearPending();
        setPendingFile(normalized);
        setPendingPreview(URL.createObjectURL(normalized));
        return;
      }

      const localUrl = URL.createObjectURL(normalized);
      setPreview(localUrl);
      await uploadFile(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir a imagem.");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function openPicker(event: React.MouseEvent | React.TouchEvent) {
    stopPointerEvent(event);
    if (uploading || pendingFile) return;

    pickerOpenRef.current = true;
    setPickerOpen(true);
    setError("");
    inputRef.current?.click();
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
      setError(formatImageProcessError(err));
      setUploading(false);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleCancelFocus() {
    clearPending();
    if (inputRef.current) inputRef.current.value = "";
  }

  function clearImage(event: React.MouseEvent) {
    stopPointerEvent(event);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onChange("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
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

  return (
    <>
      <div className="votti-image-field">
        <span className="votti-field__label">{label}</span>
        {hint ? <p className="votti-image-field__hint">{hint}</p> : null}

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={uploading}
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />

        <button
          type="button"
          className={`votti-image-box votti-image-box--${variant} ${displayUrl ? "votti-image-box--filled" : ""}`}
          disabled={uploading}
          aria-label={displayUrl ? "Trocar imagem" : "Escolher imagem"}
          onClick={openPicker}
        >
          {uploading ? (
            <span className="votti-image-box__placeholder">
              <Loader2 className="size-8 animate-spin opacity-70" />
              <span>Enviando…</span>
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
              <span className="votti-image-box__overlay">Trocar imagem</span>
            </>
          ) : (
            <span className="votti-image-box__placeholder">
              <ImagePlus className="size-8 opacity-60" />
              <span>Clique para escolher</span>
            </span>
          )}
        </button>

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
