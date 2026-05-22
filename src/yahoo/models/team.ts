import type { YahooClient } from '../client.js';
import { buildStatsUriParams } from '../keys.js';
import { getFantasyContent } from '../parse.js';
import { buildRosterXml } from '../xml.js';
import type { JsonObject } from '../types/raw.js';
import { parseMatchupsFromTeam } from './matchup.js';
import type { Matchup } from './matchup.js';
import { parseRosterFromResponse } from './roster.js';
import type { Roster } from './roster.js';

export interface TeamOptions {
  client: YahooClient;
  teamKey: string;
}

export interface TeamStatsOptions {
  type?: string;
  date?: string;
  week?: number;
  season?: number;
}

export interface TeamRosterOptions {
  date?: string;
  week?: number;
}

export interface TeamMatchupsOptions {
  weeks?: number[];
}

export class Team {
  readonly client: YahooClient;
  readonly teamKey: string;

  constructor(options: TeamOptions) {
    this.client = options.client;
    this.teamKey = options.teamKey;
  }

  async metadata(): Promise<JsonObject> {
    const doc = await this.client.get(`team/${this.teamKey}`);
    return getFantasyContent(doc);
  }

  async stats(options: TeamStatsOptions = {}): Promise<JsonObject> {
    const type = options.type ?? 'date';
    const params = buildStatsUriParams(type, options);
    const doc = await this.client.get(`team/${this.teamKey}/stats;${params}`);
    return getFantasyContent(doc);
  }

  async standings(): Promise<JsonObject> {
    const doc = await this.client.get(`team/${this.teamKey}/standings`);
    return getFantasyContent(doc);
  }

  async roster(options: TeamRosterOptions = {}): Promise<Roster> {
    let suffix = '';
    if (options.date !== undefined) {
      suffix = `;date=${options.date}`;
    } else if (options.week !== undefined) {
      suffix = `;week=${options.week}`;
    }
    const doc = await this.client.get(`team/${this.teamKey}/roster${suffix}`);
    return parseRosterFromResponse(doc);
  }

  async draftResults(): Promise<JsonObject> {
    const doc = await this.client.get(`team/${this.teamKey}/draftresults`);
    return getFantasyContent(doc);
  }

  async matchups(options: TeamMatchupsOptions = {}): Promise<Matchup[]> {
    let suffix = '';
    if (options.weeks?.length) {
      suffix = `;weeks=${options.weeks.join(',')}`;
    }
    const doc = await this.client.get(`team/${this.teamKey}/matchups${suffix}`);
    return parseMatchupsFromTeam(doc);
  }

  async setLineup(options: { date: string; moves: Array<{ playerKey: string; position: string }> }): Promise<Response> {
    const xml = buildRosterXml(options);
    return this.client.put(`team/${this.teamKey}/roster`, xml);
  }
}
