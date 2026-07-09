export type ImageFocus = { x: number; y: number };

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function formatImageProcessError(error: unknown): string {
  const msg = error instanceof Error ? error.message : "";
  if (/could not be decoded|decode|invalid image|corrupt/i.test(msg)) {
    return "Não foi possível abrir esta imagem. Tente JPG ou PNG.";
  }
  if (msg) return msg;
  return "Não foi possível processar a imagem.";
}

/** Garante tipo MIME para arquivos do celular (iOS costuma vir sem type). */
export function normalizeImageFile(file: File): File {
  if (file.type?.startsWith("image/")) return file;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "gif"
          ? "image/gif"
          : "image/jpeg";

  return new File([file], file.name || "foto.jpg", { type, lastModified: file.lastModified });
}

async function loadImageElement(file: File): Promise<{ img: HTMLImageElement; cleanup: () => void }> {
  const url = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Não foi possível abrir esta imagem. Tente JPG ou PNG."));
      el.src = url;
    });

    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) {
      throw new Error("Imagem inválida ou corrompida.");
    }

    return {
      img,
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function canvasToFile(canvas: HTMLCanvasElement, name: string, quality = 0.88): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível processar a imagem."));
          return;
        }
        resolve(new File([blob], name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
      },
      "image/jpeg",
      quality,
    );
  });
}

/** Recorte quadrado centrado no ponto de foco — ideal para bolha da opção. */
export async function cropImageSquare(
  file: File,
  focus: ImageFocus,
  outputSize = 256,
): Promise<File> {
  const normalized = normalizeImageFile(file);
  const { img, cleanup } = await loadImageElement(normalized);

  try {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const side = Math.min(width, height);
    const focusX = clamp01(focus.x) * width;
    const focusY = clamp01(focus.y) * height;

    let sx = focusX - side / 2;
    let sy = focusY - side / 2;
    sx = Math.max(0, Math.min(width - side, sx));
    sy = Math.max(0, Math.min(height - side, sy));

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível.");

    ctx.drawImage(img, sx, sy, side, side, 0, 0, outputSize, outputSize);

    return canvasToFile(canvas, normalized.name);
  } finally {
    cleanup();
  }
}

/** Recorte 16:9 centrado no foco — ideal para capa. */
export async function cropImageCover(
  file: File,
  focus: ImageFocus,
  outputWidth = 1280,
): Promise<File> {
  const normalized = normalizeImageFile(file);
  const { img, cleanup } = await loadImageElement(normalized);

  try {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const outputHeight = Math.round((outputWidth * 9) / 16);
    const targetRatio = outputWidth / outputHeight;

    let cropW = width;
    let cropH = height;

    if (width / height > targetRatio) {
      cropW = height * targetRatio;
    } else {
      cropH = width / targetRatio;
    }

    const focusX = clamp01(focus.x) * width;
    const focusY = clamp01(focus.y) * height;

    let sx = focusX - cropW / 2;
    let sy = focusY - cropH / 2;
    sx = Math.max(0, Math.min(width - cropW, sx));
    sy = Math.max(0, Math.min(height - cropH, sy));

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível.");

    ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outputWidth, outputHeight);

    return canvasToFile(canvas, normalized.name, 0.9);
  } finally {
    cleanup();
  }
}
