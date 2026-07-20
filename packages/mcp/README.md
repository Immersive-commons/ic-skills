# @immersivecommons/mcp

Connect any stdio MCP client (Claude Desktop, Cursor, Windsurf, …) to the
**Immersive Commons** hosted MCP server — 138 tools for the members-run AI
builder space on Floor 10 of Frontier Tower SF
([immersivecommons.com](https://www.immersivecommons.com)).

The hosted server speaks Streamable HTTP at
`https://www.immersivecommons.com/api/mcp`. If your client supports remote
MCP servers natively, point it there directly — you don't need this package.
This package is the one-command stdio bridge (via
[`mcp-remote`](https://www.npmjs.com/package/mcp-remote)) for clients that
only launch local stdio servers.

## Quick start

```sh
npx -y @immersivecommons/mcp
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "immersivecommons": {
      "command": "npx",
      "args": ["-y", "@immersivecommons/mcp"]
    }
  }
}
```

## Auth

Ten tools work with no token at all: THE SIGNAL weekly AI dispatch (5 reads),
the community presentations archive (2), the AI news feed, and two x402
donation tools. Everything else needs a per-user `agt_` bearer token minted
through a human-approved device-code flow — an agent cannot self-mint. See
[auth.md](https://www.immersivecommons.com/auth.md), or run the bundled
`ic-onboarding` skill.

```json
{
  "mcpServers": {
    "immersivecommons": {
      "command": "npx",
      "args": ["-y", "@immersivecommons/mcp"],
      "env": { "IC_AGENT_TOKEN": "agt_..." }
    }
  }
}
```

## Links

- Developer portal: <https://www.immersivecommons.com/developers>
- API documentation hub: <https://www.immersivecommons.com/docs>
- Agent manual: <https://www.immersivecommons.com/llms.txt>
- OpenAPI spec: <https://www.immersivecommons.com/openapi.json>
- Skills + agent configs: <https://github.com/immersive-commons/ic-skills>
- Official MCP registry entry: `com.immersivecommons/floor10` on
  [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io)

MIT © Immersive Commons
