<p align="center">
  <h1 align="center">fantasy-basketball-sdk</h1>
  <p align="center">
    Tree-shakeable fantasy basketball API SDK for ESPN, Yahoo, Fantrax, and more
    <br/>
    by <a href="https://github.com/jacobra19">Yakov Rakhamimov</a>
  </p>
</p>
<br/>

<p align="center">
<a href="https://github.com/jacobra19/fantasy-basketball-sdk/actions?query=branch%3Amain"><img src="https://github.com/jacobra19/fantasy-basketball-sdk/actions/workflows/ci.yml/badge.svg?event=push&branch=main" alt="CI status" /></a>
<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/jacobra19/fantasy-basketball-sdk" alt="License"></a>
<a href="https://www.npmjs.com/package/fantasy-basketball-sdk" rel="nofollow"><img src="https://img.shields.io/npm/dw/fantasy-basketball-sdk.svg" alt="npm"></a>
<a href="https://github.com/jacobra19/fantasy-basketball-sdk" rel="nofollow"><img src="https://img.shields.io/github/stars/jacobra19/fantasy-basketball-sdk" alt="stars"></a>
</p>

<div align="center">
  <a href="#quick-start">Quick start</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="./CONTRIBUTING.md">Contributing</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="./AGENTS.md">Agents</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://github.com/jacobra19/fantasy-basketball-sdk">GitHub</a>
  <br />
</div>

<br/>

> **Early development** — ESPN and Yahoo NBA APIs are available. Fantrax is still a placeholder.

> **Unofficial SDK** — This project is not official, endorsed, sponsored, or affiliated with ESPN, Yahoo, Fantrax, or any other fantasy platform. You are responsible for complying with each platform's terms, API rules, rate limits, and account policies. The SDK is provided as-is; use it at your own risk, especially with private credentials or write actions such as lineup changes and player adds.

## Features

- **ESM-only** with TypeScript types included (`dist/*.d.ts`)
- **Subpath imports** per provider — `fantasy-basketball-sdk/espn`, `/yahoo`, `/fantrax`
- Shared **`/core`** (types, shared constants) and **`/runtime`** (web-standard HTTP adapters)
- Runs in **Node.js 18+**, **Bun**, **Deno**, **browsers**, and **Cloudflare Workers** (uses `fetch`, no Node built-ins in library code)

## Requirements

- **Node.js >= 18** (when using Node)
- An **ESM** consumer project (`"type": "module"` in `package.json`, or a bundler that resolves ESM)

## Installation

```bash
npm install fantasy-basketball-sdk
```

Releases are published automatically to npm when releasable changes merge to `main`. See [CONTRIBUTING.md](./CONTRIBUTING.md#releases) for how versioning works.

For local development or testing before a release:

```bash
# Pack and install the built tarball (recommended)
npm run build && npm pack
npm install /path/to/fantasy-basketball-sdk/fantasy-basketball-sdk-*.tgz

# Or link for iterative development
npm link
```

## MCP CLI

The package publishes a read-only MCP stdio server as `fantasy-basketball-mcp`.
Use it from an MCP client, or run diagnostics directly from a shell:

```bash
npx -p fantasy-basketball-sdk fantasy-basketball-mcp --help
npx -p fantasy-basketball-sdk fantasy-basketball-mcp --version
npx -p fantasy-basketball-sdk fantasy-basketball-mcp --diagnose
```

Configure credentials in your MCP client environment, not in source control:

```bash
ESPN_LEAGUE_ID=123456
ESPN_SEASON_ID=2025
ESPN_S2=...        # private ESPN leagues only
ESPN_SWID=...      # private ESPN leagues only

YAHOO_ACCESS_TOKEN=...
YAHOO_LEAGUE_KEY=... # or use YAHOO_LEAGUE_ID plus YAHOO_SEASON
```

Diagnostics print sanitized readiness data only; secret values are never shown. For deeper troubleshooting, set `FANTASY_BASKETBALL_MCP_DEBUG=1` or pass `--debug` when launching the server. Debug output is redacted and appears only in error responses or stderr.

Exit codes:

- `0`: help, version, diagnostics, or server startup completed successfully.
- `1`: startup failed.
- `2`: unsupported CLI arguments.

Docker usage:

```bash
docker build -t fantasy-basketball-mcp .
docker run --rm fantasy-basketball-mcp --version
docker run --rm --env ESPN_LEAGUE_ID --env ESPN_SEASON_ID fantasy-basketball-mcp
```

When reporting MCP/CLI bugs, include `fantasy-basketball-mcp --version`, `node --version`, your OS, the sanitized `--diagnose` output, the MCP client, and any `FB_MCP_*` error code. Do not include ESPN cookies, Yahoo tokens, or private league data.

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

### Yahoo (Node / Bun)

Yahoo requires an OAuth 2.0 access token with Fantasy Sports scope. Obtain tokens via the [Yahoo OAuth 2.0 guide](https://developer.yahoo.com/oauth2/guide/) in your app, then pass the token to the SDK:

```ts
import { Game, League, YahooClient, addPlayer, setLineup } from 'fantasy-basketball-sdk/yahoo';

const accessToken = '...'; // from your OAuth flow

// Discover leagues for the logged-in user
const game = Game.forNba(new YahooClient({ accessToken }));
const leagueKeys = await game.leagueKeys({ seasons: ['2025'] });

// Load a league by key or by numeric id + season
const league = await League.create({
  leagueKey: leagueKeys[0],
  accessToken,
});

console.log(league.settings?.name);

const standings = await league.standings();
const matchups = await league.scoreboard();
const freeAgents = await league.players({ status: 'FA', count: 25 });

// Write: lineup edit (NBA uses date-based rosters)
const team = league.toTeam(`${league.leagueKey}.t.1`);
await setLineup(team, {
  date: '2025-01-15',
  moves: [{ playerKey: '466.p.1234', position: 'PG' }],
});

// Write: add a free agent
await addPlayer(league, {
  teamKey: `${league.leagueKey}.t.1`,
  playerKey: '466.p.5678',
});
```

Pass `refreshAccessToken` to `YahooClient` or `League.create` for automatic retry when the token expires.

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

| Subpath                          | Purpose                      | Main symbols (today)                              |
| -------------------------------- | ---------------------------- | ------------------------------------------------- |
| `fantasy-basketball-sdk`         | Root entry                   | `Provider`, `PROVIDERS`                           |
| `fantasy-basketball-sdk/espn`    | ESPN NBA read API            | `League`, `Team`, `Player`, `Matchup`             |
| `fantasy-basketball-sdk/yahoo`   | Yahoo NBA API (read + write) | `League`, `Game`, `Team`, `Player`, `YahooClient` |
| `fantasy-basketball-sdk/fantrax` | Fantrax module               | `PROVIDER`                                        |
| `fantasy-basketball-sdk/core`    | Shared types and constants   | `Provider`, `PROVIDERS`                           |
| `fantasy-basketball-sdk/runtime` | HTTP adapter                 | `FetchClient`, `createFetchClient`                |

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

ESPN and Yahoo NBA APIs are implemented. Fantrax client is planned.

## License

[ISC](./LICENSE)
