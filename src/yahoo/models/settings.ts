import type { JsonObject } from '../types/raw.js';
import {
  collectIndexedResources,
  findFirstString,
  flattenLeagueNode,
  flattenResource,
  getFantasyContent,
} from '../parse.js';

export class Settings {
  readonly raw: JsonObject;

  constructor(raw: JsonObject) {
    this.raw = raw;
  }

  get leagueKey(): string | undefined {
    const value = this.raw.league_key;
    return typeof value === 'string' ? value : undefined;
  }

  get leagueId(): string | undefined {
    const value = this.raw.league_id;
    return value !== undefined ? String(value) : undefined;
  }

  get name(): string | undefined {
    const value = this.raw.name;
    return typeof value === 'string' ? value : undefined;
  }

  get season(): string | undefined {
    const value = this.raw.season;
    return value !== undefined ? String(value) : undefined;
  }

  get gameCode(): string | undefined {
    const value = this.raw.game_code;
    return typeof value === 'string' ? value : undefined;
  }

  get scoringType(): string | undefined {
    const value = this.raw.scoring_type;
    return typeof value === 'string' ? value : undefined;
  }

  get numTeams(): number | undefined {
    const value = this.raw.num_teams;
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  get currentWeek(): number | undefined {
    const value = this.raw.current_week;
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  get draftStatus(): string | undefined {
    const value = this.raw.draft_status;
    return typeof value === 'string' ? value : undefined;
  }

  get rosterPositions(): JsonObject[] {
    const positions = this.raw.roster_positions;
    if (!positions || typeof positions !== 'object' || Array.isArray(positions)) {
      return [];
    }
    return collectIndexedResources({ roster_positions: positions }, 'roster_position');
  }

  get statCategories(): JsonObject[] {
    const categories = this.raw.stat_categories;
    if (!categories || typeof categories !== 'object' || Array.isArray(categories)) {
      return [];
    }
    const stats = (categories as JsonObject).stats;
    if (!stats || typeof stats !== 'object' || Array.isArray(stats)) {
      return [];
    }
    return collectIndexedResources({ stats }, 'stat');
  }
}

export function parseSettingsFromResponse(doc: JsonObject): Settings {
  const content = getFantasyContent(doc);
  const leagueNode = content.league;
  const merged = flattenLeagueNode(leagueNode);
  return new Settings(merged);
}

export function parseLeagueMetadata(doc: JsonObject): JsonObject {
  const content = getFantasyContent(doc);
  return flattenLeagueNode(content.league);
}

export function parseGameMetadata(doc: JsonObject): JsonObject {
  const content = getFantasyContent(doc);
  return flattenResource(content.game ?? {});
}

export function parseGameId(doc: JsonObject): string | undefined {
  const content = getFantasyContent(doc);
  return (
    findFirstString(content.game ?? null, 'game_id') ??
    findFirstString(content, 'game_id') ??
    findFirstString(content, 'game_key')
  );
}
