import { describe, expect, it } from 'vitest';

import { readEspnConfig, readYahooConfig } from '../src/mcp/config.js';

describe('mcp config', () => {
  it('reads ESPN config from environment variables', () => {
    const previous = {
      ESPN_LEAGUE_ID: process.env.ESPN_LEAGUE_ID,
      ESPN_SEASON_ID: process.env.ESPN_SEASON_ID,
      ESPN_S2: process.env.ESPN_S2,
      ESPN_SWID: process.env.ESPN_SWID,
    };

    process.env.ESPN_LEAGUE_ID = '12345';
    process.env.ESPN_SEASON_ID = '2026';
    process.env.ESPN_S2 = 'cookie-value';
    process.env.ESPN_SWID = '{SWID}';

    expect(readEspnConfig()).toEqual({
      leagueId: 12345,
      seasonId: 2026,
      espnS2: 'cookie-value',
      swid: '{SWID}',
    });

    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('reads Yahoo config from league key', () => {
    const previous = {
      YAHOO_ACCESS_TOKEN: process.env.YAHOO_ACCESS_TOKEN,
      YAHOO_LEAGUE_KEY: process.env.YAHOO_LEAGUE_KEY,
      YAHOO_LEAGUE_ID: process.env.YAHOO_LEAGUE_ID,
      YAHOO_SEASON: process.env.YAHOO_SEASON,
    };

    process.env.YAHOO_ACCESS_TOKEN = 'token';
    process.env.YAHOO_LEAGUE_KEY = 'nba.l.12345';
    delete process.env.YAHOO_LEAGUE_ID;
    delete process.env.YAHOO_SEASON;

    expect(readYahooConfig()).toEqual({
      accessToken: 'token',
      leagueKey: 'nba.l.12345',
      leagueId: undefined,
      season: undefined,
    });

    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('reads Yahoo config from league id and season', () => {
    const previous = {
      YAHOO_ACCESS_TOKEN: process.env.YAHOO_ACCESS_TOKEN,
      YAHOO_LEAGUE_KEY: process.env.YAHOO_LEAGUE_KEY,
      YAHOO_LEAGUE_ID: process.env.YAHOO_LEAGUE_ID,
      YAHOO_SEASON: process.env.YAHOO_SEASON,
    };

    process.env.YAHOO_ACCESS_TOKEN = 'token';
    delete process.env.YAHOO_LEAGUE_KEY;
    process.env.YAHOO_LEAGUE_ID = '12345';
    process.env.YAHOO_SEASON = '2026';

    expect(readYahooConfig()).toEqual({
      accessToken: 'token',
      leagueKey: undefined,
      leagueId: '12345',
      season: '2026',
    });

    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
});
