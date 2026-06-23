import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { injectAdSenseVerification } from "./lib/adsense";
import { processMercadoPagoWebhook } from "./lib/api/mercadopago.server";

const DEBUG_LOG_ENDPOINT = "http://127.0.0.1:7866/ingest/4638851f-adea-4848-b7b7-754b8f808572";
const DEBUG_SESSION_ID = "789d0f";
const DEVICE_APIS_PERMISSION_POLICY = [
  "bluetooth=()",
  "camera=()",
  "display-capture=()",
  "geolocation=()",
  "hid=()",
  "identity-credentials-get=()",
  "microphone=()",
  "nfc=()",
  "otp-credentials=()",
  "publickey-credentials-get=()",
  "serial=()",
  "usb=()",
].join(", ");

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function sendDebugLog(payload: {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
}) {
  // #region agent log
  fetch(DEBUG_LOG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: payload.runId,
      hypothesisId: payload.hypothesisId,
      location: payload.location,
      message: payload.message,
      data: payload.data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function injectAdSenseIntoHtmlResponse(response: Response, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    // #region agent log
    sendDebugLog({
      runId: "initial",
      hypothesisId: "H2",
      location: "src/server.ts:73",
      message: "AdSense injection skipped due to non-HTML response",
      data: { path: url.pathname, status: response.status, contentType },
    });
    // #endregion
    return response;
  }

  const html = await response.text();
  const nextHtml = injectAdSenseVerification(html);
  const headEnd = nextHtml.indexOf("</head>");
  const headHtml = headEnd >= 0 ? nextHtml.slice(0, headEnd) : "";
  const hadMetaBefore = html.includes("google-adsense-account");
  const hadScriptBefore = html.includes("adsbygoogle.js?client=ca-pub-1870651771757279");
  const hasMetaAfter = nextHtml.includes("google-adsense-account");
  const hasScriptAfter = nextHtml.includes("adsbygoogle.js?client=ca-pub-1870651771757279");
  const scriptInHead = headHtml.includes("adsbygoogle.js?client=ca-pub-1870651771757279");

  // #region agent log
  sendDebugLog({
    runId: "initial",
    hypothesisId: "H3",
    location: "src/server.ts:93",
    message: "AdSense verification injection result",
    data: {
      path: url.pathname,
      hadMetaBefore,
      hadScriptBefore,
      hasMetaAfter,
      hasScriptAfter,
      scriptInHead,
      hasHeadTag: headEnd >= 0,
    },
  });
  // #endregion

  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(nextHtml, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function applyDevicePermissionsPolicy(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Permission-Policy", DEVICE_APIS_PERMISSION_POLICY);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (url.pathname === "/api/mercadopago/webhook") {
      try {
        const rawBody = await request.text();
        const result = await processMercadoPagoWebhook({
          url,
          headers: request.headers,
          rawBody,
        });
        if (!result.ok && result.reason === "invalid_signature") {
          return new Response("invalid signature", { status: 401 });
        }
        return new Response("ok", { status: 200 });
      } catch (error) {
        console.error("[mercadopago webhook] erro:", error);
        return new Response("error", { status: 500 });
      }
    }

    const userAgent = request.headers.get("user-agent") ?? "";
    const accept = request.headers.get("accept") ?? "";

    // #region agent log
    sendDebugLog({
      runId: "initial",
      hypothesisId: "H1",
      location: "src/server.ts:122",
      message: "Incoming SSR request",
      data: {
        path: url.pathname,
        method: request.method,
        isGoogleCrawler:
          userAgent.includes("Mediapartners-Google") || userAgent.includes("AdsBot-Google"),
        acceptsHtml: accept.includes("text/html"),
      },
    });
    // #endregion

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);

      // #region agent log
      sendDebugLog({
        runId: "initial",
        hypothesisId: url.pathname === "/ads.txt" ? "H5" : "H4",
        location: "src/server.ts:142",
        message: "Raw handler response before AdSense injection",
        data: {
          path: url.pathname,
          status: response.status,
          contentType: response.headers.get("content-type") ?? "",
        },
      });
      // #endregion

      const normalized = await normalizeCatastrophicSsrResponse(response);
      const withAdSense = await injectAdSenseIntoHtmlResponse(normalized, request);
      return applyDevicePermissionsPolicy(withAdSense);
    } catch (error) {
      console.error(error);
      // #region agent log
      sendDebugLog({
        runId: "initial",
        hypothesisId: "H4",
        location: "src/server.ts:161",
        message: "SSR fetch failed before AdSense injection",
        data: { path: url.pathname, error: error instanceof Error ? error.message : String(error) },
      });
      // #endregion
      const errorResponse = new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      return applyDevicePermissionsPolicy(errorResponse);
    }
  },
};
