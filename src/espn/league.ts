import { EspnClient } from './client.js';
import {
  ACTIVITY_MAP,
  POSITION_MAP,
  TRANSACTION_TYPES,
  View,
} from './constants.js';
import { Activity } from './models/activity.js';
import {
  getBoxScoringTypeClass,
  H2HPointsBoxScore,
  type BoxScoreInstance,
} from './models/box-score.js';
import { Matchup } from './models/matchup.js';
import { Pick } from './models/pick.js';
import { Player, type ProTeamSchedule } from './models/player.js';
import { Settings } from './models/settings.js';
import { Team } from './models/team.js';
import { Transaction } from './models/transaction.js';
import type { EspnLeagueResponse, JsonObject } from './types/raw.js';

export interface LeagueOptions {
  leagueId: number;
  seasonId: number;
  espnS2?: string;
  swid?: string;
  fetchLeague?: boolean;
  fetch?: typeof globalThis.fetch;
}

export class League {
  teams: Team[] = [];
  members: JsonObject[] = [];
  draft: Pick[] = [];
  playerMap: Record<number | string, number | string> = {};
  settings!: Settings;
  currentMatchupPeriod = 0;
  scoringPeriodId = 0;
  firstScoringPeriod = 0;
  finalScoringPeriod = 0;
  previousSeasons: number[] = [];
  currentWeek = 0;
  year: number;
  leagueId: number;
  proSchedule: ProTeamSchedule = {};
  matchupIds: Record<number, number[]> = {};

  private readonly client: EspnClient;
  private BoxScoreClass:
    | ReturnType<typeof getBoxScoringTypeClass>
    | null = null;

  constructor(options: LeagueOptions) {
    this.leagueId = options.leagueId;
    this.year = options.seasonId;
    this.client = new EspnClient({
      leagueId: options.leagueId,
      seasonId: options.seasonId,
      espnS2: options.espnS2,
      swid: options.swid,
      fetch: options.fetch,
    });
  }

  /** Create a league and optionally fetch data (mirrors Python fetch_league=True). */
  static async create(options: LeagueOptions): Promise<League> {
    const league = new League(options);
    if (options.fetchLeague !== false) {
      await league.fetchLeague();
    }
    return league;
  }

  async fetchLeague(): Promise<void> {
    const data = await this.fetchLeagueData();
    await this.fetchTeams(data);
    await this.fetchDraft();
    this.BoxScoreClass = getBoxScoringTypeClass(this.settings.scoringType);
  }

  private async fetchLeagueData(): Promise<EspnLeagueResponse> {
    const data = await this.client.getLeague();
    this.currentMatchupPeriod = (data.status as JsonObject).currentMatchupPeriod as number;
    this.scoringPeriodId = data.scoringPeriodId as number;
    this.firstScoringPeriod = (data.status as JsonObject).firstScoringPeriod as number;
    this.finalScoringPeriod = (data.status as JsonObject).finalScoringPeriod as number;
    this.previousSeasons = (
      (data.status as JsonObject).previousSeasons as number[] | undefined
    )?.filter((year) => year < this.year) ?? [];

    if (this.year < 2018) {
      this.currentWeek = data.scoringPeriodId as number;
    } else {
      const finalPeriod = (data.status as JsonObject).finalScoringPeriod as number;
      this.currentWeek =
        this.scoringPeriodId <= finalPeriod ? this.scoringPeriodId : finalPeriod;
    }

    this.settings = new Settings(data.settings as JsonObject);
    this.members = (data.members as JsonObject[] | undefined) ?? [];

    await this.fetchPlayers();
    this.mapMatchupIds((data.schedule as JsonObject[] | undefined) ?? []);
    return data;
  }

  private mapMatchupIds(schedule: JsonObject[]): void {
    this.matchupIds = {};
    for (const match of schedule) {
      const matchupPeriod = match.matchupPeriodId as number;
      const scoringPeriods = Object.keys(
        ((match.home as JsonObject).pointsByScoringPeriod as JsonObject | undefined) ?? {},
      );
      if (scoringPeriods.length > 0) {
        const periods = scoringPeriods.map(Number).sort((a, b) => a - b);
        if (!(matchupPeriod in this.matchupIds)) {
          this.matchupIds[matchupPeriod] = periods;
        } else {
          this.matchupIds[matchupPeriod] = [
            ...new Set([...this.matchupIds[matchupPeriod]!, ...periods]),
          ].sort((a, b) => a - b);
        }
      }
    }
  }

  private async fetchPlayers(): Promise<void> {
    const data = await this.client.getProPlayers();
    for (const player of data) {
      this.playerMap[player.id] = player.fullName;
      if (!(player.fullName in this.playerMap)) {
        this.playerMap[player.fullName] = player.id;
      }
    }
  }

  private async fetchTeams(data: EspnLeagueResponse): Promise<void> {
    this.proSchedule = await this.getAllProSchedule();
    this.teams = [];
    const teams = (data.teams as JsonObject[] | undefined) ?? [];
    const schedule = (data.schedule as JsonObject[] | undefined) ?? [];
    const seasonId = data.seasonId as number;
    const members = (data.members as JsonObject[] | undefined) ?? [];

    const teamRoster: Record<number, JsonObject> = {};
    for (const team of teams) {
      teamRoster[team.id as number] = (team.roster as JsonObject | undefined) ?? {};
    }

    for (const team of teams) {
      const roster = teamRoster[team.id as number]!;
      const owners = members.filter((member) =>
        ((team.owners as string[] | undefined) ?? []).includes(member.id as string),
      );
      this.teams.push(
        new Team(team, roster, schedule, seasonId, {
          proSchedule: this.proSchedule,
          owners,
        }),
      );
    }

    this.teams.sort((a, b) => a.teamId - b.teamId);

    for (const team of this.teams) {
      team.divisionName = this.settings.divisionMap[team.divisionId] ?? '';
      for (const matchup of team.schedule) {
        for (const opponent of this.teams) {
          if (matchup.awayTeam === opponent.teamId) {
            matchup.awayTeam = opponent;
          }
          if (matchup.homeTeam === opponent.teamId) {
            matchup.homeTeam = opponent;
          }
        }
      }
    }
  }

  private async getAllProSchedule(): Promise<ProTeamSchedule> {
    const data = await this.client.getProSchedule();
    const proTeams = data.settings?.proTeams ?? [];
    const proTeamSchedule: ProTeamSchedule = {};

    for (const team of proTeams) {
      const proGame =
        (team.proGamesByScoringPeriod as ProTeamSchedule[number] | undefined) ?? {};
      proTeamSchedule[team.id as number] = proGame;
    }

    return proTeamSchedule;
  }

  private async fetchDraft(): Promise<void> {
    const data = await this.client.getLeagueDraft();
    const draftDetail = (data.draftDetail as JsonObject | undefined) ?? {};
    if (!draftDetail.drafted) {
      return;
    }

    const picks = (draftDetail.picks as JsonObject[] | undefined) ?? [];
    this.draft = [];
    for (const pick of picks) {
      const team = this.getTeamData(pick.teamId as number);
      const playerId = pick.playerId as number;
      let playerName = '';
      if (playerId in this.playerMap) {
        playerName = String(this.playerMap[playerId]);
      }
      this.draft.push(
        new Pick(
          team,
          playerId,
          playerName,
          pick.roundId as number,
          pick.roundPickNumber as number,
          pick.bidAmount,
          pick.keeper,
          this.getTeamData(pick.nominatingTeamId as number),
        ),
      );
    }
  }

  getTeamData(teamId: number): Team | undefined {
    return this.teams.find((team) => team.teamId === teamId);
  }

  standings(): Team[] {
    return [...this.teams].sort((a, b) => {
      const aRank = a.finalStanding && a.finalStanding !== 0 ? a.finalStanding : a.standing;
      const bRank = b.finalStanding && b.finalStanding !== 0 ? b.finalStanding : b.standing;
      return aRank - bRank;
    });
  }

  async scoreboard(matchupPeriod?: number): Promise<Matchup[]> {
    const period = matchupPeriod ?? this.currentMatchupPeriod;
    const data = await this.client.leagueGet({
      params: { view: View.MMatchup },
    });
    const schedule = (data.schedule as JsonObject[] | undefined) ?? [];
    const matchups = schedule
      .filter((matchup) => matchup.matchupPeriodId === period)
      .map((matchup) => new Matchup(matchup));

    for (const team of this.teams) {
      for (const matchup of matchups) {
        if (matchup.homeTeam === team.teamId) {
          matchup.homeTeam = team;
        } else if (matchup.awayTeam === team.teamId) {
          matchup.awayTeam = team;
        }
      }
    }

    return matchups;
  }

  async recentActivity(options: {
    size?: number;
    msgType?: string;
    offset?: number;
    includeMoved?: boolean;
  } = {}): Promise<Activity[]> {
    if (this.year < 2019) {
      throw new Error('Cant use recent activity before 2019');
    }

    const { size = 25, msgType, offset = 0, includeMoved = false } = options;
    let msgTypes = [178, 180, 179, 239, 181, 244, 188];
    if (msgType && msgType in ACTIVITY_MAP) {
      msgTypes = [ACTIVITY_MAP[msgType] as number];
    }

    const filters = {
      topics: {
        filterType: { value: ['ACTIVITY_TRANSACTIONS'] },
        limit: size,
        limitPerMessageSet: { value: 25 },
        offset,
        sortMessageDate: { sortPriority: 1, sortAsc: false },
        sortFor: { sortPriority: 2, sortAsc: false },
        filterIncludeMessageTypeIds: { value: msgTypes },
      },
    };

    const data = await this.client.leagueGet({
      extend: '/communication/',
      params: { view: View.KonaLeagueCommunication },
      headers: { 'x-fantasy-filter': JSON.stringify(filters) },
    });

    const topics = (data.topics as JsonObject[] | undefined) ?? [];
    return topics.map(
      (topic) =>
        new Activity(topic, this.playerMap, (id) => this.getTeamData(id), includeMoved),
    );
  }

  async transactions(options: {
    scoringPeriod?: number;
    types?: Set<string>;
  } = {}): Promise<Transaction[]> {
    const scoringPeriod = options.scoringPeriod ?? this.scoringPeriodId;
    const types = options.types ?? new Set(['FREEAGENT', 'WAIVER', 'WAIVER_ERROR']);

    for (const type of types) {
      if (!TRANSACTION_TYPES.has(type)) {
        throw new Error('Invalid transaction type');
      }
    }

    const filters = {
      transactions: { filterType: { value: [...types] } },
    };

    const data = await this.client.leagueGet({
      params: {
        view: View.MTransactions2,
        scoringPeriodId: scoringPeriod,
      },
      headers: { 'x-fantasy-filter': JSON.stringify(filters) },
    });

    const transactions = (data.transactions as JsonObject[] | undefined) ?? [];
    return transactions.map(
      (transaction) =>
        new Transaction(transaction, this.playerMap, (id) => this.getTeamData(id)),
    );
  }

  async freeAgents(options: {
    week?: number;
    size?: number;
    position?: string;
    positionId?: number;
  } = {}): Promise<Player[]> {
    if (this.year < 2019) {
      throw new Error('Cant use free agents before 2019');
    }

    const week = options.week ?? this.currentWeek;
    const size = options.size ?? 50;
    const slotFilter: number[] = [];

    if (options.position && options.position in POSITION_MAP) {
      slotFilter.push(POSITION_MAP[options.position] as number);
    }
    if (options.positionId !== undefined) {
      slotFilter.push(options.positionId);
    }

    const filters = {
      players: {
        filterStatus: { value: ['FREEAGENT', 'WAIVERS'] },
        filterSlotIds: { value: slotFilter },
        limit: size,
        sortPercOwned: { sortPriority: 1, sortAsc: false },
        sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'STANDARD' },
      },
    };

    const data = await this.client.leagueGet({
      params: {
        view: View.KonaPlayerInfo,
        scoringPeriodId: week,
      },
      headers: { 'x-fantasy-filter': JSON.stringify(filters) },
    });

    const players = (data.players as JsonObject[] | undefined) ?? [];
    return players.map((player) => new Player(player, this.year));
  }

  async boxScores(options: {
    matchupPeriod?: number;
    scoringPeriod?: number;
    matchupTotal?: boolean;
  } = {}): Promise<BoxScoreInstance[]> {
    if (this.year < 2019) {
      throw new Error('Cant use box score before 2019');
    }

    const matchupTotal = options.matchupTotal ?? true;
    let matchupId = this.currentMatchupPeriod;
    let scoringId = this.currentWeek;

    if (options.matchupPeriod !== undefined && options.scoringPeriod !== undefined) {
      matchupId = options.matchupPeriod;
      scoringId = options.scoringPeriod;
    } else if (options.matchupPeriod !== undefined && options.matchupPeriod < matchupId) {
      matchupId = options.matchupPeriod;
      scoringId = this.matchupIds[options.matchupPeriod]?.at(-1) ?? 1;
    } else if (
      options.scoringPeriod !== undefined &&
      options.scoringPeriod <= scoringId
    ) {
      scoringId = options.scoringPeriod;
      for (const matchup of Object.keys(this.matchupIds).map(Number)) {
        if (this.matchupIds[matchup]!.map(String).includes(String(scoringId))) {
          matchupId = matchup;
          break;
        }
      }
    }

    const filters = {
      schedule: { filterMatchupPeriodIds: { value: [matchupId] } },
    };

    const data = await this.client.leagueGet({
      params: {
        view: [View.MMatchupScore, View.MScoreboard],
        scoringPeriodId: scoringId,
      },
      headers: { 'x-fantasy-filter': JSON.stringify(filters) },
    });

    const schedule = (data.schedule as JsonObject[] | undefined) ?? [];
    const BoxScoreCtor = this.BoxScoreClass ?? H2HPointsBoxScore;
    const boxData = schedule.map(
      (matchup) =>
        new BoxScoreCtor(matchup, this.proSchedule, matchupTotal, this.year, scoringId) as BoxScoreInstance,
    );

    for (const team of this.teams) {
      for (const matchup of boxData) {
        if (matchup.homeTeam === team.teamId) {
          matchup.homeTeam = team;
        } else if (matchup.awayTeam === team.teamId) {
          matchup.awayTeam = team;
        }
      }
    }

    return boxData;
  }

  async playerInfo(options: {
    name?: string;
    playerId?: number | number[];
    includeNews?: boolean;
  }): Promise<Player | Player[] | null> {
    let playerIds = options.playerId;
    if (options.name) {
      playerIds = this.playerMap[options.name] as number | undefined;
    }
    if (playerIds === undefined || playerIds === null || typeof playerIds === 'string') {
      return null;
    }

    const ids = Array.isArray(playerIds) ? playerIds : [playerIds];
    const data = await this.client.getPlayerCard(ids, this.finalScoringPeriod);

    const newsMap: Record<number, JsonObject> = {};
    if (options.includeNews) {
      for (const id of ids) {
        newsMap[id] = (await this.client.getPlayerNews(id)) as JsonObject;
      }
    }

    const players = (data.players as JsonObject[] | undefined) ?? [];
    if (players.length === 1) {
      return new Player(
        players[0]!,
        this.year,
        this.proSchedule,
        options.includeNews ? newsMap[ids[0]!] ?? null : null,
      );
    }
    if (players.length > 1) {
      return players.map((player) => {
        const id = player.id as number;
        return new Player(
          player,
          this.year,
          this.proSchedule,
          options.includeNews ? newsMap[id] ?? null : null,
        );
      });
    }
    return null;
  }
}
