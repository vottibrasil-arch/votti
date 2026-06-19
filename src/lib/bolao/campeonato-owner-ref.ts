export type CampeonatoOwnerRef = {
  campeonatoId: number;
  slug?: string | null;
};

export function ownerRefPayload(ref: CampeonatoOwnerRef, accessToken: string) {
  if (ref.slug) {
    return { accessToken, slug: ref.slug };
  }
  return { accessToken, campeonatoId: ref.campeonatoId };
}
