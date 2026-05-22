import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  collectIndexedResources,
  flattenLeagueNode,
  flattenResource,
  getFantasyContent,
} from '../../src/yahoo/parse.js';
import {
  buildAddDropXml,
  buildAddPlayerXml,
  buildDropPlayerXml,
  buildEditWaiverXml,
  buildRosterXml,
  buildTradeActionXml,
} from '../../src/yahoo/xml.js';
import { buildLeagueKey, buildPlayerKey, buildTeamKey, parseLeagueKey } from '../../src/yahoo/keys.js';

import type { JsonObject } from '../../src/yahoo/types/raw.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '../fixtures/yahoo');

function loadFixture(name: string): JsonObject {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8')) as JsonObject;
}

describe('parse utilities', () => {
  it('flattens positional league resource pairs', () => {
    const doc = loadFixture('league-settings.json');
    const content = getFantasyContent(doc);
    const merged = flattenLeagueNode(content.league);

    expect(merged.league_key).toBe('466.l.1000');
    expect(merged.draft_type).toBe('live');
    expect(merged.uses_faab).toBe('1');
  });

  it('collects indexed teams from standings', () => {
    const doc = loadFixture('standings.json');
    const content = getFantasyContent(doc);
    const league = flattenLeagueNode(content.league);
    const teamsNode = league.teams;
    const teams = collectIndexedResources(teamsNode ?? null, 'team');

    expect(teams).toHaveLength(2);
    expect(teams[0]?.name).toBe('Alpha Squad');
    expect(teams[0]?.team_standings).toBeDefined();
  });
});

describe('key builders', () => {
  it('builds and parses league keys', () => {
    const key = buildLeagueKey(466, 1000);
    expect(key).toBe('466.l.1000');
    expect(parseLeagueKey(key)).toEqual({ gameId: '466', leagueId: '1000' });
  });

  it('builds team and player keys', () => {
    expect(buildTeamKey('466.l.1000', 1)).toBe('466.l.1000.t.1');
    expect(buildPlayerKey(466, 1234)).toBe('466.p.1234');
  });
});

describe('XML builders', () => {
  it('builds NBA roster XML with date coverage', () => {
    const xml = buildRosterXml({
      date: '2025-01-15',
      moves: [
        { playerKey: '466.p.1001', position: 'PG' },
        { playerKey: '466.p.1002', position: 'BN' },
      ],
    });

    expect(xml).toContain('<coverage_type>date</coverage_type>');
    expect(xml).toContain('<date>2025-01-15</date>');
    expect(xml).toContain('<position>PG</position>');
    expect(xml).toContain('<position>BN</position>');
  });

  it('builds add/drop transaction XML', () => {
    const xml = buildAddDropXml({
      teamKey: '466.l.1000.t.1',
      addPlayerKey: '466.p.2001',
      dropPlayerKey: '466.p.2002',
      faabBid: 20,
    });

    expect(xml).toContain('<type>add/drop</type>');
    expect(xml).toContain('<faab_bid>20</faab_bid>');
  });

  it('builds add player XML with FAAB', () => {
    const xml = buildAddPlayerXml('466.l.1000.t.1', '466.p.2001', { faabBid: 10 });
    expect(xml).toContain('<type>add</type>');
    expect(xml).toContain('<faab_bid>10</faab_bid>');
  });

  it('builds drop player XML', () => {
    const xml = buildDropPlayerXml('466.l.1000.t.1', '466.p.2002');
    expect(xml).toContain('<type>drop</type>');
    expect(xml).toContain('466.p.2002');
  });

  it('builds edit waiver XML', () => {
    const xml = buildEditWaiverXml({
      transactionKey: '466.l.1000.w.c.1',
      waiverPriority: 1,
      faabBid: 25,
    });

    expect(xml).toContain('<type>waiver</type>');
    expect(xml).toContain('<waiver_priority>1</waiver_priority>');
    expect(xml).toContain('<faab_bid>25</faab_bid>');
  });

  it('builds trade action XML', () => {
    const xml = buildTradeActionXml({
      transactionKey: '466.l.1000.pt.1',
      action: 'accept',
      note: 'Fair trade',
    });

    expect(xml).toContain('<action>accept</action>');
    expect(xml).toContain('<trade_note>Fair trade</trade_note>');
  });
});
