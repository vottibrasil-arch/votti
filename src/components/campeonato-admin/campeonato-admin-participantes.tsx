import { useState } from "react";
import { PrimaryButton } from "@/components/ui-kit";
import { formatMoney } from "@/lib/bolao";
import type { CampeonatoAdminData } from "@/lib/bolao/db-types";
import { Check, Copy, Share2, UserPlus, Wallet } from "lucide-react";

type Props = {
  slug: string;
  data: CampeonatoAdminData;
};

function formatEntryDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CampeonatoAdminParticipantes({ slug: _slug, data }: Props) {
  const [copied, setCopied] = useState(false);
  const temBolao = Boolean(data.bolao);
  const shareUrl = data.bolao?.shareUrl ?? "";

  const copyLink = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.campeonato.nome,
          text: `Entre no bolão ${data.campeonato.nome}!`,
          url: shareUrl,
        });
        return;
      } catch {
        /* fallback */
      }
    }
    copyLink();
  };

  if (!temBolao) {
    return (
      <div className="glass rounded-2xl p-6 text-center space-y-2">
        <UserPlus className="size-8 mx-auto text-muted-foreground opacity-60" />
        <p className="font-display font-semibold">Bolão ainda não ativado</p>
        <p className="text-sm text-muted-foreground">
          Ative o bolão no card acima para gerar o link de convite e receber participantes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Wallet className="size-3.5" /> Entrada
          </div>
          <div className="font-display text-xl font-bold mt-1">{formatMoney(data.bolao!.stake)}</div>
        </div>
        <div className="rounded-2xl p-4 demo-prize-banner">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gold">
            <UserPlus className="size-3.5" /> Inscritos
          </div>
          <div className="font-display text-xl font-bold mt-1">{data.participantes.length}</div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-gold/40 bg-gold/5 p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Share2 className="size-3" /> Link do bolão
        </div>
        <div className="text-sm font-medium break-all text-primary leading-snug">{shareUrl}</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex-1 h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground active:scale-[0.98] transition"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <button
            type="button"
            onClick={shareNative}
            className="flex-1 h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-gold/40 text-gold bg-gold/10 active:scale-[0.98] transition"
          >
            <Share2 className="size-4" /> Compartilhar
          </button>
        </div>
      </div>

      <PrimaryButton onClick={shareNative} variant="gold" className="h-12">
        <UserPlus className="size-5" /> Convidar participantes
      </PrimaryButton>

      <div>
        <h2 className="font-display font-semibold text-sm mb-3">
          Lista de participantes
        </h2>

        {data.participantes.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Nenhum participante ainda. Compartilhe o link para convidar a galera.
          </div>
        ) : (
          <ul className="space-y-2">
            {data.participantes.map((p) => (
              <li key={p.id} className="glass rounded-2xl p-3.5 flex items-center gap-3">
                <div
                  className="size-11 rounded-xl grid place-items-center font-display font-bold shrink-0 text-primary-foreground"
                  style={{ background: "var(--gradient-green)" }}
                >
                  {p.nome[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{p.nome}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.cidade ? `${p.cidade} · ` : ""}
                    Entrou em {formatEntryDate(p.created_at)}
                  </div>
                </div>
                <div className="text-right shrink-0 rounded-xl bg-surface-2/80 px-2.5 py-1.5">
                  <div className="font-display font-bold text-sm">{p.palpites_count}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">palpites</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
