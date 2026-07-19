---
name: zai-keys
description: Request and use a Z.ai (GLM) Claude-Code-compatible key from Immersive Commons — a 5-hour walk-in WORKSHOP pass (public tier, tied to an event) or a weekly-token MEMBER key (ic-member, pick a multiplier). Use when the human says "get me a Z.ai key", "I need a GLM key for the workshop", "set up Claude Code on the IC gateway", "request a zai key", "I'm at the IC event and want to code", or "give me a weekly Z.ai allowance". Walks the full path — pick key type → request via MCP → operator approves → configure Claude Code (4 ANTHROPIC_* env vars) → run, plus the time-box / weekly limits and what happens at the cap. Requires an IC agent token with `keys:request` (granted at every tier). Official immersivecommons.com skill.
---

You help an agent's human get a **Z.ai GLM key that Claude Code can use** through Immersive Commons. IC holds ONE Z.ai org key server-side and fans out per-member virtual keys metered through an IC gateway — you (the agent) never see the org key, only the minted per-member proxy key (`agt_…`). Two flavors:

- **Workshop pass** (anyone, even a brand-new **public**-tier member): a **5-hour** time-boxed key tied to an upcoming IC event you're attending. The walk-in path for a Vibe Coding Night / ClawCamp / workshop.
- **Member key** (**ic-member**+): a **weekly-token** key at a multiplier (1 / 2 / 5 / 10 / 20× the base weekly allowance). Resets every Monday, never expires.

The shape is **request → operator approves → key is minted**. You file the request; an IC operator (Ray) approves before any key exists. **You cannot mint your own key** — that is the whole point of the gate.

## Pre-flight (always)

- **Token + scope.** You need an `agt_*` IC agent token carrying `keys:request`. It's granted at **every tier** (public → operator), so any token can file a request. No token yet? Run [`ic-onboarding`](https://www.immersivecommons.com/skills/ic-onboarding/SKILL.md) and include `keys:request` in the scope array.
- **Smoke-check** the token + scope:
  ```bash
  curl -s -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
    https://www.immersivecommons.com/api/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_get_my_membership","arguments":{}}}'
  ```
  A `token missing required scope: keys:request` on the request tool below means your tier didn't grant it — re-mint with the scope (see `ic-onboarding`). The MCP `Accept: application/json, text/event-stream` header is mandatory; without it the server returns `-32000 Not Acceptable`.
- **Pick the right key type with the human** before filing. Don't request both. If they're at an event and just want to code for the session → **workshop**. If they want a standing weekly allowance → **member** (needs ic-member; below that the member tool errors and the fix is a tier upgrade, not a re-mint).

## The pipeline (always this order)

### 1. Request a key

Both request tools live on the IC MCP server (`https://www.immersivecommons.com/api/mcp`) and need only `keys:request`. They **file a pending request** and return a `request_id` — they do **NOT** return a key (the key doesn't exist until an operator approves).

#### Workshop pass (public; tied to an event)

`ic_request_workshop_key` with `{ event_id?, note? }`.

- **`event_id`** is the **Luma URL** of the upcoming IC event you're attending (e.g. `https://luma.com/<slug>`). The upcoming-events list is fetched server-side, so a public caller needs only `keys:request` (NOT `events:read_upcoming`).
- **Omit `event_id` first to list eligible events.** A call with no `event_id` returns `{ ok: false, error_kind: "needs_event", events: [{ event_id, title, when, venue }, …] }`. Show the human that list, let them pick, then call again with the chosen `event_id`. (A bad/expired `event_id` returns `error_kind: "event_not_found"` with the same picker list — re-pick.)
- **`note`** (optional, ≤600 chars) — free-text context for the operator reviewing the queue.

```bash
# List eligible events (no event_id)
curl -s -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  https://www.immersivecommons.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_request_workshop_key","arguments":{}}}'

# File the request for the chosen event
curl -s -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  https://www.immersivecommons.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_request_workshop_key","arguments":{"event_id":"https://luma.com/<slug>","note":"At the VCN walk-in"}}}'
```

Success: `{ ok: true, request_id, status: "pending", kind: "workshop", event: { event_id, title } }`.

#### Member key (ic-member; weekly tokens)

`ic_request_zai_key` with `{ multiplier?, note? }`.

- **`multiplier`** ∈ `1 | 2 | 5 | 10 | 20` (default `1`) — × the base weekly token allowance. The operator may **approve a different multiplier** than you asked for; don't promise the human the exact number until it's minted.
- **`note`** (optional, ≤600 chars) — what they're building, to help the operator size it.

```bash
curl -s -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  https://www.immersivecommons.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_request_zai_key","arguments":{"multiplier":2,"note":"building an agent harness"}}}'
```

Success: `{ ok: true, request_id, status: "pending", kind: "member", multiplier }`.

MCP form (either tool): `{ "name": "ic_request_workshop_key", "arguments": { "event_id": "https://luma.com/<slug>" } }`.

### 2. Wait for the operator to approve

The request sits in a queue until an IC operator approves it on `/floor10/admin/zai-keys` (or via the operator MCP tools). **There is no agent-token MCP tool that returns YOUR minted key** — the plaintext key is surfaced exactly once, at approve time, and goes to whoever is collecting it:

- If the human filed through their **agent (this flow)**: tell them the request is filed (`request_id`), and that an operator needs to approve it. The operator hands them the key + setup block when they approve. Don't poll in a loop expecting a key to appear over MCP — it won't.
- If the human prefers to **self-serve in a browser**: point them at the Clerk-gated page `https://www.immersivecommons.com/zai-keys`. There they submit the same request, watch it flip to *approved*, and the page reveals the key + a copy-paste setup block exactly once. (That page's status/reveal endpoints require a signed-in Clerk session — an agent bearer token cannot drive them, by design.)

Either way: **the key arrives out-of-band to the human.** Your job resumes once they hand you the `agt_…` proxy key.

> Don't fabricate a key, a `request_id`, or an "approved" status. If you only have a `pending` request, say so. Surface the `request_id` so the human (or operator) can reference it.

### 3. Configure Claude Code with the minted key

Once the human gives you the minted **proxy key** (`agt_…`) — and, for a workshop, the setup bundle that came with it — point Claude Code at the IC gateway. The key only works through the gateway URL; it is **not** a real Anthropic key and will 401 against `api.anthropic.com`.

A **workshop** approval returns a ready-to-paste **bundle** with these fields: `base_url`, `env_lines` (the four `export` lines below), `install_line`, `copy_paste` (everything joined, paste-and-go), `expires_at`, `note`. If the human pastes you the `copy_paste` block, just run it. Otherwise set the **four `ANTHROPIC_*` env vars** yourself:

```bash
export ANTHROPIC_BASE_URL=<gateway base url from the bundle>   # the IC Z.ai gateway, NOT api.anthropic.com
export ANTHROPIC_AUTH_TOKEN=agt_<your minted proxy key>
export ANTHROPIC_MODEL=glm-4.6                                 # a GLM model id (from the bundle)
export ANTHROPIC_SMALL_FAST_MODEL=glm-4.5-air                  # the small/fast GLM (from the bundle)
npm install -g @anthropic-ai/claude-code
claude
```

Why all four matter:
- **`ANTHROPIC_BASE_URL`** routes Claude Code through the IC gateway (which injects the real Z.ai org key server-side and meters your usage). Use the `base_url` from the bundle verbatim — don't guess it.
- **`ANTHROPIC_AUTH_TOKEN`** is your minted `agt_…` proxy key. The gateway authorizes on the key's embedded proxy block (limits, expiry, model allow-list), not on a scope.
- **`ANTHROPIC_MODEL` + `ANTHROPIC_SMALL_FAST_MODEL` must BOTH be GLM model ids.** Claude Code defaults to Claude model names (`claude-sonnet-*` / `claude-haiku-*`) for its main and small/fast calls; the gateway's per-key allow-list is GLM-only and **403s any Claude model name**. Paste-and-go only works once both are pinned to GLM (use the exact ids from the bundle / the minted key's model allow-list). A **member** key has no auto-generated bundle, so set these two from the model allow-list the operator confirmed.

Smoke-test the wiring with a tiny prompt (`claude -p "say hi"`) before a real session, so a 401 (wrong base URL / bad key) or 403 (Claude model name slipped through / over cap) surfaces immediately.

### 4. Live within the limits

| | Limit | Reset | Expiry | At the cap |
|---|---|---|---|---|
| **Workshop** | wall-clock **5 hours** from approval | none | approval + 5h | gateway returns a clean 4xx Claude Code surfaces; request a fresh key |
| **Member** | weekly token allowance (`multiplier` × base) | **Monday 00:00 UTC** | none | gateway 4xx until the Monday reset; ask the operator to raise the multiplier if you keep hitting it |

- The **workshop 5-hour clock starts at approval**, not first use — if the operator approves early, the window is already counting. Reveal/collect and start coding promptly.
- The **member meter is weekly and soft by a small margin** (concurrent streams can overshoot slightly before the meter commits); don't treat the cap as a hard ceiling to ride.
- When a key hits its limit mid-session, Claude Code shows the gateway's 4xx. That's expected — it's not a bug to retry around. For a workshop, file a new request (a new 5h window needs a fresh approval). For a member key, wait for the Monday reset or ask the operator to bump the multiplier.
- **Revoke / rotate** at `https://www.immersivecommons.com/floor10/agent-console`. A demotion does NOT auto-revoke a live key — revoke explicitly if needed.

## What you DON'T do

- **Don't try to mint your own key.** The request tools only file a request; minting is operator-only by design. There's no scope, env var, or endpoint that lets an agent self-issue a key — and a token without a minted proxy block 403s at the gateway.
- **Don't poll an agent-token endpoint for the minted key.** No such MCP tool exists. The key reaches the human out-of-band (operator hands it over) or via the Clerk-gated web page. Polling won't surface it.
- **Don't point the key at `api.anthropic.com`.** It's a Z.ai proxy key; it only authenticates against the IC gateway `ANTHROPIC_BASE_URL`.
- **Don't leave `ANTHROPIC_MODEL` on a Claude model name.** That's the #1 cause of a 403 on an otherwise-valid key. Both model vars must be GLM ids.
- **Don't request a member key below ic-member.** The `ic_request_zai_key` tool errors for sub-member tiers; the fix is a tier upgrade (`ic_request_tier`), not a re-mint at the same tier. Below ic-member, use the workshop path instead.
- **Don't promise the exact multiplier before mint.** The operator can adjust it. Report what was actually minted.
- **Don't log or echo the plaintext key** beyond handing it to the human / setting it in env. It's a live credential; treat it like a password.

## Edge cases

- **`token missing required scope: keys:request`** — your token's tier didn't grant `keys:request` (it's granted at every tier, so this usually means a deliberately narrowed mint). Re-mint including the scope; this is NOT a tier problem for `keys:request` specifically.
- **`error_kind: "needs_event"` / `"event_not_found"`** — workshop requests need a valid upcoming-event `event_id`. The response carries the eligible `events[]` list; show it, re-pick, re-call.
- **`token has no tied Clerk identity (legacy token?)`** — the token predates Clerk binding. Re-mint via `ic-onboarding` or `/floor10/agent-console`.
- **Member tool errors with a tier/scope message** — you're below ic-member. Request the upgrade with `ic_request_tier` (operator approves; you get a `tier_approved` event), then re-request the key. Re-minting at the same tier grants nothing new.
- **Key 401s in Claude Code** — almost always `ANTHROPIC_BASE_URL` (must be the gateway, not Anthropic) or a stale/revoked `ANTHROPIC_AUTH_TOKEN`. Re-check the base URL from the bundle; if revoked, file a fresh request.
- **Key 403s in Claude Code** — either a Claude model name leaked into `ANTHROPIC_MODEL`/`ANTHROPIC_SMALL_FAST_MODEL` (pin both to GLM), or you're over the cap / past the 5h window (file a fresh request / wait for Monday).
- **Web reveal window closed** — the browser page's once-only reveal has a short (~15 min) TTL that's shorter than the 5h key life. If the human approved-then-walked-away, the reveal can expire even though the key is still alive; they file a new request (the prior approval is then wasted — reveal promptly).

## Useful reference

- **MCP endpoint**: `https://www.immersivecommons.com/api/mcp` (streamable-http; bearer `agt_*`).
- **Request tools** (scope `keys:request`, every tier): `ic_request_workshop_key` (`{ event_id?, note? }`) · `ic_request_zai_key` (`{ multiplier?, note? }`).
- **Operator-side** (scope `admin:llm_keys`, operator only — NOT for member agents): `ic_admin_list_pending_key_requests` / `ic_admin_approve_key_request` / `ic_admin_deny_key_request`. Covered by the [`ic-operator-admin`](https://www.immersivecommons.com/skills/ic-operator-admin/SKILL.md) skill.
- **Human web front door**: `https://www.immersivecommons.com/zai-keys` (Clerk-gated; submit + reveal-once). For humans who'd rather click than drive an agent.
- **Console** (mint browser-paste tokens, revoke keys): `https://www.immersivecommons.com/floor10/agent-console`.
- **The 4 Claude-Code env vars**: `ANTHROPIC_BASE_URL` (IC gateway) · `ANTHROPIC_AUTH_TOKEN` (your `agt_*` proxy key) · `ANTHROPIC_MODEL` (a GLM id) · `ANTHROPIC_SMALL_FAST_MODEL` (small/fast GLM id). Install line: `npm install -g @anthropic-ai/claude-code`.
- **Sister skills**: [`ic-onboarding`](https://www.immersivecommons.com/skills/ic-onboarding/SKILL.md) (mint a token with `keys:request`) · [`ic-events`](https://www.immersivecommons.com/skills/ic-events/SKILL.md) (find the event to tie a workshop key to) · [`ic-operator-admin`](https://www.immersivecommons.com/skills/ic-operator-admin/SKILL.md) (the operator approve side).

## When something looks broken

The IC agent surface evolves; a cached URL or schema can drift. Recovery, in order:

1. **Re-fetch discovery.** `GET https://www.immersivecommons.com/.well-known/ai-agent.json`; compare `last_modified` to your cached copy. If newer, re-read the tool list + scopes. Most "this used to work" failures resolve here.
2. **Retry with the fresh values** — the live discovery wins over any cached copy.
3. **File a structured report** if still broken — `POST https://www.immersivecommons.com/api/agent/feedback` (anonymous, rate-limited, returns a `ticket_id`):
   ```bash
   curl -X POST https://www.immersivecommons.com/api/agent/feedback \
     -H "Content-Type: application/json" \
     -d '{
       "kind": "schema_mismatch",
       "url": "/skills/zai-keys/SKILL.md",
       "expected": "ic_request_workshop_key returns { ok, request_id, status }",
       "got": "<what you actually saw>",
       "agent_id": "Your Agent Name",
       "message": "Followed zai-keys SKILL.md and the response shape didn't match."
     }'
   ```
   `kind` ∈ `broken_url | schema_mismatch | stale_doc | endpoint_404 | other`. Hand the `ticket_id` to your human; don't loop on the same failure.
4. **Out-of-band fallback**: if `/api/agent/feedback` itself 5xxs, email `admin@immersivecommons.com` with the same body.
