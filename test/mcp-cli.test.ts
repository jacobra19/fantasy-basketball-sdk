import { describe, expect, it } from 'vitest';

import { runCli } from '../src/mcp/cli.js';
import type { startMcpServer } from '../src/mcp/create-server.js';
import { PACKAGE_METADATA } from '../src/mcp/package-info.js';
import { MCP_DEBUG_ENV } from '../src/mcp/results.js';

class MemoryWriter {
  output = '';

  write(chunk: string): true {
    this.output += chunk;
    return true;
  }
}

function createStartedServer(): Awaited<ReturnType<typeof startMcpServer>> {
  return {
    close: async () => {},
  } as Awaited<ReturnType<typeof startMcpServer>>;
}

describe('mcp cli', () => {
  it('prints help without starting the server', async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    let started = false;

    const exitCode = await runCli(['--help'], {
      stdout,
      stderr,
      startServer: async () => {
        started = true;
        return createStartedServer();
      },
    });

    expect(exitCode).toBe(0);
    expect(started).toBe(false);
    expect(stdout.output).toContain('Usage:');
    expect(stdout.output).toContain('--diagnose');
    expect(stderr.output).toBe('');
  });

  it('prints package version', async () => {
    const stdout = new MemoryWriter();

    const exitCode = await runCli(['--version'], { stdout });

    expect(exitCode).toBe(0);
    expect(stdout.output.trim()).toBe(`${PACKAGE_METADATA.name} ${PACKAGE_METADATA.version}`);
  });

  it('prints sanitized diagnostics', async () => {
    const stdout = new MemoryWriter();
    const env: Record<string, string | undefined> = {
      ESPN_LEAGUE_ID: '123',
      ESPN_SEASON_ID: '2025',
      ESPN_S2: 'secret-cookie',
      YAHOO_ACCESS_TOKEN: 'secret-token',
      YAHOO_LEAGUE_ID: '456',
      YAHOO_SEASON: '2025',
    };

    const exitCode = await runCli(['--diagnose'], { stdout, env });
    const diagnostics = JSON.parse(stdout.output) as {
      config: {
        espn: { configured: boolean; optionalPresent: string[] };
        yahoo: { configured: boolean; present: string[] };
      };
    };

    expect(exitCode).toBe(0);
    expect(diagnostics.config.espn.configured).toBe(true);
    expect(diagnostics.config.espn.optionalPresent).toContain('ESPN_S2');
    expect(diagnostics.config.yahoo.configured).toBe(true);
    expect(diagnostics.config.yahoo.present).toContain('YAHOO_ACCESS_TOKEN');
    expect(stdout.output).not.toContain('secret-cookie');
    expect(stdout.output).not.toContain('secret-token');
  });

  it('returns a usage exit code for unknown flags', async () => {
    const stderr = new MemoryWriter();

    const exitCode = await runCli(['--wat'], { stderr });

    expect(exitCode).toBe(2);
    expect(stderr.output).toContain('FB_MCP_USAGE');
  });

  it('enables debug mode before starting the server', async () => {
    const env: Record<string, string | undefined> = {};
    let started = false;

    const exitCode = await runCli(['--debug'], {
      env,
      startServer: async () => {
        started = true;
        return createStartedServer();
      },
    });

    expect(exitCode).toBe(0);
    expect(started).toBe(true);
    expect(env[MCP_DEBUG_ENV]).toBe('1');
  });

  it('returns startup failures on stderr', async () => {
    const stderr = new MemoryWriter();

    const exitCode = await runCli([], {
      stderr,
      startServer: async () => {
        throw new Error('transport unavailable');
      },
    });

    expect(exitCode).toBe(1);
    expect(stderr.output).toContain('FB_MCP_STARTUP');
    expect(stderr.output).toContain('transport unavailable');
  });
});
