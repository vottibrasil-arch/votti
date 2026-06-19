import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BolaoAtivarSection } from "@/components/bolao/bolao-ativar-section";
import { PrimaryButton } from "@/components/ui-kit";
import { ativarBolaoCampeonato } from "@/lib/api/campeonato-admin.server";
import { useAuth } from "@/lib/auth/use-auth";
import { Link2 } from "lucide-react";

type Props = {
  slug: string;
  onActivated: () => void;
};

export function CampeonatoAdminAtivarBolao({ slug, onActivated }: Props) {
  const { getAccessToken } = useAuth();
  const ativarFn = useServerFn(ativarBolaoCampeonato);

  const [stake, setStake] = useState(10);
  const [modoExclusivo, setModoExclusivo] = useState(true);
  const [ativando, setAtivando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAtivar = async () => {
    const token = getAccessToken();
    if (!token) return;
    if (stake < 1) {
      setError("Defina um valor de aposta válido.");
      return;
    }

    setAtivando(true);
    setError(null);
    try {
      await ativarFn({ data: { accessToken: token, slug, stake, modoExclusivo } });
      onActivated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ativar bolão");
    } finally {
      setAtivando(false);
    }
  };

  return (
    <div className="space-y-3">
      <BolaoAtivarSection
        enabled
        onEnabledChange={() => {}}
        stake={stake}
        onStakeChange={setStake}
        modoExclusivo={modoExclusivo}
        onModoExclusivoChange={setModoExclusivo}
        hideToggle
      />
      <PrimaryButton
        onClick={handleAtivar}
        variant="gold"
        className={`h-12 ${ativando ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Link2 className="size-5" /> {ativando ? "Ativando..." : "Ativar bolão agora"}
      </PrimaryButton>
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
