import { POSITION_MAP, PRO_TEAM_MAP, STATS_MAP } from '../constants.js';
import type { JsonObject } from '../types/raw.js';
import { Player, type ProTeamSchedule } from './player.js';

export class BoxPlayer extends Player {
  slotPosition = 'FA';
  proOpponent = 'None';
  gamePlayed = 100;
  points = 0;
  pointsBreakdown: Record<string, number> = {};

  constructor(
    data: JsonObject,
    proSchedule: ProTeamSchedule,
    year: number,
    scoringPeriod: number,
  ) {
    super(data, year, proSchedule);

    if ('lineupSlotId' in data) {
      this.slotPosition = POSITION_MAP[data.lineupSlotId as number] as string;
    }

    const player =
      'playerPoolEntry' in data
        ? ((data.playerPoolEntry as JsonObject).player as JsonObject)
        : (data.player as JsonObject);

    const proId = player.proTeamId as number;
    const periodKey = String(scoringPeriod);
    if (proId in proSchedule && periodKey in proSchedule[proId]!) {
      const game = proSchedule[proId]![periodKey]![0]!;
      const oppId =
        game.awayProTeamId !== player.proTeamId
          ? game.awayProTeamId
          : game.homeProTeamId;
      const gameDate = new Date(game.date / 1000);
      const gameEnd = new Date(gameDate.getTime() + 3 * 60 * 60 * 1000);
      this.gamePlayed = Date.now() > gameEnd.getTime() ? 100 : 0;
      this.proOpponent = PRO_TEAM_MAP[oppId] ?? 'None';
    }

    const playerStats = (player.stats as JsonObject[] | undefined) ?? [];
    for (const stats of playerStats) {
      const statsBreakdown =
        (stats.appliedStats as Record<string, number> | undefined) ??
        (stats.stats as Record<string, number> | undefined) ??
        {};
      const breakdown: Record<string, number> = {};
      for (const [key, value] of Object.entries(statsBreakdown)) {
        breakdown[STATS_MAP[key] ?? key] = value;
      }
      this.points = Math.round(((stats.appliedTotal as number | undefined) ?? 0) * 100) / 100;
      this.pointsBreakdown = breakdown;
    }
  }
}
