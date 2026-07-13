import { getSupabaseBrowser } from "@/lib/api/supabase-browser";
import { finalizeOAuthSession } from "@/lib/auth/ensure-auth-session";

const GIS_SCRIPT = "https://accounts.google.com/gsi/client";
let scriptPromise: Promise<void> | null = null;
let cachedClientId = "";

type GoogleCredentialResponse = {
  credential: string;
};

type GooglePromptNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (listener?: (notification: GooglePromptNotification) => void) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar Google Sign-In.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar Google Sign-In."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function resolveGoogleClientId(): Promise<string> {
  if (cachedClientId) return cachedClientId;

  const fromEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (fromEnv) {
    cachedClientId = fromEnv;
    return cachedClientId;
  }

  const { getPublicAuthConfig } = await import("@/lib/auth/auth-config.server");
  const config = await getPublicAuthConfig();
  cachedClientId = config.googleClientId?.trim() ?? "";
  return cachedClientId;
}

function removeGoogleOverlay(overlay: HTMLDivElement | null) {
  overlay?.remove();
}

function openGooglePopupButton(clientId: string, onCredential: (response: GoogleCredentialResponse) => void) {
  const overlay = document.createElement("div");
  overlay.className = "votti-google-signin-overlay";
  const host = document.createElement("div");
  overlay.appendChild(host);
  document.body.appendChild(overlay);

  window.google!.accounts.id.initialize({
    client_id: clientId,
    callback: (response: GoogleCredentialResponse) => {
      removeGoogleOverlay(overlay);
      onCredential(response);
    },
    ux_mode: "popup",
    auto_select: false,
    cancel_on_tap_outside: true,
    context: "signin",
    itp_support: true,
  });

  window.google!.accounts.id.renderButton(host, {
    theme: "filled_black",
    size: "large",
    width: 300,
    text: "continue_with",
    locale: "pt-BR",
    shape: "pill",
  });

  requestAnimationFrame(() => {
    host.querySelector<HTMLElement>('[role="button"]')?.click();
  });
}

/** Login Google em popup — não redireciona para localhost. */
export async function signInWithGoogleIdentity(): Promise<void> {
  const clientId = await resolveGoogleClientId();
  if (!clientId) {
    throw new Error(
      "Google não configurado no servidor. Adicione GOOGLE_CLIENT_ID (Web Client ID do Google Cloud) na Vercel.",
    );
  }

  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      fn();
    };

    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error("Login Google expirou. Toque de novo em Entrar com Google.")));
    }, 120_000);

    const handleCredential = async (response: GoogleCredentialResponse) => {
      try {
        const supabase = getSupabaseBrowser();
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
        });
        if (error) {
          finish(() => reject(error));
          return;
        }
        if (data.session) {
          await finalizeOAuthSession(data.session);
        }
        finish(() => resolve());
      } catch (err) {
        finish(() => reject(err));
      }
    };

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => void handleCredential(response),
      ux_mode: "popup",
      auto_select: false,
      cancel_on_tap_outside: true,
      context: "signin",
      itp_support: true,
    });

    window.google!.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        openGooglePopupButton(clientId, (response) => void handleCredential(response));
      }
    });
  });
}

export function isGoogleIdentityAvailable(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());
}
