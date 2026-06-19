import { MatchHeader } from "@/components/bolao/match-header";
import { ParticipantRow } from "@/components/bolao/participant-row";
import { ScrollableListPanel } from "@/components/bolao/scrollable-list-panel";
import { PrizeBanner } from "@/components/bolao/prize-banner";
import { loadGuestPick, type GuestPickSession } from "@/lib/bolao/guest-session";
import {
  bolaoFeePercent,
  calcPrizeShare,
  formatMoney,
  formatScore,
  getParticipantStatus,
  rankParticipants,
  resolvePrizeLeaders,
} from "@/lib/bolao";
import type { Bolao, Score } from "@/lib/bolao/types";
import { Crown, Frown } from "lucide-react";
import { useEffect, useState } from "react";



function isLeaderParticipant(

  participant: { name: string; guess: Score },

  leaders: Array<{ name: string; guess: Score }>,

) {

  return leaders.some(

    (leader) =>

      leader.name === participant.name &&

      leader.guess[0] === participant.guess[0] &&

      leader.guess[1] === participant.guess[1],

  );

}



export function GuestRankingScreen({

  slug,

  bolao,

  liveScore,

}: {

  slug: string;

  bolao: Bolao;

  liveScore?: Score;

}) {

  const isEnded = bolao.status === "encerrado";

  const score = isEnded ? bolao.liveScore : (liveScore ?? bolao.liveScore);

  const [guestSession, setGuestSession] = useState<GuestPickSession | null>(null);

  useEffect(() => {
    setGuestSession(loadGuestPick(slug));
  }, [slug]);

  const participants = guestSession

    ? bolao.participants.map((p) =>

        p.name.toLowerCase() === guestSession.nome.toLowerCase() ? { ...p, isYou: true } : p,

      )

    : bolao.participants;



  const feePercent = bolaoFeePercent(bolao.settings);

  const leaders = resolvePrizeLeaders(participants, score, bolao.settings.exclusiveScore, isEnded);

  const { totalPrize, perWinner } = calcPrizeShare(

    bolao.participants.length,

    bolao.stake,

    feePercent,

    leaders.length,

  );

  const ranking = rankParticipants(participants, score);

  const winner = leaders[0];

  const you = ranking.find((p) => p.isYou);

  const yourStatus = you ? getParticipantStatus(you, leaders, { isEnded }) : null;

  const hasParticipants = participants.length > 0;

  const allEliminated = hasParticipants && leaders.length === 0;



  return (

    <div className="space-y-5 animate-rise">

      <div className="rounded-3xl glass p-5 relative overflow-hidden">

        <div className="absolute inset-0 opacity-60 demo-pitch-bg" style={{ background: "var(--gradient-pitch)" }} />

        <MatchHeader match={bolao.match} score={score} live={bolao.isStarted && !isEnded} ended={isEnded} minute={bolao.minute} />

      </div>



      {bolao.settings.showWinningNow && totalPrize > 0 && leaders.length > 0 && (

        <PrizeBanner prize={totalPrize} delta={0} />

      )}



      {winner && bolao.settings.showWinningNow && (

        <div className="rounded-3xl p-5 overflow-hidden demo-card-gold">

          <div className="flex items-center gap-1.5">

            <Crown className="size-4 text-gold" />

            <span className="text-[10px] uppercase tracking-[0.18em] text-gold font-bold">

              {isEnded

                ? leaders.length > 1

                  ? "Vencedores do bolão"

                  : "Vencedor do bolão"

                : leaders.length > 1

                  ? "Dividindo a liderança agora"

                  : "Cravou o placar agora"}

            </span>

          </div>

          <div className="mt-3 flex items-center gap-3">

            <div

              className="size-14 rounded-2xl grid place-items-center font-display font-bold text-xl shrink-0"

              style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}

            >

              {winner.avatar}

            </div>

            <div className="min-w-0 flex-1">

              <div className="font-display text-xl font-bold truncate">

                {leaders.length > 1 ? leaders.map((p) => p.name).join(", ") : winner.name}

              </div>

              <div className="text-sm text-muted-foreground">

                Palpite {formatScore(winner.guess)}

                {isEnded && " · placar cravado"}

              </div>

            </div>

            <div className="font-display font-bold text-gradient-gold shrink-0 text-right">

              <div>{formatMoney(leaders.length > 1 ? perWinner : totalPrize)}</div>

              {leaders.length > 1 && <div className="text-[10px] text-muted-foreground font-normal">cada</div>}

            </div>

          </div>

        </div>

      )}



      {allEliminated && (

        <div className="glass rounded-3xl p-5 text-center border border-border/70">

          <div className="mx-auto size-16 rounded-full bg-surface-2 grid place-items-center mb-3">

            <Frown className="size-9 text-muted-foreground" />

          </div>

          <div className="font-display font-bold text-lg">

            {isEnded ? "Ninguém cravou" : "Aguardando placar exato"}

          </div>

          <p className="text-sm text-muted-foreground mt-1">

            {isEnded

              ? "Ninguém cravou o placar final."

              : "Ninguém cravou o placar atual. Só quem acertar o resultado exato leva o prêmio."}

          </p>

        </div>

      )}



      {yourStatus && you && (

        <div className="rounded-2xl p-4" style={{ background: yourStatus.bg, border: `1px solid ${yourStatus.border}` }}>

          <div className="flex items-center justify-between gap-3">

            <div className="font-display font-bold" style={{ color: yourStatus.color }}>

              {yourStatus.emoji} {yourStatus.label}

            </div>

            <div className="font-display font-bold tabular-nums">{formatScore(you.guess)}</div>

          </div>

        </div>

      )}



      <section>

        <h2 className="font-display font-semibold text-sm mb-2">Ranking</h2>

        {ranking.length === 0 ? (

          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">

            Nenhum participante aprovado ainda.

          </div>

        ) : (
          <ScrollableListPanel>
            {ranking.map((p, i) => (
              <ParticipantRow
                key={`${p.name}-${i}`}
                participant={p}
                isLeader={isLeaderParticipant(p, leaders)}
              />
            ))}
          </ScrollableListPanel>
        )}

      </section>

    </div>

  );

}

