import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/meus-boloes")({
  component: () => <Navigate to="/create" search={{ aba: "meus" }} />,
});
