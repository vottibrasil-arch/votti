export type ImageFocus = { x: number; y: number };

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function formatImageProcessError(error: unknown): string {
  const msg = error instanceof Error ? error.message : "";
  if (/could not be decoded|decode|invalid image|corrupt/i.test(msg)) {
    return "Não foi possível abrir esta foto. No iPhone, em Ajustes da foto, use “Mais compatível” (JPG).";
  }
  if (msg) return msg;
  return "Não foi possível processar a imagem.";
}

function fileExtension(name: string): string {
  const lower = name.toLowerCase();
  if (!lower.includes(".")) return "";
  return lower.split(".").pop() ?? "";
}

/** Garante tipo MIME para arquivos do celular (iOS costuma vir sem type). */
export function normalizeImageFile(file: File): File {
  if (file.type?.startsWith("image/")) return file;

  const ext = fileExtension(file.name);
  const type =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "gif"
          ? "image/gif"
          : ext === "heic" || ext === "heif"
            ? "image/heic"
            : "image/jpeg";

  const name = ext ? file.name || "foto.jpg" : "foto.jpg";
  return new File([file], name, { type, lastModified: file.lastModified });
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);

/** Aceita fotos do celular mesmo quando o MIME vem vazio (comum no iOS). */
export function isAcceptedImageFile(file: File): boolean {
  if (file.type?.startsWith("image/")) return true;
  const ext = fileExtension(file.name);
  if (ext && IMAGE_EXTENSIONS.has(ext)) return true;
  // Galeria do celular: sem extensão nem MIME — o input accept=image/* já filtra
  if ((!file.type || file.type === "application/octet-stream") && file.size > 0) return true;
  return false;
}

type DrawableSource = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

function scaledDimensions(width: number, height: number, maxEdge: number) {
  const max = Math.max(width, height);
  if (max <= maxEdge) return { width, height };
  const scale = maxEdge / max;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function decodeWithImageElement(file: File, maxEdge: number): Promise<DrawableSource> {
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

    const target = scaledDimensions(width, height, maxEdge);
    if (target.width === width && target.height === height) {
      return {
        source: img,
        width,
        height,
        cleanup: () => URL.revokeObjectURL(url),
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível.");

    ctx.drawImage(img, 0, 0, target.width, target.height);
    URL.revokeObjectURL(url);

    return {
      source: canvas,
      width: target.width,
      height: target.height,
      cleanup: () => {},
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** Decodifica e reduz a imagem antes do recorte — evita travar o celular em fotos 12 MP+. */
async function loadDrawableSource(file: File, maxEdge = 2000): Promise<DrawableSource> {
  const normalized = normalizeImageFile(file);
  const edgeSteps = [maxEdge, Math.round(maxEdge * 0.65), 900];

  for (const edge of edgeSteps) {
    if (typeof createImageBitmap === "function") {
      try {
        let bitmap = await createImageBitmap(normalized);
        const target = scaledDimensions(bitmap.width, bitmap.height, edge);

        if (target.width !== bitmap.width || target.height !== bitmap.height) {
          const resized = await createImageBitmap(bitmap, {
            resizeWidth: target.width,
            resizeHeight: target.height,
            resizeQuality: "medium",
          });
          bitmap.close();
          bitmap = resized;
        }

        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close(),
        };
      } catch {
        /* tenta Image() ou próximo tamanho */
      }
    }

    try {
      return await decodeWithImageElement(normalized, edge);
    } catch {
      /* próximo tamanho */
    }
  }

  throw new Error("Não foi possível abrir esta imagem. Tente JPG ou PNG.");
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
  const { source, width, height, cleanup } = await loadDrawableSource(
    normalized,
    Math.max(outputSize * 3, 900),
  );

  try {
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

    ctx.drawImage(source, sx, sy, side, side, 0, 0, outputSize, outputSize);

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
  quality = 0.9,
): Promise<File> {
  const normalized = normalizeImageFile(file);
  const outputHeight = Math.round((outputWidth * 9) / 16);
  const { source, width, height, cleanup } = await loadDrawableSource(
    normalized,
    Math.max(outputWidth * 1.35, 1200),
  );

  try {
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

    ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, outputWidth, outputHeight);

    return canvasToFile(canvas, normalized.name, quality);
  } finally {
    cleanup();
  }
}
