import { GAME_CODE } from '../constants.js';
import type { YahooClient } from '../client.js';
import { joinKeys } from '../keys.js';
import { collectLeagueKeys, getFantasyContent } from '../parse.js';
import { parseGameId, parseGameMetadata } from './settings.js';
import type { JsonObject } from '../types/raw.js';
import { League } from './league.js';

export interface GameOptions {
  client: YahooClient;
  gameKey?: string;
}

export interface LeagueKeysFilters {
  isAvailable?: boolean;
  gameTypes?: string[];
  gameCodes?: string[];
  seasons?: string[];
}

export class Game {
  readonly client: YahooClient;
  readonly gameKey: string;

  constructor(options: GameOptions) {
    this.client = options.client;
    this.gameKey = options.gameKey ?? GAME_CODE;
  }

  static forNba(client: YahooClient, season?: string | number): Game {
    const gameKey = season !== undefined ? String(season) : GAME_CODE;
    return new Game({ client, gameKey });
  }

  async metadata(): Promise<JsonObject> {
    const doc = await this.client.get(`game/${this.gameKey}`);
    return parseGameMetadata(doc);
  }

  async gameId(): Promise<string> {
    const doc = await this.client.get(`game/${this.gameKey}`);
    const id = parseGameId(doc);
    if (!id) {
      throw new Error(`Could not resolve game_id for ${this.gameKey}`);
    }
    return id;
  }

  async leagues(leagueKeys: string[]): Promise<JsonObject> {
    const doc = await this.client.get(
      `game/${this.gameKey}/leagues;league_keys=${joinKeys(leagueKeys)}`,
    );
    return getFantasyContent(doc);
  }

  async players(playerKeys: string[]): Promise<JsonObject> {
    const doc = await this.client.get(
      `game/${this.gameKey}/players;player_keys=${joinKeys(playerKeys)}`,
    );
    return getFantasyContent(doc);
  }

  async dates(): Promise<JsonObject> {
    const doc = await this.client.get(`game/${this.gameKey}/dates`);
    return getFantasyContent(doc);
  }

  async gameWeeks(): Promise<JsonObject> {
    const doc = await this.client.get(`game/${this.gameKey}/game_weeks`);
    return getFantasyContent(doc);
  }

  async statCategories(): Promise<JsonObject> {
    const doc = await this.client.get(`game/${this.gameKey}/stat_categories`);
    return getFantasyContent(doc);
  }

  async positionTypes(): Promise<JsonObject> {
    const doc = await this.client.get(`game/${this.gameKey}/position_types`);
    return getFantasyContent(doc);
  }

  async rosterPositions(): Promise<JsonObject> {
    const doc = await this.client.get(`game/${this.gameKey}/roster_positions`);
    return getFantasyContent(doc);
  }

  async leagueKeys(filters: LeagueKeysFilters = {}): Promise<string[]> {
    const params = new URLSearchParams();
    params.set('use_login', '1');
    params.set('is_available', filters.isAvailable ? '1' : '0');
    params.set('game_types', filters.gameTypes?.join(',') ?? '');
    params.set('game_codes', filters.gameCodes?.join(',') ?? GAME_CODE);
    params.set('seasons', filters.seasons?.join(',') ?? '');

    const doc = await this.client.get(`users/games/leagues?${params.toString()}`);
    return collectLeagueKeys(doc);
  }

  toLeague(leagueKey: string): League {
    return new League({ client: this.client, leagueKey });
  }
}
