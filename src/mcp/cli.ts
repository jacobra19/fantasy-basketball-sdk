import process from 'node:process';

import { diagnoseMcpConfig, type Environment } from './config.js';
import { PACKAGE_METADATA } from './package-info.js';
import { MCP_DEBUG_ENV } from './results.js';
import { startMcpServer } from './create-server.js';

interface Writable {
  write(chunk: string): unknown;
}

export interface CliDiagnostics {
  name: string;
  version: string;
  node: string;
  platform: string;
  debug: boolean;
  config: ReturnType<typeof diagnoseMcpConfig>;
}

export interface RunCliOptions {
  env?: Environment;
  stdout?: Writable;
  stderr?: Writable;
  startServer?: typeof startMcpServer;
}

const HELP_TEXT = `fantasy-basketball-mcp - MCP stdio server for fantasy-basketball-sdk

Usage:
  fantasy-basketball-mcp [options]

Options:
  -h, --help       Show this help text.
  -V, --version    Print the package version.
      --diagnose   Print sanitized runtime and configuration diagnostics.
      --debug      Include redacted debug details in MCP tool errors.

Environment:
  ESPN_LEAGUE_ID and ESPN_SEASON_ID configure ESPN tools.
  ESPN_S2 and ESPN_SWID are required for private ESPN leagues.
  YAHOO_ACCESS_TOKEN plus YAHOO_LEAGUE_KEY, or YAHOO_LEAGUE_ID and YAHOO_SEASON, configure Yahoo tools.
  FANTASY_BASKETBALL_MCP_DEBUG=1 enables debug output without a CLI flag.

Examples:
  fantasy-basketball-mcp --diagnose
  FANTASY_BASKETBALL_MCP_DEBUG=1 fantasy-basketball-mcp
`;

function writeLine(writer: Writable, text: string): void {
  writer.write(text.endsWith('\n') ? text : `${text}\n`);
}

function isDebugEnabled(env: Environment): boolean {
  const value = env[MCP_DEBUG_ENV]?.toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function enableDebug(env: Environment): void {
  env[MCP_DEBUG_ENV] = '1';
}

function createDiagnostics(env: Environment): CliDiagnostics {
  return {
    name: PACKAGE_METADATA.name,
    version: PACKAGE_METADATA.version,
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    debug: isDebugEnabled(env),
    config: diagnoseMcpConfig(env),
  };
}

async function closeOnSignal(close: () => Promise<void>, stderr: Writable): Promise<void> {
  try {
    await close();
  } catch (error) {
    if (error instanceof Error) {
      writeLine(stderr, `FB_MCP_SHUTDOWN: ${error.message}`);
    }
  } finally {
    process.exit(0);
  }
}

export async function runCli(
  args = process.argv.slice(2),
  options: RunCliOptions = {},
): Promise<number> {
  const env = options.env ?? process.env;
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const startServer = options.startServer ?? startMcpServer;

  const remainingArgs = [...args];
  const debugIndex = remainingArgs.indexOf('--debug');
  if (debugIndex !== -1) {
    enableDebug(env);
    remainingArgs.splice(debugIndex, 1);
  }

  if (remainingArgs.length === 0) {
    try {
      const server = await startServer();
      if (options.startServer === undefined) {
        process.once('SIGINT', () => {
          void closeOnSignal(() => server.close(), stderr);
        });
        process.once('SIGTERM', () => {
          void closeOnSignal(() => server.close(), stderr);
        });
      }
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown startup failure';
      writeLine(stderr, `FB_MCP_STARTUP: ${message}`);
      return 1;
    }
  }

  if (remainingArgs.length === 1 && (remainingArgs[0] === '--help' || remainingArgs[0] === '-h')) {
    writeLine(stdout, HELP_TEXT);
    return 0;
  }

  if (
    remainingArgs.length === 1 &&
    (remainingArgs[0] === '--version' || remainingArgs[0] === '-V')
  ) {
    writeLine(stdout, `${PACKAGE_METADATA.name} ${PACKAGE_METADATA.version}`);
    return 0;
  }

  if (remainingArgs.length === 1 && remainingArgs[0] === '--diagnose') {
    writeLine(stdout, JSON.stringify(createDiagnostics(env), null, 2));
    return 0;
  }

  writeLine(stderr, `FB_MCP_USAGE: unknown option or arguments: ${remainingArgs.join(' ')}`);
  writeLine(stderr, 'Run `fantasy-basketball-mcp --help` for usage.');
  return 2;
}
