import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const DEFAULT_TOOL_TIMEOUT_MS = 30_000;

const ACTIONABLE_ERROR_PATTERNS = [
  /^Missing required environment variable:/,
  /^Environment variable .+ must be an integer/,
  /^Missing Yahoo league configuration:/,
  /^Provide leagueKey or both leagueId and season$/,
];

function isActionableError(message: string): boolean {
  return ACTIONABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === 'Tool execution timed out') {
      return 'Tool failed: request timed out. Try again or narrow the query.';
    }
    if (isActionableError(error.message)) {
      return error.message;
    }
  }
  return 'Tool failed: an unexpected error occurred while fetching fantasy data.';
}

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

export async function runTool<T>(
  fn: () => Promise<T>,
  options?: { timeoutMs?: number },
): Promise<CallToolResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Tool execution timed out')), timeoutMs);
      }),
    ]);
    return textResult(result);
  } catch (error) {
    return errorResult(sanitizeErrorMessage(error));
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
