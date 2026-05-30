import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';

import { createMcpServer } from '../src/mcp/create-server.js';

function createLinkedTransports(): [Transport, Transport] {
  const clientTransport: Transport = {
    start: async () => {},
    close: async () => {},
    send: async () => {},
  };
  const serverTransport: Transport = {
    start: async () => {},
    close: async () => {},
    send: async () => {},
  };

  clientTransport.send = async (message: JSONRPCMessage) => {
    serverTransport.onmessage?.(message);
  };
  serverTransport.send = async (message: JSONRPCMessage) => {
    clientTransport.onmessage?.(message);
  };

  return [clientTransport, serverTransport];
}

describe('mcp server', () => {
  it('creates a server instance without connecting', () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
    expect(server.isConnected()).toBe(false);
  });

  it('exposes parameter descriptions in tools/list inputSchema', async () => {
    const mcpServer = createMcpServer();
    const [clientTransport, serverTransport] = createLinkedTransports();
    const client = new Client({ name: 'test', version: '1.0.0' });

    await mcpServer.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const { tools } = await client.listTools();
      const boxScores = tools.find((tool) => tool.name === 'espn-box-scores');
      expect(boxScores).toBeDefined();

      const properties = boxScores!.inputSchema.properties as Record<
        string,
        { description?: string }
      >;
      expect(properties.matchupPeriod?.description).toMatch(/matchup period/i);
      expect(properties.scoringPeriod?.description).toMatch(/scoring period/i);
      expect(properties.matchupTotal?.description).toMatch(/matchup/i);

      const playerStats = tools.find((tool) => tool.name === 'yahoo-player-stats');
      const playerStatsProps = playerStats!.inputSchema.properties as Record<
        string,
        { description?: string }
      >;
      expect(playerStatsProps.playerIds?.description).toMatch(/player/i);
    } finally {
      await client.close();
      await mcpServer.close();
    }
  });
});
