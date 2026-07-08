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
import { OptionImagePicker } from "@/components/votti/option-image-picker";
import { PollRankingPreview } from "@/components/votti/poll-ranking-preview";
import { SecurityBadge } from "@/components/votti/security-badge";
import { formatPollStats } from "@/lib/votti/poll-stats";
import { loadDraft, publishPoll, saveDraft, getPollErrorMessage, getPollById, updatePoll, closePoll, reopenPoll } from "@/lib/votti/poll-store";
import { newId, storedPollToDraft, validatePublishDraft, EMPTY_DRAFT, THEME_PRESETS, type PollDraft, type StoredPoll } from "@/lib/votti/poll-types";

const STEPS = [
  { label: "Informações", icon: Sparkles },
  { label: "Perguntas", icon: HelpCircle },
  { label: "Visual", icon: Palette },
  { label: "Configurações", icon: Settings2 },
  { label: "Publicar", icon: Rocket },
] as const;

type WizardProps = {
  onPublished: (slug: string) => void;
  onSaved?: (slug: string) => void;
  editPollId?: string;
};

export function CreateWizard({ onPublished, onSaved, editPollId }: WizardProps) {
  const { user } = useAuth();
  const isEditing = Boolean(editPollId);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PollDraft>(() => (isEditing ? { ...EMPTY_DRAFT } : loadDraft()));
  const [editPoll, setEditPoll] = useState<StoredPoll | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);
  const [loadError, setLoadError] = useState("");
  const [closeBusy, setCloseBusy] = useState(false);

  useEffect(() => {
    if (!isEditing || !editPollId || !user) return;

    let cancelled = false;
    setLoadingEdit(true);
    setLoadError("");

    void getPollById(editPollId, user.id)
      .then((poll) => {
        if (cancelled) return;
        if (!poll) {
          setLoadError("Votação não encontrada.");
          return;
        }
        setEditPoll(poll);
        setDraft(storedPollToDraft(poll));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getPollErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingEdit(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEditing, editPollId, user]);

  useEffect(() => {
    if (isEditing) return;
    saveDraft(draft);
  }, [draft, isEditing]);

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
            { id: newId("o"), text: "", votes: 0, imageUrl: "" },
            { id: newId("o"), text: "", votes: 0, imageUrl: "" },
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

  async function handleToggleStatus() {
    if (!editPollId || !user || !editPoll) return;
    setCloseBusy(true);
    try {
      if (editPoll.status === "active") {
        await closePoll(editPollId, user.id);
        setEditPoll((p) => (p ? { ...p, status: "closed" } : p));
      } else {
        await reopenPoll(editPollId, user.id);
        setEditPoll((p) => (p ? { ...p, status: "active" } : p));
      }
    } catch (err) {
      setLoadError(getPollErrorMessage(err));
    } finally {
      setCloseBusy(false);
    }
  }

  if (loadingEdit) {
    return (
      <div className="votti-wizard animate-rise flex items-center justify-center py-16">
        <p className="votti-app-muted">Carregando votação…</p>
      </div>
    );
  }

  if (loadError && isEditing && !editPoll) {
    return (
      <div className="votti-wizard animate-rise">
        <p className="votti-auth__error">{loadError}</p>
        <Link to="/minhas" className="votti-mega-btn votti-mega-btn--sm mt-4">
          Voltar para minhas votações
        </Link>
      </div>
    );
  }

  return (
    <div className="votti-wizard animate-rise">
      <div className="votti-wizard__hero">
        <SecurityBadge compact />
        <p className="votti-wizard__kicker">{isEditing ? "Editar votação" : "Criar votação"}</p>
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
          <label className="votti-field">
            <span className="votti-field__label">Cor principal</span>
            <input type="color" className="votti-field__color" value={draft.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} />
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="votti-wizard__panel votti-wizard__panel--glass">
          <h2>Perguntas</h2>
          <p className="votti-wizard__hint">
            Monte as opções — a fotinha é opcional, pequena e discreta. Depois de escolher, arraste para ajustar o que aparece.
          </p>
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
                <div key={o.id} className="votti-option-row">
                  <OptionImagePicker
                    value={o.imageUrl ?? ""}
                    onChange={(imageUrl) => {
                      const questions = [...draft.questions];
                      const options = [...q.options];
                      options[oi] = { ...o, imageUrl };
                      questions[qi] = { ...q, options };
                      patch({ questions });
                    }}
                    ownerId={user?.id}
                  />
                  <label className="votti-field votti-field--grow">
                    <span className="votti-field__label">Opção {oi + 1}</span>
                    <input
                      className="votti-field__input"
                      value={o.text}
                      onChange={(e) => {
                        const questions = [...draft.questions];
                        const options = [...q.options];
                        options[oi] = { ...o, text: e.target.value };
                        questions[qi] = { ...q, options };
                        patch({ questions });
                      }}
                      placeholder={`Opção ${oi + 1}`}
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="votti-link-btn"
                onClick={() => {
                  const questions = [...draft.questions];
                  questions[qi] = {
                    ...q,
                    options: [...q.options, { id: newId("o"), text: "", votes: 0, imageUrl: "" }],
                  };
                  patch({ questions });
                }}
              >
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
          <p className="votti-wizard__hint">Capa, cores e tema — a capa aparece só como fundo da votação.</p>
          <div className="votti-wizard__preview-stack">
            <div
              className="votti-preview votti-preview--rich votti-preview--cover-bg"
              style={{
                borderColor: draft.primaryColor,
                ...(draft.coverUrl
                  ? { backgroundImage: `linear-gradient(oklch(0.14 0.04 260 / 88%), oklch(0.14 0.04 260 / 92%)), url(${draft.coverUrl})` }
                  : {}),
              }}
            >
              <div className="votti-preview__body">
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
            <span className="votti-field__label">Cor do tema</span>
            <input type="color" className="votti-field__color" value={draft.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} />
          </label>

          <div className="votti-theme-presets">
            <span className="votti-field__label">Temas prontos</span>
            <div className="votti-theme-presets__grid">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`votti-theme-preset ${draft.settings.themePreset === preset.id ? "votti-theme-preset--active" : ""}`}
                  onClick={() =>
                    patch({
                      primaryColor: preset.primaryColor,
                      settings: {
                        ...draft.settings,
                        themePreset: preset.id,
                        backgroundColor: preset.backgroundColor,
                        buttonColor: preset.buttonColor,
                      },
                    })
                  }
                >
                  <span className="votti-theme-preset__swatch" style={{ background: preset.primaryColor }} />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="votti-wizard__color-row">
            <label className="votti-field">
              <span className="votti-field__label">Cor de fundo</span>
              <input
                type="color"
                className="votti-field__color"
                value={draft.settings.backgroundColor}
                onChange={(e) =>
                  patch({ settings: { ...draft.settings, backgroundColor: e.target.value, themePreset: "custom" } })
                }
              />
            </label>
            <label className="votti-field">
              <span className="votti-field__label">Cor dos botões</span>
              <input
                type="color"
                className="votti-field__color"
                value={draft.settings.buttonColor}
                onChange={(e) =>
                  patch({ settings: { ...draft.settings, buttonColor: e.target.value, themePreset: "custom" } })
                }
              />
            </label>
          </div>

          <PollImageField
            label="Imagem de capa"
            hint="Opcional. Aparece como fundo no celular e no ranking. Depois de escolher, você ajusta o enquadramento."
            variant="cover"
            value={draft.coverUrl}
            onChange={(coverUrl) => patch({ coverUrl, logoUrl: "" })}
            ownerId={user?.id}
          />
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
          {isEditing && editPoll ? (
            <div className="votti-wizard__status-box">
              <p className="votti-wizard__hint">
                Status atual: <strong>{editPoll.status === "active" ? "Ativa" : "Encerrada"}</strong>
                {editPoll.registeredVotes > 0 ? ` · ${formatPollStats(editPoll)}` : ""}
              </p>
              <button
                type="button"
                className={`votti-outline-btn w-full ${editPoll.status === "active" ? "votti-outline-btn--danger" : ""}`}
                disabled={closeBusy}
                onClick={() => void handleToggleStatus()}
              >
                {closeBusy
                  ? "Salvando…"
                  : editPoll.status === "active"
                    ? "Encerrar votação agora"
                    : "Reabrir votação"}
              </button>
            </div>
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
            <p className="votti-launch__kicker">{isEditing ? "Salvar alterações" : "Último passo"}</p>
            <h2 className="votti-launch__title">
              {isEditing ? "Revise e salve sua votação" : "Sua votação vai ao ar agora"}
            </h2>
            <p className="votti-launch__desc">
              {isEditing
                ? "As mudanças valem na hora. Quem já votou continua vendo o ranking atualizado."
                : "Tudo começa zerado. Compartilhe o link e veja o ranking subir ao vivo."}
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
                <span className="votti-launch__stat-value tabular-nums">
                  {isEditing && editPoll ? editPoll.registeredVotes : 0}
                </span>
                <span className="votti-launch__stat-label">votos</span>
              </div>
            </div>
          </div>

          <div
            className={`votti-publish-card votti-publish-card--launch ${draft.coverUrl ? "votti-publish-card--cover-bg" : ""}`}
            style={
              draft.coverUrl
                ? {
                    backgroundImage: `linear-gradient(oklch(0.16 0.04 260 / 92%), oklch(0.16 0.04 260 / 96%)), url(${draft.coverUrl})`,
                  }
                : undefined
            }
          >
            <div className="votti-publish-card__body">
              <div className="votti-publish-card__meta">
                <div className="votti-publish-card__logo votti-publish-card__logo--empty">
                  <Trophy className="size-5" />
                </div>
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

          {isEditing && editPollId ? (
            <SaveButton
              pollId={editPollId}
              draft={draft}
              status={editPoll?.status}
              onSaved={onSaved ?? onPublished}
            />
          ) : (
            <PublishButton draft={draft} onPublished={onPublished} />
          )}
        </div>
      )}

      <div className="votti-wizard__nav">
        {step > 0 ? (
          <button type="button" className="votti-outline-btn" onClick={() => setStep((s) => s - 1)}>
            Voltar
          </button>
        ) : (
          <Link to={isEditing ? "/minhas" : "/"} className="votti-outline-btn">
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

function SaveButton({
  pollId,
  draft,
  status,
  onSaved,
}: {
  pollId: string;
  draft: PollDraft;
  status?: StoredPoll["status"];
  onSaved: (slug: string) => void;
}) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function handleSave() {
    const validationError = validatePublishDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const poll = await updatePoll(pollId, user!.id, draft, { status });
      onSaved(poll.slug);
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
        onClick={() => void handleSave()}
      >
        {submitting ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Salvando…
          </>
        ) : (
          <>
            <Check className="size-5" />
            SALVAR ALTERAÇÕES
          </>
        )}
      </button>
    </>
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
