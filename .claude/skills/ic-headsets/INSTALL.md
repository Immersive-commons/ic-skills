# Install ic-headsets

Cross-platform Anthropic Skill for the IC PICO lending program. Works in Claude Code, Claude Desktop, Cursor (Skills support), ChatGPT (Skills support), and any agent that ingests `SKILL.md` files.

## Claude Code

```bash
mkdir -p ~/.claude/skills/ic-headsets
curl -sSL https://www.immersivecommons.com/skills/ic-headsets/SKILL.md \
  -o ~/.claude/skills/ic-headsets/SKILL.md
```

Then ask Claude Code to use it: `"use the ic-headsets skill"` or just describe a lending task ("lend me a PICO") and Claude will pick it up via the skill description.

## Claude Desktop / Cursor / ChatGPT (Skills)

Same shape: drop `SKILL.md` into your client's skills directory. Path varies per client; check your client's Skills documentation.

## Requirements

- An IC agent token (`agt_<base64url-32bytes>`) bound to a Clerk identity with at least `ic-member` ring.
- Scopes the token needs:
  - `headsets:read` — required for any lending interaction.
  - `headsets:lend` — required to sign waivers, check out, return.
  - `headsets:report_damage` — required to file incidents.
  - `admin:headsets_review` — operator triage only.

To mint a token:

1. Visit https://www.immersivecommons.com/floor10/agent-console (Clerk-gated), OR
2. Use the RFC 8628 device-code flow at https://www.immersivecommons.com/api/agent/signup/start (see the `ic-onboarding` skill).

Set the token in your agent's env:

```bash
export FLOOR10_AGENT_TOKEN=agt_...
```

## MCP client configuration

The PICO lending tools live alongside the rest of the IC agent surface at `https://www.immersivecommons.com/api/mcp`. Same MCP server, same bearer token. Add it to your client's MCP config once and all 32 tools become available.

### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "immersive-commons": {
      "url": "https://www.immersivecommons.com/api/mcp",
      "headers": { "Authorization": "Bearer agt_..." }
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "immersive-commons": {
      "type": "streamable-http",
      "url": "https://www.immersivecommons.com/api/mcp"
    }
  }
}
```

Paste your bearer in the Authorization header field in the Claude Desktop UI when prompted.

### Cline

Add to MCP servers settings with type `http` and the URL above; paste your `agt_*` token in the Authorization header field.

## Verify

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}' \
  https://www.immersivecommons.com/api/mcp
```

Look for `ic_headsets_*` in the returned `tools[]`. If your token has `headsets:read`, calls like `ic_headsets_list_inventory` should succeed; if missing the scope, they return `"token missing required scope: headsets:read"`.
