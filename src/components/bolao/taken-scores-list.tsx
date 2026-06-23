import { useEffect, useRef } from "react";

import type { ParticipantRequest } from "@/lib/bolao/types";

import {

  PARTICIPANT_LIST_SCROLL_CLASS,

  PARTICIPANT_LIST_SCROLL_WRAP_CLASS,

  ScrollableListPanel,

} from "@/components/bolao/scrollable-list-panel";



export { PARTICIPANT_LIST_SCROLL_CLASS, PARTICIPANT_LIST_SCROLL_WRAP_CLASS };



type Props = {

  requests: ParticipantRequest[];

  title?: string;

  emptyMessage?: string;

  showStatus?: boolean;

  /** Destaca na lista quem pegou o placar selecionado (modo exclusivo). */

  highlightGuess?: string;

  scrollable?: boolean;

};



const STATUS_LABEL: Record<ParticipantRequest["status"], string> = {

  pending: "Pendente",

  approved: "Aprovado",

  rejected: "Rejeitado",

};



export function TakenScoresList({

  requests,

  title = "Placares escolhidos",

  emptyMessage = "Nenhum placar escolhido ainda. Seja o primeiro!",

  showStatus = true,

  highlightGuess,

  scrollable = true,

}: Props) {

  const visible = requests.filter((r) => r.status !== "rejected");

  const sortedVisible = highlightGuess

    ? [...visible].sort((a, b) => {

        const aHit = a.guess === highlightGuess ? 0 : 1;

        const bHit = b.guess === highlightGuess ? 0 : 1;

        return aHit - bHit;

      })

    : visible;

  const scrollContainerRef = useRef<HTMLUListElement>(null);

  const wrapRef = useRef<HTMLDivElement>(null);



  useEffect(() => {

    if (!highlightGuess) return;



    const frame = requestAnimationFrame(() => {

      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });

      wrapRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    });



    return () => cancelAnimationFrame(frame);

  }, [highlightGuess]);



  const rows =

    sortedVisible.length === 0 ? (

      <li className="glass rounded-2xl p-4 text-center text-sm text-muted-foreground">{emptyMessage}</li>

    ) : (

      sortedVisible.map((r, i) => {

        const highlighted = Boolean(highlightGuess && r.guess === highlightGuess);

        return (

          <li

            key={`${r.name}-${r.guess}-${i}`}

            className={`rounded-2xl p-3 flex items-center gap-3 transition ${

              highlighted

                ? "border-2 border-destructive/50 bg-destructive/10 ring-2 ring-destructive/20"

                : "glass"

            }`}

          >

            <div

              className={`size-10 rounded-xl grid place-items-center font-display font-bold shrink-0 ${

                highlighted ? "bg-destructive/20 text-destructive" : "bg-surface-2"

              }`}

            >

              {r.name[0]?.toUpperCase() ?? "?"}

            </div>

            <div className="min-w-0 flex-1">

              <div className={`font-semibold truncate ${highlighted ? "text-destructive" : ""}`}>{r.name}</div>

              <div className="text-xs text-muted-foreground">

                Palpite:{" "}

                <span

                  className={`font-medium tabular-nums ${

                    highlighted ? "text-destructive font-semibold" : "text-foreground"

                  }`}

                >

                  {r.guess}

                </span>

              </div>

            </div>

            {showStatus && (

              <span className="chip shrink-0 text-[10px]">{STATUS_LABEL[r.status]}</span>

            )}

          </li>

        );

      })

    );



  return (

    <div>

      <div className="flex items-center justify-between mb-3">

        <h2 className="font-display font-semibold text-sm">{title}</h2>

        {visible.length > 0 && <span className="chip">{visible.length}</span>}

      </div>

      {scrollable && sortedVisible.length > 0 ? (

        <ScrollableListPanel scrollContainerRef={scrollContainerRef} wrapRef={wrapRef}>

          {rows}

        </ScrollableListPanel>

      ) : (

        <ul className="space-y-2">{rows}</ul>

      )}

    </div>

  );

}


