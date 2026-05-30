import { League as EspnLeague } from '../espn/league.js';
import { League as YahooLeague } from '../yahoo/models/league.js';
import { readEspnConfig, readYahooConfig, type EspnConfig, type YahooConfig } from './config.js';

function espnCacheKey(config: EspnConfig): string {
  return `espn:${config.leagueId}:${config.seasonId}:${config.espnS2 ?? ''}:${config.swid ?? ''}`;
}

function yahooCacheKey(config: YahooConfig): string {
  return `yahoo:${config.accessToken}:${config.leagueKey ?? ''}:${config.leagueId ?? ''}:${config.season ?? ''}`;
}

const espnLeagues = new Map<string, Promise<EspnLeague>>();
const yahooLeagues = new Map<string, Promise<YahooLeague>>();

export async function getEspnLeague(): Promise<EspnLeague> {
  const config = readEspnConfig();
  const key = espnCacheKey(config);
  let cached = espnLeagues.get(key);
  if (!cached) {
    cached = EspnLeague.create({
      leagueId: config.leagueId,
      seasonId: config.seasonId,
      espnS2: config.espnS2,
      swid: config.swid,
    });
    espnLeagues.set(key, cached);
  }
  return cached;
}

export async function getYahooLeague(): Promise<YahooLeague> {
  const config = readYahooConfig();
  const key = yahooCacheKey(config);
  let cached = yahooLeagues.get(key);
  if (!cached) {
    cached = YahooLeague.create({
      accessToken: config.accessToken,
      leagueKey: config.leagueKey,
      leagueId: config.leagueId,
      season: config.season,
    });
    yahooLeagues.set(key, cached);
  }
  return cached;
}

/** Clears in-process league caches (for tests). */
export function clearLeagueContextCache(): void {
  espnLeagues.clear();
  yahooLeagues.clear();
}
