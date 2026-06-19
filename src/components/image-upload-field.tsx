import { useEffect, useRef, useState } from "react";
import { FormField } from "@/components/bolao/form-primitives";
import { ImagePlus, X } from "lucide-react";

type ImageUploadFieldProps = {
  label: string;
  hint?: string;
  file: File | null;
  existingUrl?: string | null;
  onChange: (file: File | null) => void;
  previewHeight?: string;
};

export function ImageUploadField({
  label,
  hint,
  file,
  existingUrl,
  onChange,
  previewHeight = "h-36",
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(existingUrl ?? null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, existingUrl]);

  return (
    <FormField label={label}>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full rounded-2xl border border-dashed border-border glass overflow-hidden transition hover:border-primary/50 ${previewHeight}`}
        >
          {preview ? (
            <img src={preview} alt={label} className="w-full h-full object-cover" />
          ) : (
            <div className="h-full grid place-items-center gap-2 text-muted-foreground p-4">
              <ImagePlus className="size-8 opacity-70" />
              <span className="text-sm font-medium">Subir foto</span>
            </div>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        {(file || existingUrl) && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-xs text-red-400 flex items-center gap-1"
          >
            <X className="size-3" /> Remover foto
          </button>
        )}
      </div>
    </FormField>
  );
}
