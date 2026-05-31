---
name: Bug report
about: Report an SDK, MCP, or CLI bug
title: ''
labels: ''
assignees: ''
---

**Describe the bug**
A clear and concise description of what failed.

**To Reproduce**
Steps to reproduce the behavior:

1. Run `...`
2. Call MCP tool `...` with sanitized input `...`
3. See error code/output `...`

**Expected behavior**
A clear and concise description of what you expected to happen.

**Environment**

- Package version: output of `fantasy-basketball-mcp --version`
- Node.js version: output of `node --version`
- OS and shell:
- Install method: npm, npx, Docker, local tarball, or source checkout
- MCP client, if applicable:

**Diagnostics**
Paste sanitized output from:

```bash
fantasy-basketball-mcp --diagnose
```

If debug output is needed, rerun with `FANTASY_BASKETBALL_MCP_DEBUG=1` and include only redacted output.

**Configuration source**

- ESPN: env vars, MCP client env, Docker env, or other
- Yahoo: env vars, MCP client env, Docker env, or other

Do not paste ESPN cookies, Yahoo OAuth tokens, private league data, or `.env` files with real values.

**Additional context**
Add any other context about the problem here.
