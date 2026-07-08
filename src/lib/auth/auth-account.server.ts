import { createServerFn } from "@tanstack/react-start";

import { getSupabaseAdmin, getSupabaseWithToken } from "@/lib/api/supabase.server";
import { assertSupabaseAdminConfigured } from "@/lib/config.server";

export const deleteOwnAccount = createServerFn({ method: "POST" })
  .inputValidator((data: { accessToken?: string }) => ({
    accessToken: typeof data.accessToken === "string" ? data.accessToken : "",
  }))
  .handler(async ({ data }) => {
    if (!data.accessToken) {
      throw new Error("Sessão expirada. Entre novamente.");
    }

    assertSupabaseAdminConfigured();

    const userClient = getSupabaseWithToken(data.accessToken);
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      throw new Error("Sessão expirada. Entre novamente.");
    }

    const userId = userData.user.id;
    const admin = getSupabaseAdmin();

    const { error: pollsError } = await admin.from("polls").delete().eq("owner_id", userId);
    if (pollsError) throw pollsError;

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return { ok: true as const };
  });
