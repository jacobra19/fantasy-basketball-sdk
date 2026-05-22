export const PROVIDER = 'yahoo' as const;

export { YahooClient } from './client.js';
export type { YahooClientOptions } from './client.js';

export { Game } from './models/game.js';
export type { GameOptions, LeagueKeysFilters } from './models/game.js';

export { User } from './models/user.js';
export type { UserOptions, UserGamesFilters } from './models/user.js';

export { League } from './models/league.js';
export type {
  LeagueOptions,
  LeagueCreateOptions,
  LeaguePlayersFilters,
  LeagueTransactionsFilters,
} from './models/league.js';

export { Team } from './models/team.js';
export type { TeamOptions, TeamStatsOptions, TeamRosterOptions, TeamMatchupsOptions } from './models/team.js';

export { Player, fetchLeaguePlayerStats, playerKeyFromLeague } from './models/player.js';
export type { PlayerOptions, PlayerStatsOptions, LeaguePlayerStatsOptions } from './models/player.js';

export { Transaction } from './models/transaction.js';

export { Matchup } from './models/matchup.js';
export { Roster } from './models/roster.js';
export type { RosterPlayer } from './models/roster.js';
export { Settings } from './models/settings.js';

export {
  YahooAccessDenied,
  YahooInvalidLeague,
  YahooApiError,
  YahooTokenExpired,
  YahooResponseError,
} from './errors.js';

export {
  BASE_ENDPOINT,
  GAME_CODE,
  PLAYER_STATUS,
  TRANSACTION_TYPES,
  PENDING_TRANSACTION_TYPES,
  STATS_TYPE,
  SORT_TYPE,
} from './constants.js';
export type { PlayerStatus, TransactionType, StatsType } from './constants.js';

export {
  buildLeagueKey,
  buildTeamKey,
  buildPlayerKey,
  parseLeagueKey,
  parseTeamKey,
  gameIdFromLeagueKey,
  resolveLeagueKey,
  buildPlayerKeysFromIds,
  joinKeys,
  buildStatsUriParams,
  buildPlayerFilterParams,
} from './keys.js';

export {
  getFantasyContent,
  flattenResource,
  collectIndexedResources,
  collectLeagueKeys,
  collectTeamKeys,
  collectPlayerKeys,
  collectTransactionKeys,
} from './parse.js';

export {
  buildRosterXml,
  buildAddPlayerXml,
  buildDropPlayerXml,
  buildAddDropXml,
  buildProposeTradeXml,
  buildEditWaiverXml,
  buildTradeActionXml,
} from './xml.js';
export type {
  RosterMove,
  RosterXmlOptions,
  TradePlayerMove,
  AddDropXmlOptions,
  EditWaiverXmlOptions,
  TradeAction,
  TradeActionXmlOptions,
} from './xml.js';

export { setLineup, setTeamLineup } from './write/roster.js';
export type { SetLineupOptions } from './write/roster.js';

export {
  addPlayer,
  dropPlayer,
  addDrop,
  proposeTrade,
  editWaiver,
  acceptTrade,
  rejectTrade,
  allowTrade,
  voteAgainstTrade,
  cancelTransaction,
  tradeAction,
  transactionClient,
} from './write/transactions.js';
export type {
  AddPlayerOptions,
  AddDropOptions,
  ProposeTradeOptions,
  EditWaiverOptions,
  TradeActionOptions,
} from './write/transactions.js';
