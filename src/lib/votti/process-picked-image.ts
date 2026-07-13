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

/** No celular, pula o editor e recorta no centro automaticamente. */
export async function autoProcessPickedImage(
  file: File,
  mode: "option" | "cover",
): Promise<File> {
  const normalized = normalizeImageFile(file);
  return mode === "option"
    ? cropImageSquare(normalized, CENTER_FOCUS, 192)
    : cropImageCover(normalized, CENTER_FOCUS);
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
