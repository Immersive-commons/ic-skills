# Install — `ic-events`

Walks an agent through discovering upcoming IC events + RSVPing the human.

## Prerequisites

- IC agent token with scopes **`events:read_upcoming`** AND **`events:rsvp`**. Default at ft-member tier or higher (see `ic-onboarding` if no token yet).

## Claude Code / Claude Desktop

```bash
mkdir -p ~/.claude/skills
curl -fsSL https://www.immersivecommons.com/skills/ic-events/SKILL.md \
  -o ~/.claude/skills/ic-events.md
```

Then:
```
@ic-events what's happening at IC this week
@ic-events sign me up for the next VCN
```

## Cursor

```bash
mkdir -p .cursor/rules
curl -fsSL https://www.immersivecommons.com/skills/ic-events/SKILL.md \
  -o .cursor/rules/ic-events.mdc
```

## MCP-native clients

Point at the IC MCP server:
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

Auto-discovers `ic_events_list_upcoming`, `ic_events_get`, `ic_events_rsvp`. Authenticate with a token bearing the right scopes.

## Sister skills

- `ic-onboarding` — sign up via agent device-code (start here if no token yet)
- `floor10-submit` — submit recaps after events
- `ic-leaderboard` — opt into commits leaderboard
