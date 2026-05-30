import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { DEFAULT_INSTRUCTIONS } from './instructions.js';
import { registerWorkflowTools } from './tools/index.js';

export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'fantasy-basketball-sdk',
      version: process.env.npm_package_version ?? '0.0.0',
    },
    {
      instructions: DEFAULT_INSTRUCTIONS,
    },
  );

  registerWorkflowTools(server);

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
