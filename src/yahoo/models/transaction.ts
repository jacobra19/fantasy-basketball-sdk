import type { YahooClient } from '../client.js';
import type { JsonObject } from '../types/raw.js';
import { getFantasyContent } from '../parse.js';

export class Transaction {
  readonly client: YahooClient;
  readonly transactionKey: string;

  constructor(client: YahooClient, transactionKey: string) {
    this.client = client;
    this.transactionKey = transactionKey;
  }

  async metadata(): Promise<JsonObject> {
    const doc = await this.client.get(`transaction/${this.transactionKey}`);
    return getFantasyContent(doc);
  }

  async players(): Promise<JsonObject> {
    const doc = await this.client.get(`transaction/${this.transactionKey}/players`);
    return getFantasyContent(doc);
  }
}
