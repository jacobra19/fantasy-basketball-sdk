import type { YahooClient } from '../client.js';
import { GAME_CODE } from '../constants.js';
import { joinKeys } from '../keys.js';
import { getFantasyContent } from '../parse.js';
import type { JsonObject } from '../types/raw.js';

export interface UserOptions {
  client: YahooClient;
}

export interface UserGamesFilters {
  isAvailable?: boolean;
  gameKeys?: string[];
}

export class User {
  readonly client: YahooClient;

  constructor(options: UserOptions) {
    this.client = options.client;
  }

  static create(client: YahooClient): User {
    return new User({ client });
  }

  async profile(): Promise<JsonObject> {
    const doc = await this.client.get('users;use_login=1');
    return getFantasyContent(doc);
  }

  async games(filters: UserGamesFilters = {}): Promise<JsonObject> {
    let path = 'users;use_login=1/games';
    const parts: string[] = [];
    if (filters.isAvailable) {
      parts.push('is_available=1');
    }
    if (filters.gameKeys?.length) {
      parts.push(`game_keys=${joinKeys(filters.gameKeys)}`);
    }
    if (parts.length > 0) {
      path = `users;use_login=1/games;${parts.join(';')}`;
    }
    const doc = await this.client.get(path);
    return getFantasyContent(doc);
  }

  async leagues(gameKeys?: string[]): Promise<JsonObject> {
    const keys = gameKeys?.length ? joinKeys(gameKeys) : GAME_CODE;
    const doc = await this.client.get(`users;use_login=1/games;game_keys=${keys}/leagues`);
    return getFantasyContent(doc);
  }

  async teams(gameKeys?: string[]): Promise<JsonObject> {
    const keys = gameKeys?.length ? joinKeys(gameKeys) : GAME_CODE;
    const doc = await this.client.get(`users;use_login=1/games;game_keys=${keys}/teams`);
    return getFantasyContent(doc);
  }
}
