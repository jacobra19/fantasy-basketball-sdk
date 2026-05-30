import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerEspnTools } from './tools/espn.js';
import { registerYahooTools } from './tools/yahoo.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'fantasy-basketball-sdk',
    version: process.env.npm_package_version ?? '0.0.0',
  });

  registerEspnTools(server);
  registerYahooTools(server);

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
