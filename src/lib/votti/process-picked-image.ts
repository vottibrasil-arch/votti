import {
  cropImageCover,
  cropImageSquare,
  normalizeImageFile,
  type ImageFocus,
} from "@/lib/votti/crop-image";

const CENTER_FOCUS: ImageFocus = { x: 0.5, y: 0.5 };

export function isCoarsePointerDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/** No celular, pula o editor e recorta no centro automaticamente (tamanho menor = mais rápido). */
export async function autoProcessPickedImage(
  file: File,
  mode: "option" | "cover",
): Promise<File> {
  const normalized = normalizeImageFile(file);
  const mobile = isCoarsePointerDevice();

  if (mode === "option") {
    return cropImageSquare(normalized, CENTER_FOCUS, mobile ? 160 : 192);
  }

  return cropImageCover(normalized, CENTER_FOCUS, mobile ? 960 : 1280, mobile ? 0.82 : 0.9);
}

export async function processPickedImageWithFocus(
  file: File,
  mode: "option" | "cover",
  focus: ImageFocus,
): Promise<File> {
  const normalized = normalizeImageFile(file);
  return mode === "option"
    ? cropImageSquare(normalized, focus, 192)
    : cropImageCover(normalized, focus);
}
