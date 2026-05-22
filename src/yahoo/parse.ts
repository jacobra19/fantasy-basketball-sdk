import type { JsonObject, JsonValue } from './types/raw.js';

export function getFantasyContent(doc: JsonObject): JsonObject {
  const content = doc.fantasy_content;
  if (content !== null && typeof content === 'object' && !Array.isArray(content)) {
    return content as JsonObject;
  }
  if (Array.isArray(content)) {
    return flattenResource(content);
  }
  return doc;
}

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
}

export function mergeDicts(target: JsonObject, source: JsonObject): JsonObject {
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== null) {
      target[key] = value;
    }
  }
  return target;
}

/** Wrapper keys whose array values contain objects merged into the parent. */
const MERGE_ARRAY_KEYS = new Set(['settings', 'scoreboard', 'standings', 'roster']);

/** Merge Yahoo positional resource pairs ([0] metadata + [1] sub-resource). */
export function flattenResource(node: JsonValue): JsonObject {
  if (Array.isArray(node)) {
    const result: JsonObject = {};
    for (const item of node) {
      mergeDicts(result, flattenResource(item));
    }
    return result;
  }

  if (!isJsonObject(node)) {
    return {};
  }

  const result: JsonObject = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (MERGE_ARRAY_KEYS.has(key) && Array.isArray(value)) {
      for (const item of value) {
        mergeDicts(result, flattenResource(item));
      }
      result[key] = value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function parseCount(node: JsonValue): number | undefined {
  if (isJsonObject(node) && 'count' in node) {
    const count = node.count;
    if (typeof count === 'number') {
      return count;
    }
    if (typeof count === 'string') {
      const parsed = Number.parseInt(count, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
  }
  return undefined;
}

/** Collect all values for a key anywhere in the tree. */
export function collectByKey(node: JsonValue, key: string): JsonValue[] {
  const results: JsonValue[] = [];

  function walk(value: JsonValue): void {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    if (!isJsonObject(value)) {
      return;
    }
    if (key in value) {
      results.push(value[key]!);
    }
    for (const child of Object.values(value)) {
      walk(child);
    }
  }

  walk(node);
  return results;
}

/** Extract indexed collection items (teams, players, etc.) from Yahoo JSON. */
export function collectIndexedResources(
  container: JsonValue,
  entryResourceKey: string,
): JsonObject[] {
  const results: JsonObject[] = [];

  if (!isJsonObject(container)) {
    return results;
  }

  const count =
    parseCount(container) ?? Object.keys(container).filter((k) => /^\d+$/.test(k)).length;

  for (let i = 0; i < count; i += 1) {
    const entry = container[String(i)];
    if (entry === undefined) {
      continue;
    }

    if (isJsonObject(entry) && entryResourceKey in entry) {
      results.push(flattenResource(entry[entryResourceKey]!));
    } else {
      results.push(flattenResource(entry));
    }
  }

  return results;
}

/** Find first string value for a key in the tree. */
export function findFirstString(node: JsonValue, key: string): string | undefined {
  for (const value of collectByKey(node, key)) {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return undefined;
}

/** Collect all league_key values from a response. */
export function collectLeagueKeys(doc: JsonObject): string[] {
  const keys = new Set<string>();
  for (const value of collectByKey(doc, 'league_key')) {
    if (typeof value === 'string') {
      keys.add(value);
    }
  }
  return [...keys].sort();
}

/** Collect all team_key values from a response. */
export function collectTeamKeys(doc: JsonObject): string[] {
  const keys = new Set<string>();
  for (const value of collectByKey(doc, 'team_key')) {
    if (typeof value === 'string') {
      keys.add(value);
    }
  }
  return [...keys].sort();
}

/** Collect all player_key values from a response. */
export function collectPlayerKeys(doc: JsonObject): string[] {
  const keys = new Set<string>();
  for (const value of collectByKey(doc, 'player_key')) {
    if (typeof value === 'string') {
      keys.add(value);
    }
  }
  return [...keys].sort();
}

/** Collect all transaction_key values from a response. */
export function collectTransactionKeys(doc: JsonObject): string[] {
  const keys = new Set<string>();
  for (const value of collectByKey(doc, 'transaction_key')) {
    if (typeof value === 'string') {
      keys.add(value);
    }
  }
  return [...keys].sort();
}

/** Flatten a league node (array or object) into a single metadata + settings object. */
export function flattenLeagueNode(leagueNode: JsonValue | undefined): JsonObject {
  return flattenResource(leagueNode ?? {});
}

/** Read an indexed collection from a flattened league response. */
export function collectLeagueResources(
  league: JsonObject,
  collectionKey: string,
  entryResourceKey: string,
): JsonObject[] {
  const node = league[collectionKey];
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return [];
  }
  return collectIndexedResources(node, entryResourceKey);
}
