import { YahooClient } from '../client.js';
import type { YahooClient as YahooClientType } from '../client.js';
import type { PlayerStatus } from '../constants.js';
import { resolveLeagueKey } from '../keys.js';
import {
  collectIndexedResources,
  flattenLeagueNode,
  flattenResource,
  getFantasyContent,
} from '../parse.js';
import { fetchLeaguePlayerStats, Player } from './player.js';
import { parseMatchupsFromScoreboard } from './matchup.js';
import { parseSettingsFromResponse, type Settings } from './settings.js';
import { Team } from './team.js';
import { Transaction } from './transaction.js';
import type { JsonObject } from '../types/raw.js';
import type { Matchup } from './matchup.js';

export interface LeagueOptions {
  client: YahooClientType;
  leagueKey: string;
}

export interface LeagueCreateOptions {
  leagueKey?: string;
  leagueId?: string | number;
  season?: string | number;
  accessToken: string;
  fetch?: typeof globalThis.fetch;
  refreshAccessToken?: () => Promise<string>;
  fetchLeague?: boolean;
}

export interface LeaguePlayersFilters {
  start?: number;
  count?: number;
  status?: PlayerStatus | string;
  position?: string;
  search?: string;
  sort?: string;
  sortType?: string;
  sortSeason?: string | number;
  sortDate?: string;
  sortWeek?: number;
}

export interface LeagueTransactionsFilters {
  type?: string;
  types?: string[];
  teamKey?: string;
  count?: number;
}

export class League {
  readonly client: YahooClientType;
  readonly leagueKey: string;
  settings?: Settings;
  teams: JsonObject[] = [];

  constructor(options: LeagueOptions) {
    this.client = options.client;
    this.leagueKey = options.leagueKey;
  }

  static async create(options: LeagueCreateOptions): Promise<League> {
    const client = new YahooClient({
      accessToken: options.accessToken,
      fetch: options.fetch,
      refreshAccessToken: options.refreshAccessToken,
    });

    let leagueKey = options.leagueKey;
    if (!leagueKey) {
      if (options.leagueId === undefined || options.season === undefined) {
        throw new Error('Provide leagueKey or both leagueId and season');
      }
      leagueKey = await resolveLeagueKey({
        leagueId: options.leagueId,
        season: options.season,
        client,
      });
    }

    const league = new League({ client, leagueKey });
    if (options.fetchLeague !== false) {
      await league.fetchLeague();
    }
    return league;
  }

  async fetchLeague(): Promise<void> {
    this.settings = await this.fetchSettings();
    this.teams = await this.teamsList();
  }

  async metadata(): Promise<JsonObject> {
    const doc = await this.client.get(`league/${this.leagueKey}`);
    const content = getFantasyContent(doc);
    return flattenLeagueNode(content.league);
  }

  async fetchSettings(): Promise<Settings> {
    const doc = await this.client.get(`league/${this.leagueKey}/settings`);
    return parseSettingsFromResponse(doc);
  }

  async standings(): Promise<JsonObject[]> {
    const doc = await this.client.get(`league/${this.leagueKey}/standings`);
    const content = getFantasyContent(doc);
    const league = flattenLeagueNode(content.league);

    let teamsNode = league.teams;
    if (!teamsNode || typeof teamsNode !== 'object' || Array.isArray(teamsNode)) {
      const standingsFlat = flattenResource(league.standings ?? {});
      teamsNode = standingsFlat.teams;
    }

    if (!teamsNode || typeof teamsNode !== 'object' || Array.isArray(teamsNode)) {
      return [];
    }
    return collectIndexedResources(teamsNode, 'team');
  }

  async scoreboard(week?: number): Promise<Matchup[]> {
    const suffix = week !== undefined ? `;week=${week}` : '';
    const doc = await this.client.get(`league/${this.leagueKey}/scoreboard${suffix}`);
    return parseMatchupsFromScoreboard(doc);
  }

  async teamsList(): Promise<JsonObject[]> {
    const doc = await this.client.get(`league/${this.leagueKey}/teams`);
    const content = getFantasyContent(doc);
    const league = flattenLeagueNode(content.league);
    const teamsNode = league.teams;
    if (!teamsNode || typeof teamsNode !== 'object' || Array.isArray(teamsNode)) {
      return [];
    }
    return collectIndexedResources(teamsNode, 'team');
  }

  async players(filters: LeaguePlayersFilters = {}): Promise<JsonObject[]> {
    const parts: string[] = [];
    if (filters.start !== undefined) {
      parts.push(`start=${filters.start}`);
    }
    if (filters.count !== undefined) {
      parts.push(`count=${filters.count}`);
    } else {
      parts.push('count=25');
    }
    if (filters.status !== undefined) {
      parts.push(`status=${filters.status}`);
    }
    if (filters.position !== undefined) {
      parts.push(`position=${filters.position}`);
    }
    if (filters.search !== undefined) {
      parts.push(`search=${encodeURIComponent(filters.search)}`);
    }
    if (filters.sort !== undefined) {
      parts.push(`sort=${filters.sort}`);
    }
    if (filters.sortType !== undefined) {
      parts.push(`sort_type=${filters.sortType}`);
    }
    if (filters.sortSeason !== undefined) {
      parts.push(`sort_season=${filters.sortSeason}`);
    }
    if (filters.sortDate !== undefined) {
      parts.push(`sort_date=${filters.sortDate}`);
    }
    if (filters.sortWeek !== undefined) {
      parts.push(`sort_week=${filters.sortWeek}`);
    }

    const filterStr = parts.length > 0 ? `;${parts.join(';')}` : '';
    const doc = await this.client.get(`league/${this.leagueKey}/players${filterStr}`);
    const content = getFantasyContent(doc);
    const league = flattenLeagueNode(content.league);
    const playersNode = league.players;
    if (!playersNode || typeof playersNode !== 'object' || Array.isArray(playersNode)) {
      return [];
    }
    return collectIndexedResources(playersNode, 'player');
  }

  async draftResults(): Promise<JsonObject> {
    const doc = await this.client.get(`league/${this.leagueKey}/draftresults`);
    return getFantasyContent(doc);
  }

  async transactions(filters: LeagueTransactionsFilters = {}): Promise<JsonObject[]> {
    const parts: string[] = [];
    if (filters.type !== undefined) {
      parts.push(`type=${filters.type}`);
    }
    if (filters.types?.length) {
      parts.push(`types=${filters.types.join(',')}`);
    }
    if (filters.teamKey !== undefined) {
      parts.push(`team_key=${filters.teamKey}`);
    }
    if (filters.count !== undefined) {
      parts.push(`count=${filters.count}`);
    }

    const filterStr = parts.length > 0 ? `;${parts.join(';')}` : '';
    const doc = await this.client.get(`league/${this.leagueKey}/transactions${filterStr}`);
    const content = getFantasyContent(doc);
    const league = flattenLeagueNode(content.league);
    const txNode = league.transactions;
    if (!txNode || typeof txNode !== 'object' || Array.isArray(txNode)) {
      return [];
    }
    return collectIndexedResources(txNode, 'transaction');
  }

  async playerStats(
    playerIds: Array<string | number>,
    reqType = 'date',
    date?: string,
  ): Promise<JsonObject> {
    return fetchLeaguePlayerStats(this.client, this.leagueKey, {
      playerIds,
      reqType,
      date,
    });
  }

  toTeam(teamKey: string): Team {
    return new Team({ client: this.client, teamKey });
  }

  toPlayer(playerKey: string): Player {
    return new Player({ client: this.client, playerKey, leagueKey: this.leagueKey });
  }

  toTransaction(transactionKey: string): Transaction {
    return new Transaction(this.client, transactionKey);
  }

  async postTransactionXml(xml: string): Promise<Response> {
    return this.client.post(`league/${this.leagueKey}/transactions`, xml);
  }
}
