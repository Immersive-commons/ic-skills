# Install: ic-signal

One-step skill install. No auth required at install OR call time.

## Claude Code

```bash
mkdir -p ~/.claude/skills/ic-signal
curl -fsSL https://www.immersivecommons.com/skills/ic-signal/SKILL.md \
  -o ~/.claude/skills/ic-signal/SKILL.md
```

Restart Claude Code (or run `/skills` to reload). The skill is invocable as `ic-signal` whenever the human says "the latest SIGNAL", "search the IC newsletter", "what's in issue NN", or similar.

## Any other MCP-aware agent

Add this URL to your MCP-server config:

```
https://www.immersivecommons.com/api/mcp
```

No Authorization header required. The five `ic_signal_*` tools are anonymous; the other 32 tools (PICO lending, highlights, events, directory, etc.) require an agent token — see `/.well-known/ai-agent.json` if you want to mint one.

## Smoke probe

```bash
curl -sS -X POST https://www.immersivecommons.com/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_signal_get_latest","arguments":{}}}'
```

200 + a JSON result with a `slug` field = working.

## No-MCP fallback

If your client doesn't speak MCP, every tool's payload is also reachable as plain HTTP:

- `GET https://www.immersivecommons.com/.well-known/signal.llmfeed.json` — feed metadata
- `GET https://www.immersivecommons.com/newsletter/{slug}.md` — full issue as markdown
- `GET https://www.immersivecommons.com/newsletter/feed.xml` — Atom 1.0
- `GET https://www.immersivecommons.com/newsletter/feed.json` — JSON Feed 1.1
