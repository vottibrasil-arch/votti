import { ImagePlus, Loader2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { RankingOptionAvatar } from "@/components/votti/ranking-option-avatar";
import { normalizeImageUrl } from "@/lib/votti/persist-image-url";
import { ImageFocusEditor } from "@/components/votti/image-focus-editor";
import { cropImageSquare, formatImageProcessError, normalizeImageFile } from "@/lib/votti/crop-image";
import { uploadPollAsset } from "@/lib/votti/upload-poll-asset";

type OptionImagePickerProps = {
  value: string;
  onChange: (url: string) => void;
  ownerId?: string;
  label?: string;
};

const ACCEPT = "image/*,.heic,.heif";

export function OptionImagePicker({ value, onChange, ownerId, label = "Foto" }: OptionImagePickerProps) {
  const imageUrl = normalizeImageUrl(value);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState("");

  function clearPending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview("");
  }

  async function uploadCropped(file: File) {
    if (!ownerId) {
      setError("Entre na conta para salvar a foto.");
      return;
    }

    setUploading(true);
    try {
      onChange(await uploadPollAsset(file, ownerId, "option"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Use PNG, JPG ou WebP.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("Máximo 3 MB.");
      return;
    }

    const normalized = normalizeImageFile(file);
    clearPending();
    setPendingFile(normalized);
    setPendingPreview(URL.createObjectURL(normalized));
  }

  async function confirmFocusWithPosition(focus: { x: number; y: number }) {
    if (!pendingFile) return;
    setError("");
    setUploading(true);

    try {
      const cropped = await cropImageSquare(pendingFile, focus, 192);
      clearPending();
      await uploadCropped(cropped);
    } catch (err) {
      setError(formatImageProcessError(err));
      setUploading(false);
    }
  }

  return (
    <>
      <div className="votti-option-photo">
        <label htmlFor={inputId} className="votti-option-photo__btn" title={label}>
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
            <Loader2 className="size-4 animate-spin" />
          ) : imageUrl ? (
            <RankingOptionAvatar src={imageUrl} size={40} className="votti-option-photo__img" />
          ) : (
            <ImagePlus className="size-4 opacity-60" />
          )}
        </label>
        {imageUrl && !uploading ? (
          <button
            type="button"
            className="votti-option-photo__clear"
            aria-label="Remover foto"
            onClick={() => {
              onChange("");
              setError("");
            }}
          >
            <X className="size-3" />
          </button>
        ) : null}
        {error ? <p className="votti-option-photo__error">{error}</p> : null}
      </div>

      {pendingFile && pendingPreview ? (
        <ImageFocusEditor
          previewUrl={pendingPreview}
          variant="circle"
          title="Ajustar foto da opção"
          onCancel={() => {
            clearPending();
            if (inputRef.current) inputRef.current.value = "";
          }}
          onConfirm={(focus) => void confirmFocusWithPosition(focus)}
        />
      ) : null}
    </>
  );
}
