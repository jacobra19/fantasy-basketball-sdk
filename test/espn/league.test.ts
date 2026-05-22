import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { EspnClient } from '../../src/espn/client.js';
import { EspnAccessDenied, EspnInvalidLeague } from '../../src/espn/errors.js';
import { League } from '../../src/espn/league.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '../fixtures/espn');

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8')) as T;
}

function createMockFetch(handlers: Record<string, unknown>): typeof globalThis.fetch {
  return async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [pattern, body] of Object.entries(handlers)) {
      if (url.includes(pattern)) {
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    return new Response(JSON.stringify({ error: 'not found', url }), { status: 404 });
  };
}

describe('EspnClient', () => {
  it('fetches league with multiple views', async () => {
    const league = loadFixture('league.json');
    const client = new EspnClient({
      leagueId: 123456,
      seasonId: 2025,
      fetch: createMockFetch({
        'segments/0/leagues/123456': league,
      }),
    });

    const data = await client.getLeague();
    expect(data.id).toBe(123456);
    expect(data.teams).toHaveLength(2);
  });

  it('throws EspnInvalidLeague on 404', async () => {
    const client = new EspnClient({
      leagueId: 999,
      seasonId: 2025,
      fetch: async () => new Response('', { status: 404 }),
    });

    await expect(client.getLeague()).rejects.toBeInstanceOf(EspnInvalidLeague);
  });

  it('throws EspnAccessDenied on 401 without cookies', async () => {
    const client = new EspnClient({
      leagueId: 123456,
      seasonId: 2025,
      fetch: async () => new Response('', { status: 401 }),
    });

    await expect(client.getLeague()).rejects.toBeInstanceOf(EspnAccessDenied);
  });

  it('retries with alternate endpoint on 401 and succeeds', async () => {
    const league = loadFixture('league.json');
    let callCount = 0;
    const fetchFn: typeof globalThis.fetch = async (input) => {
      callCount += 1;
      const url = String(input);
      if (callCount === 1 && url.includes('segments/0/leagues')) {
        return new Response('', { status: 401 });
      }
      if (url.includes('leagueHistory')) {
        return new Response(JSON.stringify(league), { status: 200 });
      }
      return new Response('', { status: 404 });
    };

    const client = new EspnClient({
      leagueId: 123456,
      seasonId: 2025,
      espnS2: 'test-s2',
      swid: '{test-swid}',
      fetch: fetchFn,
    });

    const data = await client.getLeague();
    expect(data.id).toBe(123456);
    expect(callCount).toBeGreaterThan(1);
  });

  it('sends x-fantasy-filter for pro players', async () => {
    const players = loadFixture('players.json');
    let capturedHeaders: Headers | undefined;
    const fetchFn: typeof globalThis.fetch = async (_input, init) => {
      capturedHeaders = init?.headers as Headers;
      return new Response(JSON.stringify(players), { status: 200 });
    };

    const client = new EspnClient({
      leagueId: 123456,
      seasonId: 2025,
      fetch: fetchFn,
    });

    const data = await client.getProPlayers();
    expect(data).toHaveLength(2);
    expect(capturedHeaders?.get('x-fantasy-filter')).toContain('filterActive');
  });
});

describe('League', () => {
function createLeagueFetch(): typeof globalThis.fetch {
  const league = loadFixture<Record<string, unknown>>('league.json');
  const players = loadFixture<unknown[]>('players.json');
  const proSchedule = loadFixture<Record<string, unknown>>('pro-schedule.json');
  const draft = loadFixture<Record<string, unknown>>('draft.json');

  return async (input: RequestInfo | URL) => {
    const url = new URL(String(input));

    if (url.pathname.includes('/players')) {
      return new Response(JSON.stringify(players), { status: 200 });
    }

    if (url.searchParams.get('view') === 'proTeamSchedules_wl') {
      return new Response(JSON.stringify(proSchedule), { status: 200 });
    }

    const views = url.searchParams.getAll('view');
    if (views.includes('mDraftDetail')) {
      return new Response(JSON.stringify(draft), { status: 200 });
    }
    if (views.includes('kona_player_info')) {
      return new Response(
        JSON.stringify({
          players: [
            {
              playerPoolEntry: {
                player: {
                  id: 200,
                  fullName: 'Free Agent Player',
                  defaultPositionId: 2,
                  eligibleSlots: [2],
                  proTeamId: 0,
                  stats: [],
                },
              },
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (views.includes('mTransactions2')) {
      return new Response(
        JSON.stringify({
          transactions: [
            {
              teamId: 1,
              type: 'FREEAGENT',
              status: 'EXECUTED',
              scoringPeriodId: 10,
              items: [{ type: 'ADD', playerId: 200 }],
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (views.includes('kona_league_communication')) {
      return new Response(
        JSON.stringify({
          topics: [
            {
              date: 1700000000000,
              messages: [{ messageTypeId: 178, to: 1, targetId: 200 }],
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (views.includes('mMatchupScore')) {
      return new Response(
        JSON.stringify({
          schedule: [
            {
              winner: 'HOME',
              home: {
                teamId: 1,
                totalPointsLive: 110,
                rosterForMatchupPeriod: { entries: [], appliedStatTotal: 110 },
              },
              away: {
                teamId: 2,
                totalPointsLive: 95,
                rosterForMatchupPeriod: { entries: [], appliedStatTotal: 95 },
              },
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (views.includes('mMatchup')) {
      return new Response(JSON.stringify(league), { status: 200 });
    }

    if (url.pathname.includes('/segments/0/leagues/123456')) {
      return new Response(JSON.stringify(league), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'not found', url: url.toString() }), {
      status: 404,
    });
  };
}

  it('loads league data via create()', async () => {
    const league = await League.create({
      leagueId: 123456,
      seasonId: 2025,
      fetch: createLeagueFetch(),
    });

    expect(league.settings.name).toBe('Test League');
    expect(league.teams).toHaveLength(2);
    expect(league.teams[0]!.teamName).toBe('Team Alpha');
    expect(league.teams[0]!.roster[0]!.name).toBe('Test Player');
    expect(league.playerMap[100]).toBe('Test Player');
    expect(league.draft).toHaveLength(1);
    expect(league.draft[0]!.playerName).toBe('Test Player');
  });

  it('returns sorted standings', async () => {
    const league = await League.create({
      leagueId: 123456,
      seasonId: 2025,
      fetch: createLeagueFetch(),
    });

    const standings = league.standings();
    expect(standings[0]!.teamId).toBe(1);
    expect(standings[1]!.teamId).toBe(2);
  });

  it('fetches scoreboard for current period', async () => {
    const league = await League.create({
      leagueId: 123456,
      seasonId: 2025,
      fetch: createLeagueFetch(),
    });

    const matchups = await league.scoreboard();
    expect(matchups.length).toBeGreaterThan(0);
    expect(typeof matchups[0]!.homeTeam).toBe('object');
  });

  it('fetches free agents with filter header', async () => {
    const league = await League.create({
      leagueId: 123456,
      seasonId: 2025,
      fetch: createLeagueFetch(),
    });

    const agents = await league.freeAgents({ size: 10 });
    expect(agents[0]!.name).toBe('Free Agent Player');
  });

  it('fetches transactions', async () => {
    const league = await League.create({
      leagueId: 123456,
      seasonId: 2025,
      fetch: createLeagueFetch(),
    });

    const transactions = await league.transactions();
    expect(transactions[0]!.type).toBe('FREEAGENT');
    expect(transactions[0]!.items[0]!.player).toBe('Free Agent Player');
  });

  it('fetches recent activity', async () => {
    const league = await League.create({
      leagueId: 123456,
      seasonId: 2025,
      fetch: createLeagueFetch(),
    });

    const activity = await league.recentActivity();
    expect(activity[0]!.actions[0]!.action).toBe('FA ADDED');
    expect(activity[0]!.actions[0]!.player).toBe('Free Agent Player');
  });

  it('fetches box scores', async () => {
    const league = await League.create({
      leagueId: 123456,
      seasonId: 2025,
      fetch: createLeagueFetch(),
    });

    const boxScores = await league.boxScores({ matchupPeriod: 5, scoringPeriod: 10 });
    expect(boxScores).toHaveLength(1);
    expect('homeScore' in boxScores[0]!).toBe(true);
  });
});
