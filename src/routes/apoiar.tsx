import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell, TopBar, PrimaryButton } from "@/components/ui-kit";
import { FormField } from "@/components/bolao/form-primitives";
import { createApoio } from "@/lib/api/apoiadores.server";
import { Heart, Camera, Check } from "lucide-react";

const FIXED_SUPPORT_VALUE = 2;
const MAX_MESSAGE_LENGTH = 18;

export const Route = createFileRoute("/apoiar")({
  head: () => ({ meta: [{ title: "Apoiar — Palpite Gol" }] }),
  component: Apoiar,
});

function Apoiar() {
  const createApoioFn = useServerFn(createApoio);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Informe como você quer aparecer.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createApoioFn({
        data: {
          nome: name.trim(),
          cidade: city.trim() || undefined,
          mensagem: message.trim() || undefined,
          valor: FIXED_SUPPORT_VALUE,
        },
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar apoio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <TopBar title="Apoiar" back="/create" backSearch={{ aba: "bolao", passo: 1 }} />

      <div className="text-center animate-rise">
        <div className="inline-grid place-items-center size-16 rounded-2xl mb-3" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-glow-gold)" }}>
          <Heart className="size-7" style={{ color: "var(--gold-foreground)" }} fill="currentColor" />
        </div>
        <h1 className="font-display text-3xl font-bold">Apoie o Palpite Gol</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Seu nome, cidade e mensagem aparecem no rodapé durante os jogos.
        </p>
      </div>

      <div className="mt-6 rounded-2xl glass overflow-hidden grid grid-cols-[38%_62%] animate-rise">
        <div className="flex items-center gap-2 p-2.5 border-r border-border/70">
          <div className="size-10 rounded-xl grid place-items-center font-display text-sm font-bold" style={{ background: "var(--gradient-green)", color: "var(--primary-foreground)" }}>
            {initial}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[11px] truncate">{name || "Seu nome"}</div>
            <div className="text-[9px] text-muted-foreground truncate">{city || "Sua cidade"}</div>
          </div>
        </div>
        <div className="flex flex-col justify-center px-3 py-2.5 text-center" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--gold) 22%, var(--surface)), color-mix(in oklab, var(--primary) 18%, var(--surface)))" }}>
          <div className="text-[9px] uppercase tracking-[0.18em] text-gold font-bold">Mensagem</div>
          <div className="mt-1 text-sm font-semibold leading-snug line-clamp-2">{message || "Boa sorte a todos."}</div>
        </div>
      </div>

      <div className="mt-6 space-y-3 animate-rise">
        <FormField label="Nome">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como você quer aparecer" className="w-full bg-transparent outline-none font-semibold" />
        </FormField>
        <FormField label="Cidade">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: São Paulo · SP" className="w-full bg-transparent outline-none font-semibold" />
        </FormField>
        <FormField label={`Mensagem · ${message.length}/${MAX_MESSAGE_LENGTH}`}>
          <input value={message} onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))} maxLength={MAX_MESSAGE_LENGTH} placeholder="Boa sorte a todos." className="w-full bg-transparent outline-none font-semibold" />
        </FormField>
        <button type="button" className="w-full glass rounded-2xl p-3.5 flex items-center gap-3 text-left">
          <div className="size-10 rounded-xl bg-surface-2 grid place-items-center text-gold shrink-0">
            <Camera className="size-4" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Foto (opcional)</div>
            <div className="text-sm font-semibold">Tocar para enviar</div>
          </div>
        </button>
      </div>

      <div className="mt-8">
        {error && (
          <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {sent ? (
          <div className="rounded-2xl bg-primary/15 border border-primary/40 p-4 flex items-center gap-3">
            <div className="size-9 rounded-full bg-primary/20 grid place-items-center text-primary shrink-0">
              <Check className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold">Obrigado! 💚</div>
              <div className="text-sm text-muted-foreground">Você entrou na fila dos apoiadores ativos.</div>
            </div>
          </div>
        ) : (
          <PrimaryButton variant="gold" disabled={loading} onClick={() => void handleSubmit()}>
            {loading ? "Registrando..." : "❤️ Apoiar com R$ 2,00"}
          </PrimaryButton>
        )}
        <p className="text-xs text-center text-muted-foreground mt-3">Pagamento via PIX.</p>
      </div>
    </Shell>
  );
}
