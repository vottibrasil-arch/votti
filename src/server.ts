import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { injectAdSenseVerification } from "./lib/adsense";
import { injectMonetagVerification } from "./lib/monetag";
import { handleRankingApi } from "./lib/votti/ranking/api.server";

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

async function injectAdSenseIntoHtmlResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  const nextHtml = injectMonetagVerification(injectAdSenseVerification(html));

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
    try {
      const apiResponse = await handleRankingApi(request);
      if (apiResponse) {
        return applyDevicePermissionsPolicy(apiResponse);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      const withAdSense = await injectAdSenseIntoHtmlResponse(normalized);
      return applyDevicePermissionsPolicy(withAdSense);
    } catch (error) {
      console.error(error);
      const errorResponse = new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      return applyDevicePermissionsPolicy(errorResponse);
    }
  },
};
