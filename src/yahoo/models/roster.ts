import type { JsonObject } from '../types/raw.js';
import { collectIndexedResources, flattenResource, getFantasyContent, isJsonObject } from '../parse.js';

export interface RosterPlayer {
  playerKey: string;
  selectedPosition?: string;
  raw: JsonObject;
}

export class Roster {
  readonly raw: JsonObject;
  readonly players: RosterPlayer[];

  constructor(raw: JsonObject, players: RosterPlayer[]) {
    this.raw = raw;
    this.players = players;
  }

  get coverageType(): string | undefined {
    const value = this.raw.coverage_type;
    return typeof value === 'string' ? value : undefined;
  }

  get date(): string | undefined {
    const value = this.raw.date;
    return typeof value === 'string' ? value : undefined;
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
}

export function parseRosterFromResponse(doc: JsonObject): Roster {
  const content = getFantasyContent(doc);
  const team = flattenResource(content.team ?? {});

  const playersNode = team.players;
  const playerResources = collectIndexedResources(playersNode ?? null, 'player');

  const players: RosterPlayer[] = playerResources.map((raw) => {
    const playerKey = String(raw.player_key ?? '');
    let selectedPosition: string | undefined;
    const sp = raw.selected_position;
    if (Array.isArray(sp) && isJsonObject(sp[0])) {
      selectedPosition = String(sp[0].position ?? '');
    } else if (isJsonObject(sp)) {
      selectedPosition = String(sp.position ?? '');
    }

    return { playerKey, selectedPosition, raw };
  });

  return new Roster(team, players);
}
