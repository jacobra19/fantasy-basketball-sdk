import { STATS_MAP } from '../constants.js';
import type { JsonObject } from '../types/raw.js';
import { Matchup } from './matchup.js';
import { Player, type ProTeamSchedule } from './player.js';

export class Team {
  teamId: number;
  teamAbbrev: string;
  teamName: string;
  divisionId: number;
  divisionName = '';
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  acquisitions: number;
  acquisitionBudgetSpent: number;
  drops: number;
  trades: number;
  logoUrl = '';
  stats: Record<string, number> | null = null;
  standing: number;
  finalStanding: number | undefined;
  roster: Player[] = [];
  schedule: Matchup[] = [];
  owners: JsonObject[] = [];

  constructor(
    data: JsonObject,
    roster: JsonObject,
    schedule: JsonObject[],
    year: number,
    options: { proSchedule?: ProTeamSchedule | null; owners?: JsonObject[] } = {},
  ) {
    this.teamId = data.id as number;
    this.teamAbbrev = data.abbrev as string;
    this.teamName = (data.name as string | undefined) ?? 'Unknown';
    if (this.teamName === 'Unknown') {
      this.teamName = `${(data.location as string | undefined) ?? 'Unknown'} ${(data.nickname as string | undefined) ?? 'Unknown'}`;
    }
    this.divisionId = data.divisionId as number;

    const record = (data.record as JsonObject).overall as JsonObject;
    this.wins = record.wins as number;
    this.losses = record.losses as number;
    this.ties = record.ties as number;
    this.pointsFor = record.pointsFor as number;
    this.pointsAgainst = Math.round((record.pointsAgainst as number) * 100) / 100;

    const transactionCounter = (data.transactionCounter as JsonObject | undefined) ?? {};
    this.acquisitions = (transactionCounter.acquisitions as number | undefined) ?? 0;
    this.acquisitionBudgetSpent =
      (transactionCounter.acquisitionBudgetSpent as number | undefined) ?? 0;
    this.drops = (transactionCounter.drops as number | undefined) ?? 0;
    this.trades = (transactionCounter.trades as number | undefined) ?? 0;

    this.standing = data.playoffSeed as number;
    this.finalStanding =
      (data.rankFinal as number | undefined) ?? (data.rankCalculatedFinal as number | undefined);

    if (data.valuesByStat) {
      this.stats = {};
      for (const [statKey, value] of Object.entries(data.valuesByStat as Record<string, number>)) {
        this.stats[STATS_MAP[statKey] ?? statKey] = value;
      }
    }

    if (data.logo) {
      this.logoUrl = data.logo as string;
    }

    this.fetchRoster(roster, year, options.proSchedule ?? null);
    this.fetchSchedule(schedule);
    this.owners = options.owners ?? [];
  }

  private fetchRoster(roster: JsonObject, year: number, proSchedule: ProTeamSchedule | null): void {
    this.roster = [];
    const entries = (roster.entries as JsonObject[] | undefined) ?? [];
    for (const player of entries) {
      this.roster.push(new Player(player, year, proSchedule));
    }
  }

  private fetchSchedule(data: JsonObject[]): void {
    this.schedule = [];
    for (const match of data) {
      if (!('away' in match)) {
        continue;
      }
      const awayTeamId = (match.away as JsonObject).teamId as number;
      const homeTeamId = (match.home as JsonObject).teamId as number;

      if (awayTeamId === this.teamId) {
        const newMatch = new Matchup(match);
        newMatch.awayTeam = this;
        this.schedule.push(newMatch);
      } else if (homeTeamId === this.teamId) {
        const newMatch = new Matchup(match);
        newMatch.homeTeam = this;
        this.schedule.push(newMatch);
      }
    }
  }
}
