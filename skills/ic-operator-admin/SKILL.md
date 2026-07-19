---
name: ic-operator-admin
description: Walk an Immersive Commons operator's agent through the pending-membership review queue end-to-end — list waiting requests, decide approve / deny / override, run a dry-run preview, then commit. Hard rules around evidence-before-decision, no batch approvals, no self-promotion. Use when the human says "review pending IC members", "who's waiting for approval", "approve X", "deny Y", "burn down the queue", "promote someone to operator". Requires an IC agent token carrying `admin:tier_review` (operator tier only). The MCP scope is enforced server-side; this doc is the workflow + judgement layer. Official immersivecommons.com skill.
---

You help an Immersive Commons operator's agent triage the pending-membership queue. The MCP server at `https://www.immersivecommons.com/api/mcp` exposes three operator verbs that are wired to the same helpers (`applyTier` / `denyTierRequest`) as the in-browser admin page at `/floor10/admin/members`. Behaviour is identical across transports; this skill teaches you the *workflow*, not the *boundary*.

## Pre-flight (every session)

1. **Token check.** You need an IC agent token with `admin:tier_review` in its scope set. Only operator-tier IC members can mint this scope — `lib/capabilities.ts::SCOPES_BY_TIER.operator` is the gate, enforced server-side at mint time. Smoke probe:
   ```bash
   curl -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
     -X POST -H "content-type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"ic_admin_list_pending_tier_requests","arguments":{}}}' \
     https://www.immersivecommons.com/api/mcp
   ```
   200 + result with `pending: []` (or non-empty) = good. 401 = no/bad token. `token missing required scope: admin:tier_review` = your token is non-operator (or your tier was demoted between mint and now — the live-tier check fires every call).

   **REQUIRED Accept header.** MCP streamable-HTTP transport gates on `Accept: application/json, text/event-stream`. A bare `Accept: application/json` (or missing header) returns JSON-RPC `-32000 "Not Acceptable"` even for tools/list that doesn't actually stream. Every curl / fetch / HTTP probe against `/api/mcp` MUST include both content types.

2. **Identity check.** Tools refuse if the calling operator has been demoted in Clerk since the token was minted (Layer-3 freshness gate; ~60s cached). If you see `tier check failed`, the human's tier is no longer operator — escalate to a human-in-the-loop fix; do not retry.

## The three verbs

### 1. `ic_admin_list_pending_tier_requests`
Read-only. Returns `{ pending: PendingTierRequest[], audit: TierAuditEntry[] }`. Newest first. The `audit` tail is the last 25 approve/deny/auto-promote decisions across the queue (anyone, not just yours) — use it to understand recent context before you decide.

```jsonc
{ "name": "ic_admin_list_pending_tier_requests", "arguments": {} }
```

Pending record shape:
```jsonc
{
  "user_id": "user_2x...",            // Clerk userId
  "email": "jane@example.com",
  "display_name": "Jane Founder",
  "current_tier": "public",
  "requested_tier": "ic-member",
  "note": "I host VCN, attended every Lab night",
  "submitted_at": "2026-05-19T22:14:08.214Z"
}
```

### 2. `ic_admin_approve_tier_request`
Two-step. Default is a dry-run preview; `confirm: true` is required to mutate.

**Step 1 — preview:**
```jsonc
{
  "name": "ic_admin_approve_tier_request",
  "arguments": { "user_id": "user_2x..." }
}
```
Returns `{ ok: true, dry_run: true, from, to, action: "approve", was_pending, requested_tier, override_used }` *or* `{ ok: false, error_kind: "no_pending" }` if there's nothing to approve and you didn't pass a `tier` override.

**Step 2 — commit:**
```jsonc
{
  "name": "ic_admin_approve_tier_request",
  "arguments": {
    "user_id": "user_2x...",
    "reason": "Hosts VCN, verified attendance via graph + Telegram",
    "confirm": true
  }
}
```

**Override:** if you want to approve a member to a *different* tier than they requested (e.g. they asked for `ic-member` but you decide `ai-floor`), pass `tier`:
```jsonc
{
  "name": "ic_admin_approve_tier_request",
  "arguments": {
    "user_id": "user_2x...",
    "tier": "ai-floor",
    "reason": "Active in the AI floor channel but not yet at the IC-member bar",
    "confirm": true
  }
}
```

**`tier: "operator"` is approvable here** even though it isn't self-requestable. Use this for the rare promotion-from-trust path (Ray bringing in a deputy). Treat it as a separate review — see the hard rules below.

### 3. `ic_admin_deny_tier_request`
Same two-step shape. The user's tier is **unchanged**; only their pending request is cleared. The `reason` is recorded in the audit log AND surfaced to the requester on their `/membership` page so they understand why.

```jsonc
{
  "name": "ic_admin_deny_tier_request",
  "arguments": {
    "user_id": "user_2x...",
    "reason": "Haven't seen you on the floor yet — come hang at a VCN night and re-apply.",
    "confirm": true
  }
}
```

## The judgement layer (read this before deciding)

Approving someone unlocks scope vocabulary they couldn't have before. Map each ring to what they get and what bar to apply:

| Tier | Unlocks | Bar |
|---|---|---|
| `ft-member` | Frontier Tower presence; events:read_upcoming + RSVP | Verified FT member (paid floor or guest pass on file). |
| `ai-floor` | + directory:search, resources:read | Active in the AI Floor channel; recognized by 2+ existing ai-floor members; has shown up to at least one event. |
| `ic-member` | + resources:book, events:submit_recap, leaderboard:manage, github:link, headsets:lend, headsets:report_damage | Has hosted or co-hosted IC programming, OR has been an active member for 60+ days with consistent floor presence. |
| `operator` | + every admin scope (tier_review, highlights_review, manifest_edit, roster_sync, headsets_review) | Ray's explicit trust circle. Defaults to "no" unless Ray has personally said yes. |

**Evidence before decision.** Cross-reference each candidate against:
- The `audit` tail — has this user requested before, been denied, been demoted?
- Their `note` — is it specific (event names, dates, hosted-by) or generic (gen-ai vibes)?
- Their email domain — known sponsor / partner orgs (anthropic.com, openai.com, deepmind...) get scrutiny *upward* (don't auto-approve based on prestige, but do flag as worth knowing).
- The display_name — does it match someone on the Telegram floor channel? On Luma guest lists? (The agent that mints this token typically has membership:read; cross-link if you have it.)

**Don't infer evidence.** If the note is "I'm interested in AI," the human did not give you a reason — surface the gap, don't manufacture justification.

## Hard rules

- **No batch approvals.** Each `confirm:true` call is one human-deliberated decision. If the agent encounters 10 pending requests, run 10 separate decision loops — list → preview → ask human → confirm. Never loop blindly.
- **Self-promotion is a foot-gun.** The MCP doesn't structurally prevent you from approving the operator themselves to a different tier (or worse, demoting themselves via an override-down approve). Refuse the call. The operator's own membership belongs in Ray's hands, not their agent's.
- **`tier: "operator"` is a Ray-level decision.** Surface the request to the human operator + Ray (if they're not the same person) explicitly. Don't approve operator promotions on a same-session agent decision unless Ray has confirmed in a durable channel (telegram message, commit message, written approval).
- **Honor the dry-run.** If the operator hasn't explicitly said "do it," return the preview and stop. Don't shortcut to `confirm:true` because the preview looked fine.
- **Audit the audit.** Before each approve, scan the recent audit tail for a pattern: was this user denied recently? Was their tier rolled back? Surface the prior decision to the human; don't approve over a recent denial without explanation.
- **Never invent reasons.** The `reason` field becomes part of the user's `/membership` page on a deny, and part of the audit log on either decision. Use only what the human told you, or quote the evidence (event attendance, graph link, ticket from sponsor).
- **Rate limit awareness.** 20 mutations per token per UTC day. If you're approaching the cap on a legitimate burndown day, *stop* and tell the human; do not try to rotate to a different token to evade the bound.

## What gets logged

Every call writes to two places:
1. **MCP activity log** (per-user, readable via `ic_activity_get_recent`) — every tool call, including dry-runs.
2. **Tier audit log** (`KVKeys.tierAudit`, capped at 500) — every approve/deny mutation with `by_clerk_user_id` attribution to the operator's Clerk identity (NOT the agent's token).

If you see a decision in the audit log that you don't recognize, it's coming from another operator (or from a different agent under the same operator). Investigate before assuming compromise.

## Failure modes & recovery

- **`no_pending` on approve without `tier`.** The user has nothing pending (cleared by another operator, or they cancelled). Use the `tier` override only if the human explicitly wants to grant a ring without a fresh request.
- **`tier check failed: tier <X> does not authorize scope admin:tier_review`.** The operator was demoted between mint and call. Stop; escalate to a human-in-the-loop.
- **`admin rate limit exceeded`.** You've hit 20 mutations in the UTC day. Stop. Resumes at 00:00 UTC.
- **`could not resolve user`.** The `user_id` doesn't exist in Clerk. Double-check the id from the `pending` array.

## Discovery surfaces

- Agent card: https://www.immersivecommons.com/.well-known/agent-card.json
- Aiia manifest: https://www.immersivecommons.com/.well-known/ai-agent.json
- MCP discovery: https://www.immersivecommons.com/.well-known/mcp.json
- llms.txt URL map: https://www.immersivecommons.com/llms.txt
- Human-facing admin page: https://www.immersivecommons.com/floor10/admin/members

## Related skills

- `ic-onboarding` — RFC 8628 device-code signup; how a fresh agent gets authorized.
- `ic-headsets` — Same operator scope pattern (`admin:headsets_review`) for the PICO lending program.
- `ic-events` — Sister surface; same auth model.
