import { STATS_MAP } from '../constants.js';
import type { JsonObject } from '../types/raw.js';
import { BoxPlayer } from './box-player.js';
import type { ProTeamSchedule } from './player.js';
import type { Team } from './team.js';

export abstract class BoxScore {
  winner: unknown;
  homeTeam: number | Team = 0;
  awayTeam: number | Team = 0;
  scoringPeriod: number;

  constructor(data: JsonObject, scoringPeriod: number) {
    this.winner = data.winner;
    this.homeTeam = ((data.home as JsonObject | undefined)?.teamId as number | undefined) ?? 0;
    this.awayTeam = ((data.away as JsonObject | undefined)?.teamId as number | undefined) ?? 0;
    this.scoringPeriod = scoringPeriod;
  }

  protected getPlayerLineup(
    team: 'home' | 'away',
    data: JsonObject,
    proSchedule: ProTeamSchedule,
    byMatchup: boolean,
    year: number,
  ): BoxPlayer[] {
    const side = data[team] as JsonObject | undefined;
    if (!side) {
      return [];
    }

    const rosterKey = byMatchup ? 'rosterForMatchupPeriod' : 'rosterForCurrentScoringPeriod';
    const roster = (side[rosterKey] as JsonObject | undefined) ?? {};
    const entries = (roster.entries as JsonObject[] | undefined) ?? [];
    return entries.map(
      (player) => new BoxPlayer(player, proSchedule, year, this.scoringPeriod),
    );
  }
}

export class H2HPointsBoxScore extends BoxScore {
  homeScore = 0;
  homeProjected = -1;
  homeLineup: BoxPlayer[] = [];
  awayScore = 0;
  awayProjected = -1;
  awayLineup: BoxPlayer[] = [];

  constructor(
    data: JsonObject,
    proSchedule: ProTeamSchedule,
    byMatchup: boolean,
    year: number,
    scoringPeriod = 0,
  ) {
    super(data, scoringPeriod);
    [this.homeScore, this.homeProjected, this.homeLineup] = this.getTeamData(
      'home',
      data,
      proSchedule,
      byMatchup,
      year,
    );
    [this.awayScore, this.awayProjected, this.awayLineup] = this.getTeamData(
      'away',
      data,
      proSchedule,
      byMatchup,
      year,
    );
  }

  private getTeamData(
    team: 'home' | 'away',
    data: JsonObject,
    proSchedule: ProTeamSchedule,
    byMatchup: boolean,
    year: number,
  ): [number, number, BoxPlayer[]] {
    const side = data[team] as JsonObject | undefined;
    if (!side) {
      return [0, -1, []];
    }

    const rosterKey = byMatchup ? 'rosterForMatchupPeriod' : 'rosterForCurrentScoringPeriod';
    const teamRoster = (side[rosterKey] as JsonObject | undefined) ?? {};
    let teamScore: number;
    let teamProjected = -1;

    if ('totalPointsLive' in side && byMatchup) {
      teamScore = Math.round((side.totalPointsLive as number) * 100) / 100;
      teamProjected =
        Math.round(((side.totalProjectedPointsLive as number | undefined) ?? -1) * 100) / 100;
    } else {
      teamScore = Math.round(((teamRoster.appliedStatTotal as number | undefined) ?? 0) * 100) / 100;
    }

    const lineup = this.getPlayerLineup(team, data, proSchedule, byMatchup, year);
    return [teamScore, teamProjected, lineup];
  }
}

export class H2HCategoryBoxScore extends BoxScore {
  homeWins = 0;
  homeTies = 0;
  homeLosses = 0;
  homeStats: Record<string, { value: number; result: unknown }> = {};
  homeLineup: BoxPlayer[] = [];
  awayWins = 0;
  awayTies = 0;
  awayLosses = 0;
  awayStats: Record<string, { value: number; result: unknown }> = {};
  awayLineup: BoxPlayer[] = [];

  constructor(
    data: JsonObject,
    proSchedule: ProTeamSchedule,
    byMatchup: boolean,
    year: number,
    scoringPeriod = 0,
  ) {
    super(data, scoringPeriod);
    [this.homeWins, this.homeTies, this.homeLosses, this.homeStats, this.homeLineup] =
      this.getTeamData('home', data, proSchedule, byMatchup, year);
    [this.awayWins, this.awayTies, this.awayLosses, this.awayStats, this.awayLineup] =
      this.getTeamData('away', data, proSchedule, byMatchup, year);
  }

  private getTeamData(
    team: 'home' | 'away',
    data: JsonObject,
    proSchedule: ProTeamSchedule,
    byMatchup: boolean,
    year: number,
  ): [
    number,
    number,
    number,
    Record<string, { value: number; result: unknown }>,
    BoxPlayer[],
  ] {
    const side = data[team] as JsonObject | undefined;
    if (!side) {
      return [0, 0, 0, {}, []];
    }

    const cumulativeScore = (side.cumulativeScore as JsonObject | undefined) ?? {};
    const teamWins = (cumulativeScore.wins as number | undefined) ?? 0;
    const teamTies = (cumulativeScore.ties as number | undefined) ?? 0;
    const teamLosses = (cumulativeScore.losses as number | undefined) ?? 0;

    const teamStats: Record<string, { value: number; result: unknown }> = {};
    const scoreByStat =
      (cumulativeScore.scoreByStat as Record<string, { score: number; result: unknown }>) ?? {};
    for (const [statKey, statDict] of Object.entries(scoreByStat)) {
      teamStats[STATS_MAP[statKey] ?? statKey] = {
        value: statDict.score,
        result: statDict.result,
      };
    }

    const lineup = this.getPlayerLineup(team, data, proSchedule, byMatchup, year);
    return [teamWins, teamTies, teamLosses, teamStats, lineup];
  }
}

const SCORING_TYPE_MAP: Record<
  string,
  typeof H2HPointsBoxScore | typeof H2HCategoryBoxScore
> = {
  H2H_POINTS: H2HPointsBoxScore,
  H2H_CATEGORY: H2HCategoryBoxScore,
  H2H_MOST_CATEGORIES: H2HCategoryBoxScore,
};

export function getBoxScoringTypeClass(
  scoringType: string | undefined,
): typeof H2HPointsBoxScore | typeof H2HCategoryBoxScore {
  if (scoringType && scoringType in SCORING_TYPE_MAP) {
    return SCORING_TYPE_MAP[scoringType]!;
  }
  return H2HPointsBoxScore;
}

export type BoxScoreInstance = H2HPointsBoxScore | H2HCategoryBoxScore;
