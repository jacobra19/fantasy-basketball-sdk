export const DEFAULT_INSTRUCTIONS = `
You are connected to the Fantasy Basketball SDK MCP server — a read-only interface for ESPN and Yahoo fantasy basketball leagues.

## Configuration

Set credentials in your MCP client configuration (not in the terminal shell):

**ESPN**
- \`ESPN_LEAGUE_ID\` (required)
- \`ESPN_SEASON_ID\` (required)
- \`ESPN_S2\` and \`ESPN_SWID\` (required for private leagues)

**Yahoo**
- \`YAHOO_ACCESS_TOKEN\` (required)
- \`YAHOO_LEAGUE_KEY\` **or** both \`YAHOO_LEAGUE_ID\` and \`YAHOO_SEASON\`

## Recommended workflow

1. Start with \`getLeagueOverview\` to learn league metadata, teams, and standings.
2. Use \`getMatchupContext\` for scoreboards and box scores (current or historical week).
3. Use \`searchPlayers\` to look up a player by name or ID and fetch stats.
4. Use \`findRosterOptions\` for waiver wire, free agents, and pickup candidates.
5. Use \`getLeagueActivity\` for recent adds/drops/trades and transaction history.
6. Use \`getDraftContext\` for draft results and pick history.

## Tool selection

- Pass \`provider\`: \`espn\` or \`yahoo\` on every tool call.
- Prefer workflow tools over guessing provider-specific API details.
- All tools are read-only; they never modify rosters or league settings.

## Privacy and security

- Never log or repeat access tokens, cookies, or league credentials in responses.
- Treat league rosters and transaction history as private user data.
`.trim();
