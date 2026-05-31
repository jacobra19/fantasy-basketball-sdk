import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { DEFAULT_INSTRUCTIONS } from './instructions.js';
import { PACKAGE_METADATA } from './package-info.js';
import { registerWorkflowTools } from './tools/index.js';

export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: PACKAGE_METADATA.name,
      version: PACKAGE_METADATA.version,
    },
    {
      instructions: DEFAULT_INSTRUCTIONS,
    },
  );

  registerWorkflowTools(server);

  return server;
}

export async function startMcpServer(): Promise<McpServer> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
