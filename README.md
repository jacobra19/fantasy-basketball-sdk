# fantasy-basketball-sdk

Tree-shakeable fantasy basketball API SDK for ESPN, Yahoo, Fantrax, and more.

> **Early development** — ESPN basketball read APIs are available. Yahoo and Fantrax modules are still placeholders.

## Features

- **ESM-only** with TypeScript types included (`dist/*.d.ts`)
- **Subpath imports** per provider — `fantasy-basketball-sdk/espn`, `/yahoo`, `/fantrax`
- Shared **`/core`** (types, shared constants) and **`/runtime`** (web-standard HTTP adapters)
- Runs in **Node.js 18+**, **Bun**, **Deno**, **browsers**, and **Cloudflare Workers** (uses `fetch`, no Node built-ins in library code)

## Requirements

- **Node.js >= 18** (when using Node)
- An **ESM** consumer project (`"type": "module"` in `package.json`, or a bundler that resolves ESM)

## Installation

When published to npm:

```bash
npm install fantasy-basketball-sdk
```

The package is not on npm yet (`0.0.0`). For local development or testing:

```bash
npm install /path/to/fantasy-basketball-sdk
# or: npm install github:<user>/fantasy-basketball-sdk
```

## Quick start

Import only what you need. Prefer a **provider subpath** when you work with one platform so bundlers can tree-shake the rest.

### ESPN (Node / Bun)

```ts
import { League } from 'fantasy-basketball-sdk/espn';

// Public leagues: omit espnS2 and swid. Private leagues: pass ESPN session cookies.
const league = await League.create({
  leagueId: 123456,
  seasonId: 2025,
  espnS2: '...',
  swid: '{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}',
});

console.log(league.settings.name);

for (const team of league.standings()) {
  console.log(team.teamName, team.wins, team.losses);
}

const matchups = await league.scoreboard();
const freeAgents = await league.freeAgents({ size: 25 });
const transactions = await league.transactions();
```

`League.create` loads league data by default. Pass `fetchLeague: false` to construct without an initial fetch, then call `await league.fetchLeague()` when ready.

### Deno

```ts
import { League } from 'npm:fantasy-basketball-sdk/espn';

const league = await League.create({ leagueId: 123456, seasonId: 2025 });
console.log(league.standings().map((team) => team.teamName));
```

### Browser / Cloudflare Workers

Use your bundler’s usual ESM resolution (Vite, webpack, esbuild, etc.):

```ts
import { League } from 'fantasy-basketball-sdk/espn';

const league = await League.create({ leagueId: 123456, seasonId: 2025 });
```

## Subpath exports

| Subpath                          | Purpose                    | Main symbols (today)               |
| -------------------------------- | -------------------------- | ---------------------------------- |
| `fantasy-basketball-sdk`         | Root entry                 | `Provider`, `PROVIDERS`            |
| `fantasy-basketball-sdk/espn`    | ESPN NBA read API          | `League`, `Team`, `Player`, `Matchup` |
| `fantasy-basketball-sdk/yahoo`   | Yahoo module               | `PROVIDER`                         |
| `fantasy-basketball-sdk/fantrax` | Fantrax module             | `PROVIDER`                         |
| `fantasy-basketball-sdk/core`    | Shared types and constants | `Provider`, `PROVIDERS`            |
| `fantasy-basketball-sdk/runtime` | HTTP adapter               | `FetchClient`, `createFetchClient` |

## Tree-shaking

- Import `fantasy-basketball-sdk/espn` (or `/yahoo`, `/fantrax`) instead of the root package when you only need one platform.
- The package sets `"sideEffects": false` so unused modules can be dropped by your bundler.

## TypeScript

Types are published next to the JS output under `dist/`. You do not need `@types/fantasy-basketball-sdk`.

For best results, use a modern `moduleResolution` setting (`Node16`, `NodeNext`, or `Bundler`) and ESM in your project.

## Development

Clone the repo and run:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run verify
```

**Contributors:** see [CONTRIBUTING.md](./CONTRIBUTING.md) for the PR workflow, branch protection, and merge policy.

**Coding agents:** see [AGENTS.md](./AGENTS.md) for architecture, conventions, and how to add a new provider.

## Roadmap

ESPN NBA read APIs are implemented. Yahoo and Fantrax clients are planned.

## License

[ISC](./package.json)
