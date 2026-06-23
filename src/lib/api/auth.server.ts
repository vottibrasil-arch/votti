import type { User } from "@supabase/supabase-js";
import { getSupabaseEnvStatus } from "../supabase-env";

type AccessTokenPayload = {
  sub?: string;
  email?: string;
  role?: string;
  aud?: string | string[];
  exp?: number;
};

function decodeBase64Url(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? padded : padded + "=".repeat(4 - (padded.length % 4));

  if (typeof Buffer !== "undefined") {
    return Buffer.from(pad, "base64").toString("utf8");
  }

  return decodeURIComponent(
    atob(pad)
      .split("")
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join(""),
  );
}

function decodeAccessTokenPayload(accessToken: string): AccessTokenPayload {
  const token = accessToken.trim();
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Token inválido");
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1]!)) as AccessTokenPayload;
  } catch {
    throw new Error("Token inválido");
  }
}

function isTokenExpired(payload: AccessTokenPayload) {
  if (!payload.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

function userFromAccessTokenPayload(payload: AccessTokenPayload): User {
  return {
    id: payload.sub!,
    email: payload.email,
    aud: payload.aud ?? "authenticated",
    role: payload.role ?? "authenticated",
    created_at: "",
    app_metadata: {},
    user_metadata: {},
  } as User;
}

export async function getUserFromAccessToken(accessToken: string) {
  const env = getSupabaseEnvStatus();
  if (!env.ok) {
    throw new Error(`Supabase não configurado. Faltando: ${env.missing.join(", ")}`);
  }

  const token = accessToken.trim();
  if (!token) {
    throw new Error("Sessão inválida ou expirada: token ausente");
  }

  let payload: AccessTokenPayload;
  try {
    payload = decodeAccessTokenPayload(token);
  } catch {
    throw new Error("Sessão inválida ou expirada: token malformado");
  }

  if (!payload.sub) {
    throw new Error("Sessão inválida ou expirada: usuário não encontrado");
  }

  if (isTokenExpired(payload)) {
    throw new Error("Sessão inválida ou expirada: token expirado");
  }

  return userFromAccessTokenPayload(payload);
}
