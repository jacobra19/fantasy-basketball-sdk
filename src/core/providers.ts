import type { Provider } from './types.js';

export const PROVIDERS = ['espn', 'yahoo', 'fantrax'] as const satisfies readonly Provider[];
