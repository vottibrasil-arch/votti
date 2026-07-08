import { ImagePlus, Loader2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { ImageFocusEditor } from "@/components/votti/image-focus-editor";
import { cropImageSquare } from "@/lib/votti/crop-image";
import { uploadPollAsset } from "@/lib/votti/upload-poll-asset";

type OptionImagePickerProps = {
  value: string;
  onChange: (url: string) => void;
  ownerId?: string;
  label?: string;
};

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function OptionImagePicker({ value, onChange, ownerId, label = "Foto" }: OptionImagePickerProps) {
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
    setUploading(true);
    try {
      if (ownerId) {
        onChange(await uploadPollAsset(file, ownerId, "option"));
      } else {
        onChange(URL.createObjectURL(file));
      }
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

    clearPending();
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
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
      setError(err instanceof Error ? err.message : "Erro ao ajustar a foto.");
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
            <Loader2 className="size-3.5 animate-spin" />
          ) : value ? (
            <img src={value} alt="" className="votti-option-photo__img" />
          ) : (
            <ImagePlus className="size-3.5 opacity-60" />
          )}
        </label>
        {value && !uploading ? (
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
