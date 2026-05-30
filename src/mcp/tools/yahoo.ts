import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { League } from '../../yahoo/models/league.js';
import { readYahooConfig } from '../config.js';
import { runTool } from '../results.js';
import {
  serializeYahooMatchups,
  serializeYahooSettings,
  serializeYahooTeams,
} from '../serialize.js';

async function createYahooLeague(): Promise<League> {
  const config = readYahooConfig();
  return League.create({
    accessToken: config.accessToken,
    leagueKey: config.leagueKey,
    leagueId: config.leagueId,
    season: config.season,
  });
}

export function registerYahooTools(server: McpServer): void {
  server.registerTool(
    'yahoo-standings',
    {
      description: 'Get Yahoo fantasy basketball league standings',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      runTool(async () => {
        const league = await createYahooLeague();
        return serializeYahooTeams(await league.standings());
      }),
  );

  server.registerTool(
    'yahoo-scoreboard',
    {
      description: 'Get Yahoo fantasy basketball scoreboard for a week',
      inputSchema: z.object({
        week: z
          .number()
          .int()
          .optional()
          .describe('Fantasy week number. Defaults to current week.'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ week }) =>
      runTool(async () => {
        const league = await createYahooLeague();
        return serializeYahooMatchups(await league.scoreboard(week));
      }),
  );

  server.registerTool(
    'yahoo-teams',
    {
      description: 'List Yahoo fantasy basketball teams in the league',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      runTool(async () => {
        const league = await createYahooLeague();
        return serializeYahooTeams(await league.teamsList());
      }),
  );

  server.registerTool(
    'yahoo-players',
    {
      description: 'Search Yahoo fantasy basketball players in the league player pool',
      inputSchema: z.object({
        start: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Zero-based pagination offset into the player pool.'),
        count: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Players to return (1–100). Default 25.'),
        status: z
          .string()
          .optional()
          .describe(
            'Ownership filter: A (all), FA, W (waivers), T (taken), K (keepers).',
          ),
        position: z
          .string()
          .optional()
          .describe('Roster position filter (e.g. PG, G).'),
        search: z.string().optional().describe('Name search string.'),
        sort: z.string().optional().describe('Stat category to sort by.'),
        sortType: z
          .string()
          .optional()
          .describe('Stats window: season, date, lastweek, lastmonth.'),
        sortSeason: z
          .union([z.string(), z.number()])
          .optional()
          .describe('Season year used when sorting.'),
        sortDate: z
          .string()
          .optional()
          .describe('Date (YYYY-MM-DD) for date-based sorting.'),
        sortWeek: z
          .number()
          .int()
          .optional()
          .describe('Week number for week-based sorting.'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (filters) =>
      runTool(async () => {
        const league = await createYahooLeague();
        return await league.players(filters);
      }),
  );

  server.registerTool(
    'yahoo-transactions',
    {
      description: 'Get Yahoo fantasy basketball league transactions',
      inputSchema: z.object({
        type: z
          .string()
          .optional()
          .describe('Single transaction type: add, drop, commish, or trade.'),
        types: z
          .array(z.string())
          .optional()
          .describe('Multiple transaction types (comma-separated in the API).'),
        teamKey: z.string().optional().describe('Yahoo team key to scope transactions.'),
        count: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Max transactions to return (1–100).'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (filters) =>
      runTool(async () => {
        const league = await createYahooLeague();
        return await league.transactions(filters);
      }),
  );

  server.registerTool(
    'yahoo-draft-results',
    {
      description: 'Get Yahoo fantasy basketball draft results',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      runTool(async () => {
        const league = await createYahooLeague();
        return await league.draftResults();
      }),
  );

  server.registerTool(
    'yahoo-player-stats',
    {
      description: 'Get Yahoo fantasy basketball player stats for one or more player IDs',
      inputSchema: z.object({
        playerIds: z
          .array(z.union([z.string(), z.number()]))
          .min(1)
          .describe('One or more Yahoo player IDs.'),
        reqType: z
          .string()
          .optional()
          .describe(
            'Stats window: season, date, lastweek, lastmonth, average_season. Default date.',
          ),
        date: z
          .string()
          .optional()
          .describe('Date (YYYY-MM-DD) when reqType is date.'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ playerIds, reqType, date }) =>
      runTool(async () => {
        const league = await createYahooLeague();
        return await league.playerStats(playerIds, reqType, date);
      }),
  );

  server.registerTool(
    'yahoo-league-info',
    {
      description: 'Get Yahoo fantasy basketball league metadata and settings',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      runTool(async () => {
        const league = await createYahooLeague();
        const [metadata, settings] = await Promise.all([
          league.metadata(),
          league.fetchSettings(),
        ]);
        return {
          metadata,
          settings: serializeYahooSettings(settings),
        };
      }),
  );
}
