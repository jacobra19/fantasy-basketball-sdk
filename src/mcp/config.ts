export interface EspnConfig {
  leagueId: number;
  seasonId: number;
  espnS2?: string;
  swid?: string;
}

export interface YahooConfig {
  accessToken: string;
  leagueKey?: string;
  leagueId?: string;
  season?: string;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  return value.trim();
}

function readRequiredEnv(name: string): string {
  const value = readEnv(name);
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readRequiredInt(name: string): number {
  const value = readRequiredEnv(name);
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, got "${value}"`);
  }
  return parsed;
}

export function readEspnConfig(): EspnConfig {
  return {
    leagueId: readRequiredInt('ESPN_LEAGUE_ID'),
    seasonId: readRequiredInt('ESPN_SEASON_ID'),
    espnS2: readEnv('ESPN_S2'),
    swid: readEnv('ESPN_SWID'),
  };
}

export function readYahooConfig(): YahooConfig {
  const accessToken = readRequiredEnv('YAHOO_ACCESS_TOKEN');
  const leagueKey = readEnv('YAHOO_LEAGUE_KEY');
  const leagueId = readEnv('YAHOO_LEAGUE_ID');
  const season = readEnv('YAHOO_SEASON');

  if (!leagueKey && (!leagueId || !season)) {
    throw new Error(
      'Missing Yahoo league configuration: set YAHOO_LEAGUE_KEY or both YAHOO_LEAGUE_ID and YAHOO_SEASON',
    );
  }

  return { accessToken, leagueKey, leagueId, season };
}
