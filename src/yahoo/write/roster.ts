import type { Team } from '../models/team.js';
import { buildRosterXml, type RosterMove, type RosterXmlOptions } from '../xml.js';

export type SetLineupOptions = RosterXmlOptions;

export async function setLineup(team: Team, options: SetLineupOptions): Promise<Response> {
  const xml = buildRosterXml(options);
  return team.client.put(`team/${team.teamKey}/roster`, xml);
}

// Convenience method on Team via extension pattern
export async function setTeamLineup(team: Team, options: SetLineupOptions): Promise<Response> {
  return setLineup(team, options);
}

export type { RosterMove };
