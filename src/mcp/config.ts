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

export type Environment = Record<string, string | undefined>;

export interface ProviderConfigDiagnostics {
  configured: boolean;
  missing: string[];
  present: string[];
  optionalPresent: string[];
}

export interface McpConfigDiagnostics {
  espn: ProviderConfigDiagnostics;
  yahoo: ProviderConfigDiagnostics;
}

function readEnv(name: string, env: Environment = process.env): string | undefined {
  const value = env[name];
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  return value.trim();
}

function readRequiredEnv(name: string, env: Environment = process.env): string {
  const value = readEnv(name, env);
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readRequiredInt(name: string, env: Environment = process.env): number {
  const value = readRequiredEnv(name, env);
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, got "${value}"`);
  }
  return parsed;
}

export function readEspnConfig(env: Environment = process.env): EspnConfig {
  return {
    leagueId: readRequiredInt('ESPN_LEAGUE_ID', env),
    seasonId: readRequiredInt('ESPN_SEASON_ID', env),
    espnS2: readEnv('ESPN_S2', env),
    swid: readEnv('ESPN_SWID', env),
  };
}

export function readYahooConfig(env: Environment = process.env): YahooConfig {
  const accessToken = readRequiredEnv('YAHOO_ACCESS_TOKEN', env);
  const leagueKey = readEnv('YAHOO_LEAGUE_KEY', env);
  const leagueId = readEnv('YAHOO_LEAGUE_ID', env);
  const season = readEnv('YAHOO_SEASON', env);

  if (!leagueKey && (!leagueId || !season)) {
    throw new Error(
      'Missing Yahoo league configuration: set YAHOO_LEAGUE_KEY or both YAHOO_LEAGUE_ID and YAHOO_SEASON',
    );
  }

  return { accessToken, leagueKey, leagueId, season };
}

function providerDiagnostics(
  required: string[],
  optional: string[],
  env: Environment,
): ProviderConfigDiagnostics {
  const present = required.filter((name) => readEnv(name, env) !== undefined);
  const optionalPresent = optional.filter((name) => readEnv(name, env) !== undefined);
  const missing = required.filter((name) => !present.includes(name));

  return {
    configured: missing.length === 0,
    missing,
    present,
    optionalPresent,
  };
}

export function diagnoseMcpConfig(env: Environment = process.env): McpConfigDiagnostics {
  const espn = providerDiagnostics(
    ['ESPN_LEAGUE_ID', 'ESPN_SEASON_ID'],
    ['ESPN_S2', 'ESPN_SWID'],
    env,
  );
  const yahooBase = providerDiagnostics(['YAHOO_ACCESS_TOKEN'], [], env);
  const hasLeagueKey = readEnv('YAHOO_LEAGUE_KEY', env) !== undefined;
  const hasLeagueId = readEnv('YAHOO_LEAGUE_ID', env) !== undefined;
  const hasSeason = readEnv('YAHOO_SEASON', env) !== undefined;
  const missingLeaguePair =
    hasLeagueKey || (hasLeagueId && hasSeason)
      ? []
      : [
          'YAHOO_LEAGUE_KEY',
          ...(hasLeagueId ? [] : ['YAHOO_LEAGUE_ID']),
          ...(hasSeason ? [] : ['YAHOO_SEASON']),
        ];
  const yahooMissing = [...yahooBase.missing, ...missingLeaguePair];

  return {
    espn,
    yahoo: {
      configured: yahooMissing.length === 0,
      missing: yahooMissing,
      present: [
        ...yahooBase.present,
        ...(hasLeagueKey ? ['YAHOO_LEAGUE_KEY'] : []),
        ...(hasLeagueId ? ['YAHOO_LEAGUE_ID'] : []),
        ...(hasSeason ? ['YAHOO_SEASON'] : []),
      ],
      optionalPresent: [],
    },
  };
}
