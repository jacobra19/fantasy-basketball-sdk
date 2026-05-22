export class EspnAccessDenied extends Error {
  override readonly name = 'EspnAccessDenied';

  constructor(message = 'espn_s2 and swid are required for private leagues') {
    super(message);
  }
}

export class EspnInvalidLeague extends Error {
  override readonly name = 'EspnInvalidLeague';

  constructor(leagueId: number) {
    super(`League ${leagueId} does not exist`);
  }
}

export class EspnApiError extends Error {
  override readonly name = 'EspnApiError';
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `ESPN returned an HTTP ${status}`);
    this.status = status;
  }
}

export class EspnResponseError extends Error {
  override readonly name = 'EspnResponseError';

  constructor(message: string) {
    super(message);
  }
}

export function assertEspnResponse(data: unknown): void {
  if (
    data !== null &&
    typeof data === 'object' &&
    'messages' in data &&
    Array.isArray((data as { messages?: unknown[] }).messages) &&
    (data as { messages: unknown[] }).messages[0]
  ) {
    throw new EspnResponseError(String((data as { messages: unknown[] }).messages[0]));
  }
}
