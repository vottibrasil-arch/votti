import type { Bolao, Match, Participant, Supporter } from "./types";

export const MATCHES: Match[] = [
  { id: "m1", home: "Brasil", homeFlag: "🇧🇷", homeCode: "br", away: "França", awayFlag: "🇫🇷", awayCode: "fr", date: "11 Jul · 16:00", stage: "Quartas de final" },
  { id: "m2", home: "Argentina", homeFlag: "🇦🇷", homeCode: "ar", away: "Inglaterra", awayFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayCode: "gb-eng", date: "11 Jul · 20:00", stage: "Quartas de final" },
  { id: "m3", home: "Portugal", homeFlag: "🇵🇹", homeCode: "pt", away: "Espanha", awayFlag: "🇪🇸", awayCode: "es", date: "10 Jul · 13:00", stage: "Quartas de final" },
  { id: "m4", home: "Alemanha", homeFlag: "🇩🇪", homeCode: "de", away: "Holanda", awayFlag: "🇳🇱", awayCode: "nl", date: "10 Jul · 17:00", stage: "Quartas de final" },
  { id: "m5", home: "Croácia", homeFlag: "🇭🇷", homeCode: "hr", away: "Marrocos", awayFlag: "🇲🇦", awayCode: "ma", date: "6 Jul · 12:00", stage: "Oitavas de final" },
  { id: "m6", home: "Uruguai", homeFlag: "🇺🇾", homeCode: "uy", away: "Japão", awayFlag: "🇯🇵", awayCode: "jp", date: "6 Jul · 16:00", stage: "Oitavas de final" },
];

const DEMO_PARTICIPANTS: Participant[] = [
  { name: "Maria", avatar: "M", guess: [2, 1] },
  { name: "Você", avatar: "V", guess: [2, 2], isYou: true },
  { name: "João", avatar: "J", guess: [3, 1] },
  { name: "Ana", avatar: "A", guess: [2, 0] },
  { name: "Pedro", avatar: "P", guess: [1, 1] },
  { name: "Carlos", avatar: "C", guess: [0, 0] },
  { name: "Lucas", avatar: "L", guess: [3, 2] },
  { name: "Bia", avatar: "B", guess: [1, 0] },
];

export const SUPPORTERS: Supporter[] = [
  { id: "s1", name: "Carlos M.", city: "São Paulo · SP", initial: "C", message: "Vai Brasil 🇧🇷", color: "oklch(0.55 0.18 150)" },
  { id: "s2", name: "Juliana A.", city: "Recife · PE", initial: "J", message: "Hexa é nosso! ⚽", color: "oklch(0.62 0.18 50)" },
  { id: "s3", name: "Rafael T.", city: "Curitiba · PR", initial: "R", message: "Bora pra cima! 🔥", color: "oklch(0.58 0.18 25)" },
  { id: "s4", name: "Marina S.", city: "Salvador · BA", initial: "M", message: "Amor pelo futebol ❤️", color: "oklch(0.58 0.20 350)" },
  { id: "s5", name: "Diego P.", city: "Porto Alegre · RS", initial: "D", message: "Bola pra frente! 💪", color: "oklch(0.60 0.16 220)" },
];

/** Bolão de demonstração — fonte única até o Supabase estar populado. */
export const DEMO_BOLAO: Bolao = {
  slug: "br-fra-demo",
  status: "ao_vivo",
  partidaStatus: "ao_vivo",
  isStarted: true,
  match: MATCHES[0],
  stake: 10,
  settings: {
    exclusiveScore: true,
    participantsVisible: true,
    showWinningNow: true,
    taxaPercent: 10,
  },
  liveScore: [2, 1],
  finalScore: [2, 2],
  minute: 78,
  prize: 240,
  prizeDelta: 20,
  participantCount: 24,
  participants: DEMO_PARTICIPANTS,
  takenScores: {
    "2-1": "Maria",
    "3-1": "João",
    "2-0": "Ana",
    "0-0": "Carlos",
    "1-1": "Pedro",
    "3-2": "Lucas",
    "1-0": "Bia",
  },
  requests: [
    { name: "Maria", guess: "2x1", status: "approved" },
    { name: "João", guess: "3x1", status: "approved" },
    { name: "Ana", guess: "2x0", status: "approved" },
    { name: "Lucas", guess: "3x2", status: "pending" },
    { name: "Rafael", guess: "1x0", status: "pending" },
    { name: "Bia", guess: "1x0", status: "rejected" },
  ],
  recentGuesses: [
    { name: "Maria", guess: "2x1", time: "agora" },
    { name: "João", guess: "3x1", time: "1 min" },
    { name: "Ana", guess: "2x0", time: "3 min" },
    { name: "Lucas", guess: "3x2", time: "5 min" },
  ],
  sharePath: "bolao.live/br-fra-demo",
  winnerGuess: [2, 2],
};
