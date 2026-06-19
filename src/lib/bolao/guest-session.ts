const KEY_PREFIX = "bolao-guest:";

export type GuestPickSession = {
  nome: string;
  guess: [number, number];
};

export function saveGuestPick(slug: string, data: GuestPickSession) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`${KEY_PREFIX}${slug}`, JSON.stringify(data));
}

export function loadGuestPick(slug: string): GuestPickSession | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(`${KEY_PREFIX}${slug}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestPickSession;
  } catch {
    return null;
  }
}
