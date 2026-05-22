export type JsonObject = Record<string, unknown>;

export interface EspnLeagueResponse extends JsonObject {
  id?: number;
  seasonId?: number;
  scoringPeriodId?: number;
  schedule?: JsonObject[];
  teams?: JsonObject[];
  members?: JsonObject[];
  settings?: JsonObject;
  status?: JsonObject;
  draftDetail?: JsonObject;
  players?: JsonObject[];
  transactions?: JsonObject[];
  topics?: JsonObject[];
  messages?: string[];
}

export interface EspnProPlayer {
  id: number;
  fullName: string;
}

export interface EspnProScheduleResponse extends JsonObject {
  settings?: {
    proTeams?: JsonObject[];
  };
}
