import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function textResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

export function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

export async function runTool<T>(fn: () => Promise<T>): Promise<CallToolResult> {
  try {
    return textResult(await fn());
  } catch (error) {
    if (error instanceof Error) {
      return errorResult(`${error.name}: ${error.message}`);
    }
    return errorResult(String(error));
  }
}
