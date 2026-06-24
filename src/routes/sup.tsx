import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/sup")({
  component: () => (
    <Navigate
      to="/login"
      search={{ redirect: "/super-admin", mode: "login" }}
      replace
    />
  ),
});
