export const BASE_ENDPOINT = 'https://fantasysports.yahooapis.com/fantasy/v2';

export const GAME_CODE = 'nba' as const;

/** Player collection status filters (league context). */
export const PLAYER_STATUS = {
  ALL: 'A',
  FREE_AGENT: 'FA',
  WAIVERS: 'W',
  TAKEN: 'T',
  KEEPERS: 'K',
} as const;

export type PlayerStatus = (typeof PLAYER_STATUS)[keyof typeof PLAYER_STATUS];

/** Completed transaction type filters. */
export const TRANSACTION_TYPES = {
  ADD: 'add',
  DROP: 'drop',
  COMMISH: 'commish',
  TRADE: 'trade',
} as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

/** Pending transaction types (require team_key filter). */
export const PENDING_TRANSACTION_TYPES = {
  WAIVER: 'waiver',
  PENDING_TRADE: 'pending_trade',
} as const;

/** Player stats request types for NBA (date-based). */
export const STATS_TYPE = {
  SEASON: 'season',
  DATE: 'date',
  LAST_WEEK: 'lastweek',
  LAST_MONTH: 'lastmonth',
  AVERAGE_SEASON: 'average_season',
} as const;

export type StatsType = (typeof STATS_TYPE)[keyof typeof STATS_TYPE];

/** Player sort types for NBA leagues. */
export const SORT_TYPE = {
  SEASON: 'season',
  DATE: 'date',
  LAST_WEEK: 'lastweek',
  LAST_MONTH: 'lastmonth',
} as const;
