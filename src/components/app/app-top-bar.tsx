import { useRouter, type LinkProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

type AppPageBarProps = {
  title?: string;
  back?: LinkProps["to"];
};

/** Barra secundária de página — voltar e título, sem duplicar cabeçalho global. */
export function AppPageBar({ title, back }: AppPageBarProps) {
  const router = useRouter();

  if (!back && !title) return null;

  return (
    <div className={`votti-app-pagebar ${back ? "" : "votti-app-pagebar--solo"}`.trim()}>
      {back ? (
        <button
          type="button"
          onClick={() => router.navigate({ to: back })}
          className="votti-app-pagebar__back"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </button>
      ) : null}
      {title ? <h1 className="votti-app-pagebar__title">{title}</h1> : null}
    </div>
  );
}

/** @deprecated Use AppHeader + AppPageBar */
export const AppTopBar = AppPageBar;
