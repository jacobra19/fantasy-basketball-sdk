import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { YahooClient } from '../../src/yahoo/client.js';
import { YahooAccessDenied, YahooTokenExpired } from '../../src/yahoo/errors.js';
import { Game } from '../../src/yahoo/models/game.js';
import { League } from '../../src/yahoo/models/league.js';
import { Team } from '../../src/yahoo/models/team.js';
import {
  addPlayer,
  cancelTransaction,
  dropPlayer,
} from '../../src/yahoo/write/transactions.js';
import { setLineup } from '../../src/yahoo/write/roster.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '../fixtures/yahoo');

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8')) as T;
}

function createMockFetch(handlers: Record<string, unknown>): typeof globalThis.fetch {
  return async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [pattern, body] of Object.entries(handlers)) {
      if (url.includes(pattern)) {
        if (body instanceof Response) {
          return body;
        }
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    return new Response(JSON.stringify({ error: 'not found', url }), { status: 404 });
  };
}

describe('YahooClient', () => {
  it('sends Bearer auth and format=json on GET', async () => {
    const game = loadFixture('game-nba.json');
    let capturedUrl = '';
    let capturedAuth = '';

    const fetchFn: typeof globalThis.fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedAuth = new Headers(init?.headers).get('Authorization') ?? '';
      return new Response(JSON.stringify(game), { status: 200 });
    };

    const client = new YahooClient({ accessToken: 'test-token', fetch: fetchFn });
    await client.get('game/nba');

    expect(capturedUrl).toContain('format=json');
    expect(capturedAuth).toBe('Bearer test-token');
  });

  it('refreshes token on 401 token_expired and retries', async () => {
    const game = loadFixture('game-nba.json');
    let callCount = 0;
    let refreshed = false;

    const fetchFn: typeof globalThis.fetch = async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response(JSON.stringify({ error: 'token_expired' }), { status: 401 });
      }
      return new Response(JSON.stringify(game), { status: 200 });
    };

    const client = new YahooClient({
      accessToken: 'old-token',
      fetch: fetchFn,
      refreshAccessToken: async () => {
        refreshed = true;
        return 'new-token';
      },
    });

    const result = await client.get('game/nba');
    expect(refreshed).toBe(true);
    expect(callCount).toBe(2);
    expect(result.fantasy_content).toBeDefined();
  });

  it('throws YahooTokenExpired when refresh unavailable', async () => {
    const client = new YahooClient({
      accessToken: 'old-token',
      fetch: async () =>
        new Response(JSON.stringify({ error: 'token_expired' }), { status: 401 }),
    });

    await expect(client.get('game/nba')).rejects.toBeInstanceOf(YahooTokenExpired);
  });

  it('throws YahooAccessDenied on 401 without refresh', async () => {
    const client = new YahooClient({
      accessToken: 'bad-token',
      fetch: async () => new Response('Unauthorized', { status: 401 }),
    });

    await expect(client.get('game/nba')).rejects.toBeInstanceOf(YahooAccessDenied);
  });

  it('POST sends XML with application/xml content type', async () => {
    let method = '';
    let contentType = '';

    const fetchFn: typeof globalThis.fetch = async (_input, init) => {
      method = init?.method ?? '';
      contentType = new Headers(init?.headers).get('Content-Type') ?? '';
      return new Response('', { status: 201 });
    };

    const client = new YahooClient({ accessToken: 'token', fetch: fetchFn });
    await client.post('league/466.l.1000/transactions', '<fantasy_content/>');

    expect(method).toBe('POST');
    expect(contentType).toBe('application/xml');
  });
});

describe('Game', () => {
  it('resolves game_id from metadata', async () => {
    const gameFixture = loadFixture('game-nba.json');
    const client = new YahooClient({
      accessToken: 'token',
      fetch: createMockFetch({ 'game/nba': gameFixture }),
    });

    const game = Game.forNba(client);
    await expect(game.gameId()).resolves.toBe('466');
  });
});

describe('League', () => {
  const leagueKey = '466.l.1000';

  function createLeagueClient(): YahooClient {
    return new YahooClient({
      accessToken: 'token',
      fetch: createMockFetch({
        [`league/${leagueKey}/settings`]: loadFixture('league-settings.json'),
        [`league/${leagueKey}/teams`]: loadFixture('teams.json'),
        [`league/${leagueKey}/standings`]: loadFixture('standings.json'),
        [`league/${leagueKey}/scoreboard`]: loadFixture('scoreboard.json'),
        'status=FA': loadFixture('players-fa.json'),
        [`league/${leagueKey}/transactions`]: loadFixture('transactions.json'),
        [`league/${leagueKey}/draftresults`]: loadFixture('draftresults.json'),
        [`league/${leagueKey}`]: loadFixture('league-metadata.json'),
      }),
    });
  }

  it('loads league settings and teams on create', async () => {
    const client = createLeagueClient();
    const direct = new League({ client, leagueKey });
    await direct.fetchLeague();

    expect(direct.settings?.name).toBe('Test NBA League');
    expect(direct.settings?.gameCode).toBe('nba');
    expect(direct.teams).toHaveLength(2);
  });

  it('returns standings with team records', async () => {
    const client = createLeagueClient();
    const league = new League({ client, leagueKey });
    const standings = await league.standings();

    expect(standings).toHaveLength(2);
    expect(standings[0]?.name).toBe('Alpha Squad');
    expect(standings[0]?.team_standings).toBeDefined();
  });

  it('returns scoreboard matchups', async () => {
    const client = createLeagueClient();
    const league = new League({ client, leagueKey });
    const matchups = await league.scoreboard();

    expect(matchups).toHaveLength(1);
    expect(matchups[0]?.week).toBe(12);
    expect(matchups[0]?.winnerTeamKey).toBe('466.l.1000.t.1');
  });

  it('returns free agents with FA filter', async () => {
    const client = createLeagueClient();
    const league = new League({ client, leagueKey });
    const players = await league.players({ status: 'FA', count: 25 });

    expect(players).toHaveLength(1);
    expect(players[0]?.name).toEqual({ full: 'Free Agent Player' });
  });

  it('returns transactions', async () => {
    const client = createLeagueClient();
    const league = new League({ client, leagueKey });
    const transactions = await league.transactions();

    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.type).toBe('add/drop');
  });
});

describe('Team', () => {
  it('parses date-based roster', async () => {
    const roster = loadFixture('roster.json');
    const client = new YahooClient({
      accessToken: 'token',
      fetch: createMockFetch({
        'team/466.l.1000.t.1/roster': roster,
      }),
    });

    const team = new Team({ client, teamKey: '466.l.1000.t.1' });
    const result = await team.roster({ date: '2025-01-15' });

    expect(result.date).toBe('2025-01-15');
    expect(result.players).toHaveLength(2);
    expect(result.players[0]?.selectedPosition).toBe('PG');
  });
});

describe('write operations', () => {
  it('setLineup PUTs roster XML', async () => {
    let method = '';
    let body = '';

    const client = new YahooClient({
      accessToken: 'token',
      fetch: async (_input, init) => {
        method = init?.method ?? '';
        body = String(init?.body ?? '');
        return new Response('', { status: 200 });
      },
    });

    const team = new Team({ client, teamKey: '466.l.1000.t.1' });
    await setLineup(team, {
      date: '2025-01-15',
      moves: [{ playerKey: '466.p.1001', position: 'PG' }],
    });

    expect(method).toBe('PUT');
    expect(body).toContain('<coverage_type>date</coverage_type>');
    expect(body).toContain('<date>2025-01-15</date>');
    expect(body).toContain('466.p.1001');
  });

  it('addPlayer POSTs transaction XML', async () => {
    let method = '';
    let body = '';

    const client = new YahooClient({
      accessToken: 'token',
      fetch: async (_input, init) => {
        method = init?.method ?? '';
        body = String(init?.body ?? '');
        return new Response('', { status: 201 });
      },
    });

    const league = new League({ client, leagueKey: '466.l.1000' });
    await addPlayer(league, {
      teamKey: '466.l.1000.t.1',
      playerKey: '466.p.2001',
      faabBid: 15,
    });

    expect(method).toBe('POST');
    expect(body).toContain('<type>add</type>');
    expect(body).toContain('<faab_bid>15</faab_bid>');
  });

  it('cancelTransaction DELETEs transaction', async () => {
    let method = '';

    const client = new YahooClient({
      accessToken: 'token',
      fetch: async (_input, init) => {
        method = init?.method ?? '';
        return new Response('', { status: 200 });
      },
    });

    await cancelTransaction(client, '466.l.1000.w.c.1');
    expect(method).toBe('DELETE');
  });

  it('dropPlayer POSTs drop XML', async () => {
    let body = '';

    const client = new YahooClient({
      accessToken: 'token',
      fetch: async (_input, init) => {
        body = String(init?.body ?? '');
        return new Response('', { status: 201 });
      },
    });

    const league = new League({ client, leagueKey: '466.l.1000' });
    await dropPlayer(league, '466.l.1000.t.1', '466.p.2002');

    expect(body).toContain('<type>drop</type>');
    expect(body).toContain('466.p.2002');
  });
});
