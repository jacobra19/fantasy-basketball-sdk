/** Yahoo fantasy_content root document (JSON via format=json). */
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface FantasyContentDocument {
  fantasy_content: JsonObject;
}

export type FantasyContent = FantasyContentDocument | JsonObject;
