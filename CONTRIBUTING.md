# Contributing

Thanks for helping improve **fantasy-basketball-sdk**. This project is an ESM-only TypeScript library; keep changes focused and provider-scoped when possible.

## Getting started

1. Fork the repository and clone your fork.
2. Create a branch from `main` (for example `feat/espn-scoreboard` or `fix/league-parsing`).
3. Install dependencies and run the full verification suite:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run verify
```

Or run everything in one pass:

```bash
npm ci && npm run typecheck && npm run lint && npm run test && npm run build && npm run verify
```

4. Open a pull request against `main`.

## Pull request guidelines

- **Target `main`.** All changes land through pull requests; do not push directly to `main`.
- **Keep PRs focused.** One logical change per PR is easier to review and revert.
- **CI must pass.** The `verify` job runs typecheck, lint, test, build, and package verification.
- **Match project conventions.** See [AGENTS.md](./AGENTS.md) for architecture, import rules, and how to add a provider.
- **No secrets.** Do not commit ESPN cookies, league tokens, or real credentials. Use fixtures in `test/fixtures/`.

## Code conventions (summary)

- ESM only — use `.js` extensions in relative imports.
- Web-standard APIs in `src/` (`fetch`, `URL`, `Headers`); no `node:*` imports in library code.
- Import provider subpaths (`fantasy-basketball-sdk/espn`) instead of the root package when you only need one platform.
- Strict TypeScript; avoid `any` without justification.

## Merge policy

Pull requests are **squash-merged** into `main` to keep history linear and easy to bisect. Merge commits and rebase merges are disabled. Feature branches are deleted after merge.

## Branch protection

`main` is intended to be a protected branch with:

| Rule | Setting |
| ---- | ------- |
| Pull requests required | Yes (direct pushes blocked) |
| Required status check | `verify` |
| Require branch up to date | Yes |
| Force push | Blocked |
| Branch deletion | Blocked |
| Linear history | Enforced (no merge commits) |
| Required approvals | None (solo maintainer; increase when co-maintainers join) |

### Enabling protection on GitHub

Branch protection and rulesets require a **public repository** or **GitHub Pro** on a private repo. While the repo is private on a free plan, configure protection after making the repository public (or upgrading).

Run the setup script once protection is available:

```bash
./scripts/setup-branch-protection.sh
```

Or configure manually under **Settings → Rules → Rulesets → New branch ruleset** for `main` with the rules above.

## Releases

Releases are automated with [semantic-release](https://github.com/semantic-release/semantic-release) when releasable changes land on `main`. The `release` CI job runs after `verify` passes on push to `main`.

### PR titles (required)

PRs are squash-merged, so the **PR title becomes the commit message on `main`**. Use [Conventional Commits](https://www.conventionalcommits.org/) so semantic-release can pick the version:

| PR title | npm bump |
| -------- | -------- |
| `fix: parse Yahoo team logos` | patch (`1.0.1`, `1.0.2`, …) |
| `feat: add Yahoo scoreboard client` | minor (`1.1.0`, `1.2.0`, …) |
| `feat!: remove deprecated export` or `BREAKING CHANGE:` footer | major (`2.0.0`, …) |
| `chore:` / `docs:` / `ci:` / etc. | no publish |

The first automated release is always `1.0.0` (semantic-release first-release behavior), even if the triggering commit is a `fix:`.

Non-conventional PR titles merge cleanly but **do not publish** a new npm version. Rules are defined in [`.releaserc.json`](./.releaserc.json).

### Maintainer one-time setup

Before the first automated release:

1. Register the **`fantasy-basketball-sdk`** package on [npm](https://www.npmjs.com/).
2. Configure **trusted publishing** (recommended): npm → package → Publishing access → GitHub Actions → repository `jacobra19/fantasy-basketball-sdk`, workflow `.github/workflows/ci.yml`, branch `main`.
3. If trusted publishing is unavailable, add an **`NPM_TOKEN`** secret (automation token with publish scope) to the GitHub repo.

If the release job fails with permission errors under branch protection, allow `github-actions[bot]` to create tags and GitHub Releases on `main`.

## Questions

Open a [GitHub issue](https://github.com/jacobra19/fantasy-basketball-sdk/issues) for bugs, feature requests, or design questions before large changes.
