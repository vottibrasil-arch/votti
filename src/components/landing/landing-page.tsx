import { MessageCircle, Share2, Zap } from "lucide-react";
import { GamifiedBg } from "@/components/gamified/gamified-bg";
import { LiveVoteCounter } from "@/components/landing/live-activity";
import { LivePollCard } from "@/components/landing/live-poll-card";
import { LandingAuthLink } from "@/components/landing/landing-auth-link";
import { LandingFooter, LandingGuestHeader } from "@/components/landing/sections";
import { TrustStrip, SecurityBadge } from "@/components/landing/trust-strip";
import { AppHeader } from "@/components/app/app-header";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth/use-auth";
import { LANDING_DEMO_POLLS } from "@/lib/votti/landing-demo";

function LandingBody({ guest }: { guest: boolean }) {
  return (
    <>
      <section className={`votti-hero ${guest ? "votti-hero--guest" : ""}`}>
        <Logo size="hero" className="votti-hero__logo" />

        <h1 className="votti-hero__title">
          Vote uma vez.
          <br />
          <span className="votti-hero__title-accent">Acompanhe ao vivo.</span>
        </h1>

        <SecurityBadge />

        <div className={`votti-hero__actions ${guest ? "votti-hero__actions--solo" : ""}`}>
          <LandingAuthLink redirect="/criar" className="votti-mega-btn">
            CRIAR VOTAÇÃO
          </LandingAuthLink>
          {!guest ? (
            <LandingAuthLink redirect="/minhas" className="votti-outline-btn votti-hero__action-secondary">
              Minhas votações
            </LandingAuthLink>
          ) : null}
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
          {LANDING_DEMO_POLLS.map((poll, i) => (
            <LivePollCard
              key={poll.continent}
              continent={poll.continent}
              title={poll.title}
              options={poll.options}
              primaryColor={poll.primaryColor}
              tickOffset={poll.tickOffset}
              className={`animate-rise votti-live-card--${i + 1}`}
            />
          ))}
        </div>
      </section>

      <LandingFooter guest={guest} />
    </>
  );
}

export function LandingPage() {
  const { user, loading } = useAuth();
  const guest = loading || !user;

  return (
    <div className={`votti-landing ${guest ? "votti-landing--guest" : "votti-landing--auth"}`}>
      <GamifiedBg feed securityTags />

      <div className="votti-landing__inner">
        {guest ? <LandingGuestHeader /> : <AppHeader />}
        <LandingBody guest={guest} />
      </div>
    </div>
  );
}
