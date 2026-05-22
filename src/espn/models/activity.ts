import { ACTIVITY_MAP, POSITION_MAP } from '../constants.js';
import type { JsonObject } from '../types/raw.js';
import type { Team } from './team.js';

export interface ActivityAction {
  team: Team | string;
  action: string;
  player: string;
  position: string;
}

export class Activity {
  actions: ActivityAction[] = [];
  date: unknown;

  constructor(
    data: JsonObject,
    playerMap: Record<number | string, number | string>,
    getTeamData: (teamId: number) => Team | undefined,
    includeMoved = false,
  ) {
    this.date = data.date;
    const messages = (data.messages as JsonObject[] | undefined) ?? [];

    for (const msg of messages) {
      let team: Team | string = '';
      let action = 'UNKNOWN';
      let player = '';
      let position = '';
      const msgId = msg.messageTypeId as number;

      if (msgId === 244) {
        team = getTeamData(msg.from as number) ?? '';
      } else if (msgId === 239) {
        team = getTeamData(msg.for as number) ?? '';
      } else if (msgId === 188 && includeMoved && (msg.to as number) in POSITION_MAP) {
        position = POSITION_MAP[msg.to as number] as string;
      } else {
        team = getTeamData(msg.to as number) ?? '';
      }

      if (msgId in ACTIVITY_MAP) {
        if (includeMoved) {
          action = ACTIVITY_MAP[msgId] as string;
        } else if (msgId !== 188) {
          action = ACTIVITY_MAP[msgId] as string;
        }
      }

      if ((msg.targetId as number) in playerMap) {
        player = String(playerMap[msg.targetId as number]!);
      }

      if (action !== 'UNKNOWN') {
        this.actions.push({ team, action, player, position });
      }
    }
  }
}
