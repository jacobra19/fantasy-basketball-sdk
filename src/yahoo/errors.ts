export class YahooAccessDenied extends Error {
  override readonly name = 'YahooAccessDenied';

  constructor(message = 'A valid OAuth access token is required') {
    super(message);
  }
}

export class YahooInvalidLeague extends Error {
  override readonly name = 'YahooInvalidLeague';

  constructor(leagueKey: string) {
    super(`League ${leagueKey} does not exist or is not accessible`);
  }
}

export class YahooTokenExpired extends Error {
  override readonly name = 'YahooTokenExpired';

  constructor(message = 'OAuth access token expired and could not be refreshed') {
    super(message);
  }
}

export class YahooApiError extends Error {
  override readonly name = 'YahooApiError';
  readonly status: number;
  readonly body?: string;

  constructor(status: number, message?: string, body?: string) {
    super(message ?? `Yahoo Fantasy API returned HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export class YahooResponseError extends Error {
  override readonly name = 'YahooResponseError';

  constructor(message: string) {
    super(message);
  }
}

export function isTokenExpiredResponse(status: number, body: string): boolean {
  if (status !== 401 && status !== 403) {
    return false;
  }
  const lower = body.toLowerCase();
  if (lower.includes('token_expired') || lower.includes('oauth_problem')) {
    return true;
  }
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    const errorDesc = String(parsed.error ?? '').toLowerCase();
    return errorDesc.includes('token_expired') || errorDesc.includes('oauth');
  } catch {
    return false;
  }
}
