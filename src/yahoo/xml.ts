export interface RosterMove {
  playerKey: string;
  position: string;
}

export interface RosterXmlOptions {
  date: string;
  moves: RosterMove[];
}

export interface TradePlayerMove {
  playerKey: string;
  sourceTeamKey: string;
  destinationTeamKey: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildRosterXml(options: RosterXmlOptions): string {
  const players = options.moves
    .map(
      (move) => `      <player>
        <player_key>${escapeXml(move.playerKey)}</player_key>
        <position>${escapeXml(move.position)}</position>
      </player>`,
    )
    .join('\n');

  return `<?xml version="1.0"?>
<fantasy_content>
  <roster>
    <coverage_type>date</coverage_type>
    <date>${escapeXml(options.date)}</date>
    <players>
${players}
    </players>
  </roster>
</fantasy_content>`;
}

export function buildAddPlayerXml(
  teamKey: string,
  playerKey: string,
  options?: { faabBid?: number; waiverPriority?: number },
): string {
  const faab =
    options?.faabBid !== undefined ? `\n        <faab_bid>${options.faabBid}</faab_bid>` : '';
  const priority =
    options?.waiverPriority !== undefined
      ? `\n        <waiver_priority>${options.waiverPriority}</waiver_priority>`
      : '';

  return `<fantasy_content>
  <transaction>
    <type>add</type>
    <player>
      <player_key>${escapeXml(playerKey)}</player_key>
      <transaction_data>
        <type>add</type>
        <destination_team_key>${escapeXml(teamKey)}</destination_team_key>${faab}${priority}
      </transaction_data>
    </player>
  </transaction>
</fantasy_content>`;
}

export function buildDropPlayerXml(teamKey: string, playerKey: string): string {
  return `<fantasy_content>
  <transaction>
    <type>drop</type>
    <player>
      <player_key>${escapeXml(playerKey)}</player_key>
      <transaction_data>
        <type>drop</type>
        <source_team_key>${escapeXml(teamKey)}</source_team_key>
      </transaction_data>
    </player>
  </transaction>
</fantasy_content>`;
}

export interface AddDropXmlOptions {
  teamKey: string;
  addPlayerKey: string;
  dropPlayerKey: string;
  faabBid?: number;
  waiverPriority?: number;
}

export function buildAddDropXml(options: AddDropXmlOptions): string {
  const faab =
    options.faabBid !== undefined
      ? `\n        <faab_bid>${options.faabBid}</faab_bid>`
      : '';
  const priority =
    options.waiverPriority !== undefined
      ? `\n        <waiver_priority>${options.waiverPriority}</waiver_priority>`
      : '';

  return `<fantasy_content>
  <transaction>
    <type>add/drop</type>
    <players>
      <player>
        <player_key>${escapeXml(options.addPlayerKey)}</player_key>
        <transaction_data>
          <type>add</type>
          <destination_team_key>${escapeXml(options.teamKey)}</destination_team_key>${faab}${priority}
        </transaction_data>
      </player>
      <player>
        <player_key>${escapeXml(options.dropPlayerKey)}</player_key>
        <transaction_data>
          <type>drop</type>
          <source_team_key>${escapeXml(options.teamKey)}</source_team_key>
        </transaction_data>
      </player>
    </players>
  </transaction>
</fantasy_content>`;
}

export function buildProposeTradeXml(players: TradePlayerMove[]): string {
  const playerBlocks = players
    .map(
      (p) => `      <player>
        <player_key>${escapeXml(p.playerKey)}</player_key>
        <transaction_data>
          <type>trade</type>
          <source_team_key>${escapeXml(p.sourceTeamKey)}</source_team_key>
          <destination_team_key>${escapeXml(p.destinationTeamKey)}</destination_team_key>
        </transaction_data>
      </player>`,
    )
    .join('\n');

  return `<fantasy_content>
  <transaction>
    <type>pending_trade</type>
    <players>
${playerBlocks}
    </players>
  </transaction>
</fantasy_content>`;
}

export interface EditWaiverXmlOptions {
  transactionKey: string;
  waiverPriority?: number;
  faabBid?: number;
}

export function buildEditWaiverXml(options: EditWaiverXmlOptions): string {
  const priority =
    options.waiverPriority !== undefined
      ? `\n    <waiver_priority>${options.waiverPriority}</waiver_priority>`
      : '';
  const faab =
    options.faabBid !== undefined ? `\n    <faab_bid>${options.faabBid}</faab_bid>` : '';

  return `<?xml version='1.0'?>
<fantasy_content>
  <transaction>
    <transaction_key>${escapeXml(options.transactionKey)}</transaction_key>
    <type>waiver</type>${priority}${faab}
  </transaction>
</fantasy_content>`;
}

export type TradeAction = 'accept' | 'reject' | 'allow' | 'vote';

export interface TradeActionXmlOptions {
  transactionKey: string;
  action: TradeAction;
  note?: string;
}

export function buildTradeActionXml(options: TradeActionXmlOptions): string {
  const note = options.note
    ? `\n    <trade_note>${escapeXml(options.note)}</trade_note>`
    : '';

  return `<?xml version='1.0'?>
<fantasy_content>
  <transaction>
    <transaction_key>${escapeXml(options.transactionKey)}</transaction_key>
    <type>pending_trade</type>
    <action>${escapeXml(options.action)}</action>${note}
  </transaction>
</fantasy_content>`;
}
