import { createFileRoute, redirect } from "@tanstack/react-router";

/** Mantém links antigos — a home é `/`. */
export const Route = createFileRoute("/como-funciona")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
