import type { JsonObject } from '../types/raw.js';
import type { Team } from './team.js';

export class TransactionItem {
  type: string;
  player: string;

  constructor(data: JsonObject, playerMap: Record<number | string, number | string>) {
    this.type = data.type as string;
    this.player = String(playerMap[data.playerId as number] ?? '');
  }
}

export class Transaction {
  team: Team | undefined;
  type: string;
  status: string;
  scoringPeriod: number;
  date: unknown;
  bidAmount: unknown;
  items: TransactionItem[] = [];

  constructor(
    data: JsonObject,
    playerMap: Record<number | string, number | string>,
    getTeamData: (teamId: number) => Team | undefined,
  ) {
    this.team = getTeamData(data.teamId as number);
    this.type = data.type as string;
    this.status = data.status as string;
    this.scoringPeriod = data.scoringPeriodId as number;
    this.date = data.processDate;
    this.bidAmount = data.bidAmount;

    const items = (data.items as JsonObject[] | undefined) ?? [];
    this.items = items.map((item) => new TransactionItem(item, playerMap));
  }
}
