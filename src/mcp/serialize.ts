import type { Activity } from '../espn/models/activity.js';
import type { BoxScoreInstance } from '../espn/models/box-score.js';
import type { League as EspnLeague } from '../espn/league.js';
import type { Matchup as EspnMatchup } from '../espn/models/matchup.js';
import type { Pick } from '../espn/models/pick.js';
import type { Player as EspnPlayer } from '../espn/models/player.js';
import type { Team as EspnTeam } from '../espn/models/team.js';
import type { Transaction as EspnTransaction } from '../espn/models/transaction.js';
import type { Matchup as YahooMatchup } from '../yahoo/models/matchup.js';
import type { Settings as YahooSettings } from '../yahoo/models/settings.js';
import type { JsonObject } from '../yahoo/types/raw.js';

function teamRef(team: number | EspnTeam): string | number {
  return typeof team === 'number' ? team : team.teamName;
}

export function serializeEspnLeague(league: EspnLeague): Record<string, unknown> {
  return {
    leagueId: league.leagueId,
    seasonId: league.year,
    name: league.settings.name,
    teamCount: league.settings.teamCount,
    scoringType: league.settings.scoringType,
    currentWeek: league.currentWeek,
    currentMatchupPeriod: league.currentMatchupPeriod,
    scoringPeriodId: league.scoringPeriodId,
  };
}

export function serializeEspnTeams(teams: EspnTeam[]): Record<string, unknown>[] {
  return teams.map((team) => ({
    teamId: team.teamId,
    teamName: team.teamName,
    teamAbbrev: team.teamAbbrev,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    pointsFor: team.pointsFor,
    pointsAgainst: team.pointsAgainst,
    standing: team.standing,
    finalStanding: team.finalStanding,
  }));
}

export function serializeEspnMatchups(matchups: EspnMatchup[]): Record<string, unknown>[] {
  return matchups.map((matchup) => ({
    homeTeam: teamRef(matchup.homeTeam),
    homeFinalScore: matchup.homeFinalScore,
    awayTeam: teamRef(matchup.awayTeam),
    awayFinalScore: matchup.awayFinalScore,
    winner: matchup.winner,
  }));
}

export function serializeEspnPlayers(players: EspnPlayer[]): Record<string, unknown>[] {
  return players.map((player) => ({
    playerId: player.playerId,
    name: player.name,
    position: player.position,
    proTeam: player.proTeam,
    totalPoints: player.totalPoints,
    avgPoints: player.avgPoints,
  }));
}

export function serializeEspnTransactions(
  transactions: EspnTransaction[],
): Record<string, unknown>[] {
  return transactions.map((transaction) => ({
    type: transaction.type,
    status: transaction.status,
    bidAmount: transaction.bidAmount,
    team: transaction.team?.teamName,
    items: transaction.items.map((item) => ({
      type: item.type,
      player: item.player,
    })),
  }));
}

export function serializeEspnActivities(activities: Activity[]): Record<string, unknown>[] {
  return activities.map((activity) => ({
    date: activity.date,
    actions: activity.actions.map((action) => ({
      team: typeof action.team === 'string' ? action.team : action.team.teamName,
      action: action.action,
      player: action.player,
      position: action.position,
    })),
  }));
}

export function serializeEspnBoxScores(boxScores: BoxScoreInstance[]): Record<string, unknown>[] {
  return boxScores.map((boxScore) => ({
    winner: boxScore.winner,
    homeTeam: teamRef(boxScore.homeTeam),
    awayTeam: teamRef(boxScore.awayTeam),
    scoringPeriod: boxScore.scoringPeriod,
    homeScore: 'homeScore' in boxScore ? boxScore.homeScore : undefined,
    awayScore: 'awayScore' in boxScore ? boxScore.awayScore : undefined,
  }));
}

export function serializeEspnDraft(draft: Pick[]): Record<string, unknown>[] {
  return draft.map((pick) => ({
    roundId: pick.roundNum,
    roundPickNumber: pick.roundPick,
    playerId: pick.playerId,
    playerName: pick.playerName,
    team: pick.team?.teamName,
    bidAmount: pick.bidAmount,
  }));
}

export function serializeEspnPlayer(player: EspnPlayer | EspnPlayer[] | null): unknown {
  if (player === null) {
    return null;
  }
  if (Array.isArray(player)) {
    return serializeEspnPlayers(player);
  }
  return serializeEspnPlayers([player])[0];
}

export function serializeYahooMatchups(matchups: YahooMatchup[]): Record<string, unknown>[] {
  return matchups.map((matchup) => ({
    week: matchup.week,
    status: matchup.status,
    winnerTeamKey: matchup.winnerTeamKey,
    teams: matchup.teams,
  }));
}

export function serializeYahooSettings(settings: YahooSettings): Record<string, unknown> {
  return {
    leagueKey: settings.leagueKey,
    leagueId: settings.leagueId,
    name: settings.name,
    season: settings.season,
    gameCode: settings.gameCode,
    numTeams: settings.numTeams,
    scoringType: settings.scoringType,
    currentWeek: settings.currentWeek,
    draftStatus: settings.draftStatus,
  };
}

export function serializeYahooTeams(teams: JsonObject[]): JsonObject[] {
  return teams;
}
