import { describe, expect, it } from 'vitest';

import { PROVIDER as espnProvider } from '../src/espn/index.js';
import { PROVIDER as fantraxProvider } from '../src/fantrax/index.js';
import { PROVIDERS, type Provider } from '../src/index.js';
import { PROVIDER as yahooProvider } from '../src/yahoo/index.js';

describe('provider subpath exports', () => {
  it('exports espn provider constant', () => {
    expect(espnProvider).toBe('espn');
  });

  it('exports yahoo provider constant', () => {
    expect(yahooProvider).toBe('yahoo');
  });

  it('exports fantrax provider constant', () => {
    expect(fantraxProvider).toBe('fantrax');
  });
});

describe('root export', () => {
  it('exports Provider type at compile time', () => {
    const provider: Provider = 'espn';
    expect(provider).toBe('espn');
  });

  it('exports PROVIDERS list', () => {
    expect(PROVIDERS).toEqual(['espn', 'yahoo', 'fantrax']);
  });
});
