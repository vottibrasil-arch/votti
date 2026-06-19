import type { Bolao } from "./types";
import type { GuestPickSession } from "./guest-session";

export type GuestEntryStatus = "pending" | "approved" | "rejected" | null;

export function getGuestEntryStatus(bolao: Bolao, guest: GuestPickSession | null): GuestEntryStatus {
  if (!guest) return null;

  const req = bolao.requests.find((r) => r.name.toLowerCase() === guest.nome.toLowerCase());
  return req?.status ?? null;
}

export function isParticipantePending(status: string) {
  return status !== "aprovado" && status !== "approved" && status !== "rejeitado" && status !== "rejected";
}
