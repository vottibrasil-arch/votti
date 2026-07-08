import { MessageCircle, Share2, Zap } from "lucide-react";
import { GamifiedBg } from "@/components/gamified/gamified-bg";
import { LiveVoteCounter } from "@/components/landing/live-activity";
import { LivePollCard } from "@/components/landing/live-poll-card";
import { LandingAuthLink } from "@/components/landing/landing-auth-link";
import { LandingFooter, LandingHeader } from "@/components/landing/sections";
import { TrustStrip, SecurityBadge } from "@/components/landing/trust-strip";
import { Logo } from "@/components/logo";

const LIVE_POLLS = [
  {
    title: "Quem será Presidente?",
    initial: [
      { label: "Candidato A", pct: 42 },
      { label: "Candidato B", pct: 36 },
      { label: "Candidato C", pct: 22 },
    ],
    tickOffset: 0,
  },
  {
    title: "Melhor Restaurante",
    initial: [
      { label: "Opção 1", pct: 48 },
      { label: "Opção 2", pct: 35 },
      { label: "Opção 3", pct: 17 },
    ],
    tickOffset: 400,
  },
  {
    title: "Melhor Escola",
    initial: [
      { label: "Escola A", pct: 51 },
      { label: "Escola B", pct: 32 },
      { label: "Escola C", pct: 17 },
    ],
    tickOffset: 800,
  },
];

export function LandingPage() {
  return (
    <div className="votti-landing">
      <GamifiedBg feed securityTags />

      <div className="votti-landing__inner">
        <LandingHeader />

        <section className="votti-hero">
          <Logo size="hero" className="votti-hero__logo" />

          <h1 className="votti-hero__title">
            Vote uma vez.
            <br />
            <span className="votti-hero__title-accent">Acompanhe ao vivo.</span>
          </h1>

          <SecurityBadge />

          <div className="votti-hero__actions">
            <LandingAuthLink redirect="/criar" className="votti-mega-btn">
              CRIAR VOTAÇÃO
            </LandingAuthLink>
            <LandingAuthLink redirect="/minhas" className="votti-outline-btn votti-hero__action-secondary">
              Minhas votações
            </LandingAuthLink>
          </div>

          <a href="#passos" className="votti-hero__secondary">
            Saiba mais
          </a>
        </section>

        <section id="passos" className="votti-steps scroll-mt-24">
          <div className="votti-steps__row">
            <div className="votti-step-pill">
              <Zap className="size-6" />
              <span>Crie</span>
            </div>
            <div className="votti-step-arrow" aria-hidden />
            <div className="votti-step-pill">
              <Share2 className="size-6" />
              <span>Compartilhe</span>
            </div>
            <div className="votti-step-arrow" aria-hidden />
            <div className="votti-step-pill votti-step-pill--live">
              <MessageCircle className="size-6" />
              <span>Ao vivo</span>
            </div>
          </div>
        </section>

        <TrustStrip />

        <section id="beneficios" className="votti-perks scroll-mt-24">
          <div className="votti-perk-chips">
            <span>Sem cadastro</span>
            <span>WhatsApp</span>
            <span>1 minuto</span>
            <span>Realtime</span>
          </div>
        </section>

        <section className="votti-live">
          <LiveVoteCounter />

          <div className="votti-live__cards">
            {LIVE_POLLS.map((poll, i) => (
              <LivePollCard
                key={poll.title}
                title={poll.title}
                initial={poll.initial}
                tickOffset={poll.tickOffset}
                className={`animate-rise votti-live-card--${i + 1}`}
              />
            ))}
          </div>
        </section>

        <LandingFooter />
      </div>
    </div>
  );
}
