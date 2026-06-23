import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Supporter } from "@/lib/bolao";
import { getSupabaseAdmin } from "./supabase.server";
import { createMercadoPagoPixOrder, getMercadoPagoPublicKey } from "./mercadopago.server";

const SUPPORTER_COLORS = [
  "oklch(0.55 0.18 150)",
  "oklch(0.62 0.18 50)",
  "oklch(0.58 0.18 25)",
  "oklch(0.58 0.20 350)",
  "oklch(0.60 0.16 220)",
] as const;

const createApoioInput = z.object({
  nome: z.string().trim().min(2).max(80),
  cidade: z.string().trim().max(80).optional(),
  mensagem: z.string().trim().max(18).optional(),
  valor: z.number().min(1).max(9999),
});

type ApoiadorRow = {
  id: string;
  nome: string;
  cidade: string | null;
  mensagem: string | null;
};

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function mapApoiadorToSupporter(row: ApoiadorRow): Supporter {
  return {
    id: row.id,
    name: row.nome,
    city: row.cidade ?? "",
    initial: (row.nome.trim()[0] ?? "?").toUpperCase(),
    message: row.mensagem ?? "Apoie o Palpite Gol 💚",
    color: SUPPORTER_COLORS[hashString(row.id) % SUPPORTER_COLORS.length],
  };
}

/** Lê o flag jsonb da tabela app_settings (padrão: visível). */
export function parsePropagandaRodapeVisivel(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return Boolean(value);
}

async function readPropagandaRodapeVisivel() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "propaganda_rodape_visivel")
    .maybeSingle();

  if (error || !data) return true;
  return parsePropagandaRodapeVisivel(data.value);
}

function parseSettingString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") return String(value);
  return null;
}

/** Slot da unidade Display do AdSense no rodapé (app_settings ou api_settings). */
async function readFooterAdSenseSlot() {
  const supabase = getSupabaseAdmin();

  for (const table of ["app_settings", "api_settings"] as const) {
    const { data } = await supabase
      .from(table)
      .select("value")
      .eq("key", "adsense_footer_slot")
      .maybeSingle();

    const slot = parseSettingString(data?.value);
    if (slot) return slot;
  }

  return null;
}

export const getPublicApoiadoresData = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseAdmin();

  const [{ data: settingsData }, { data: apoiadoresData }, adsenseFooterSlot] = await Promise.all([
    supabase.from("app_settings").select("value").eq("key", "propaganda_rodape_visivel").maybeSingle(),
    supabase
      .from("apoiadores")
      .select("id, nome, cidade, mensagem")
      .eq("status", "ativo")
      .order("created_at", { ascending: false })
      .limit(50),
    readFooterAdSenseSlot(),
  ]);

  return {
    propagandaRodapeVisivel: parsePropagandaRodapeVisivel(settingsData?.value),
    adsenseFooterSlot,
    apoiadores: (apoiadoresData ?? []).map(mapApoiadorToSupporter),
  };
});

export const createApoio = createServerFn({ method: "POST" })
  .validator((data: unknown) => createApoioInput.parse(data))
  .handler(async ({ data }): Promise<{
    ok: true;
    apoioId: string;
    paymentId: string;
    status: string;
    qrCode: string | null;
    qrCodeBase64: string | null;
    ticketUrl: string | null;
    publicKey: string | null;
  }> => {
    const supabase = getSupabaseAdmin();
    const { data: inserted, error } = await supabase
      .from("apoiadores")
      .insert({
        nome: data.nome,
        cidade: data.cidade || null,
        mensagem: data.mensagem || null,
        valor: data.valor,
        status: "pendente",
      })
      .select("id")
      .single();

    if (error || !inserted?.id) {
      throw new Error(`Erro ao registrar apoio: ${error?.message ?? "sem id retornado"}`);
    }

    const appUrl =
      (typeof import.meta !== "undefined" ? import.meta.env?.VITE_APP_URL : undefined) ||
      process.env.VITE_APP_URL ||
      process.env.APP_URL ||
      "";
    const webhookUrl = appUrl.trim() ? `${appUrl.replace(/\/$/, "")}/api/mercadopago/webhook` : undefined;

    const pixOrder = await createMercadoPagoPixOrder({
      externalReference: inserted.id,
      description: `Apoio Palpite Gol · ${data.nome}`,
      amount: data.valor,
      payer: {
        email: "pagamento@palpitegol.com",
        firstName: data.nome.slice(0, 60),
        lastName: "Apoiador",
      },
      webhookUrl,
    });

    return {
      ok: true,
      apoioId: inserted.id,
      paymentId: pixOrder.paymentId,
      status: pixOrder.status,
      qrCode: pixOrder.qrCode,
      qrCodeBase64: pixOrder.qrCodeBase64,
      ticketUrl: pixOrder.ticketUrl,
      publicKey: getMercadoPagoPublicKey() || null,
    };
  });

export { readPropagandaRodapeVisivel };
