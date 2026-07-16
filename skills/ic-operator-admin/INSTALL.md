# Install: ic-operator-admin

One-step skill install. **Requires an IC agent token carrying `admin:tier_review`** (operator tier only — `lib/capabilities.ts::SCOPES_BY_TIER.operator` is the gate, enforced server-side at mint time).

## Claude Code

```bash
mkdir -p ~/.claude/skills/ic-operator-admin
curl -fsSL https://www.immersivecommons.com/skills/ic-operator-admin/SKILL.md \
  -o ~/.claude/skills/ic-operator-admin/SKILL.md
```

Restart Claude Code (or run `/skills` to reload). Invocable as `ic-operator-admin` whenever the human says "review pending IC members", "who's waiting for approval", "approve X", "deny Y", or "burn down the membership queue".

## Any other MCP-aware agent

Add this URL to your MCP-server config and send your operator token:

```
https://www.immersivecommons.com/api/mcp
Authorization: Bearer <your operator agent token>
```

The three verbs: `ic_admin_list_pending_tier_requests` (read), `ic_admin_approve_tier_request`, `ic_admin_deny_tier_request`. They wire to the same `applyTier` / `denyTierRequest` helpers as the in-browser admin page at `/floor10/admin/members`.

**REQUIRED Accept header.** The MCP streamable-HTTP transport gates on `Accept: application/json, text/event-stream`. A bare `Accept: application/json` returns JSON-RPC `-32000 "Not Acceptable"` even for non-streaming calls.

## Smoke probe (needs operator token)

```bash
curl -sS -X POST https://www.immersivecommons.com/api/mcp \
  -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_admin_list_pending_tier_requests","arguments":{}}}'
```

200 + `{ pending: [...], audit: [...] }` = working. 401 = no/bad token. `token missing required scope: admin:tier_review` = your token is non-operator (or your tier was demoted since mint — the live-tier check fires every call).
