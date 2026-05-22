# fantasy-basketball-sdk

Tree-shakeable fantasy basketball API SDK for ESPN, Yahoo, Fantrax, and more.

> **Early development** — Provider modules (`espn`, `yahoo`, `fantrax`) are placeholders today. The public API will grow as real platform clients are added; do not expect league or auth APIs yet.

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

### Node / Bun (TypeScript or JavaScript)

```ts
import { PROVIDERS, type Provider } from 'fantasy-basketball-sdk';
import { PROVIDER } from 'fantasy-basketball-sdk/espn';
import { createFetchClient } from 'fantasy-basketball-sdk/runtime';

const client = createFetchClient();
const platform: Provider = PROVIDER;

console.log(PROVIDERS, platform, typeof client.fetch);
```

### Deno

```ts
import { PROVIDER } from 'npm:fantasy-basketball-sdk/espn';
```

### Browser / Cloudflare Workers

Use your bundler’s usual ESM resolution (Vite, webpack, esbuild, etc.):

```ts
import { PROVIDER } from 'fantasy-basketball-sdk/espn';
```

## Subpath exports

| Subpath                          | Purpose                    | Main symbols (today)               |
| -------------------------------- | -------------------------- | ---------------------------------- |
| `fantasy-basketball-sdk`         | Root entry                 | `Provider`, `PROVIDERS`            |
| `fantasy-basketball-sdk/espn`    | ESPN module                | `PROVIDER`                         |
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

**Contributors and coding agents:** see [AGENTS.md](./AGENTS.md) for architecture, conventions, and how to add a new provider.

## Roadmap

ESPN, Yahoo, and Fantrax API clients are planned. The current release is an infra and build scaffold with stub exports.

## License

[ISC](./package.json)
