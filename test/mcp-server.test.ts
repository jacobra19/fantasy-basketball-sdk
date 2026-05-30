import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';

import { createMcpServer } from '../src/mcp/create-server.js';
import { DEFAULT_INSTRUCTIONS } from '../src/mcp/instructions.js';
import { clearLeagueContextCache } from '../src/mcp/league-context.js';
import {
  DEFAULT_TOOL_TIMEOUT_MS,
  errorResult,
  runTool,
  sanitizeErrorMessage,
} from '../src/mcp/results.js';
import { WORKFLOW_TOOL_NAMES } from '../src/mcp/tools/index.js';

function textContent(result: { content: Array<{ type: string; text?: string }> }): string {
  const block = result.content[0];
  expect(block?.type).toBe('text');
  return block?.text ?? '';
}

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

  it('exposes workflow tools with camelCase names and readOnlyHint', async () => {
    const mcpServer = createMcpServer();
    const [clientTransport, serverTransport] = createLinkedTransports();
    const client = new Client({ name: 'test', version: '1.0.0' });

    await mcpServer.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const { tools } = await client.listTools();
      const toolNames = tools.map((tool) => tool.name).sort();
      expect(toolNames).toEqual([...WORKFLOW_TOOL_NAMES].sort());

      for (const tool of tools) {
        expect(tool.description).toMatch(/<use_case>/);
        expect(tool.description).toMatch(/<important_notes>/);
        expect(tool.annotations?.readOnlyHint).toBe(true);
      }
    } finally {
      await client.close();
      await mcpServer.close();
    }
  });

  it('exposes parameter descriptions in tools/list inputSchema', async () => {
    const mcpServer = createMcpServer();
    const [clientTransport, serverTransport] = createLinkedTransports();
    const client = new Client({ name: 'test', version: '1.0.0' });

    await mcpServer.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const { tools } = await client.listTools();
      const matchupContext = tools.find((tool) => tool.name === 'getMatchupContext');
      expect(matchupContext).toBeDefined();

      const properties = matchupContext!.inputSchema.properties as Record<
        string,
        { description?: string }
      >;
      expect(properties.provider?.description).toMatch(/espn|yahoo/i);
      expect(properties.matchupPeriod?.description).toMatch(/matchup period/i);
      expect(properties.includeBoxScores?.description).toMatch(/box score/i);

      const searchPlayers = tools.find((tool) => tool.name === 'searchPlayers');
      const searchProps = searchPlayers!.inputSchema.properties as Record<
        string,
        { description?: string }
      >;
      expect(searchProps.playerIds?.description).toMatch(/player/i);
    } finally {
      await client.close();
      await mcpServer.close();
    }
  });

  it('includes rich server instructions', () => {
    expect(DEFAULT_INSTRUCTIONS).toMatch(/getLeagueOverview/);
    expect(DEFAULT_INSTRUCTIONS).toMatch(/ESPN_LEAGUE_ID/);
    expect(DEFAULT_INSTRUCTIONS).toMatch(/YAHOO_ACCESS_TOKEN/);
    expect(DEFAULT_INSTRUCTIONS).toMatch(/read-only/i);
  });

  it('clears league context cache between tests', () => {
    clearLeagueContextCache();
    expect(true).toBe(true);
  });
});

describe('mcp results', () => {
  it('preserves actionable config errors', () => {
    expect(
      sanitizeErrorMessage(new Error('Missing required environment variable: ESPN_LEAGUE_ID')),
    ).toBe('Missing required environment variable: ESPN_LEAGUE_ID');
    expect(
      sanitizeErrorMessage(
        new Error('Missing Yahoo league configuration: set YAHOO_LEAGUE_KEY or both'),
      ),
    ).toMatch(/Missing Yahoo league configuration/);
  });

  it('redacts internal error details', () => {
    expect(
      sanitizeErrorMessage(new Error('FetchError: https://example.com?token=secret failed')),
    ).toBe('Tool failed: an unexpected error occurred while fetching fantasy data.');
  });

  it('returns sanitized errors from runTool', async () => {
    const result = await runTool(async () => {
      throw new Error('TypeError: Cannot read properties of undefined');
    });
    expect(result.isError).toBe(true);
    expect(textContent(result)).toBe(
      'Tool failed: an unexpected error occurred while fetching fantasy data.',
    );
  });

  it('times out long-running tools', async () => {
    const result = await runTool(
      () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve('late'), DEFAULT_TOOL_TIMEOUT_MS + 200);
        }),
      { timeoutMs: 50 },
    );
    expect(result.isError).toBe(true);
    expect(textContent(result)).toMatch(/timed out/i);
  });

  it('returns successful JSON results', async () => {
    const result = await runTool(async () => ({ ok: true }));
    expect(result.isError).toBeUndefined();
    expect(textContent(result)).toContain('"ok": true');
  });

  it('formats explicit error results', () => {
    const result = errorResult('Missing required environment variable: ESPN_LEAGUE_ID');
    expect(result.isError).toBe(true);
    expect(textContent(result)).toContain('ESPN_LEAGUE_ID');
  });
});
