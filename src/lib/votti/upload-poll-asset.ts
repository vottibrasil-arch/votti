import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/api/supabase-browser";
import { ensureAuthSession } from "@/lib/auth/ensure-auth-session";

const BUCKET = "poll-assets";

export async function uploadPollAsset(
  file: File,
  ownerId: string,
  kind: "logo" | "cover" | "option",
): Promise<string> {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error("Supabase não configurado. Não foi possível enviar a imagem.");
  }

  await ensureAuthSession();

  const supabase = getSupabaseBrowser();
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeExt = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext) ? ext : "jpg";
  const path = `${ownerId}/${kind}/${Date.now()}.${safeExt}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("bucket") && msg.includes("not found")) {
      throw new Error(
        "Bucket poll-assets não encontrado. Execute docs/supabase/SETUP-COMPLETO.sql no Supabase.",
      );
    }
    if (msg.includes("row-level security") || msg.includes("permission denied")) {
      throw new Error("Sem permissão para enviar imagem. Saia da conta, entre de novo e tente outra vez.");
    }
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
