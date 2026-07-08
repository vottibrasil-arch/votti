import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { runSupabaseConnectionTest } from "./lib/api/supabase-test.server";

let supabaseTested = false;

const supabaseTestMiddleware = createMiddleware().server(async ({ next }) => {
  if (!supabaseTested) {
    supabaseTested = true;
    await runSupabaseConnectionTest();
  }
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next, request, handlerType }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("[VOTTI] Erro no servidor:", error);

    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Erro interno do servidor";

    if (handlerType === "serverFn" || request.headers.get("x-tsr-serverFn") === "true") {
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [supabaseTestMiddleware, errorMiddleware],
}));
