import type { YahooClient } from '../client.js';
import {
  buildPlayerKeysFromIds,
  buildStatsUriParams,
  gameIdFromLeagueKey,
  joinKeys,
} from '../keys.js';
import type { JsonObject } from '../types/raw.js';
import { getFantasyContent } from '../parse.js';

export interface PlayerOptions {
  client: YahooClient;
  playerKey: string;
  leagueKey?: string;
}

export interface PlayerStatsOptions {
  type?: string;
  date?: string;
  week?: number;
  season?: number;
}

export class Player {
  readonly client: YahooClient;
  readonly playerKey: string;
  readonly leagueKey?: string;

  constructor(options: PlayerOptions) {
    this.client = options.client;
    this.playerKey = options.playerKey;
    this.leagueKey = options.leagueKey;
  }

  async metadata(): Promise<JsonObject> {
    const doc = await this.client.get(`player/${this.playerKey}`);
    return getFantasyContent(doc);
  }

  async stats(options: PlayerStatsOptions = {}): Promise<JsonObject> {
    const type = options.type ?? 'season';
    const params = buildStatsUriParams(type, options);
    const doc = await this.client.get(`player/${this.playerKey}/stats;${params}`);
    return getFantasyContent(doc);
  }

  async ownership(leagueKey?: string): Promise<JsonObject> {
    const key = leagueKey ?? this.leagueKey;
    if (!key) {
      throw new Error('leagueKey is required for ownership lookup');
    }
    const doc = await this.client.get(
      `league/${key}/players;player_keys=${this.playerKey}/ownership`,
    );
    return getFantasyContent(doc);
  }

  async percentOwned(): Promise<JsonObject> {
    const doc = await this.client.get(`player/${this.playerKey}/percent_owned`);
    return getFantasyContent(doc);
  }

  async draftAnalysis(): Promise<JsonObject> {
    const doc = await this.client.get(`player/${this.playerKey}/draft_analysis`);
    return getFantasyContent(doc);
  }
}

export interface LeaguePlayerStatsOptions {
  playerIds: Array<string | number>;
  reqType?: string;
  date?: string;
  week?: number;
  season?: number;
}

export async function fetchLeaguePlayerStats(
  client: YahooClient,
  leagueKey: string,
  options: LeaguePlayerStatsOptions,
): Promise<JsonObject> {
  const reqType = options.reqType ?? 'date';
  const playerKeys = buildPlayerKeysFromIds(leagueKey, options.playerIds);
  const statsParams = buildStatsUriParams(reqType, options);
  const doc = await client.get(
    `league/${leagueKey}/players;player_keys=${joinKeys(playerKeys)}/stats;${statsParams}`,
  );
  return getFantasyContent(doc);
}

export function playerKeyFromLeague(leagueKey: string, playerId: string | number): string {
  const gameId = gameIdFromLeagueKey(leagueKey);
  return `${gameId}.p.${playerId}`;
}
