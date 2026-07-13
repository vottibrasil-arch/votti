import { createServerFn } from "@tanstack/react-start";

export type PublicAuthConfig = {
  googleClientId: string;
};

/** Config pública de auth (Client ID do Google é seguro expor). */
export const getPublicAuthConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicAuthConfig> => {
    const googleClientId =
      process.env.GOOGLE_CLIENT_ID?.trim() ||
      process.env.VITE_GOOGLE_CLIENT_ID?.trim() ||
      "";

    return { googleClientId };
  },
);
