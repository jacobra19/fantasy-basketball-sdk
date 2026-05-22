import type { JsonObject } from '../types/raw.js';
import { collectIndexedResources, flattenLeagueNode, flattenResource, getFantasyContent } from '../parse.js';

export class Matchup {
  readonly raw: JsonObject;

  constructor(raw: JsonObject) {
    this.raw = raw;
  }

  get week(): number | undefined {
    const value = this.raw.week;
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  get status(): string | undefined {
    const value = this.raw.status;
    return typeof value === 'string' ? value : undefined;
  }

  get winnerTeamKey(): string | undefined {
    const value = this.raw.winner_team_key;
    return typeof value === 'string' ? value : undefined;
  }

  get teams(): JsonObject[] {
    const teams = this.raw.teams;
    if (!teams || typeof teams !== 'object' || Array.isArray(teams)) {
      return [];
    }
    return collectIndexedResources(teams, 'team');
  }
}

export function parseMatchupsFromScoreboard(doc: JsonObject): Matchup[] {
  const content = getFantasyContent(doc);
  const league = flattenLeagueNode(content.league);

  let matchupsNode = league.matchups;
  if (!matchupsNode || typeof matchupsNode !== 'object' || Array.isArray(matchupsNode)) {
    const scoreboardFlat = flattenResource(league.scoreboard ?? {});
    matchupsNode = scoreboardFlat.matchups;
  }

  if (!matchupsNode || typeof matchupsNode !== 'object' || Array.isArray(matchupsNode)) {
    return [];
  }

  return collectIndexedResources(matchupsNode, 'matchup').map(
    (raw) => new Matchup(raw),
  );
}

export function parseMatchupsFromTeam(doc: JsonObject): Matchup[] {
  const content = getFantasyContent(doc);
  const teamNode = content.team;
  const team = flattenResource(teamNode ?? {});

  const matchupsNode = team.matchups;
  if (!matchupsNode || typeof matchupsNode !== 'object' || Array.isArray(matchupsNode)) {
    return [];
  }

  return collectIndexedResources(matchupsNode, 'matchup').map(
    (raw) => new Matchup(raw),
  );
}
