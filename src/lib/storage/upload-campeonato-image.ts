import { getSupabaseBrowser } from "@/lib/api/supabase-browser";

const BUCKET = "campeonatos-media";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extFromFile(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export function validateImageFile(file: File) {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Use JPG, PNG, WEBP ou GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }
}

export async function uploadCampeonatoImage(
  file: File,
  folder: "banners" | "escudos" | "logos" | "times",
  userId: string,
) {
  validateImageFile(file);

  const supabase = getSupabaseBrowser();
  const ext = extFromFile(file);
  const path = `${folder}/${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    if (error.message.includes("Bucket not found")) {
      throw new Error(
        "Storage não configurado. Execute docs/supabase/storage-campeonatos.sql no Supabase.",
      );
    }
    throw new Error(`Falha no upload da imagem: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
