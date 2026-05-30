import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  serializeYahooDraft,
  serializeYahooPlayers,
  serializeYahooTeams,
  serializeYahooTransactions,
} from '../src/mcp/serialize.js';
import {
  collectIndexedResources,
  flattenLeagueNode,
  flattenResource,
  getFantasyContent,
} from '../src/yahoo/parse.js';
import type { JsonObject } from '../src/yahoo/types/raw.js';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/yahoo');

function loadFixture(name: string): JsonObject {
  return JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf8')) as JsonObject;
}

describe('mcp serialize', () => {
  it('compacts Yahoo standings teams', () => {
    const doc = loadFixture('standings.json');
    const content = getFantasyContent(doc);
    const league = flattenLeagueNode(content.league);
    const standingsFlat = flattenResource(league.standings ?? {});
    const teams = serializeYahooTeams(
      collectIndexedResources(standingsFlat.teams ?? {}, 'team'),
    );

    expect(teams[0]).toMatchObject({
      teamId: '1',
      name: 'Alpha Squad',
      rank: '1',
      wins: '8',
      losses: '4',
    });
  });

  it('compacts Yahoo free-agent players', () => {
    const doc = loadFixture('players-fa.json');
    const content = getFantasyContent(doc);
    const league = flattenLeagueNode(content.league);
    const players = serializeYahooPlayers(
      collectIndexedResources(league.players ?? {}, 'player'),
    );

    expect(players[0]).toMatchObject({
      playerId: '2001',
      name: 'Free Agent Player',
      proTeam: 'LAL',
      percentOwned: '42',
    });
  });

  it('compacts Yahoo transactions', () => {
    const doc = loadFixture('transactions.json');
    const content = getFantasyContent(doc);
    const league = flattenLeagueNode(content.league);
    const transactions = serializeYahooTransactions(
      collectIndexedResources(league.transactions ?? {}, 'transaction'),
    );

    expect(transactions[0]).toMatchObject({
      transactionId: '1',
      type: 'add/drop',
      status: 'successful',
    });
    expect(transactions[0]?.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Added Player', action: 'add' }),
        expect.objectContaining({ name: 'Dropped Player', action: 'drop' }),
      ]),
    );
  });

  it('compacts Yahoo draft results', () => {
    const doc = loadFixture('draftresults.json');
    const picks = serializeYahooDraft(doc);
    expect(picks).toEqual([
      {
        pick: '1',
        round: '1',
        teamKey: '466.l.1000.t.1',
        playerKey: '466.p.3001',
      },
    ]);
  });
});
