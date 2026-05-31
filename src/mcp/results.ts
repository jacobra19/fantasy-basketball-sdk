import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const DEFAULT_TOOL_TIMEOUT_MS = 30_000;
export const MCP_DEBUG_ENV = 'FANTASY_BASKETBALL_MCP_DEBUG';
export const ERROR_DOCS_URL =
  'https://github.com/jacobra19/fantasy-basketball-sdk/issues/new?template=bug_report.md';

const ACTIONABLE_ERROR_PATTERNS = [
  /^Missing required environment variable:/,
  /^Environment variable .+ must be an integer/,
  /^Missing Yahoo league configuration:/,
  /^Provide leagueKey or both leagueId and season$/,
];

export type McpErrorCode =
  | 'FB_MCP_CONFIG_MISSING'
  | 'FB_MCP_CONFIG_INVALID'
  | 'FB_MCP_CONFIG_INCOMPLETE'
  | 'FB_MCP_TIMEOUT'
  | 'FB_MCP_FETCH_FAILED'
  | 'FB_MCP_UNEXPECTED';

export interface McpToolError {
  code: McpErrorCode;
  message: string;
  nextStep: string;
}

export function isMcpDebugEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const value = env[MCP_DEBUG_ENV]?.toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

export function redactSensitiveText(text: string): string {
  return text
    .replace(/Bearer\s+[\w./+=-]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:access_)?token=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(
      /((?:ESPN_S2|ESPN_SWID|YAHOO_ACCESS_TOKEN|token|cookie|authorization)=)[^\s&]+/gi,
      '$1[REDACTED]',
    );
}

function classifyError(message: string): McpToolError {
  const missingEnv = /^Missing required environment variable: ([A-Z0-9_]+)$/.exec(message);
  if (missingEnv?.[1]) {
    return {
      code: 'FB_MCP_CONFIG_MISSING',
      message,
      nextStep: `Set ${missingEnv[1]} in your MCP client environment and retry.`,
    };
  }

  if (/^Environment variable .+ must be an integer/.test(message)) {
    return {
      code: 'FB_MCP_CONFIG_INVALID',
      message,
      nextStep: 'Use a numeric value for the reported environment variable.',
    };
  }

  if (/^Missing Yahoo league configuration:/.test(message)) {
    return {
      code: 'FB_MCP_CONFIG_INCOMPLETE',
      message,
      nextStep: 'Set YAHOO_LEAGUE_KEY, or set both YAHOO_LEAGUE_ID and YAHOO_SEASON.',
    };
  }

  if (message === 'Tool execution timed out') {
    return {
      code: 'FB_MCP_TIMEOUT',
      message: 'Tool request timed out.',
      nextStep: 'Try again, narrow the query, or check provider availability.',
    };
  }

  if (/fetch|network|https?:\/\//i.test(message)) {
    return {
      code: 'FB_MCP_FETCH_FAILED',
      message: 'Tool failed while fetching fantasy data.',
      nextStep: 'Check network access, provider availability, and credential freshness.',
    };
  }

  if (ACTIONABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return {
      code: 'FB_MCP_UNEXPECTED',
      message,
      nextStep: 'Review the reported input and retry.',
    };
  }

  return {
    code: 'FB_MCP_UNEXPECTED',
    message: 'Tool failed: an unexpected error occurred while fetching fantasy data.',
    nextStep:
      'Run `fantasy-basketball-mcp --diagnose` and include sanitized output in a bug report.',
  };
}

function formatToolError(details: McpToolError, error: unknown): string {
  const lines = [
    `${details.code}: ${details.message}`,
    `Next step: ${details.nextStep}`,
    `Help: ${ERROR_DOCS_URL}`,
  ];

  if (isMcpDebugEnabled() && error instanceof Error) {
    lines.push(`Debug: ${error.name}: ${redactSensitiveText(error.message)}`);
  }

  return lines.join('\n');
}

export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return formatToolError(classifyError(error.message), error);
  }
  return formatToolError(classifyError(''), error);
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
