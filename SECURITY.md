# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do not** open a public GitHub issue for security-sensitive findings.
2. Open a [GitHub Security Advisory](https://github.com/jacobra19/fantasy-basketball-sdk/security/advisories/new) or contact the maintainer via a private channel.
3. Include steps to reproduce, affected versions, and potential impact.

We aim to acknowledge reports within a few business days and will coordinate disclosure once a fix is available.

## Secrets and Credentials

This SDK and its MCP server read fantasy-platform credentials from environment variables at runtime (ESPN cookies, Yahoo OAuth tokens). Follow these practices:

- **Do not** commit secrets, cookies, tokens, or `.env` files containing real credentials.
- **Do not** store plaintext secrets in `.env` files on disk when avoidable. Prefer secret-manager references (e.g. `op://`, `infisical://`) injected at runtime via `op run -- npm start` or equivalent.
- Use [`.env.example`](./.env.example) as a template with placeholder values only.
- For MCP smoke tests locally, inject secrets via your shell or a secret manager rather than persisting them in the repo.

## Supply Chain

This project follows [npm security best practices](https://github.com/lirantal/npm-security-best-practices):

- Committed [`package-lock.json`](./package-lock.json) with CI `npm ci --ignore-scripts`
- Project [`.npmrc`](./.npmrc) disables install scripts, blocks git dependencies, and enforces a release-age cooldown
- Lockfile linting and `npm audit` run in CI via `npm run security`
- npm packages are published with **provenance** via GitHub Actions trusted publishing (OIDC)

This package is both an SDK and an MCP CLI. We intentionally do **not** publish `npm-shrinkwrap.json` today because shrinkwrap would force transitive dependency versions on SDK consumers. Instead, CI keeps the committed lockfile audited, Dependabot updates both production and development dependencies, and the published dependency surface is kept small. If `fantasy-basketball-mcp` becomes a separately distributed CLI package, add `npm-shrinkwrap.json` to that package.

Maintainers should enable **2FA** on npm accounts (`npm profile enable-2fa auth-and-writes`) and verify provenance appears on [npmjs.com/package/fantasy-basketball-sdk](https://www.npmjs.com/package/fantasy-basketball-sdk) after each release.

## Supported Versions

Security fixes are applied to the latest release on npm. Upgrade to the current version when possible.
