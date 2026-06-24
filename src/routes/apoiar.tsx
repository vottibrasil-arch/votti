import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell, TopBar, PrimaryButton } from "@/components/ui-kit";
import { FormField } from "@/components/bolao/form-primitives";
import { createApoio, getApoioStatus } from "@/lib/api/apoiadores.server";
import { Heart, Camera, Check, Copy, Clock3, AlertCircle } from "lucide-react";

const DEFAULT_SUPPORT_VALUE = "2,00";
const MAX_MESSAGE_LENGTH = 18;
const STATUS_POLL_INTERVAL_MS = 5000;
const STATUS_POLL_MAX_ATTEMPTS = 24;

function parseSupportValue(raw: string) {
  const normalized = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const Route = createFileRoute("/apoiar")({
  head: () => ({ meta: [{ title: "Apoiar — Palpite Gol" }] }),
  component: Apoiar,
});

function Apoiar() {
  const createApoioFn = useServerFn(createApoio);
  const getApoioStatusFn = useServerFn(getApoioStatus);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [supportValueInput, setSupportValueInput] = useState(DEFAULT_SUPPORT_VALUE);
  const [sent, setSent] = useState(false);
  const [apoioId, setApoioId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pendente" | "ativo" | "inativo">("pendente");
  const [pollAttempts, setPollAttempts] = useState(0);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixQrBase64, setPixQrBase64] = useState<string | null>(null);
  const [pixTicketUrl, setPixTicketUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const supportValue = useMemo(() => parseSupportValue(supportValueInput), [supportValueInput]);
  const supportValueLabel = useMemo(
    () => (Number.isFinite(supportValue) ? `R$ ${formatMoney(supportValue)}` : "R$ --"),
    [supportValue],
  );

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Informe como você quer aparecer.");
      return;
    }
    if (!Number.isFinite(supportValue) || supportValue < 1 || supportValue > 9999) {
      setError("Informe um valor de apoio válido entre R$ 1,00 e R$ 9.999,00.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await createApoioFn({
        data: {
          nome: name.trim(),
          cidade: city.trim() || undefined,
          mensagem: message.trim() || undefined,
          valor: supportValue,
        },
      });
      if (!result.qrCode && !result.ticketUrl) {
        throw new Error("Não foi possível gerar o Pix. Tente novamente.");
      }
      setApoioId(result.apoioId);
      setPaymentStatus("pendente");
      setPollAttempts(0);
      setPixCode(result.qrCode);
      setPixQrBase64(result.qrCodeBase64);
      setPixTicketUrl(result.ticketUrl);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar apoio.");
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Não foi possível copiar o código Pix.");
    }
  };

  useEffect(() => {
    if (!sent || !apoioId || paymentStatus !== "pendente") return;
    if (pollAttempts >= STATUS_POLL_MAX_ATTEMPTS) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const statusResult = await getApoioStatusFn({ data: { apoioId } });
          setPaymentStatus(statusResult.status);
          setPollAttempts((prev) => prev + 1);
        } catch {
          setPollAttempts((prev) => prev + 1);
        }
      })();
    }, STATUS_POLL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [sent, apoioId, paymentStatus, pollAttempts, getApoioStatusFn]);

  const statusUi = useMemo(() => {
    if (paymentStatus === "ativo") {
      return {
        icon: <Check className="size-4" />,
        text: "Pagamento confirmado! Seu apoio já está ativo no sistema.",
        className: "text-primary",
      };
    }

    if (paymentStatus === "inativo") {
      return {
        icon: <AlertCircle className="size-4" />,
        text: "Pagamento não confirmado. Gere um novo Pix para concluir.",
        className: "text-red-400",
      };
    }

    const timeoutReached = pollAttempts >= STATUS_POLL_MAX_ATTEMPTS;
    return {
      icon: <Clock3 className="size-4" />,
      text: timeoutReached
        ? "Aguardando confirmação do Pix. Se já pagou, aguarde alguns segundos e recarregue a tela."
        : "Aguardando confirmação do Pix...",
      className: "text-gold",
    };
  }, [paymentStatus, pollAttempts]);

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
        <FormField label="Valor do apoio (R$)">
          <input
            value={supportValueInput}
            onChange={(e) => setSupportValueInput(e.target.value)}
            placeholder="Ex: 2,00"
            inputMode="decimal"
            className="w-full bg-transparent outline-none font-semibold"
          />
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
          <div className="rounded-2xl bg-primary/15 border border-primary/40 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-primary/20 grid place-items-center text-primary shrink-0">
                <Check className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold">Pix gerado com sucesso 💚</div>
                <div className="text-sm text-muted-foreground">
                  Depois da confirmação, seu apoio será ativado automaticamente.
                </div>
              </div>
            </div>
            <div className={`rounded-xl border border-border/70 bg-background/40 p-2.5 text-xs flex items-center gap-2 ${statusUi.className}`}>
              {statusUi.icon}
              <span>{statusUi.text}</span>
            </div>
            {pixQrBase64 ? (
              <div className="rounded-xl border border-border/70 bg-background/40 p-3 flex justify-center">
                <img
                  src={`data:image/png;base64,${pixQrBase64}`}
                  alt="QR Code Pix"
                  className="size-44 rounded-lg"
                />
              </div>
            ) : null}
            {pixCode ? (
              <div className="rounded-xl border border-border/70 bg-background/40 p-3 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Copia e cola Pix
                </div>
                <p className="text-xs break-all text-foreground/90">{pixCode}</p>
                <button
                  type="button"
                  onClick={() => void copyPixCode()}
                  className="w-full h-10 rounded-xl border border-border/70 bg-surface/50 inline-flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <Copy className="size-4" />
                  {copied ? "Código copiado" : "Copiar código Pix"}
                </button>
              </div>
            ) : null}
            {pixTicketUrl ? (
              <a
                href={pixTicketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs text-primary underline"
              >
                Abrir cobrança no Mercado Pago
              </a>
            ) : null}
          </div>
        ) : (
          <PrimaryButton variant="gold" disabled={loading} onClick={() => void handleSubmit()}>
            {loading ? "Registrando..." : `❤️ Apoiar com ${supportValueLabel}`}
          </PrimaryButton>
        )}
        <p className="text-xs text-center text-muted-foreground mt-3">Pagamento via PIX.</p>
      </div>
    </Shell>
  );
}
