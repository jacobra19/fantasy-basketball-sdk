import {
  NINE_CAT_STATS,
  POSITION_MAP,
  PRO_TEAM_MAP,
  STAT_ID_MAP,
  STATS_MAP,
} from '../constants.js';
import type { JsonObject } from '../types/raw.js';
import { jsonParsing } from '../utils.js';

export interface PlayerNewsItem {
  published: string;
  headline: string;
  story: string;
}

export interface PlayerStatEntry {
  appliedTotal: number;
  appliedAvg: number;
  team: string | null;
  date: Date | null;
  avg: Record<string, number> | null;
  total: Record<string, number>;
}

export type ProTeamSchedule = Record<
  number,
  Record<string, Array<{ awayProTeamId: number; homeProTeamId: number; date: number }>>
>;

export class Player {
  name: string;
  playerId: number;
  year: number;
  position: string;
  lineupSlot: string;
  eligibleSlots: string[];
  acquisitionType: unknown;
  proTeam: string;
  injuryStatus: unknown;
  posRank: unknown;
  stats: Record<string, PlayerStatEntry> = {};
  schedule: Record<string, { team: string; date: Date }> = {};
  news: PlayerNewsItem[] = [];
  expectedReturnDate: Date | null = null;
  injured = false;
  totalPoints = 0;
  avgPoints = 0;
  projectedTotalPoints = 0;
  projectedAvgPoints = 0;

  constructor(
    data: JsonObject,
    year: number,
    proTeamSchedule: ProTeamSchedule | null = null,
    news: JsonObject | null = null,
  ) {
    this.name = jsonParsing(data, 'fullName') as string;
    this.playerId = jsonParsing(data, 'id') as number;
    this.year = year;
    const defaultPositionId = jsonParsing(data, 'defaultPositionId') as number;
    this.position = POSITION_MAP[defaultPositionId - 1] as string;
    this.lineupSlot = POSITION_MAP[data.lineupSlotId as number] as string ?? '';
    const eligibleSlots = jsonParsing(data, 'eligibleSlots') as number[];
    this.eligibleSlots = eligibleSlots.map((pos) => POSITION_MAP[pos] as string);
    this.acquisitionType = jsonParsing(data, 'acquisitionType');
    this.proTeam = PRO_TEAM_MAP[jsonParsing(data, 'proTeamId') as number] ?? 'FA';
    this.injuryStatus = jsonParsing(data, 'injuryStatus');
    this.posRank = jsonParsing(data, 'positionalRanking');

    const expectedReturnDate = jsonParsing(data, 'expectedReturnDate') as
      | number[]
      | undefined;
    if (expectedReturnDate && expectedReturnDate.length >= 3) {
      this.expectedReturnDate = new Date(
        expectedReturnDate[0]!,
        expectedReturnDate[1]! - 1,
        expectedReturnDate[2],
      );
    }

    if (proTeamSchedule) {
      const proTeamId = jsonParsing(data, 'proTeamId') as number;
      const proTeam = proTeamSchedule[proTeamId] ?? {};
      for (const key of Object.keys(proTeam)) {
        const game = proTeam[key]![0]!;
        const opponentId =
          game.awayProTeamId !== proTeamId ? game.awayProTeamId : game.homeProTeamId;
        this.schedule[key] = {
          team: PRO_TEAM_MAP[opponentId] ?? 'FA',
          date: new Date(game.date / 1000),
        };
      }
    }

    if (news) {
      const newsFeed = ((news.news as JsonObject | undefined)?.feed as JsonObject[]) ?? [];
      this.news = newsFeed.map((item) => ({
        published: (item.published as string | undefined) ?? '',
        headline: (item.headline as string | undefined) ?? '',
        story: (item.story as string | undefined) ?? '',
      }));
    }

    const player =
      'playerPoolEntry' in data
        ? ((data.playerPoolEntry as JsonObject).player as JsonObject)
        : (data.player as JsonObject);

    this.injuryStatus = player.injuryStatus ?? this.injuryStatus;
    this.injured = (player.injured as boolean | undefined) ?? false;

    const playerStats = (player.stats as JsonObject[] | undefined) ?? [];
    for (const split of playerStats) {
      if (split.seasonId !== year) {
        continue;
      }
      const id = this.statIdPretty(split.id as string, split.scoringPeriodId as number);
      const appliedTotal = (split.appliedTotal as number | undefined) ?? 0;
      const appliedAvg = Math.round(((split.appliedAverage as number | undefined) ?? 0) * 100) / 100;
      const game = this.schedule[id];
      this.stats[id] = {
        appliedTotal,
        appliedAvg,
        team: game?.team ?? null,
        date: game?.date ?? null,
        avg: null,
        total: {},
      };

      if (split.stats) {
        const stats = split.stats as Record<string, number>;
        if ('averageStats' in split) {
          const averageStats = split.averageStats as Record<string, number>;
          this.stats[id].avg = {};
          for (const [statKey, value] of Object.entries(averageStats)) {
            const mapped = STATS_MAP[statKey];
            if (mapped && mapped !== '') {
              this.stats[id].avg![mapped] = value;
            }
          }
          this.stats[id].total = {};
          for (const [statKey, value] of Object.entries(stats)) {
            const mapped = STATS_MAP[statKey];
            if (mapped && mapped !== '') {
              this.stats[id].total[mapped] = value;
            }
          }
        } else {
          this.stats[id].avg = null;
          this.stats[id].total = {};
          for (const [statKey, value] of Object.entries(stats)) {
            const mapped = STATS_MAP[statKey];
            if (mapped && mapped !== '') {
              this.stats[id].total[mapped] = value;
            }
          }
        }
      }
    }

    this.totalPoints = this.stats[`${year}_total`]?.appliedTotal ?? 0;
    this.avgPoints = this.stats[`${year}_total`]?.appliedAvg ?? 0;
    this.projectedTotalPoints = this.stats[`${year}_projected`]?.appliedTotal ?? 0;
    this.projectedAvgPoints = this.stats[`${year}_projected`]?.appliedAvg ?? 0;
  }

  get nineCatAverages(): Record<string, number> {
    const avg = this.stats[`${this.year}_total`]?.avg ?? {};
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(avg)) {
      if (NINE_CAT_STATS.has(key)) {
        result[key] = Math.round(value * (key === 'FG%' || key === 'FT%' ? 1000 : 10)) /
          (key === 'FG%' || key === 'FT%' ? 1000 : 10);
      }
    }
    return result;
  }

  private statIdPretty(id: string, scoringPeriod: number): string {
    const idType = STAT_ID_MAP[id.slice(0, 2)];
    return idType ? `${id.slice(2)}_${idType}` : String(scoringPeriod);
  }
}
