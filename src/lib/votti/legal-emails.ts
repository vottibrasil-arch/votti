import { VOTTI_INSTITUTIONAL_URL } from "@/lib/votti/brand";

function resolveEmailDomain(): string {
  const fromEnv =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_VOTTI_EMAIL_DOMAIN?.trim();
  if (fromEnv) return fromEnv.replace(/^@/, "");

  try {
    const host = new URL(VOTTI_INSTITUTIONAL_URL).hostname;
    if (host && !host.includes("localhost") && !host.includes("vercel.app")) {
      return host;
    }
  } catch {
    /* fallback */
  }

  return "votti.com.br";
}

const EMAIL_DOMAIN = resolveEmailDomain();

export const VOTTI_CONTACT_EMAIL = `contato@${EMAIL_DOMAIN}`;
export const VOTTI_REPORT_EMAIL = `denuncias@${EMAIL_DOMAIN}`;
