/**
 * Smoke-test the built MCP stdio server by spawning it and listing tools.
 */
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, '../dist/mcp/server.js');

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  stderr: 'pipe',
});

const client = new Client({ name: 'verify-dist', version: '1.0.0' });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name).sort();

  const expected = [
    'espn-box-scores',
    'espn-free-agents',
    'espn-league-info',
    'espn-player-info',
    'espn-recent-activity',
    'espn-scoreboard',
    'espn-standings',
    'espn-transactions',
    'yahoo-draft-results',
    'yahoo-league-info',
    'yahoo-player-stats',
    'yahoo-players',
    'yahoo-scoreboard',
    'yahoo-standings',
    'yahoo-teams',
    'yahoo-transactions',
  ];

  if (toolNames.join(',') !== expected.join(',')) {
    console.error('smoke-mcp: unexpected tools', toolNames);
    process.exit(1);
  }

  console.log(`smoke-mcp: listed ${toolNames.length} tools OK`);
} catch (error) {
  console.error('smoke-mcp: failed', error);
  process.exit(1);
} finally {
  await client.close();
}
