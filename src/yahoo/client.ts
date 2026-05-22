import { BASE_ENDPOINT } from './constants.js';
import {
  isTokenExpiredResponse,
  YahooAccessDenied,
  YahooApiError,
  YahooTokenExpired,
} from './errors.js';
import type { JsonObject } from './types/raw.js';

export interface YahooClientOptions {
  accessToken: string;
  fetch?: typeof globalThis.fetch;
  refreshAccessToken?: () => Promise<string>;
}

export class YahooClient {
  private accessToken: string;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly refreshAccessToken?: () => Promise<string>;

  constructor(options: YahooClientOptions) {
    this.accessToken = options.accessToken;
    this.fetchFn = options.fetch ?? globalThis.fetch;
    this.refreshAccessToken = options.refreshAccessToken;
  }

  private buildUrl(path: string, json = false): string {
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(`${BASE_ENDPOINT}/${normalized}`);
    if (json) {
      url.searchParams.set('format', 'json');
    }
    return url.toString();
  }

  private authHeaders(): Headers {
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${this.accessToken}`);
    return headers;
  }

  private async readBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }

  private async handleTokenRefresh(
    retry: () => Promise<Response>,
    body: string,
    status: number,
  ): Promise<Response> {
    if (!isTokenExpiredResponse(status, body)) {
      return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
    }

    if (!this.refreshAccessToken) {
      throw new YahooTokenExpired();
    }

    this.accessToken = await this.refreshAccessToken();
    return retry();
  }

  async get(path: string): Promise<JsonObject> {
    const url = this.buildUrl(path, true);

    const execute = async (): Promise<Response> =>
      this.fetchFn(url, { method: 'GET', headers: this.authHeaders() });

    let response = await execute();
    let body = await this.readBody(response);

    if (response.status === 401 || response.status === 403) {
      response = await this.handleTokenRefresh(execute, body, response.status);
      body = await this.readBody(response);
    }

    if (response.status === 401 || response.status === 403) {
      throw new YahooAccessDenied(body || undefined);
    }

    if (!response.ok) {
      throw new YahooApiError(response.status, undefined, body);
    }

    return JSON.parse(body) as JsonObject;
  }

  async post(path: string, xml: string): Promise<Response> {
    return this.writeRequest('POST', path, xml, 201);
  }

  async put(path: string, xml: string): Promise<Response> {
    return this.writeRequest('PUT', path, xml, 200);
  }

  async delete(path: string): Promise<Response> {
    return this.writeRequest('DELETE', path, undefined, 200);
  }

  private async writeRequest(
    method: 'POST' | 'PUT' | 'DELETE',
    path: string,
    xml: string | undefined,
    expectedStatus: number,
  ): Promise<Response> {
    const url = this.buildUrl(path, false);
    const headers = this.authHeaders();
    if (xml !== undefined) {
      headers.set('Content-Type', 'application/xml');
    }

    const init: RequestInit = { method, headers };
    if (xml !== undefined) {
      init.body = xml;
    }

    const execute = async (): Promise<Response> => this.fetchFn(url, init);

    let response = await execute();
    let body = await this.readBody(response);

    if (response.status === 401 || response.status === 403) {
      response = await this.handleTokenRefresh(execute, body, response.status);
      body = await this.readBody(response);
    }

    if (response.status === 401 || response.status === 403) {
      throw new YahooAccessDenied(body || undefined);
    }

    if (response.status !== expectedStatus) {
      throw new YahooApiError(response.status, undefined, body);
    }

    return response;
  }
}
