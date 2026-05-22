import type { JsonObject } from '../types/raw.js';

export class Settings {
  readonly regSeasonCount: number;
  readonly matchupPeriods: unknown;
  readonly vetoVotesRequired: number;
  readonly teamCount: number;
  readonly playoffTeamCount: number;
  readonly keeperCount: number;
  readonly tradeDeadline: number;
  readonly divisionMap: Record<number, string>;
  readonly name: string;
  readonly tieRule: unknown;
  readonly playoffTieRule: unknown;
  readonly playoffMatchupPeriodLength: number;
  readonly playoffSeedTieRule: unknown;
  readonly scoringType: string | undefined;
  readonly medianScoring: boolean;
  readonly faab: boolean;
  readonly acquisitionBudget: number;
  readonly acquisitionLimit: unknown;
  readonly matchupAcquisitionLimit: unknown;
  readonly matchupLimitPerScoringPeriod: unknown;
  readonly minimumBid: number;
  readonly waiverProcessDays: unknown[];
  readonly waiverProcessHour: unknown;
  readonly tradeRevisionHours: unknown;

  constructor(data: JsonObject) {
    const scheduleSettings = (data.scheduleSettings ?? {}) as JsonObject;
    const tradeSettings = (data.tradeSettings ?? {}) as JsonObject;
    const draftSettings = (data.draftSettings ?? {}) as JsonObject;
    const scoringSettings = (data.scoringSettings ?? {}) as JsonObject;
    const acquisitionSettings = (data.acquisitionSettings ?? {}) as JsonObject;

    this.regSeasonCount = scheduleSettings.matchupPeriodCount as number;
    this.matchupPeriods = scheduleSettings.matchupPeriods;
    this.vetoVotesRequired = tradeSettings.vetoVotesRequired as number;
    this.teamCount = data.size as number;
    this.playoffTeamCount = scheduleSettings.playoffTeamCount as number;
    this.keeperCount = draftSettings.keeperCount as number;
    this.tradeDeadline = (tradeSettings.deadlineDate as number | undefined) ?? 0;
    this.divisionMap = {};
    this.name = data.name as string;
    this.tieRule = scoringSettings.matchupTieRule;
    this.playoffTieRule = scoringSettings.playoffMatchupTieRule;
    this.playoffMatchupPeriodLength =
      (scheduleSettings.playoffMatchupPeriodLength as number | undefined) ?? 0;
    this.playoffSeedTieRule = scheduleSettings.playoffSeedingRule;
    this.scoringType = scoringSettings.scoringType as string | undefined;
    this.medianScoring = scoringSettings.scoringEnhancementType === 'WIN_BONUS_TOP_HALF';
    this.faab = acquisitionSettings.isUsingAcquisitionBudget as boolean;
    this.acquisitionBudget = (acquisitionSettings.acquisitionBudget as number | undefined) ?? 0;
    this.acquisitionLimit = acquisitionSettings.acquisitionLimit;
    this.matchupAcquisitionLimit = acquisitionSettings.matchupAcquisitionLimit;
    this.matchupLimitPerScoringPeriod = acquisitionSettings.matchupLimitPerScoringPeriod;
    this.minimumBid = (acquisitionSettings.minimumBid as number | undefined) ?? 0;
    this.waiverProcessDays = (acquisitionSettings.waiverProcessDays as unknown[]) ?? [];
    this.waiverProcessHour = acquisitionSettings.waiverProcessHour;
    this.tradeRevisionHours = tradeSettings.revisionHours;

    const divisions = (scheduleSettings.divisions as JsonObject[] | undefined) ?? [];
    for (const division of divisions) {
      this.divisionMap[division.id as number] = division.name as string;
    }
  }
}
