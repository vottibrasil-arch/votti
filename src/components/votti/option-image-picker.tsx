import { ImagePlus, Loader2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
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

  return (
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
        ) : value ? (
          <img src={value} alt="" className="votti-option-photo__img" />
        ) : (
          <ImagePlus className="size-4 opacity-60" />
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
  );
}
