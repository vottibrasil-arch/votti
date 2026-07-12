import type { PollOption } from "@/lib/votti/poll-types";

/** Avatar fictício (SVG local) — letras A–D para a demo da landing. */
export function landingDemoAvatar(letter: string, hue: number): string {
  const bg = `hsl(${hue} 62% 46%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="48" fill="${bg}"/><text x="48" y="56" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" font-weight="700" fill="white">${letter}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export type LandingDemoPoll = {
  continent: string;
  title: string;
  primaryColor: string;
  options: PollOption[];
  tickOffset: number;
};

export const LANDING_DEMO_POLLS: LandingDemoPoll[] = [
  {
    continent: "Auroria",
    title: "Eleição em Auroria",
    primaryColor: "#8B5CF6",
    tickOffset: 0,
    options: [
      { id: "aur-a", text: "A", votes: 43, imageUrl: landingDemoAvatar("A", 278) },
      { id: "aur-b", text: "B", votes: 14, imageUrl: landingDemoAvatar("B", 218) },
      { id: "aur-c", text: "C", votes: 28, imageUrl: landingDemoAvatar("C", 188) },
      { id: "aur-d", text: "D", votes: 15, imageUrl: landingDemoAvatar("D", 152) },
    ],
  },
  {
    continent: "Novaterra",
    title: "Melhor cidade de Novaterra",
    primaryColor: "#4F8FD9",
    tickOffset: 420,
    options: [
      { id: "nov-a", text: "A", votes: 46, imageUrl: landingDemoAvatar("A", 205) },
      { id: "nov-b", text: "B", votes: 36, imageUrl: landingDemoAvatar("B", 245) },
      { id: "nov-c", text: "C", votes: 18, imageUrl: landingDemoAvatar("C", 175) },
      { id: "nov-d", text: "D", votes: 12, imageUrl: landingDemoAvatar("D", 135) },
    ],
  },
  {
    continent: "Eldaris",
    title: "Destaque em Eldaris",
    primaryColor: "#22C55E",
    tickOffset: 840,
    options: [
      { id: "eld-a", text: "A", votes: 52, imageUrl: landingDemoAvatar("A", 142) },
      { id: "eld-b", text: "B", votes: 34, imageUrl: landingDemoAvatar("B", 198) },
      { id: "eld-c", text: "C", votes: 14, imageUrl: landingDemoAvatar("C", 258) },
      { id: "eld-d", text: "D", votes: 9, imageUrl: landingDemoAvatar("D", 118) },
    ],
  },
];
