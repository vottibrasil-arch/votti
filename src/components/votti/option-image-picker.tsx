import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RankingOptionAvatar } from "@/components/votti/ranking-option-avatar";
import { normalizeImageUrl } from "@/lib/votti/persist-image-url";
import { ImageFocusEditor } from "@/components/votti/image-focus-editor";
import {
  formatImageProcessError,
  isAcceptedImageFile,
  normalizeImageFile,
} from "@/lib/votti/crop-image";
import {
  autoProcessPickedImage,
  isCoarsePointerDevice,
  processPickedImageWithFocus,
} from "@/lib/votti/process-picked-image";
import { uploadPollAsset } from "@/lib/votti/upload-poll-asset";

type OptionImagePickerProps = {
  value: string;
  onChange: (url: string) => void;
  ownerId?: string;
  label?: string;
  onBusyChange?: (busy: boolean) => void;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/*";

export function OptionImagePicker({
  value,
  onChange,
  ownerId,
  label = "Foto",
  onBusyChange,
}: OptionImagePickerProps) {
  const imageUrl = normalizeImageUrl(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState("");

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
      setError("Entre na conta para salvar a foto.");
      setUploading(false);
      return;
    }

    setUploading(true);
    try {
      onChange(await uploadPollAsset(file, ownerId, "option"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setUploading(false);
      resetInput();
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");

    if (!isAcceptedImageFile(file)) {
      setError("Use JPG, PNG ou WebP.");
      resetInput();
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Máximo 8 MB.");
      resetInput();
      return;
    }

    const normalized = normalizeImageFile(file);

    if (isCoarsePointerDevice()) {
      setUploading(true);
      try {
        clearPending();
        const processed = await autoProcessPickedImage(normalized, "option");
        await uploadProcessed(processed);
      } catch (err) {
        setError(formatImageProcessError(err));
        setUploading(false);
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
  }

  async function confirmFocusWithPosition(focus: { x: number; y: number }) {
    if (!pendingFile) return;
    setError("");
    setUploading(true);

    try {
      const processed = await processPickedImageWithFocus(pendingFile, "option", focus);
      clearPending();
      await uploadProcessed(processed);
    } catch (err) {
      setError(formatImageProcessError(err));
      setUploading(false);
    }
  }

  function handleCancelFocus() {
    clearPending();
    resetInput();
  }

  const focusEditor =
    pendingFile && pendingPreview ? (
      <ImageFocusEditor
        previewUrl={pendingPreview}
        variant="circle"
        title="Ajustar foto da opção"
        onCancel={handleCancelFocus}
        onConfirm={(focus) => void confirmFocusWithPosition(focus)}
      />
    ) : null;

  return (
    <>
      <div className="votti-option-photo">
        <div
          className={`votti-option-photo__btn ${uploading ? "votti-option-photo__btn--busy" : ""}`}
          title={label}
        >
          {!uploading && !pendingFile ? (
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="votti-file-overlay"
              aria-label={imageUrl ? "Trocar foto da opção" : "Adicionar foto da opção"}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          ) : null}
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : imageUrl ? (
            <RankingOptionAvatar src={imageUrl} size={40} className="votti-option-photo__img" />
          ) : (
            <ImagePlus className="size-4 opacity-60" />
          )}
        </div>
        {imageUrl && !uploading ? (
          <button
            type="button"
            className="votti-option-photo__clear"
            aria-label="Remover foto"
            onClick={(event) => {
              event.stopPropagation();
              onChange("");
              setError("");
              resetInput();
            }}
          >
            <X className="size-3" />
          </button>
        ) : null}
        {error ? <p className="votti-option-photo__error">{error}</p> : null}
      </div>

      {focusEditor}
    </>
  );
}
