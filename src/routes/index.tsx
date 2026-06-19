import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Zap, SlidersHorizontal, Wallet, Trophy, Share2, Target, Smartphone, Users, ShieldCheck,
  BarChart3, Play, ArrowRight,
} from "lucide-react";
import { Benefit, Perk, Step } from "@/components/landing/sections";
import { PhonePreview } from "@/components/landing/phone-preview";
import { Logo } from "@/components/logo";
import { FreeHighlight } from "@/components/free-highlight";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Palpite Gol — o bolão ao vivo do seu jeito" },
      { name: "description", content: "Descubra em tempo real quem leva o prêmio se o jogo acabar agora. Crie seu bolão da Copa em segundos." },
      { property: "og:title", content: "Palpite Gol" },
      { property: "og:description", content: "O bolão ao vivo do seu jeito. Veja quem leva o prêmio agora." },
      { property: "og:url", content: "/" },
    ],
    links: [
      { rel: "canonical", href: "/" },
      { rel: "icon", href: "/logo-full.png", type: "image/png" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen relative overflow-x-hidden bg-background">
      <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none overflow-hidden hidden sm:block">
        <div className="absolute inset-x-0 top-0 h-[70vh]" style={{ background: "radial-gradient(ellipse 70% 60% at 50% -5%, color-mix(in oklab, var(--primary) 20%, transparent), transparent 65%)" }} />
        <div
          className="absolute inset-x-0 bottom-0 h-[50vh]"
          style={{ background: "radial-gradient(ellipse 50% 40% at 80% 100%, color-mix(in oklab, var(--gold) 8%, transparent), transparent)" }}
        />
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 py-6 sm:py-8 lg:py-12 overflow-x-hidden">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 mb-6 sm:mb-10 lg:mb-12">
          <Logo to="/" size="xs" className="shrink-0 min-w-0 max-w-[52%]" />
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-muted-foreground">
            <a href="#como-funciona" className="hover:text-foreground transition">Como funciona</a>
            <Link to="/demonstracao" search={{ passo: 1 }} className="hover:text-foreground transition">Demonstração</Link>
            <Link
              to="/login"
              search={{ redirect: "/create", mode: "signup" }}
              className="hover:text-foreground transition text-primary"
            >
              Cadastro
            </Link>
          </nav>
          <Link
            to="/login"
            search={{ redirect: "/create" }}
            className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-5 rounded-full font-display font-semibold text-xs sm:text-sm shrink-0"
            style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
          >
            <span className="hidden sm:inline">Criar bolão</span>
            <span className="sm:hidden">Criar</span>
            <ArrowRight className="size-3.5 sm:size-4" />
          </Link>
        </header>

        {/* Hero */}
        <section className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-14 items-center mb-12 sm:mb-16 lg:mb-20">
          <div className="text-center lg:text-left animate-rise flex flex-col">
            <div className="hidden lg:flex justify-center lg:justify-start">
              <Logo size="lg" />
            </div>

            <div className="mt-0 lg:mt-5 max-w-md mx-auto lg:mx-0 w-full">
              <FreeHighlight />
            </div>

            <p className="mt-4 sm:mt-5 text-[15px] sm:text-lg text-foreground/85 leading-relaxed max-w-md mx-auto lg:mx-0">
              Descubra <span className="text-foreground font-semibold">quem leva o prêmio agora</span> — em tempo real, a cada gol.
            </p>

            <div className="mt-4 sm:mt-6 flex flex-wrap justify-center lg:justify-start gap-1.5 sm:gap-2">
              <span className="chip text-[11px] sm:text-xs">Participantes ilimitados</span>
              <span className="chip text-[11px] sm:text-xs text-gold border-gold/40">Prêmio personalizado</span>
              <span className="chip text-[11px] sm:text-xs text-[var(--live)] border-[color-mix(in_oklab,var(--live)_45%,transparent)]">
                Escolha seu campeonato
              </span>
            </div>
            <p className="mt-2.5 sm:mt-3 text-xs text-foreground/70 leading-relaxed max-w-md mx-auto lg:mx-0">
              Copa · Brasileirão · Libertadores · personalizados · entre amigos
            </p>

            <div className="mt-5 sm:hidden max-w-md mx-auto lg:mx-0 w-full">
              <Link
                to="/login"
                search={{ redirect: "/create" }}
                className="w-full h-12 rounded-2xl font-display font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition text-sm"
                style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
              >
                <Trophy className="size-4" /> Criar meu bolão
              </Link>
            </div>

            <ul className="mt-6 sm:mt-8 space-y-3 max-w-md mx-auto lg:mx-0">
              <Perk icon={<Zap className="size-5" />} title="Resultados em tempo real" sub="Placares e ranking atualizados automaticamente." />
              <Perk icon={<SlidersHorizontal className="size-5" />} title="Modo de palpites flexível" sub="Escolha entre placar exclusivo ou placares repetidos." />
              <Perk icon={<Wallet className="size-5" />} title="Prêmio ao vivo" sub="Acompanhe o valor acumulado e quem está levando o prêmio neste momento." />
              <Perk icon={<Trophy className="size-5" />} title="Campeonatos personalizados" sub="Crie seus próprios times, campeonatos e placares." />
              <Perk icon={<Share2 className="size-5" />} title="Compartilhamento instantâneo" sub="Convide participantes através de um link do WhatsApp." />
            </ul>

            <div className="mt-6 sm:mt-8 max-w-md mx-auto lg:mx-0 w-full hidden sm:block">
              <Link
                to="/login"
                search={{ redirect: "/create" }}
                className="w-full h-14 rounded-2xl font-display font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition sm:[box-shadow:var(--shadow-glow-gold)]"
                style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
              >
                <Trophy className="size-5" /> Criar meu bolão
              </Link>
            </div>
          </div>

          <div className="w-full max-w-[280px] sm:max-w-[300px] mx-auto lg:mx-0 lg:ml-auto overflow-hidden">
            <PhonePreview />
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="rounded-3xl glass p-6 sm:p-8 mb-10 animate-rise">
          <h2 className="font-display font-bold text-center text-lg tracking-wide mb-8">Como funciona</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <Step n={1} icon={<Smartphone className="size-6" />} title="Crie o bolão" desc="Escolha o jogo e o valor da entrada." />
            <Step n={2} icon={<Users className="size-6" />} title="Compartilhe" desc="Envie o link para seus amigos." />
            <Step n={3} icon={<ShieldCheck className="size-6" />} title="Aprove apostas" desc="Confirme quem entrou no bolão." />
            <Step n={4} icon={<BarChart3 className="size-6" />} title="Acompanhe ao vivo" desc="Veja quem ganha a cada minuto." last />
          </div>
        </section>

        {/* Benefícios */}
        <section className="rounded-3xl border border-border bg-surface/30 p-6 sm:p-8 mb-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Benefit icon={<Zap className="size-5" />} title="Conectado" desc="Dados dos jogos em tempo real" />
            <Benefit icon={<ShieldCheck className="size-5" />} title="Fair play" desc="Placar exclusivo, mais justo" />
            <Benefit icon={<Target className="size-5" />} title="Simples" desc="Crie e compartilhe em segundos" />
            <Benefit icon={<Users className="size-5" />} title="Para todos" desc="Amigos, família ou trabalho" />
          </div>
        </section>

        {/* CTA final */}
        <section className="text-center rounded-2xl sm:rounded-3xl p-5 sm:p-8 bg-surface border border-border">
          <Logo size="sm" className="mx-auto" />
          <div className="mt-3 sm:mt-4 flex justify-center">
            <FreeHighlight variant="pill" />
          </div>
          <p className="mt-3 sm:mt-4 text-sm font-medium text-foreground/90 max-w-xs sm:max-w-sm mx-auto leading-relaxed">
            Próximo jogo da Copa? Monte seu bolão agora e convide a galera.
          </p>
          <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row justify-center gap-3 w-full max-w-xs sm:max-w-sm mx-auto">
            <Link
              to="/login"
              search={{ redirect: "/create" }}
              className="h-12 px-6 rounded-2xl font-display font-bold inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
            >
              Começar agora
            </Link>
            <Link
              to="/demonstracao"
              search={{ passo: 1 }}
              className="h-12 px-6 rounded-2xl font-display font-semibold inline-flex items-center justify-center gap-2 border border-primary/50 text-primary w-full sm:w-auto"
            >
              <Play className="size-4 fill-current" /> Demonstração
            </Link>
          </div>
        </section>

        <footer className="mt-10 sm:mt-12 px-2 text-center text-xs text-foreground/65 leading-relaxed pb-8 break-words text-pretty">
          © {new Date().getFullYear()} Palpite Gol · Feito para a galera que ama viver cada lance.
        </footer>
      </div>
    </main>
  );
}
