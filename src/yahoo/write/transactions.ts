import type { YahooClient } from '../client.js';
import type { League } from '../models/league.js';
import type { Transaction } from '../models/transaction.js';
import {
  buildAddDropXml,
  buildAddPlayerXml,
  buildDropPlayerXml,
  buildEditWaiverXml,
  buildProposeTradeXml,
  buildTradeActionXml,
  type TradeAction,
  type TradePlayerMove,
} from '../xml.js';

export interface AddPlayerOptions {
  teamKey: string;
  playerKey: string;
  faabBid?: number;
  waiverPriority?: number;
}

export interface AddDropOptions {
  teamKey: string;
  addPlayerKey: string;
  dropPlayerKey: string;
  faabBid?: number;
  waiverPriority?: number;
}

export interface ProposeTradeOptions {
  players: TradePlayerMove[];
}

export interface EditWaiverOptions {
  transactionKey: string;
  waiverPriority?: number;
  faabBid?: number;
}

export interface TradeActionOptions {
  transactionKey: string;
  note?: string;
}

export async function addPlayer(league: League, options: AddPlayerOptions): Promise<Response> {
  return league.postTransactionXml(
    buildAddPlayerXml(options.teamKey, options.playerKey, {
      faabBid: options.faabBid,
      waiverPriority: options.waiverPriority,
    }),
  );
}

export async function dropPlayer(
  league: League,
  teamKey: string,
  playerKey: string,
): Promise<Response> {
  return league.postTransactionXml(buildDropPlayerXml(teamKey, playerKey));
}

export async function addDrop(league: League, options: AddDropOptions): Promise<Response> {
  return league.postTransactionXml(buildAddDropXml(options));
}

export async function proposeTrade(
  league: League,
  options: ProposeTradeOptions,
): Promise<Response> {
  return league.postTransactionXml(buildProposeTradeXml(options.players));
}

export async function editWaiver(
  client: YahooClient,
  options: EditWaiverOptions,
): Promise<Response> {
  const xml = buildEditWaiverXml(options);
  return client.put(`transaction/${options.transactionKey}`, xml);
}

export async function tradeAction(
  client: YahooClient,
  action: TradeAction,
  options: TradeActionOptions,
): Promise<Response> {
  const xml = buildTradeActionXml({
    transactionKey: options.transactionKey,
    action,
    note: options.note,
  });
  return client.put(`transaction/${options.transactionKey}`, xml);
}

export async function acceptTrade(
  client: YahooClient,
  options: TradeActionOptions,
): Promise<Response> {
  return tradeAction(client, 'accept', options);
}

export async function rejectTrade(
  client: YahooClient,
  options: TradeActionOptions,
): Promise<Response> {
  return tradeAction(client, 'reject', options);
}

export async function allowTrade(
  client: YahooClient,
  options: TradeActionOptions,
): Promise<Response> {
  return tradeAction(client, 'allow', options);
}

export async function voteAgainstTrade(
  client: YahooClient,
  options: TradeActionOptions,
): Promise<Response> {
  return tradeAction(client, 'vote', options);
}

export async function cancelTransaction(
  client: YahooClient,
  transactionKey: string,
): Promise<Response> {
  return client.delete(`transaction/${transactionKey}`);
}

export function transactionClient(transaction: Transaction): YahooClient {
  return transaction.client;
}
