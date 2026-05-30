import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { getEspnLeague, getYahooLeague } from '../league-context.js';
import { runTool } from '../results.js';
import {
  serializeEspnActivities,
  serializeEspnBoxScores,
  serializeEspnDraft,
  serializeEspnLeague,
  serializeEspnMatchups,
  serializeEspnPlayer,
  serializeEspnPlayers,
  serializeEspnTeams,
  serializeEspnTransactions,
  serializeYahooDraft,
  serializeYahooMatchups,
  serializeYahooMetadata,
  serializeYahooPlayerStats,
  serializeYahooPlayers,
  serializeYahooSettings,
  serializeYahooTeams,
  serializeYahooTransactions,
} from '../serialize.js';

export const WORKFLOW_TOOL_NAMES = [
  'getLeagueOverview',
  'getMatchupContext',
  'searchPlayers',
  'findRosterOptions',
  'getLeagueActivity',
  'getDraftContext',
] as const;

const providerSchema = z
  .enum(['espn', 'yahoo'])
  .describe('Fantasy platform: espn or yahoo. Set matching env vars in MCP client config.');

const readOnly = { readOnlyHint: true } as const;

export function registerWorkflowTools(server: McpServer): void {
  server.registerTool(
    'getLeagueOverview',
    {
      description: `<use_case>
Start here for league metadata, settings, team list, and standings.
Aliases: league info, league settings, standings, team rankings, who is in first place.
</use_case>
<important_notes>
Requires \`provider\` (espn or yahoo). Configure ESPN or Yahoo credentials in the MCP client before calling.
For Yahoo, standings are included alongside metadata and settings.
</important_notes>`,
      inputSchema: z.object({
        provider: providerSchema,
      }),
      annotations: readOnly,
    },
    async ({ provider }) =>
      runTool(async () => {
        if (provider === 'espn') {
          const league = await getEspnLeague();
          return {
            provider,
            league: serializeEspnLeague(league),
            teams: serializeEspnTeams(league.standings()),
          };
        }

        const league = await getYahooLeague();
        const [metadata, settings] = await Promise.all([
          league.metadata(),
          league.fetchSettings(),
        ]);
        return {
          provider,
          metadata: serializeYahooMetadata(metadata),
          settings: serializeYahooSettings(settings),
          teams: serializeYahooTeams(await league.standings()),
        };
      }),
  );

  server.registerTool(
    'getMatchupContext',
    {
      description: `<use_case>
Get scoreboard matchups and optional box scores for the current or a specific fantasy week.
Aliases: scoreboard, matchups, head-to-head, weekly scores, box scores, lineup scores.
</use_case>
<important_notes>
ESPN uses \`matchupPeriod\` (H2H week) and optional \`scoringPeriod\` for box scores.
Yahoo uses \`week\`. Set \`includeBoxScores\` true for ESPN cumulative or single-period box scores.
</important_notes>`,
      inputSchema: z.object({
        provider: providerSchema,
        matchupPeriod: z
          .number()
          .int()
          .optional()
          .describe(
            "ESPN only: H2H matchup period (fantasy week). Defaults to the league's current period.",
          ),
        week: z
          .number()
          .int()
          .optional()
          .describe('Yahoo only: fantasy week number. Defaults to current week.'),
        scoringPeriod: z
          .number()
          .int()
          .optional()
          .describe('ESPN only: NBA scoring period for box scores.'),
        matchupTotal: z
          .boolean()
          .optional()
          .describe(
            'ESPN box scores: true for cumulative matchup totals (default), false for single scoring period.',
          ),
        includeBoxScores: z
          .boolean()
          .optional()
          .describe('ESPN only: include box score breakdown when true.'),
      }),
      annotations: readOnly,
    },
    async ({ provider, matchupPeriod, week, scoringPeriod, matchupTotal, includeBoxScores }) =>
      runTool(async () => {
        if (provider === 'espn') {
          const league = await getEspnLeague();
          const matchups = await league.scoreboard(matchupPeriod);
          const result: Record<string, unknown> = {
            provider,
            matchups: serializeEspnMatchups(matchups),
          };
          if (includeBoxScores) {
            const boxScores = await league.boxScores({
              matchupPeriod,
              scoringPeriod,
              matchupTotal,
            });
            result.boxScores = serializeEspnBoxScores(boxScores);
          }
          return result;
        }

        const league = await getYahooLeague();
        return {
          provider,
          matchups: serializeYahooMatchups(await league.scoreboard(week)),
        };
      }),
  );

  server.registerTool(
    'searchPlayers',
    {
      description: `<use_case>
Look up player info, stats, or search the league player pool by name.
Aliases: player lookup, player stats, player news, who is this player, find player by name.
</use_case>
<important_notes>
ESPN: use \`name\` or \`playerId\` (mutually exclusive). Set \`includeNews\` for recent headlines.
Yahoo: use \`search\` for name lookup in the pool, or \`playerIds\` for detailed stats.
Returns matching players as structured data (empty array or null when no exact match).
</important_notes>`,
      inputSchema: z.object({
        provider: providerSchema,
        name: z
          .string()
          .optional()
          .describe('ESPN: player name from the league player map.'),
        playerId: z
          .union([z.number().int(), z.array(z.number().int())])
          .optional()
          .describe('ESPN: player ID or array of IDs.'),
        includeNews: z
          .boolean()
          .optional()
          .describe('ESPN: include recent player news. Default false.'),
        search: z.string().optional().describe('Yahoo: name search string.'),
        playerIds: z
          .array(z.union([z.string(), z.number()]))
          .optional()
          .describe('Yahoo: one or more player IDs for stats lookup.'),
        reqType: z
          .string()
          .optional()
          .describe(
            'Yahoo stats window: season, date, lastweek, lastmonth, average_season. Default date.',
          ),
        date: z.string().optional().describe('Yahoo: date (YYYY-MM-DD) when reqType is date.'),
        start: z.number().int().min(0).optional().describe('Yahoo pool search pagination offset.'),
        count: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Yahoo pool search result count (1–100). Default 25.'),
        status: z
          .string()
          .optional()
          .describe('Yahoo ownership filter: A, FA, W, T, K.'),
        position: z.string().optional().describe('Yahoo roster position filter (e.g. PG, G).'),
      }),
      annotations: readOnly,
    },
    async ({
      provider,
      name,
      playerId,
      includeNews,
      search,
      playerIds,
      reqType,
      date,
      start,
      count,
      status,
      position,
    }) =>
      runTool(async () => {
        if (provider === 'espn') {
          const league = await getEspnLeague();
          const player = await league.playerInfo({ name, playerId, includeNews });
          return {
            provider,
            players: serializeEspnPlayer(player),
          };
        }

        const league = await getYahooLeague();
        if (playerIds !== undefined && playerIds.length > 0) {
          const statsDoc = await league.playerStats(playerIds, reqType, date);
          return {
            provider,
            players: serializeYahooPlayerStats(statsDoc),
          };
        }

        const players = await league.players({ search, start, count, status, position });
        return {
          provider,
          players: serializeYahooPlayers(players),
        };
      }),
  );

  server.registerTool(
    'findRosterOptions',
    {
      description: `<use_case>
Find available players for pickups: free agents, waiver wire, and streaming options.
Aliases: free agents, waiver wire, available players, who can I pick up, add candidates, FAAB targets.
</use_case>
<important_notes>
ESPN: use \`size\` (1–200, default 50), \`position\` or \`positionId\`, and optional \`week\` for stat window.
Yahoo: defaults to status FA; use W for waivers. Supports \`sort\`, \`sortType\`, and pagination via \`start\`/\`count\`.
</important_notes>`,
      inputSchema: z.object({
        provider: providerSchema,
        week: z
          .number()
          .int()
          .optional()
          .describe('ESPN: NBA scoring period for player stats. Defaults to current week.'),
        size: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe('ESPN: max players to return (1–200). Default 50.'),
        position: z
          .string()
          .optional()
          .describe('Position filter (ESPN: PG/SG/SF/PF/C/G/F/UT; Yahoo: PG/G/etc.).'),
        positionId: z
          .number()
          .int()
          .optional()
          .describe('ESPN lineup slot ID filter (alternative to position).'),
        start: z.number().int().min(0).optional().describe('Yahoo pagination offset.'),
        count: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Yahoo players to return (1–100). Default 25.'),
        status: z
          .string()
          .optional()
          .describe('Yahoo ownership filter. Default FA; use W for waivers.'),
        sort: z.string().optional().describe('Yahoo stat category to sort by.'),
        sortType: z
          .string()
          .optional()
          .describe('Yahoo stats window: season, date, lastweek, lastmonth.'),
        sortSeason: z
          .union([z.string(), z.number()])
          .optional()
          .describe('Yahoo season year used when sorting.'),
        sortDate: z.string().optional().describe('Yahoo date (YYYY-MM-DD) for date-based sorting.'),
        sortWeek: z.number().int().optional().describe('Yahoo week for week-based sorting.'),
      }),
      annotations: readOnly,
    },
    async ({
      provider,
      week,
      size,
      position,
      positionId,
      start,
      count,
      status,
      sort,
      sortType,
      sortSeason,
      sortDate,
      sortWeek,
    }) =>
      runTool(async () => {
        if (provider === 'espn') {
          const league = await getEspnLeague();
          const players = await league.freeAgents({ week, size, position, positionId });
          return {
            provider,
            players: serializeEspnPlayers(players),
          };
        }

        const league = await getYahooLeague();
        const players = await league.players({
          start,
          count,
          status: status ?? 'FA',
          position,
          sort,
          sortType,
          sortSeason,
          sortDate,
          sortWeek,
        });
        return {
          provider,
          players: serializeYahooPlayers(players),
        };
      }),
  );

  server.registerTool(
    'getLeagueActivity',
    {
      description: `<use_case>
Review recent league moves: adds, drops, trades, and transaction history.
Aliases: transactions, recent activity, waiver claims, trade history, league feed, who got dropped.
</use_case>
<important_notes>
ESPN supports \`scope\`: recent (activity feed), transactions, or all (both).
Yahoo returns transactions only. Use \`types\` or \`type\` to filter transaction kinds.
</important_notes>`,
      inputSchema: z.object({
        provider: providerSchema,
        scope: z
          .enum(['recent', 'transactions', 'all'])
          .optional()
          .describe('ESPN: which feeds to include. Default all. Yahoo ignores this.'),
        size: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('ESPN recent activity count (1–100). Default 25.'),
        msgType: z
          .string()
          .optional()
          .describe('ESPN activity filter: FA, WAIVER, TRADED, or DROPPED.'),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('ESPN activity pagination offset. Default 0.'),
        includeMoved: z
          .boolean()
          .optional()
          .describe('ESPN: include lineup slot move events. Default false.'),
        scoringPeriod: z
          .number()
          .int()
          .optional()
          .describe('ESPN transactions: NBA scoring period. Defaults to current.'),
        types: z
          .array(z.string())
          .optional()
          .describe(
            'ESPN transaction types (FREEAGENT, WAIVER, TRADE_ACCEPT) or Yahoo types (add, drop, trade).',
          ),
        type: z.string().optional().describe('Yahoo single transaction type filter.'),
        teamKey: z.string().optional().describe('Yahoo team key to scope transactions.'),
        count: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Yahoo max transactions (1–100).'),
      }),
      annotations: readOnly,
    },
    async ({
      provider,
      scope,
      size,
      msgType,
      offset,
      includeMoved,
      scoringPeriod,
      types,
      type,
      teamKey,
      count,
    }) =>
      runTool(async () => {
        if (provider === 'espn') {
          const league = await getEspnLeague();
          const effectiveScope = scope ?? 'all';
          const result: Record<string, unknown> = { provider };

          if (effectiveScope === 'recent' || effectiveScope === 'all') {
            const activity = await league.recentActivity({
              size,
              msgType,
              offset,
              includeMoved,
            });
            result.recentActivity = serializeEspnActivities(activity);
          }

          if (effectiveScope === 'transactions' || effectiveScope === 'all') {
            const transactions = await league.transactions({
              scoringPeriod,
              types: types ? new Set(types) : undefined,
            });
            result.transactions = serializeEspnTransactions(transactions);
          }

          return result;
        }

        const league = await getYahooLeague();
        const transactions = await league.transactions({ type, types, teamKey, count });
        return {
          provider,
          transactions: serializeYahooTransactions(transactions),
        };
      }),
  );

  server.registerTool(
    'getDraftContext',
    {
      description: `<use_case>
Review draft results, pick order, and auction bids.
Aliases: draft results, draft recap, who was drafted, auction values, pick history.
</use_case>
<important_notes>
Works for both ESPN and Yahoo. Returns structured pick data for the configured league season.
</important_notes>`,
      inputSchema: z.object({
        provider: providerSchema,
      }),
      annotations: readOnly,
    },
    async ({ provider }) =>
      runTool(async () => {
        if (provider === 'espn') {
          const league = await getEspnLeague();
          return {
            provider,
            draft: serializeEspnDraft(league.draft),
          };
        }

        const league = await getYahooLeague();
        const draftDoc = await league.draftResults();
        return {
          provider,
          draft: serializeYahooDraft(draftDoc),
        };
      }),
  );
}
