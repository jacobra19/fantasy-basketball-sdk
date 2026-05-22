import { STATS_MAP } from '../constants.js';
import type { JsonObject } from '../types/raw.js';
import type { Team } from './team.js';

export class Matchup {
  winner: unknown;
  homeTeam: number | Team = 0;
  homeFinalScore = 0;
  homeTeamCats: Record<string, { score: number; result: unknown }> | null = null;
  homeTeamLiveScore: number | null = null;
  awayTeam: number | Team = 0;
  awayFinalScore = 0;
  awayTeamCats: Record<string, { score: number; result: unknown }> | null = null;
  awayTeamLiveScore: number | null = null;

  constructor(data: JsonObject) {
    this.winner = data.winner;
    [this.homeTeam, this.homeFinalScore, this.homeTeamCats, this.homeTeamLiveScore] =
      this.fetchMatchupInfo(data, 'home');
    [this.awayTeam, this.awayFinalScore, this.awayTeamCats, this.awayTeamLiveScore] =
      this.fetchMatchupInfo(data, 'away');
  }

  private fetchMatchupInfo(
    data: JsonObject,
    team: 'home' | 'away',
  ): [number, number, Record<string, { score: number; result: unknown }> | null, number | null] {
    const side = data[team] as JsonObject | undefined;
    if (!side) {
      return [0, 0, null, null];
    }

    const teamId = side.teamId as number;
    const finalScore = side.totalPoints as number;
    let teamCats: Record<string, { score: number; result: unknown }> | null = null;
    let teamLiveScore: number | null = null;

    const cumulativeScore = side.cumulativeScore as JsonObject | undefined;
    if (cumulativeScore?.scoreByStat) {
      const scoreByStat = cumulativeScore.scoreByStat as Record<
        string,
        { score: number; result: unknown }
      >;
      teamLiveScore =
        (cumulativeScore.wins as number) + (cumulativeScore.ties as number) / 2;
      teamCats = {};
      for (const [statKey, statDict] of Object.entries(scoreByStat)) {
        teamCats[STATS_MAP[statKey] ?? statKey] = {
          score: statDict.score,
          result: statDict.result,
        };
      }
    }

    return [teamId, finalScore, teamCats, teamLiveScore];
  }
}
