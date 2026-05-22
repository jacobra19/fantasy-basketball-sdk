/**
 * Smoke-test built ESM entrypoints (replaces attw --pack while fflate Gunzip streaming is broken).
 */
import process from 'node:process';
import { PROVIDERS } from '../dist/index.js';
import { PROVIDERS as coreProviders } from '../dist/core/index.js';
import { PROVIDER as espnProvider } from '../dist/espn/index.js';
import { PROVIDER as fantraxProvider } from '../dist/fantrax/index.js';
import { createFetchClient } from '../dist/runtime/index.js';
import { PROVIDER as yahooProvider } from '../dist/yahoo/index.js';

const checks = [
  ['root PROVIDERS', PROVIDERS.length === 3],
  ['core PROVIDERS', coreProviders.length === 3],
  ['espn', espnProvider === 'espn'],
  ['yahoo', yahooProvider === 'yahoo'],
  ['fantrax', fantraxProvider === 'fantrax'],
  ['runtime createFetchClient', typeof createFetchClient().fetch === 'function'],
];

for (const [name, ok] of checks) {
  if (!ok) {
    console.error(`verify-dist: failed check "${name}"`);
    process.exit(1);
  }
}

console.log('verify-dist: all entrypoints OK');
