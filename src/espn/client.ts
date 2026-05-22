import { FANTASY_BASE_ENDPOINT, NEWS_BASE_ENDPOINT, SPORT_PATH, View } from './constants.js';
import {
  EspnAccessDenied,
  EspnApiError,
  EspnInvalidLeague,
  assertEspnResponse,
} from './errors.js';
import type { EspnLeagueResponse, EspnProPlayer, EspnProScheduleResponse } from './types/raw.js';
import { buildCookieHeader, buildQueryString } from './utils.js';

export interface EspnClientOptions {
  leagueId: number;
  seasonId: number;
  espnS2?: string;
  swid?: string;
  fetch?: typeof globalThis.fetch;
}

export interface RequestOptions {
  params?: Record<string, string | number | string[] | number[] | undefined>;
  headers?: Record<string, string>;
  extend?: string;
}

export class EspnClient {
  readonly leagueId: number;
  readonly seasonId: number;

  private readonly fetchFn: typeof globalThis.fetch;
  private readonly cookieHeader: string | undefined;
  private readonly endpoint: string;
  private readonly newsEndpoint: string;
  private leagueEndpoint: string;

  constructor(options: EspnClientOptions) {
    this.leagueId = options.leagueId;
    this.seasonId = options.seasonId;
    this.fetchFn = options.fetch ?? globalThis.fetch;
    this.cookieHeader = buildCookieHeader(options.espnS2, options.swid);
    this.endpoint = `${FANTASY_BASE_ENDPOINT}${SPORT_PATH}/seasons/${options.seasonId}`;
    this.newsEndpoint = `${NEWS_BASE_ENDPOINT}${SPORT_PATH}/news/players`;
    this.leagueEndpoint = this.buildLeagueEndpoint(options.seasonId, options.leagueId);
  }

  private buildLeagueEndpoint(seasonId: number, leagueId: number): string {
    const base = `${FANTASY_BASE_ENDPOINT}${SPORT_PATH}`;
    if (seasonId < 2018) {
      return `${base}/leagueHistory/${leagueId}?seasonId=${seasonId}`;
    }
    return `${base}/seasons/${seasonId}/segments/0/leagues/${leagueId}`;
  }

  private swapLeagueEndpoint(): void {
    const base = `${FANTASY_BASE_ENDPOINT}${SPORT_PATH}`;
    if (this.leagueEndpoint.includes('/leagueHistory/')) {
      this.leagueEndpoint = `${base}/seasons/${this.seasonId}/segments/0/leagues/${this.leagueId}`;
    } else {
      this.leagueEndpoint = `${base}/leagueHistory/${this.leagueId}?seasonId=${this.seasonId}`;
    }
  }

  private async requestJson(url: string, init?: RequestInit): Promise<unknown> {
    const headers = new Headers(init?.headers);
    if (this.cookieHeader) {
      headers.set('Cookie', this.cookieHeader);
    }

    const response = await this.fetchFn(url, { ...init, headers });
    return { response, body: await response.json() };
  }

  private async checkLeagueStatus(
    status: number,
    extend: string,
    params?: RequestOptions['params'],
    headers?: Record<string, string>,
  ): Promise<unknown | null> {
    if (status === 401) {
      const originalEndpoint = this.leagueEndpoint;
      this.swapLeagueEndpoint();

      const query = buildQueryString(params ?? {});
      const url = `${this.leagueEndpoint}${extend}${query}`;
      const retryHeaders = new Headers(headers);
      if (this.cookieHeader) {
        retryHeaders.set('Cookie', this.cookieHeader);
      }

      const retryResponse = await this.fetchFn(url, { headers: retryHeaders });
      if (retryResponse.ok) {
        return retryResponse.json();
      }

      this.leagueEndpoint = originalEndpoint;
      if (!this.cookieHeader) {
        throw new EspnAccessDenied();
      }
      throw new EspnAccessDenied(
        `League ${this.leagueId} cannot be accessed with the provided credentials`,
      );
    }

    if (status === 404) {
      throw new EspnInvalidLeague(this.leagueId);
    }

    if (status !== 200) {
      throw new EspnApiError(status);
    }

    return null;
  }

  async leagueGet(options: RequestOptions = {}): Promise<EspnLeagueResponse> {
    const { params, headers, extend = '' } = options;
    const query = buildQueryString(params ?? {});
    const url = `${this.leagueEndpoint}${extend}${query}`;

    const requestHeaders = new Headers(headers);
    if (this.cookieHeader) {
      requestHeaders.set('Cookie', this.cookieHeader);
    }

    const response = await this.fetchFn(url, { headers: requestHeaders });
    const alternate = await this.checkLeagueStatus(response.status, extend, params, headers);

    let data: unknown;
    if (alternate !== null) {
      data = alternate;
    } else if (!response.ok) {
      throw new EspnApiError(response.status);
    } else {
      data = await response.json();
    }

    if (Array.isArray(data)) {
      data = data[0];
    }

    assertEspnResponse(data);
    return data as EspnLeagueResponse;
  }

  async get(options: RequestOptions = {}): Promise<unknown> {
    const { params, headers, extend = '' } = options;
    const query = buildQueryString(params ?? {});
    const url = `${this.endpoint}${extend}${query}`;

    const requestHeaders = new Headers(headers);
    if (this.cookieHeader) {
      requestHeaders.set('Cookie', this.cookieHeader);
    }

    const response = await this.fetchFn(url, { headers: requestHeaders });
    await this.checkLeagueStatus(response.status, extend, params, headers);

    if (!response.ok) {
      throw new EspnApiError(response.status);
    }

    const data = await response.json();
    assertEspnResponse(data);
    return data;
  }

  async newsGet(options: RequestOptions = {}): Promise<unknown> {
    const { params, headers, extend = '' } = options;
    const query = buildQueryString(params ?? {});
    const url = `${this.newsEndpoint}${extend}${query}`;

    const requestHeaders = new Headers(headers);
    if (this.cookieHeader) {
      requestHeaders.set('Cookie', this.cookieHeader);
    }

    const response = await this.fetchFn(url, { headers: requestHeaders });
    if (!response.ok) {
      throw new EspnApiError(response.status);
    }

    return response.json();
  }

  async getLeague(): Promise<EspnLeagueResponse> {
    return this.leagueGet({
      params: {
        view: [
          View.MTeam,
          View.MRoster,
          View.MMatchup,
          View.MSettings,
          View.MStandings,
        ],
      },
    });
  }

  async getProSchedule(): Promise<EspnProScheduleResponse> {
    return (await this.get({
      params: { view: View.ProTeamSchedules },
    })) as EspnProScheduleResponse;
  }

  async getProPlayers(): Promise<EspnProPlayer[]> {
    const filters = { filterActive: { value: true } };
    const data = await this.get({
      extend: '/players',
      params: { view: View.Players },
      headers: { 'x-fantasy-filter': JSON.stringify(filters) },
    });
    return data as EspnProPlayer[];
  }

  async getLeagueDraft(): Promise<EspnLeagueResponse> {
    return this.leagueGet({
      params: { view: View.MDraftDetail },
    });
  }

  async getPlayerCard(
    playerIds: number[],
    maxScoringPeriod: number,
    additionalFilters?: string[],
  ): Promise<EspnLeagueResponse> {
    const additionalValue = [`00${this.seasonId}`, `10${this.seasonId}`];
    if (additionalFilters) {
      additionalValue.push(...additionalFilters);
    }

    const filters = {
      players: {
        filterIds: { value: playerIds },
        filterStatsForTopScoringPeriodIds: {
          value: maxScoringPeriod,
          additionalValue,
        },
      },
    };

    return this.leagueGet({
      params: { view: View.KonaPlayerCard },
      headers: { 'x-fantasy-filter': JSON.stringify(filters) },
    });
  }

  async getPlayerNews(playerId: number): Promise<unknown> {
    return this.newsGet({ params: { playerId } });
  }
}
