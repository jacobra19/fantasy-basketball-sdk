import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { League } from '../../espn/league.js';
import { readEspnConfig } from '../config.js';
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
} from '../serialize.js';

async function createEspnLeague(): Promise<League> {
  const config = readEspnConfig();
  return League.create({
    leagueId: config.leagueId,
    seasonId: config.seasonId,
    espnS2: config.espnS2,
    swid: config.swid,
  });
}

export function registerEspnTools(server: McpServer): void {
  server.registerTool(
    'espn-standings',
    {
      description: 'Get ESPN fantasy basketball league standings',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      runTool(async () => {
        const league = await createEspnLeague();
        return serializeEspnTeams(league.standings());
      }),
  );

  server.registerTool(
    'espn-scoreboard',
    {
      description: 'Get ESPN fantasy basketball scoreboard for a matchup period',
      inputSchema: z.object({
        matchupPeriod: z
          .number()
          .int()
          .optional()
          .describe(
            "ESPN H2H matchup period (fantasy week). Defaults to the league's current matchup period.",
          ),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ matchupPeriod }) =>
      runTool(async () => {
        const league = await createEspnLeague();
        const matchups = await league.scoreboard(matchupPeriod);
        return serializeEspnMatchups(matchups);
      }),
  );

  server.registerTool(
    'espn-free-agents',
    {
      description: 'List ESPN fantasy basketball free agents and waiver players',
      inputSchema: z.object({
        week: z
          .number()
          .int()
          .optional()
          .describe('NBA scoring period for player stats. Defaults to current week.'),
        size: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe('Max players to return (1–200). Default 50.'),
        position: z
          .string()
          .optional()
          .describe(
            'Position filter by abbreviation (e.g. PG, SG, SF, PF, C, G, F, UT).',
          ),
        positionId: z
          .number()
          .int()
          .optional()
          .describe('ESPN lineup slot ID filter (alternative to position).'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ week, size, position, positionId }) =>
      runTool(async () => {
        const league = await createEspnLeague();
        const players = await league.freeAgents({ week, size, position, positionId });
        return serializeEspnPlayers(players);
      }),
  );

  server.registerTool(
    'espn-box-scores',
    {
      description: 'Get ESPN fantasy basketball box scores',
      inputSchema: z.object({
        matchupPeriod: z
          .number()
          .int()
          .optional()
          .describe(
            'ESPN H2H matchup period. Defaults to current period; pair with scoringPeriod for a specific day/week.',
          ),
        scoringPeriod: z
          .number()
          .int()
          .optional()
          .describe(
            'NBA scoring period within the season. Defaults to current week; used to resolve which matchup period applies.',
          ),
        matchupTotal: z
          .boolean()
          .optional()
          .describe(
            'If true (default), return cumulative matchup-period totals; if false, return stats for the single scoring period only.',
          ),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ matchupPeriod, scoringPeriod, matchupTotal }) =>
      runTool(async () => {
        const league = await createEspnLeague();
        const boxScores = await league.boxScores({ matchupPeriod, scoringPeriod, matchupTotal });
        return serializeEspnBoxScores(boxScores);
      }),
  );

  server.registerTool(
    'espn-recent-activity',
    {
      description: 'Get recent ESPN fantasy basketball league activity',
      inputSchema: z.object({
        size: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Number of activity entries (1–100). Default 25.'),
        msgType: z
          .string()
          .optional()
          .describe('Filter by activity type: FA, WAIVER, TRADED, or DROPPED.'),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Pagination offset into the activity feed. Default 0.'),
        includeMoved: z
          .boolean()
          .optional()
          .describe('Include lineup slot move events. Default false.'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ size, msgType, offset, includeMoved }) =>
      runTool(async () => {
        const league = await createEspnLeague();
        const activity = await league.recentActivity({ size, msgType, offset, includeMoved });
        return serializeEspnActivities(activity);
      }),
  );

  server.registerTool(
    'espn-transactions',
    {
      description: 'Get ESPN fantasy basketball transactions',
      inputSchema: z.object({
        scoringPeriod: z
          .number()
          .int()
          .optional()
          .describe('NBA scoring period for transactions. Defaults to current period.'),
        types: z
          .array(z.string())
          .optional()
          .describe(
            'Transaction type filters (e.g. FREEAGENT, WAIVER, TRADE_ACCEPT).',
          ),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ scoringPeriod, types }) =>
      runTool(async () => {
        const league = await createEspnLeague();
        const transactions = await league.transactions({
          scoringPeriod,
          types: types ? new Set(types) : undefined,
        });
        return serializeEspnTransactions(transactions);
      }),
  );

  server.registerTool(
    'espn-player-info',
    {
      description: 'Get ESPN fantasy basketball player info by name or player ID',
      inputSchema: z.object({
        name: z
          .string()
          .optional()
          .describe(
            'Player name as stored in the league player map (mutually exclusive with playerId).',
          ),
        playerId: z
          .union([z.number().int(), z.array(z.number().int())])
          .optional()
          .describe('ESPN player ID, or array of IDs.'),
        includeNews: z
          .boolean()
          .optional()
          .describe('Include recent player news. Default false.'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ name, playerId, includeNews }) =>
      runTool(async () => {
        const league = await createEspnLeague();
        const player = await league.playerInfo({ name, playerId, includeNews });
        return serializeEspnPlayer(player);
      }),
  );

  server.registerTool(
    'espn-league-info',
    {
      description: 'Get ESPN fantasy basketball league metadata, teams, and draft results',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      runTool(async () => {
        const league = await createEspnLeague();
        return {
          league: serializeEspnLeague(league),
          teams: serializeEspnTeams(league.teams),
          draft: serializeEspnDraft(league.draft),
        };
      }),
  );
}
