import type { Team } from './team.js';

export class Pick {
  team: Team | undefined;
  playerId: number;
  playerName: string;
  roundNum: number;
  roundPick: number;
  bidAmount: unknown;
  keeperStatus: unknown;
  nominatingTeam: Team | undefined;

  constructor(
    team: Team | undefined,
    playerId: number,
    playerName: string,
    roundNum: number,
    roundPick: number,
    bidAmount: unknown,
    keeperStatus: unknown,
    nominatingTeam: Team | undefined,
  ) {
    this.team = team;
    this.playerId = playerId;
    this.playerName = playerName;
    this.roundNum = roundNum;
    this.roundPick = roundPick;
    this.bidAmount = bidAmount;
    this.keeperStatus = keeperStatus;
    this.nominatingTeam = nominatingTeam;
  }
}
