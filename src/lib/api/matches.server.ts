import { assertFootballApiConfigured, getServerConfig } from "../config.server";

export type FootballFixture = {
  id: number;
  home: string;
  away: string;
  homeFlag?: string;
  awayFlag?: string;
  scoreHome: number | null;
  scoreAway: number | null;
  minute: number | null;
  status: string;
  date: string;
};

/** Busca jogos ao vivo ou próximos. Requer FOOTBALL_API_KEY no .env */
export async function fetchLiveFixtures(leagueId = 1): Promise<FootballFixture[]> {
  assertFootballApiConfigured();
  const { footballApi } = getServerConfig();

  const url = new URL(`${footballApi.baseUrl}/fixtures`);
  url.searchParams.set("league", String(leagueId));
  url.searchParams.set("season", String(new Date().getFullYear()));
  url.searchParams.set("live", "all");

  const res = await fetch(url, {
    headers: {
      "x-apisports-key": footballApi.apiKey,
    },
  });

  if (!res.ok) {
    throw new Error(`API de jogos retornou ${res.status}`);
  }

  const json = await res.json();
  const fixtures = json.response ?? [];

  return fixtures.map((f: Record<string, unknown>) => {
    const fixture = f.fixture as Record<string, unknown>;
    const teams = f.teams as Record<string, { name: string }>;
    const goals = f.goals as { home: number | null; away: number | null };
    const status = fixture.status as { short: string; elapsed: number | null };

    return {
      id: fixture.id as number,
      home: teams.home.name,
      away: teams.away.name,
      scoreHome: goals.home,
      scoreAway: goals.away,
      minute: status.elapsed,
      status: status.short,
      date: fixture.date as string,
    } satisfies FootballFixture;
  });
}
