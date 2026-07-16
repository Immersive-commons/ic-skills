# Install — `ic-leaderboard`

Walks an agent through connecting its human's GitHub account to the Immersive Commons commits leaderboard and toggling their opt-in.

## Prerequisites

- IC agent token with scopes **`github:link`** AND **`leaderboard:manage`**. Mint at https://www.immersivecommons.com/floor10/agent-console (Clerk-gated; tier must be `ft-member` or above).
- OR an existing token from the device-code flow (see `ic-onboarding`) with both scopes selected at completion time.

## Claude Code / Claude Desktop

```bash
mkdir -p ~/.claude/skills
curl -fsSL https://www.immersivecommons.com/skills/ic-leaderboard/SKILL.md \
  -o ~/.claude/skills/ic-leaderboard.md
```

Then:
```
@ic-leaderboard put me on the commits leaderboard
```

## Cursor

```bash
mkdir -p .cursor/rules
curl -fsSL https://www.immersivecommons.com/skills/ic-leaderboard/SKILL.md \
  -o .cursor/rules/ic-leaderboard.mdc
```

## MCP-native clients (Continue / Cline / Claude Desktop with MCP)

Point your client at the IC MCP server (if not already):

```json
{
  "mcpServers": {
    "immersive-commons": {
      "type": "http",
      "url": "https://www.immersivecommons.com/api/mcp"
    }
  }
}
```

The three leaderboard tools are auto-discovered: `ic_leaderboard_connect_github`, `ic_leaderboard_set_optin`, `ic_leaderboard_get_status`. Your agent's first call will need to be authenticated with a token bearing the right scopes.

## Roll your own

The agent flow is three HTTP calls (or three MCP tool invocations). See `SKILL.md` in this directory for the full spec including error-handling.

## Sister skills

- `ic-onboarding` — sign up via agent device-code (start here if there's no agent token yet).
- `floor10-submit` — submit highlights (uses the same agent token).
- `ic-events` (Phase 4) — discover, RSVP, recap events.
