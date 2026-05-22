import { GAME_CODE } from './constants.js';
import type { YahooClient } from './client.js';
import { findFirstString, getFantasyContent } from './parse.js';

export function buildLeagueKey(gameId: string | number, leagueId: string | number): string {
  return `${gameId}.l.${leagueId}`;
}

export function buildTeamKey(leagueKey: string, teamId: string | number): string {
  return `${leagueKey}.t.${teamId}`;
}

export function buildPlayerKey(gameId: string | number, playerId: string | number): string {
  return `${gameId}.p.${playerId}`;
}

export function parseLeagueKey(leagueKey: string): {
  gameId: string;
  leagueId: string;
} {
  const match = /^(.+)\.l\.(.+)$/.exec(leagueKey);
  if (!match) {
    throw new Error(`Invalid league key format: ${leagueKey}`);
  }
  return { gameId: match[1]!, leagueId: match[2]! };
}

export function parseTeamKey(teamKey: string): {
  leagueKey: string;
  teamId: string;
} {
  const dotIndex = teamKey.lastIndexOf('.t.');
  if (dotIndex <= 0) {
    throw new Error(`Invalid team key format: ${teamKey}`);
  }
  return {
    leagueKey: teamKey.slice(0, dotIndex),
    teamId: teamKey.slice(dotIndex + 3),
  };
}

export function gameIdFromLeagueKey(leagueKey: string): string {
  return parseLeagueKey(leagueKey).gameId;
}

export interface ResolveLeagueKeyOptions {
  leagueId: string | number;
  season: string | number;
  gameId?: string | number;
  client: YahooClient;
}

export async function resolveLeagueKey(options: ResolveLeagueKeyOptions): Promise<string> {
  if (options.gameId !== undefined) {
    return buildLeagueKey(options.gameId, options.leagueId);
  }

  const season = String(options.season);
  const doc = await options.client.get(`games;game_codes=${GAME_CODE};seasons=${season}`);
  const content = getFantasyContent(doc);
  const gameId = findFirstString(content, 'game_id') ?? findFirstString(content, 'game_key');

  if (!gameId) {
    throw new Error(`Could not resolve NBA game_id for season ${season}`);
  }

  return buildLeagueKey(gameId, options.leagueId);
}

export function buildPlayerKeysFromIds(
  leagueKey: string,
  playerIds: Array<string | number>,
): string[] {
  const gameId = gameIdFromLeagueKey(leagueKey);
  return playerIds.map((id) => buildPlayerKey(gameId, id));
}

export function joinKeys(keys: string[]): string {
  return keys.join(',');
}

export function buildStatsUriParams(
  type: string,
  options: { date?: string; week?: number; season?: number },
): string {
  if (type === 'season') {
    return options.season !== undefined ? `type=season;season=${options.season}` : 'type=season';
  }
  if (type === 'average_season') {
    return options.season !== undefined
      ? `type=average_season;season=${options.season}`
      : 'type=average_season';
  }
  if (type === 'week') {
    return options.week !== undefined ? `type=week;week=${options.week}` : 'type=week';
  }
  if (type === 'date') {
    return options.date !== undefined ? `type=date;date=${options.date}` : 'type=date';
  }
  if (type === 'lastweek' || type === 'lastmonth') {
    return `type=${type}`;
  }
  return `type=${type}`;
}

export function buildPlayerFilterParams(filters: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.join(';');
}
