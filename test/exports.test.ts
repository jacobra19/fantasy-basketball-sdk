import { describe, expect, it } from 'vitest';

import { PROVIDER as espnProvider, League as EspnLeague } from '../src/espn/index.js';
import { PROVIDER as fantraxProvider } from '../src/fantrax/index.js';
import { PROVIDERS, type Provider } from '../src/index.js';
import {
  PROVIDER as yahooProvider,
  Game,
  League as YahooLeague,
  YahooClient,
} from '../src/yahoo/index.js';

describe('provider subpath exports', () => {
  it('exports espn provider constant', () => {
    expect(espnProvider).toBe('espn');
  });

  it('exports espn League class', () => {
    expect(EspnLeague).toBeTypeOf('function');
  });

  it('exports yahoo provider constant', () => {
    expect(yahooProvider).toBe('yahoo');
  });

  it('exports yahoo League, Game, and YahooClient', () => {
    expect(YahooLeague).toBeTypeOf('function');
    expect(Game).toBeTypeOf('function');
    expect(YahooClient).toBeTypeOf('function');
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
