export const PROVIDER = 'espn' as const;

export { League } from './league.js';
export type { LeagueOptions } from './league.js';

export { Team } from './models/team.js';
export { Player } from './models/player.js';
export { Matchup } from './models/matchup.js';
export { Settings } from './models/settings.js';
export { Pick } from './models/pick.js';
export { Activity } from './models/activity.js';
export { Transaction, TransactionItem } from './models/transaction.js';
export { BoxPlayer } from './models/box-player.js';
export { BoxScore, H2HPointsBoxScore, H2HCategoryBoxScore } from './models/box-score.js';
export type { BoxScoreInstance } from './models/box-score.js';

export { EspnClient } from './client.js';
export type { EspnClientOptions } from './client.js';

export {
  EspnAccessDenied,
  EspnInvalidLeague,
  EspnApiError,
  EspnResponseError,
} from './errors.js';

export {
  FANTASY_BASE_ENDPOINT,
  NEWS_BASE_ENDPOINT,
  SPORT_PATH,
  View,
  POSITION_MAP,
  PRO_TEAM_MAP,
  STATS_MAP,
  ACTIVITY_MAP,
  TRANSACTION_TYPES,
  NINE_CAT_STATS,
} from './constants.js';
