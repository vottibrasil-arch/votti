import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { RankingOptionAvatar } from "@/components/votti/ranking-option-avatar";
import { normalizeImageUrl } from "@/lib/votti/persist-image-url";
import { ImageFocusEditor } from "@/components/votti/image-focus-editor";
import {
  cropImageSquare,
  formatImageProcessError,
  isAcceptedImageFile,
  normalizeImageFile,
} from "@/lib/votti/crop-image";
import { uploadPollAsset } from "@/lib/votti/upload-poll-asset";

type OptionImagePickerProps = {
  value: string;
  onChange: (url: string) => void;
  ownerId?: string;
  label?: string;
  onBusyChange?: (busy: boolean) => void;
};

const ACCEPT = "image/*,.heic,.heif";

function stopPointerEvent(event: React.SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function OptionImagePicker({
  value,
  onChange,
  ownerId,
  label = "Foto",
  onBusyChange,
}: OptionImagePickerProps) {
  const imageUrl = normalizeImageUrl(value);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerOpenRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState("");

  const busy = uploading || pickerOpen || Boolean(pendingFile);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    if (!pickerOpen) return;

    function onWindowFocus() {
      window.setTimeout(() => {
        if (pickerOpenRef.current && !pendingFile && !uploading) {
          pickerOpenRef.current = false;
          setPickerOpen(false);
        }
      }, 400);
    }

    window.addEventListener("focus", onWindowFocus);
    return () => window.removeEventListener("focus", onWindowFocus);
  }, [pickerOpen, pendingFile, uploading]);

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
    pickerOpenRef.current = false;
    setPickerOpen(false);

    if (!file) return;
    setError("");

    if (!isAcceptedImageFile(file)) {
      setError("Use PNG, JPG, WebP ou HEIC.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("Máximo 3 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    try {
      const normalized = normalizeImageFile(file);
      clearPending();
      setPendingFile(normalized);
      setPendingPreview(URL.createObjectURL(normalized));
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

  function handleCancelFocus() {
    clearPending();
    if (inputRef.current) inputRef.current.value = "";
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
          onClick={stopPointerEvent}
        />
        <button
          type="button"
          className="votti-option-photo__btn"
          title={label}
          aria-label={imageUrl ? "Trocar foto da opção" : "Adicionar foto da opção"}
          disabled={uploading}
          onClick={openPicker}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : imageUrl ? (
            <RankingOptionAvatar src={imageUrl} size={40} className="votti-option-photo__img" />
          ) : (
            <ImagePlus className="size-4 opacity-60" />
          )}
        </button>
        {imageUrl && !uploading ? (
          <button
            type="button"
            className="votti-option-photo__clear"
            aria-label="Remover foto"
            onClick={(event) => {
              stopPointerEvent(event);
              onChange("");
              setError("");
              if (inputRef.current) inputRef.current.value = "";
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
