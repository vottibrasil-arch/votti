import { useNavigate } from "@tanstack/react-router";

import { useState } from "react";

import { useServerFn } from "@tanstack/react-start";

import { PrimaryButton } from "@/components/ui-kit";

import { ImageUploadField } from "@/components/image-upload-field";

import { FormField } from "@/components/bolao/form-primitives";

import {

  EMPTY_JOGO,

  JogoForm,

  buildDataPartidaIso,

  type JogoDraft,

} from "@/components/jogo-form";

import { createCampeonatoPersonalizado } from "@/lib/api/campeonatos.server";

import { useAuth } from "@/lib/auth/use-auth";

import { CHURRASCO_PRESET } from "@/lib/bolao/constants";

import { uploadCampeonatoImage } from "@/lib/storage/upload-campeonato-image";

import { formatPartidaDateTime } from "@/lib/bolao/partidas-ui";

import { formatUserFacingError } from "@/lib/errors";

import { ChevronLeft, ChevronRight, MapPin, Swords, Trash2, Trophy } from "lucide-react";



const TOTAL_STEPS = 2;



export type ModoCriacao = "campeonato" | "jogo-unico";



type CampeonatoDraft = {

  nome: string;

  texto: string;

  cidade: string;

  bannerFile: File | null;

  logoFile: File | null;

};



const INITIAL_CAMPEONATO: CampeonatoDraft = {

  nome: "",

  texto: "",

  cidade: "",

  bannerFile: null,

  logoFile: null,

};



function ModoSelector({ modo, onChange }: { modo: ModoCriacao; onChange: (modo: ModoCriacao) => void }) {

  return (

    <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl glass">

      <button

        type="button"

        onClick={() => onChange("campeonato")}

        className={`rounded-xl py-3 px-2 flex flex-col items-center gap-1 transition ${

          modo === "campeonato"

            ? "bg-primary text-primary-foreground"

            : "text-muted-foreground hover:text-foreground"

        }`}

      >

        <Trophy className="size-5" />

        <span className="text-[11px] font-semibold">Campeonato</span>

        <span className="text-[9px] opacity-80">Vários jogos</span>

      </button>

      <button

        type="button"

        onClick={() => onChange("jogo-unico")}

        className={`rounded-xl py-3 px-2 flex flex-col items-center gap-1 transition ${

          modo === "jogo-unico"

            ? "bg-primary text-primary-foreground"

            : "text-muted-foreground hover:text-foreground"

        }`}

      >

        <Swords className="size-5" />

        <span className="text-[11px] font-semibold">Jogo único</span>

        <span className="text-[9px] opacity-80">Um jogo só</span>

      </button>

    </div>

  );

}



function WizardDots({ etapa, modo }: { etapa: number; modo: ModoCriacao }) {

  const labels = modo === "jogo-unico" ? ["Informações", "Jogo"] : ["Campeonato", "Jogos"];

  return (

    <div className="flex items-center justify-center gap-3 mb-5">

      {labels.map((label, i) => {

        const n = i + 1;

        return (

          <div key={label} className="flex flex-col items-center gap-1">

            <div

              className={`h-1.5 rounded-full transition-all ${

                n === etapa ? "w-10 bg-primary" : n < etapa ? "w-5 bg-primary/50" : "w-5 bg-surface-2"

              }`}

            />

            <span className={`text-[10px] font-medium ${n === etapa ? "text-primary" : "text-muted-foreground"}`}>

              {label}

            </span>

          </div>

        );

      })}

    </div>

  );

}



function JogoListItem({ jogo, onRemove }: { jogo: JogoDraft; onRemove: () => void }) {

  const when = buildDataPartidaIso(jogo.data, jogo.horario);



  return (

    <div className="glass rounded-xl p-3 flex items-start gap-3">

      <div className="min-w-0 flex-1">

        {jogo.fase.trim() && (

          <div className="text-[10px] font-bold uppercase tracking-wide text-gold mb-1">

            [{jogo.fase.trim()}]

          </div>

        )}

        <div className="font-semibold text-sm">

          {jogo.timeCasa} × {jogo.timeFora}

        </div>

        {when && (

          <div className="text-[10px] text-muted-foreground mt-0.5">{formatPartidaDateTime(when)}</div>

        )}

      </div>

      <button type="button" onClick={onRemove} className="text-red-400 p-1 shrink-0">

        <Trash2 className="size-4" />

      </button>

    </div>

  );

}



export function CriarCampeonatoWizard({ etapa, modo }: { etapa: number; modo: ModoCriacao }) {

  const navigate = useNavigate();

  const { user, getAccessToken } = useAuth();

  const createFn = useServerFn(createCampeonatoPersonalizado);



  const [campeonato, setCampeonato] = useState<CampeonatoDraft>(INITIAL_CAMPEONATO);

  const [jogosSalvos, setJogosSalvos] = useState<JogoDraft[]>([]);

  const [jogoAtual, setJogoAtual] = useState<JogoDraft>(EMPTY_JOGO);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);



  const setCamp = <K extends keyof CampeonatoDraft>(key: K, value: CampeonatoDraft[K]) =>

    setCampeonato((prev) => ({ ...prev, [key]: value }));



  const goEtapa = (next: number, nextModo = modo) =>

    navigate({ to: "/create", search: { aba: "criar", etapa: next, modo: nextModo } });



  const setModo = (nextModo: ModoCriacao) => {

    setJogosSalvos([]);

    setJogoAtual(EMPTY_JOGO());

    setError(null);

    goEtapa(etapa, nextModo);

  };



  const applyPreset = () => {

    setCampeonato((prev) => ({

      ...prev,

      nome: CHURRASCO_PRESET.nome,

      cidade: "Divinópolis",

    }));

    setJogoAtual((prev) => ({

      ...prev,

      fase: "Jogo único",

      timeCasa: CHURRASCO_PRESET.timeCasa,

      timeFora: CHURRASCO_PRESET.timeFora,

    }));

  };



  const canAdvanceStep1 =

    modo === "jogo-unico" ? true : campeonato.nome.trim().length >= 2;



  const canSaveJogo =

    jogoAtual.timeCasa.trim().length >= 1 && jogoAtual.timeFora.trim().length >= 1;



  const adicionarJogo = () => {

    if (!canSaveJogo) return;

    setJogosSalvos((prev) => [...prev, { ...jogoAtual }]);

    setJogoAtual(EMPTY_JOGO());

    setError(null);

  };



  const handleFinalize = async () => {

    const token = getAccessToken();

    if (!token || !user?.id) {
      setError("Sessão expirada. Entre de novo para salvar.");
      return;
    }



    let jogosParaSalvar = [...jogosSalvos];

    if (jogosParaSalvar.length === 0 && modo === "jogo-unico" && canSaveJogo) {

      jogosParaSalvar = [{ ...jogoAtual, fase: "Jogo único" }];

    }

    if (modo === "campeonato" && canSaveJogo) {
      jogosParaSalvar = [...jogosParaSalvar, { ...jogoAtual }];
    }



    if (jogosParaSalvar.length === 0) {

      setError(

        modo === "jogo-unico"

          ? "Preencha os times do jogo antes de criar."

          : "Adicione pelo menos 1 jogo antes de finalizar.",

      );

      return;

    }



    setSaving(true);

    setError(null);



    try {

      const bannerUrl = campeonato.bannerFile

        ? await uploadCampeonatoImage(campeonato.bannerFile, "banners", user.id)

        : undefined;

      const escudoUrl = campeonato.logoFile

        ? await uploadCampeonatoImage(campeonato.logoFile, "logos", user.id)

        : undefined;



      const jogosPayload = await Promise.all(

        jogosParaSalvar.map(async (jogo, index) => {

          const [escudoCasaUrl, escudoForaUrl] = await Promise.all([

            jogo.escudoCasaFile

              ? uploadCampeonatoImage(jogo.escudoCasaFile, "times", user.id)

              : Promise.resolve(jogo.escudoCasaUrl ?? undefined),

            jogo.escudoForaFile

              ? uploadCampeonatoImage(jogo.escudoForaFile, "times", user.id)

              : Promise.resolve(jogo.escudoForaUrl ?? undefined),

          ]);



          return {

            fase: jogo.fase.trim() || undefined,

            timeCasa: jogo.timeCasa.trim(),

            timeFora: jogo.timeFora.trim(),

            escudoCasaUrl,

            escudoForaUrl,

            dataPartida: buildDataPartidaIso(jogo.data, jogo.horario),

            ordem: index + 1,

          };

        }),

      );



      const nomeFinal =

        campeonato.nome.trim().length >= 2

          ? campeonato.nome.trim()

          : `${jogosParaSalvar[0].timeCasa.trim()} × ${jogosParaSalvar[0].timeFora.trim()}`;



      const result = await createFn({

        data: {

          accessToken: token,

          nome: nomeFinal,

          descricao: campeonato.texto.trim() || undefined,

          bannerUrl,

          escudoUrl,

          cidade: campeonato.cidade.trim() || undefined,

          jogos: jogosPayload,

        },

      });



      setCampeonato(INITIAL_CAMPEONATO);

      setJogosSalvos([]);

      setJogoAtual(EMPTY_JOGO());



      const createdSlug = result.campeonato.slug;

      navigate({

        to: "/campeonato/$slug",

        params: { slug: createdSlug ?? `camp-${result.campeonato.id}` },

      });

      return;

    } catch (err) {

      setError(formatUserFacingError(err, "Erro ao salvar campeonato"));

    } finally {

      setSaving(false);

    }

  };



  return (

    <div className="animate-rise space-y-5">

      <ModoSelector modo={modo} onChange={setModo} />



      <div>

        <h1 className="font-display text-xl font-bold">

          {modo === "jogo-unico" ? "Criar jogo" : "Criar campeonato"}

        </h1>

        <p className="text-muted-foreground mt-1 text-sm">

          Passo {etapa} de {TOTAL_STEPS}

          {modo === "jogo-unico"

            ? " — cadastre as informações e o jogo."

            : " — cadastre o campeonato e adicione os jogos."}

        </p>

      </div>



      <WizardDots etapa={etapa} modo={modo} />



      {etapa === 1 && (

        <div className="space-y-4">

          <button type="button" onClick={applyPreset} className="chip text-[10px]">

            Exemplo: Churrasco da Galera

          </button>



          <FormField label={modo === "jogo-unico" ? "Nome do evento (opcional)" : "Nome do campeonato *"}>

            <input

              value={campeonato.nome}

              onChange={(e) => setCamp("nome", e.target.value)}

              placeholder={

                modo === "jogo-unico"

                  ? "Ex: Pelada de domingo (ou deixe em branco)"

                  : "Ex: Campeonato Municipal de Divinópolis"

              }

              className="w-full bg-transparent outline-none font-semibold text-sm"

            />

          </FormField>



          <ImageUploadField

            label="Banner (opcional)"

            hint="Foto de capa do campeonato"

            file={campeonato.bannerFile}

            onChange={(file) => setCamp("bannerFile", file)}

            previewHeight="h-32"

          />



          <ImageUploadField

            label="Logo (opcional)"

            file={campeonato.logoFile}

            onChange={(file) => setCamp("logoFile", file)}

            previewHeight="h-24"

          />



          <FormField label="Cidade (opcional)">

            <div className="flex items-center gap-2">

              <MapPin className="size-4 text-muted-foreground shrink-0" />

              <input

                value={campeonato.cidade}

                onChange={(e) => setCamp("cidade", e.target.value)}

                placeholder="Ex: Divinópolis"

                className="w-full bg-transparent outline-none text-sm"

              />

            </div>

          </FormField>



          <FormField label="Descrição (opcional)">

            <textarea

              value={campeonato.texto}

              onChange={(e) => setCamp("texto", e.target.value)}

              placeholder="Ex: Pelada de domingo com a galera"

              rows={3}

              className="w-full bg-transparent outline-none text-sm resize-none"

            />

          </FormField>

        </div>

      )}



      {etapa === 2 && (

        <div className="space-y-5">

          {(campeonato.nome || campeonato.cidade) && (

            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-center">

              {campeonato.nome && <div className="font-display font-bold">{campeonato.nome}</div>}

              {campeonato.cidade && (

                <div className="text-xs text-muted-foreground mt-0.5">{campeonato.cidade}</div>

              )}

              {!campeonato.nome && modo === "jogo-unico" && (

                <div className="text-xs text-muted-foreground">Jogo único</div>

              )}

            </div>

          )}



          <JogoForm

            value={jogoAtual}

            onChange={setJogoAtual}

            onSubmit={modo === "jogo-unico" ? handleFinalize : adicionarJogo}

            showFase={modo === "campeonato"}

            submitLabel={modo === "jogo-unico" ? "Criar jogo" : "Adicionar jogo"}

            saving={modo === "jogo-unico" && saving}

          />



          {modo === "campeonato" && jogosSalvos.length > 0 && (

            <div className="space-y-2">

              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">

                Jogos adicionados ({jogosSalvos.length})

              </h2>

              {jogosSalvos.map((jogo) => (

                <JogoListItem

                  key={jogo.id}

                  jogo={jogo}

                  onRemove={() => setJogosSalvos((prev) => prev.filter((j) => j.id !== jogo.id))}

                />

              ))}

            </div>

          )}



          {error && (

            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 text-center">

              {error}

            </div>

          )}

        </div>

      )}



      <div className="flex gap-2 pt-2">

        {etapa > 1 && (

          <PrimaryButton onClick={() => goEtapa(etapa - 1)} variant="outline" className="flex-1">

            <ChevronLeft className="size-5" /> Voltar

          </PrimaryButton>

        )}

        {etapa < TOTAL_STEPS ? (

          <PrimaryButton

            onClick={() => goEtapa(etapa + 1)}

            variant="primary"

            className={`flex-[2] ${!canAdvanceStep1 ? "opacity-50 pointer-events-none" : ""}`}

          >

            Continuar <ChevronRight className="size-5" />

          </PrimaryButton>

        ) : (

          modo === "campeonato" && (

            <PrimaryButton

              onClick={handleFinalize}

              variant="gold"

              className={`flex-[2] ${saving || jogosSalvos.length === 0 ? "opacity-50 pointer-events-none" : ""}`}

            >

              {saving ? "Salvando..." : "Finalizar Campeonato"}{" "}

              <ChevronRight className="size-5" />

            </PrimaryButton>

          )

        )}

      </div>

    </div>

  );

}

