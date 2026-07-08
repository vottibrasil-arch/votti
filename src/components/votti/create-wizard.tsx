import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  HelpCircle,
  Loader2,
  Palette,
  Plus,
  Rocket,
  Settings2,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { PollImageField } from "@/components/votti/poll-image-field";
import { PollRankingPreview } from "@/components/votti/poll-ranking-preview";
import { SecurityBadge } from "@/components/votti/security-badge";
import { loadDraft, publishPoll, saveDraft, getPollErrorMessage } from "@/lib/votti/poll-store";
import { newId, validatePublishDraft, type PollDraft } from "@/lib/votti/poll-types";

const STEPS = [
  { label: "Informações", icon: Sparkles },
  { label: "Perguntas", icon: HelpCircle },
  { label: "Visual", icon: Palette },
  { label: "Configurações", icon: Settings2 },
  { label: "Publicar", icon: Rocket },
] as const;

type WizardProps = {
  onPublished: (slug: string) => void;
};

export function CreateWizard({ onPublished }: WizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PollDraft>(() => loadDraft());

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  function patch(partial: Partial<PollDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function addQuestion() {
    setDraft((d) => ({
      ...d,
      questions: [
        ...d.questions,
        {
          id: newId("q"),
          text: "",
          options: [
            { id: newId("o"), text: "", votes: 0 },
            { id: newId("o"), text: "", votes: 0 },
          ],
        },
      ],
    }));
  }

  const previewQuestion = draft.questions[0];
  const optionCount = draft.questions.reduce(
    (sum, q) => sum + q.options.filter((o) => o.text.trim()).length,
    0,
  );

  return (
    <div className="votti-wizard animate-rise">
      <div className="votti-wizard__hero">
        <SecurityBadge compact />
        <p className="votti-wizard__kicker">Criar votação</p>
      </div>

      <div className="votti-wizard__steps" aria-label="Progresso do assistente">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          const done = index < step;
          const active = index === step;
          return (
            <div
              key={item.label}
              className={`votti-wizard__step ${active ? "votti-wizard__step--active" : ""} ${done ? "votti-wizard__step--done" : ""}`}
            >
              <span className="votti-wizard__step-dot">
                {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
              </span>
              <span className="votti-wizard__step-label">{item.label}</span>
            </div>
          );
        })}
      </div>

      <div className="votti-wizard__progress">
        <span>
          Passo {step + 1} de {STEPS.length}
        </span>
        <strong>{STEPS[step].label}</strong>
        <div className="votti-wizard__bar">
          <div className="votti-wizard__bar-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {step === 0 && (
        <div className="votti-wizard__panel votti-wizard__panel--glass">
          <h2>Informações da votação</h2>
          <p className="votti-wizard__hint">Nome, categoria e identidade visual — leva menos de 1 minuto.</p>
          <label className="votti-field">
            <span className="votti-field__label">Título</span>
            <input className="votti-field__input" value={draft.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Ex: Melhor lanche da turma" />
          </label>
          <label className="votti-field">
            <span className="votti-field__label">Descrição</span>
            <textarea className="votti-field__textarea" value={draft.description} onChange={(e) => patch({ description: e.target.value })} rows={3} placeholder="Explique rapidamente do que se trata" />
          </label>
          <label className="votti-field">
            <span className="votti-field__label">Categoria</span>
            <input className="votti-field__input" value={draft.category} onChange={(e) => patch({ category: e.target.value })} placeholder="Escola, empresa, evento..." />
          </label>
          <PollImageField
            label="Logo"
            hint="Quadradinho — aparece nos cards e na votação."
            variant="logo"
            value={draft.logoUrl}
            onChange={(logoUrl) => patch({ logoUrl })}
            ownerId={user?.id}
          />
          <label className="votti-field">
            <span className="votti-field__label">Cor principal</span>
            <input type="color" className="votti-field__color" value={draft.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} />
          </label>
          <PollImageField
            label="Imagem de capa"
            hint="Banner no topo da votação (opcional)."
            variant="cover"
            value={draft.coverUrl}
            onChange={(coverUrl) => patch({ coverUrl })}
            ownerId={user?.id}
          />
        </div>
      )}

      {step === 1 && (
        <div className="votti-wizard__panel votti-wizard__panel--glass">
          <h2>Perguntas</h2>
          <p className="votti-wizard__hint">Monte as opções em cards — o ranking aparece ao vivo para quem vota.</p>
          {draft.questions.map((q, qi) => (
            <div key={q.id} className="votti-question-card">
              <div className="votti-question-card__head">
                <span className="votti-question-card__badge">Pergunta {qi + 1}</span>
              </div>
              <label className="votti-field">
                <span className="votti-field__label">Título da pergunta</span>
                <input className="votti-field__input" value={q.text} onChange={(e) => {
                  const questions = [...draft.questions];
                  questions[qi] = { ...q, text: e.target.value };
                  patch({ questions });
                }} placeholder="O que você quer decidir?" />
              </label>
              {q.options.map((o, oi) => (
                <label key={o.id} className="votti-field">
                  <span className="votti-field__label">Opção {oi + 1}</span>
                  <input className="votti-field__input" value={o.text} onChange={(e) => {
                    const questions = [...draft.questions];
                    const options = [...q.options];
                    options[oi] = { ...o, text: e.target.value };
                    questions[qi] = { ...q, options };
                    patch({ questions });
                  }} placeholder={`Opção ${oi + 1}`} />
                </label>
              ))}
              <button type="button" className="votti-link-btn" onClick={() => {
                const questions = [...draft.questions];
                questions[qi] = { ...q, options: [...q.options, { id: newId("o"), text: "", votes: 0 }] };
                patch({ questions });
              }}>
                + Adicionar opção
              </button>
            </div>
          ))}
          <button type="button" className="votti-outline-btn" onClick={addQuestion}>
            <Plus className="size-4" /> Adicionar pergunta
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="votti-wizard__panel votti-wizard__panel--glass">
          <h2>Personalização</h2>
          <p className="votti-wizard__hint">Veja como ficará para quem vota — ranking zerado até o primeiro voto.</p>
          <div className="votti-wizard__preview-stack">
            <div className="votti-preview votti-preview--rich" style={{ borderColor: draft.primaryColor }}>
              {draft.coverUrl ? <img src={draft.coverUrl} alt="" className="votti-preview__cover" /> : <div className="votti-preview__cover votti-preview__cover--empty" style={{ background: `linear-gradient(135deg, ${draft.primaryColor}55, oklch(0.2 0.04 260))` }} />}
              <div className="votti-preview__body">
                {draft.logoUrl ? <img src={draft.logoUrl} alt="" className="votti-preview__logo" /> : null}
                <h3 style={{ color: draft.primaryColor }}>{draft.title || "Título da votação"}</h3>
                <p>{draft.description || "Descrição da votação"}</p>
              </div>
            </div>
            {previewQuestion ? (
              <PollRankingPreview
                title={draft.title || "Prévia ao vivo"}
                question={previewQuestion}
                primaryColor={draft.primaryColor}
              />
            ) : null}
          </div>
          <label className="votti-field">
            <span className="votti-field__label">Cor</span>
            <input type="color" className="votti-field__color" value={draft.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} />
          </label>
          <div className="votti-wizard__image-row">
            <PollImageField
              label="Trocar logo"
              variant="logo"
              value={draft.logoUrl}
              onChange={(logoUrl) => patch({ logoUrl })}
              ownerId={user?.id}
            />
            <PollImageField
              label="Trocar capa"
              variant="cover"
              value={draft.coverUrl}
              onChange={(coverUrl) => patch({ coverUrl })}
              ownerId={user?.id}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="votti-wizard__panel votti-wizard__panel--glass">
          <h2>Configurações</h2>
          <p className="votti-wizard__hint">Controle quem vota, quando encerra e o que aparece no ranking.</p>
          <div className="votti-wizard__toggles">
            {[
              ["oneVotePerPerson", "Permitir apenas um voto por pessoa"],
              ["showResultBeforeVote", "Mostrar resultado antes do voto"],
              ["showResultAfterVote", "Mostrar resultado após votar"],
              ["autoClose", "Encerrar automaticamente"],
            ].map(([key, label]) => (
              <label key={key} className="votti-toggle votti-toggle--card">
                <input
                  type="checkbox"
                  checked={draft.settings[key as keyof typeof draft.settings] as boolean}
                  onChange={(e) => patch({ settings: { ...draft.settings, [key]: e.target.checked } })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {draft.settings.autoClose ? (
            <label className="votti-field">
              <span className="votti-field__label">Data de encerramento</span>
              <input type="datetime-local" className="votti-field__input" value={draft.settings.closeAt} onChange={(e) => patch({ settings: { ...draft.settings, closeAt: e.target.value } })} />
            </label>
          ) : null}
        </div>
      )}

      {step === 4 && (
        <div className="votti-wizard__panel votti-wizard__panel--publish">
          <div className="votti-launch">
            <div className="votti-launch__glow" aria-hidden />
            <div className="votti-launch__icon" aria-hidden>
              <Rocket className="size-8" />
            </div>
            <p className="votti-launch__kicker">Último passo</p>
            <h2 className="votti-launch__title">Sua votação vai ao ar agora</h2>
            <p className="votti-launch__desc">
              Tudo começa zerado. Compartilhe o link e veja o ranking subir ao vivo.
            </p>

            <div className="votti-launch__stats">
              <div className="votti-launch__stat">
                <HelpCircle className="size-4" />
                <span className="votti-launch__stat-value tabular-nums">{draft.questions.length}</span>
                <span className="votti-launch__stat-label">pergunta(s)</span>
              </div>
              <div className="votti-launch__stat">
                <Zap className="size-4" />
                <span className="votti-launch__stat-value tabular-nums">{optionCount}</span>
                <span className="votti-launch__stat-label">opções</span>
              </div>
              <div className="votti-launch__stat votti-launch__stat--live">
                <Users className="size-4" />
                <span className="votti-launch__stat-value tabular-nums">0</span>
                <span className="votti-launch__stat-label">votos</span>
              </div>
            </div>
          </div>

          <div className="votti-publish-card votti-publish-card--launch">
            {draft.coverUrl ? (
              <img src={draft.coverUrl} alt="" className="votti-publish-card__cover" />
            ) : (
              <div
                className="votti-publish-card__cover votti-publish-card__cover--empty"
                style={{ background: `linear-gradient(135deg, ${draft.primaryColor}, oklch(0.28 0.08 260))` }}
              />
            )}
            <div className="votti-publish-card__body">
              <div className="votti-publish-card__meta">
                {draft.logoUrl ? <img src={draft.logoUrl} alt="" className="votti-publish-card__logo" /> : (
                  <div className="votti-publish-card__logo votti-publish-card__logo--empty">
                    <Trophy className="size-5" />
                  </div>
                )}
                <div>
                  <p className="votti-publish-card__title">{draft.title || "Sem título"}</p>
                  <p className="votti-publish-card__sub">{draft.category || "Votação ao vivo"}</p>
                </div>
              </div>
              {draft.description ? <p className="votti-publish-card__desc">{draft.description}</p> : null}
            </div>
          </div>

          {previewQuestion ? (
            <PollRankingPreview
              title={draft.title || "Ranking ao vivo"}
              question={previewQuestion}
              primaryColor={draft.primaryColor}
              compact
            />
          ) : null}

          <PublishButton draft={draft} onPublished={onPublished} />
        </div>
      )}

      <div className="votti-wizard__nav">
        {step > 0 ? (
          <button type="button" className="votti-outline-btn" onClick={() => setStep((s) => s - 1)}>
            Voltar
          </button>
        ) : (
          <Link to="/" className="votti-outline-btn">
            Cancelar
          </Link>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" className="votti-mega-btn votti-mega-btn--sm" onClick={() => setStep((s) => s + 1)}>
            Continuar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PublishButton({
  draft,
  onPublished,
}: {
  draft: PollDraft;
  onPublished: (slug: string) => void;
}) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function handlePublish() {
    const validationError = validatePublishDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const poll = await publishPoll(draft, { id: user!.id, email: user!.email });
      try {
        onPublished(poll.slug);
      } catch {
        window.location.assign(`/criar/sucesso?slug=${encodeURIComponent(poll.slug)}`);
      }
    } catch (err) {
      setError(getPollErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <>
      {error ? <p className="votti-auth__error">{error}</p> : null}
      <button
        type="button"
        className="votti-mega-btn votti-mega-btn--publish w-full max-w-none mt-4"
        disabled={submitting}
        onClick={() => void handlePublish()}
      >
        {submitting ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Publicando…
          </>
        ) : (
          <>
            <Rocket className="size-5" />
            PUBLICAR VOTAÇÃO
          </>
        )}
      </button>
    </>
  );
}
