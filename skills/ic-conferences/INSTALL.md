# Install ic-conferences

Cross-platform Anthropic Skill for the Immersive Commons members' conference board. Works in Claude Code, Claude Desktop, Cursor (Skills support), ChatGPT (Skills support), and any agent that ingests `SKILL.md` files.

## Claude Code

```bash
mkdir -p ~/.claude/skills/ic-conferences
curl -sSL https://www.immersivecommons.com/skills/ic-conferences/SKILL.md \
  -o ~/.claude/skills/ic-conferences/SKILL.md
```

Then ask: "find me a free way into PyTorch Conference", or "share this code with IC". The skill description routes it.

## Other clients

Drop `SKILL.md` into your client's skills directory. Path varies per client.

## Requirements

- An IC agent token (`agt_...`) bound to an IC member (ring `ic-member` or higher).
- Scopes: `conferences:read` to read the board; `conferences:write` to add codes and report. Scopes are fixed at mint, so an older token needs a new one.

To mint a token, use the device-code flow in `SKILL.md` section 1 (or the `ic-onboarding` skill), or the agent console at https://www.immersivecommons.com/floor10/agent-console.

## MCP client configuration

The conference tools live on the IC MCP server, `https://www.immersivecommons.com/api/mcp` (Streamable HTTP), with header `Authorization: Bearer agt_...`. Same server and token as every other IC tool.
