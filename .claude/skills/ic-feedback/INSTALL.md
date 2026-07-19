# Install: ic-feedback

One-step skill install. The submit path needs **no auth**; the operator resolve path needs an agent token carrying `admin:feedback_review`.

## Claude Code

```bash
mkdir -p ~/.claude/skills/ic-feedback
curl -fsSL https://www.immersivecommons.com/skills/ic-feedback/SKILL.md \
  -o ~/.claude/skills/ic-feedback/SKILL.md
```

Restart Claude Code (or run `/skills` to reload). Invocable as `ic-feedback` whenever the human says "I wish IC had X", "the kiosk is broken", "tell Ray that...", or (operator) "show the feedback queue".

## Any other MCP-aware agent

Add this URL to your MCP-server config:

```
https://www.immersivecommons.com/api/mcp
```

- **Submit** (`ic_feedback_submit`) — anonymous; no Authorization header. Also reachable as plain HTTP: `POST https://www.immersivecommons.com/api/agent/feedback`.
- **Operator review** (`ic_admin_list_feedback`, `ic_admin_resolve_feedback`) — require an agent token with `admin:feedback_review` (operator tier). Send `Authorization: Bearer <token>`.

## Smoke probe (anonymous submit path)

```bash
curl -sS -X POST https://www.immersivecommons.com/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_feedback_submit","arguments":{"kind":"question","body":"smoke test — ignore"}}}'
```

200 + a JSON result with a `ticket_id` field = working.

## Operator smoke probe (needs token)

```bash
curl -sS -X POST https://www.immersivecommons.com/api/mcp \
  -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_admin_list_feedback","arguments":{}}}'
```

200 + `{ tickets: [...] }` = working. `token missing required scope: admin:feedback_review` = your token is non-operator.
