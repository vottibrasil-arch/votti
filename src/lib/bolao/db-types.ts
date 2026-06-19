export type CampeonatoTipo = "oficial" | "personalizado";

export type DbCampeonatoRow = {
  id: number;
  nome: string;
  api_league_id: number | null;
  ativo: boolean;
  apostas_abertas?: boolean;
  owner_id: string | null;
  tipo: CampeonatoTipo;
  banner_url: string | null;
  escudo_url: string | null;
  descricao: string | null;
  cidade: string | null;
  slug: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  created_at?: string;
};

export type CampeonatoBolaoStats = {
  total: number;
  ativos: number;
  encerrados: number;
};

export type DbCampeonatoWithStats = DbCampeonatoRow & {
  partidas_count: number;
  times_count: number;
  proxima_data: string | null;
  status_label: string;
};

export type DbPartidaRow = {
  id: number;
  campeonato_id: number | null;
  time_casa: string;
  time_fora: string;
  placar_casa: number;
  placar_fora: number;
  status: string;
  data_partida: string | null;
  fase: string | null;
  escudo_casa: string | null;
  escudo_fora: string | null;
  ordem: number | null;
  created_at: string;
  campeonatos?: DbCampeonatoRow | null;
};

export type DbBolaoRow = {
  id: string;
  usuario_id: string | null;
  partida_id: number | null;
  campeonato_id?: number | null;
  slug: string;
  stake: number;
  modo_exclusivo: boolean;
  status: string;
  created_at: string;
};

export type DbParticipanteAdmin = {
  id: string;
  nome: string;
  cidade: string | null;
  created_at: string;
  palpites_count: number;
  status: string;
};

export type CampeonatoBolaoInfo = {
  id: string;
  slug: string;
  shareUrl: string;
  stake: number;
  status: string;
};

export type CampeonatoAdminData = {
  campeonato: DbCampeonatoRow;
  partidas: DbPartidaRow[];
  participantes_count: number;
  bolao: CampeonatoBolaoInfo | null;
  participantes: DbParticipanteAdmin[];
};

export type DbBolaoWithPartida = DbBolaoRow & {
  partidas: DbPartidaRow | null;
  participant_count: number;
  ranking_lider?: string | null;
  papel?: "criador" | "participante";
};

export type AtividadeRecente = {
  id: string;
  tipo: "campeonato_criado" | "bolao_criado" | "convite_recebido";
  titulo: string;
  subtitulo: string;
  created_at: string;
};

export type CreateCampeonatoResult = {
  campeonato: DbCampeonatoRow;
  partidas: DbPartidaRow[];
  shareUrl: string;
};

export type CreateBolaoResult = {
  id: string;
  slug: string;
  shareUrl: string;
};

export const COPA_2026_NOME = "Copa do Mundo 2026";

export const BOLAO_STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  ao_vivo: "Ao vivo",
  live: "Ao vivo",
  encerrado: "Encerrado",
  fechado: "Encerrado",
};

export const PARTIDA_STATUS_LABELS: Record<string, string> = {
  agendado: "Agendado",
  ao_vivo: "Ao vivo",
  encerrado: "Encerrado",
  finalizado: "Finalizado",
};

export const CAMPEONATO_STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
};
