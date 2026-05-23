# Fantasy Basketball SDK — Agent Guide

Tree-shakeable, ESM-only TypeScript SDK for fantasy basketball APIs (ESPN, Yahoo, Fantrax, extensible). Infra-first phase: scaffold and build pipeline only until provider logic is explicitly requested.

## Architecture

- **Subpath exports** — import one provider without pulling others: `fantasy-basketball-sdk/espn`, `/yahoo`, `/fantrax`
- **`src/core/`** — shared types and errors (no provider-specific code)
- **`src/runtime/`** — web-standard adapters (`fetch`, `URL`, `Headers`); no `node:*` imports
- **`src/<provider>/`** — one folder per fantasy platform

```text
Consumers → package.json exports → provider → core → runtime
```

## Build, Test & Lint

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run verify   # publint + scripts/verify-dist.mjs (dist ESM smoke imports)
```

Watch rebuild during development:

```bash
npm run dev
```

## Code Conventions

- **ESM only** — `"type": "module"`; use `.js` extensions in relative imports (`./foo.js`)
- **Strict TypeScript** — `verbatimModuleSyntax`, no `any` without justification
- **Web-standard APIs only** in `src/` — `fetch`, `URL`, `Headers`; no `process.env`, no `node:*`, no `require()`
- **Tree-shaking** — add providers as subpath entries, not giant root barrels
- **Side effects** — keep `"sideEffects": false`; avoid top-level side effects in modules

## File Structure

```text
src/
  index.ts           # minimal root re-exports
  core/              # shared types
  runtime/           # FetchClient and adapters
  espn/index.ts
  yahoo/index.ts
  fantrax/index.ts
```

Build output mirrors `src/` under `dist/` via Vite `preserveModules` + `tsc --emitDeclarationOnly`.

## Adding a New Provider

1. Create `src/<provider>/index.ts` with a `PROVIDER` constant or stub exports
2. Add Vite lib entry in `vite.config.ts`: `'<provider>/index': resolve(__dirname, 'src/<provider>/index.ts')`
3. Add `exports["./<provider>"]` in `package.json` (`types` + `import` paths under `dist/`)
4. Add a smoke test in `test/exports.test.ts`
5. Run `npm run build && npm run verify`

## Releases

Merges to `main` run the `verify` job, then a `release` job that uses [semantic-release](https://github.com/semantic-release/semantic-release) to publish to npm when the squash-merge commit is releasable.

- **Do not manually bump `package.json` version** for routine releases — git tags and GitHub Releases are the source of truth
- **PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/)** (`feat:`, `fix:`, etc.) because PRs are squash-merged and the title becomes the commit on `main`
- **Version bumps** (defined in `.releaserc.json`): `fix:`/`perf:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major; `chore:`/`docs:`/`ci:`/etc. → no publish
- **First release** is always `1.0.0` regardless of the triggering commit type
- **One-time npm setup:** register `fantasy-basketball-sdk` on npm and configure [trusted publishing](https://docs.npmjs.com/trusted-publishers) for GitHub Actions (`jacobra19/fantasy-basketball-sdk`, workflow `.github/workflows/ci.yml`, branch `main`). Fallback: add an `NPM_TOKEN` repo secret.

## Runtime Import Examples

```ts
// Node 18+, Bun
import { PROVIDER } from 'fantasy-basketball-sdk/espn';

// Deno
import { PROVIDER } from 'npm:fantasy-basketball-sdk/espn';

// Browser / Cloudflare Workers (bundle or bare ESM)
import { PROVIDER } from 'fantasy-basketball-sdk/espn';
```

## Boundaries

- Do not commit secrets, tokens, or real league credentials
- Do not implement ESPN/Yahoo/Fantrax API logic unless explicitly asked
- Do not add CJS output or `require()` compatibility
- Do not import Node built-ins in `src/`
- Do not expand root `src/index.ts` with provider implementations (breaks tree-shaking)

## Common Mistakes

| Wrong                                                   | Correct                                         |
| ------------------------------------------------------- | ----------------------------------------------- |
| `import from 'fantasy-basketball-sdk'` for one provider | `import from 'fantasy-basketball-sdk/espn'`     |
| `import './foo'` without `.js` extension                | `import './foo.js'`                             |
| `import fs from 'node:fs'` in library code              | Use web APIs or accept injection via `runtime/` |
| Re-export all providers from root index                 | Keep root minimal; use subpaths                 |
| `process.env.YAHOO_TOKEN` in SDK                        | Pass config from consumer explicitly            |
