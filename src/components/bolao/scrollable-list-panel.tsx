import type { ReactNode, RefObject } from "react";

export const PARTICIPANT_LIST_SCROLL_CLASS = "participant-list-scroll";
export const PARTICIPANT_LIST_SCROLL_WRAP_CLASS = "participant-list-scroll-wrap";

type Props = {
  children: ReactNode;
  scrollContainerRef?: RefObject<HTMLUListElement | null>;
  wrapRef?: RefObject<HTMLDivElement | null>;
};

export function ScrollableListPanel({ children, scrollContainerRef, wrapRef }: Props) {
  return (
    <div ref={wrapRef} className={PARTICIPANT_LIST_SCROLL_WRAP_CLASS}>
      <ul ref={scrollContainerRef} className={`space-y-2 ${PARTICIPANT_LIST_SCROLL_CLASS}`}>
        {children}
      </ul>
    </div>
  );
}
