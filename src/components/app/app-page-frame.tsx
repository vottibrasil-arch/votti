import type { ReactNode } from "react";
import { AppHeader } from "@/components/app/app-header";

type AppPageFrameProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Cabeçalho em largura total; conteúdo centralizado abaixo. */
export function AppPageFrame({ children, className = "", contentClassName = "" }: AppPageFrameProps) {
  return (
    <div className={`votti-app-page flex-1 flex flex-col ${className}`.trim()}>
      <div className="votti-app-page__top">
        <div className="votti-app-page__top-inner">
          <AppHeader />
        </div>
      </div>
      <div className={`votti-app-page__body px-5 pb-10 ${contentClassName}`.trim()}>
        {children}
      </div>
    </div>
  );
}
