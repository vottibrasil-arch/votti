import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { ADSENSE_CLIENT, ADSENSE_SCRIPT_SRC } from "../lib/adsense";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SupportersFooter } from "../components/supporters-footer";
import { DemoBolaoProvider } from "../lib/demo-bolao-store";

const DEBUG_LOG_ENDPOINT = "http://127.0.0.1:7866/ingest/4638851f-adea-4848-b7b7-754b8f808572";
const DEBUG_SESSION_ID = "789d0f";

function sendClientDebugLog(payload: {
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

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Tente atualizar ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0d1f17" },
      { name: "google-adsense-account", content: ADSENSE_CLIENT },
      { title: "Palpite Gol — o bolão em tempo real" },
      { name: "description", content: "Veja em tempo real quem leva o prêmio se o jogo acabar agora. Crie seu bolão da Copa em segundos." },
      { property: "og:title", content: "Palpite Gol — o bolão em tempo real" },
      { property: "og:description", content: "Veja em tempo real quem leva o prêmio se o jogo acabar agora. Crie seu bolão da Copa em segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Palpite Gol — o bolão em tempo real" },
      { name: "twitter:description", content: "Veja em tempo real quem leva o prêmio se o jogo acabar agora. Crie seu bolão da Copa em segundos." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a1ee5a78-0411-487e-b28c-e15e860dc61b/id-preview-3e7ba1dd--fb407d6f-7dee-4596-a959-b21487def0a3.lovable.app-1781525390683.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a1ee5a78-0411-487e-b28c-e15e860dc61b/id-preview-3e7ba1dd--fb407d6f-7dee-4596-a959-b21487def0a3.lovable.app-1781525390683.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/logo-full.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/logo-full.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://pagead2.googlesyndication.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <script async src={ADSENSE_SCRIPT_SRC} crossOrigin="anonymous" suppressHydrationWarning />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // #region agent log
    sendClientDebugLog({
      runId: "initial",
      hypothesisId: "H6",
      location: "src/routes/__root.tsx:159",
      message: "Client app mounted with AdSense head config",
      data: {
        path: window.location.pathname,
        hasAdSenseScriptTagInDom: Boolean(
          document.querySelector(
            'head script[src*="adsbygoogle.js?client=ca-pub-1870651771757279"]',
          ),
        ),
        hasAdSenseMetaInDom: Boolean(
          document.querySelector('head meta[name="google-adsense-account"]'),
        ),
      },
    });
    // #endregion
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DemoBolaoProvider>
        <Outlet />
        <SupportersFooter />
      </DemoBolaoProvider>
    </QueryClientProvider>
  );
}
