export type ImageFocus = { x: number; y: number };

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
      el.src = url;
    });
    return createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
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
  const bitmap = await loadImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const focusX = clamp01(focus.x) * bitmap.width;
  const focusY = clamp01(focus.y) * bitmap.height;

  let sx = focusX - side / 2;
  let sy = focusY - side / 2;
  sx = Math.max(0, Math.min(bitmap.width - side, sx));
  sy = Math.max(0, Math.min(bitmap.height - side, sy));

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");

  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, outputSize, outputSize);
  bitmap.close?.();

  return canvasToFile(canvas, file.name);
}

/** Recorte 16:9 centrado no foco — ideal para capa. */
export async function cropImageCover(
  file: File,
  focus: ImageFocus,
  outputWidth = 1280,
): Promise<File> {
  const bitmap = await loadImageBitmap(file);
  const outputHeight = Math.round((outputWidth * 9) / 16);
  const targetRatio = outputWidth / outputHeight;

  let cropW = bitmap.width;
  let cropH = bitmap.height;

  if (bitmap.width / bitmap.height > targetRatio) {
    cropW = bitmap.height * targetRatio;
  } else {
    cropH = bitmap.width / targetRatio;
  }

  const focusX = clamp01(focus.x) * bitmap.width;
  const focusY = clamp01(focus.y) * bitmap.height;

  let sx = focusX - cropW / 2;
  let sy = focusY - cropH / 2;
  sx = Math.max(0, Math.min(bitmap.width - cropW, sx));
  sy = Math.max(0, Math.min(bitmap.height - cropH, sy));

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");

  ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, outputWidth, outputHeight);
  bitmap.close?.();

  return canvasToFile(canvas, file.name, 0.9);
}
