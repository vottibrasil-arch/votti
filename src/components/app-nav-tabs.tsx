import { Link } from "@tanstack/react-router";
import { Plus, Sparkles, Trophy, User } from "lucide-react";

export type AppTab = "criar" | "bolao" | "meus";
export type CreateAba = AppTab | "campeonato";

const TABS: { id: AppTab; label: string; icon: typeof Trophy; highlight?: boolean }[] = [
  { id: "criar", label: "Campeonato", icon: Plus },
  { id: "bolao", label: "Oficial", icon: Trophy },
  { id: "meus", label: "Meus", icon: User, highlight: true },
];

export function AppNavTabs({ active }: { active: AppTab }) {
  return (
    <nav className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl glass mb-5">
      {TABS.map(({ id, label, icon: Icon, highlight }) => {
        const selected = active === id;
        const isMeus = id === "meus";

        return (
          <Link
            key={id}
            to="/create"
            search={
              id === "criar"
                ? { aba: id, etapa: 1 }
                : id === "bolao"
                  ? { aba: id, passo: 1 }
                  : { aba: id }
            }
            className={`relative rounded-xl py-2.5 px-2 text-center transition flex flex-col items-center gap-1 ${
              selected && isMeus
                ? "bg-gradient-to-br from-gold/90 to-primary text-primary-foreground shadow-[0_4px_20px_-4px_rgba(212,175,55,0.5)] ring-2 ring-gold/60"
                : selected
                  ? "bg-primary text-primary-foreground"
                  : isMeus && highlight
                    ? "text-gold border border-gold/30 bg-gold/5 hover:bg-gold/10"
                    : id === "bolao" && !selected
                      ? "text-gold/90 border border-gold/20 hover:bg-gold/5"
                      : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isMeus && !selected && (
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-gold animate-pulse" />
            )}
            <Icon className={`size-4 shrink-0 ${isMeus && !selected ? "text-gold" : ""}`} />
            <span className="text-[10px] font-semibold leading-tight">{label}</span>
            {isMeus && selected && (
              <span className="flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider opacity-90">
                <Sparkles className="size-2.5" /> Seus
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
