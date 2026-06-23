import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "./supabase.server";

const MERCADO_PAGO_API_BASE = "https://api.mercadopago.com";

function readEnv(name: string) {
  const fromImportMeta =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env[name] as string | undefined)
      : undefined;
  if (typeof fromImportMeta === "string" && fromImportMeta.trim().length > 0) {
    return fromImportMeta.trim();
  }

  const fromProcess =
    typeof process !== "undefined" && process.env
      ? (process.env[name] as string | undefined)
      : undefined;
  return typeof fromProcess === "string" ? fromProcess.trim() : "";
}

function getMercadoPagoAccessToken() {
  return readEnv("MERCADOPAGO_ACCESS_TOKEN");
}

export function getMercadoPagoPublicKey() {
  return readEnv("VITE_MERCADOPAGO_PUBLIC_KEY");
}

function getMercadoPagoWebhookSecret() {
  return readEnv("MERCADOPAGO_WEBHOOK_SECRET");
}

async function mpFetch<T>(path: string, init: RequestInit): Promise<T> {
  const accessToken = getMercadoPagoAccessToken();
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  }

  const response = await fetch(`${MERCADO_PAGO_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const message =
      typeof parsed === "object" &&
      parsed &&
      "message" in parsed &&
      typeof (parsed as { message?: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : `HTTP ${response.status}`;
    throw new Error(`Mercado Pago: ${message}`);
  }

  return parsed as T;
}

type MercadoPagoOrderPayment = {
  id?: string | number;
  status?: string;
  status_detail?: string;
};

type MercadoPagoOrderResponse = {
  id?: string | number;
  external_reference?: string;
  status?: string;
  transactions?: {
    payments?: MercadoPagoOrderPayment[];
  };
};

type MercadoPagoPaymentResponse = {
  id?: string | number;
  status?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

function normalizePixData(payment: MercadoPagoPaymentResponse) {
  const tx = payment.point_of_interaction?.transaction_data;
  return {
    qrCode: tx?.qr_code ?? null,
    qrCodeBase64: tx?.qr_code_base64 ?? null,
    ticketUrl: tx?.ticket_url ?? null,
  };
}

export async function createMercadoPagoPixOrder(params: {
  externalReference: string;
  description: string;
  amount: number;
  payer: {
    email: string;
    firstName: string;
    lastName: string;
  };
  webhookUrl?: string;
}) {
  const body: Record<string, unknown> = {
    type: "online",
    processing_mode: "automatic",
    external_reference: params.externalReference,
    total_amount: Number(params.amount.toFixed(2)),
    description: params.description,
    payer: {
      email: params.payer.email,
      first_name: params.payer.firstName,
      last_name: params.payer.lastName,
    },
    transactions: {
      payments: [
        {
          amount: Number(params.amount.toFixed(2)),
          payment_method: {
            id: "pix",
            type: "bank_transfer",
          },
        },
      ],
    },
  };

  if (params.webhookUrl) {
    body.notification_url = params.webhookUrl;
  }

  const order = await mpFetch<MercadoPagoOrderResponse>("/v1/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const payment = order.transactions?.payments?.[0];
  const paymentId = payment?.id ? String(payment.id) : null;

  if (!paymentId) {
    throw new Error("Mercado Pago não retornou ID de pagamento Pix.");
  }

  const paymentDetails = await mpFetch<MercadoPagoPaymentResponse>(`/v1/payments/${paymentId}`, {
    method: "GET",
  });

  const pixData = normalizePixData(paymentDetails);
  if (!pixData.qrCode && !pixData.ticketUrl) {
    throw new Error("Mercado Pago não retornou dados do QR Code Pix.");
  }

  return {
    orderId: order.id ? String(order.id) : null,
    paymentId,
    status: paymentDetails.status ?? payment?.status ?? order.status ?? "pending",
    ...pixData,
  };
}

export async function syncApoiadorStatusFromMercadoPagoPaymentId(paymentId: string) {
  const payment = await mpFetch<MercadoPagoPaymentResponse & { external_reference?: string }>(
    `/v1/payments/${paymentId}`,
    { method: "GET" },
  );
  const externalReference = payment.external_reference?.trim();
  if (!externalReference) return;

  const nextStatus = payment.status === "approved" ? "ativo" : "pendente";
  const supabase = getSupabaseAdmin();
  await supabase
    .from("apoiadores")
    .update({ status: nextStatus })
    .eq("id", externalReference)
    .eq("status", "pendente");
}

function parseSignatureHeader(signature: string) {
  const parts = signature.split(",").map((p) => p.trim());
  const map = new Map<string, string>();
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (!key || !value) continue;
    map.set(key, value);
  }
  return {
    ts: map.get("ts") ?? "",
    v1: map.get("v1") ?? "",
  };
}

function safeEqualHex(a: string, b: string) {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function validateWebhookSignature(params: {
  signatureHeader: string | null;
  requestIdHeader: string | null;
  dataId: string;
}) {
  const secret = getMercadoPagoWebhookSecret();
  if (!secret) return true;
  if (!params.signatureHeader || !params.requestIdHeader) return false;

  const { ts, v1 } = parseSignatureHeader(params.signatureHeader);
  if (!ts || !v1) return false;

  const manifest = `id:${params.dataId};request-id:${params.requestIdHeader};ts:${ts};`;
  const digest = createHmac("sha256", secret).update(manifest).digest("hex");
  return safeEqualHex(digest, v1);
}

export async function processMercadoPagoWebhook(params: {
  url: URL;
  headers: Headers;
  rawBody: string;
}) {
  let parsedBody: Record<string, unknown> = {};
  if (params.rawBody) {
    try {
      parsedBody = JSON.parse(params.rawBody) as Record<string, unknown>;
    } catch {
      parsedBody = {};
    }
  }
  const queryDataId = params.url.searchParams.get("data.id");
  const bodyDataId =
    typeof parsedBody.data === "object" &&
    parsedBody.data &&
    "id" in parsedBody.data &&
    parsedBody.data.id != null
      ? String(parsedBody.data.id)
      : null;
  const dataId = queryDataId || bodyDataId;
  if (!dataId) return { ok: true, ignored: true };

  const signatureHeader = params.headers.get("x-signature");
  const requestIdHeader = params.headers.get("x-request-id");
  const signatureOk = validateWebhookSignature({
    signatureHeader,
    requestIdHeader,
    dataId,
  });
  if (!signatureOk) {
    return { ok: false, ignored: true, reason: "invalid_signature" as const };
  }

  const topic =
    params.url.searchParams.get("topic") ||
    params.url.searchParams.get("type") ||
    (typeof parsedBody.type === "string" ? parsedBody.type : "");

  if (topic === "payment" || topic === "payments") {
    await syncApoiadorStatusFromMercadoPagoPaymentId(dataId);
    return { ok: true, ignored: false };
  }

  // fallback: alguns webhooks podem vir como order; tentamos localizar pagamento associado.
  const order = await mpFetch<MercadoPagoOrderResponse>(`/v1/orders/${dataId}`, { method: "GET" });
  const paymentId = order.transactions?.payments?.[0]?.id;
  if (paymentId) {
    await syncApoiadorStatusFromMercadoPagoPaymentId(String(paymentId));
  }
  return { ok: true, ignored: false };
}
