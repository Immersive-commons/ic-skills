---
name: ic-credits
description: Get and use IC Credits from Immersive Commons. Your IC Key (one agt_ key) carries a monthly budget of model credits in dollars, spent through the IC gateway on open-weight models (DeepSeek, Kimi, Qwen, Llama, gpt-oss, Nemotron; metered in USD). Works with Claude Code (ANTHROPIC_* env) and any OpenAI-compatible tool (OPENAI_BASE_URL). Ring auto-approval: a member request at or under the ring default (operator $50, ic-member $20, ai-floor and ft-member $10 per month) mints INSTANTLY and returns the key in-band; above it an operator approves. A 5-hour workshop pass (any tier, tied to an event, $5 of credits) also mints instantly. Regenerate a lost key any time (same budget, spend carried over, old key revoked). Use when the human says "get me an IC Key", "give me IC Credits", "I need a key for the workshop", "set up Claude Code on the IC gateway", "use DeepSeek / Kimi through IC", "I lost my IC key", "how much of my credits are left", or "give me $20 of credits". Walks the full path: pick key type, budget and default model, request via MCP (instant mint or queued pickup), configure Claude Code or an OpenAI-compatible tool, check spend, regenerate, plus the time-box / monthly-budget / org-cap / 429 semantics. Requires an IC agent token with keys:request (granted at every tier). Official immersivecommons.com skill.
---

You help an agent's human get **IC Credits**: a monthly budget of model credits in dollars, carried by an **IC Key** (one `agt_` proxy key) that Claude Code or any OpenAI-compatible tool can use through Immersive Commons. IC holds the upstream provider keys server-side and fans out per-member keys metered through the IC gateway. You (the agent) never see an org key, only the minted per-member key (`agt_...`).

**Open-weight models behind one key**, picked by the model id: Nebius Token Factory models (ids with a slash, like `deepseek-ai/DeepSeek-V4-Flash-0731`), metered in USD against the key's own **dollar budget** and, above that, a shared org cap. Prices per million tokens are on the program page so the pick is informed.

The one line to remember: **"IC Key: $20 of IC Credits per month."**

**Two key kinds:**

- **Workshop pass** (anyone, even a brand-new **public**-tier member): a **5-hour** time-boxed key tied to an upcoming IC event you are attending, with **$5 of credits for its lifetime**. Mints on the spot. The walk-in path for a Vibe Coding Night / ClawCamp / workshop.
- **Member key** (**ft-member** and above): a **monthly budget** of IC Credits, one of $5 / $10 / $20 / $50 / $100. Resets on the 1st (UTC), never expires. **One live member key per person.**

**Ring auto-approval** (the part that changed on 2026-09-15):

| ring | default budget | a request at or under the default | above it |
|---|---|---|---|
| operator | $50/month | mints instantly | operator queue |
| ic-member | $20/month | mints instantly | operator queue |
| ai-floor | $10/month | mints instantly | operator queue |
| ft-member | $10/month | mints instantly | operator queue |
| public | workshop only: 5h + $5 lifetime, event-tied | mints instantly | n/a |

So the common shape is now **request -> key, in one call**: the response carries the plaintext and both setup blocks exactly once (`mode: "minted"`). Only a request **above** the ring default queues for an operator (`mode: "queued"`), and then you pick the key up once after approval. **You still cannot mint outside those rules**; the ring rule and the operator gate are the whole point.

## Pre-flight (always)

- **Token + scope.** You need an `agt_*` IC agent token carrying `keys:request`. It is granted at **every tier** (public through operator), so any token can request. No token yet? Run [`ic-onboarding`](https://www.immersivecommons.com/skills/ic-onboarding/SKILL.md) and include `keys:request` in the scope array.
- **Smoke-check** the token + scope:
  ```bash
  curl -s -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
    https://www.immersivecommons.com/api/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_get_my_membership","arguments":{}}}'
  ```
  A `token missing required scope: keys:request` on the request tool below means your tier did not grant it; re-mint with the scope (see `ic-onboarding`). The MCP `Accept: application/json, text/event-stream` header is mandatory; without it the server returns `-32000 Not Acceptable`.
- **Pick the right key type with the human** before requesting. Do not request both. At an event, wanting to code for the session -> **workshop**. A standing monthly budget -> **member** (needs ft-member or above; below that the member tool answers `not_allowed` and the fix is a tier upgrade, not a re-mint). Suggest a budget that fits: $20 covers a lot of DeepSeek V4 Flash ($0.14/$0.28 per M) and very little Kimi K3 ($3/$15 per M). **Asking for at most the ring default gets the key instantly.**
- **Pick a default model with the human.** It is pinned as `ANTHROPIC_MODEL` in the setup block; every catalog model stays allowed on the key, so it can be switched later by env. Rules of thumb:
  - Cheap, fast, 1M context, reasoning, tool use: `deepseek-ai/DeepSeek-V4-Flash-0731` ($0.14 in / $0.28 out per M).
  - Code-focused open-weight: `moonshotai/Kimi-K2.7-Code` ($0.95 / $4).
  - Also served: DeepSeek V4 Pro, Kimi K2.6 / K3, Qwen3 235B / 30B, Qwen3.5 397B, Llama 3.3 70B, Gemma 3 27B, gpt-oss-120b, Nemotron 3 Nano / Super / Ultra / 3.5 Lightning, Hermes 4 405B, MiniMax M3. The full table with prices, context and tools/reasoning badges is at `https://www.immersivecommons.com/credits`.
  - **Pass `default_model` explicitly.** Omitted, the key gets the gateway's own default, which may not be the model the human wants.
  - An id not in the catalog is rejected at request time with `default_model is not in the IC Key catalog`. Do not guess ids; copy them from the table.

## The pipeline (always this order)

### 1. Request

Both request tools live on the IC MCP server (`https://www.immersivecommons.com/api/mcp`) and need only `keys:request`. Each answers with a **`mode`** you must branch on:

- **`minted`**: the key exists NOW. `agent_token`, `token_prefix` and `bundle` are in this response and will **never be shown again**. Hand the bundle to the human at once (or set the env yourself) before doing anything else.
- **`queued`**: the request is pending for an operator; you get a `request_id` and a `next` pointer to the pickup tool. Only member requests above the ring default land here.
- **`existing`** (member only): the human already holds a live member key. You get its `token_prefix` and `usage`, not the plaintext. If they lost the key, go to **Regenerate** below.

#### Workshop pass (any tier; tied to an event)

`ic_credits_request_workshop` with `{ event_id?, default_model?, note? }`.

- **`event_id`** is the **Luma URL** of the upcoming IC event you are attending (e.g. `https://luma.com/<slug>`), or a hackathon's short slug. The upcoming-events list is fetched server-side, so a public caller needs only `keys:request`.
- **Omit `event_id` first to list eligible events.** A call with no `event_id` returns `{ ok: false, error_kind: "needs_event", events: [{ event_id, title, when, venue }, ...] }`. Show the human that list, let them pick, then call again with the chosen `event_id`. (A bad/expired `event_id` returns `error_kind: "event_not_found"` with the same picker list; re-pick.)
- **`default_model`** (optional, recommended): a catalog id.
- **`note`** (optional, up to 600 chars): recorded on the request.

```bash
# List eligible events (no event_id)
curl -s -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  https://www.immersivecommons.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_credits_request_workshop","arguments":{}}}'

# Get the key for the chosen event, pinning DeepSeek V4 Flash as the default
curl -s -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  https://www.immersivecommons.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_credits_request_workshop","arguments":{"event_id":"https://luma.com/<slug>","default_model":"deepseek-ai/DeepSeek-V4-Flash-0731","note":"At the VCN walk-in"}}}'
```

Success: `{ ok: true, mode: "minted", request_id, token_prefix, agent_token, bundle, expires_at, budget_usd: 5, default_model, event }`. The 5-hour clock starts now.

#### Member key (ft-member and above; monthly IC Credits)

`ic_credits_request` with `{ budget_usd?, default_model?, note? }`.

- **`budget_usd`** in `5 | 10 | 20 | 50 | 100` (default: the ring default). At or under the ring default -> `mode: "minted"`. Above it -> `mode: "queued"`, and the operator may **approve a different budget** than asked; do not promise the human the exact figure until it is minted. (`multiplier` from the old weekly-token model is still accepted and ignored.)
- **`default_model`** (optional, recommended): a catalog id.
- **`note`** (optional): what they are building.

```bash
curl -s -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  https://www.immersivecommons.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_credits_request","arguments":{"budget_usd":20,"default_model":"deepseek-ai/DeepSeek-V4-Flash-0731","note":"building an agent harness"}}}'
```

Instant: `{ ok: true, mode: "minted", request_id, token_prefix, agent_token, bundle, budget_usd, budget_period: "month", default_model }`.
Queued: `{ ok: true, mode: "queued", request_id, status: "pending", budget_usd, next: { tool: "ic_credits_pickup", arg: { request_id } } }`.
Already holds one: `{ ok: true, mode: "existing", token_prefix, usage, hint: { tool: "ic_credits_regenerate" } }`.

### 2. Queued only: wait for the operator, then pick the key up ONCE

A queued request sits in the operator queue (`/floor10/admin/credits`, or the operator MCP tools) until approved. Then **you** pick the key up, exactly once, with the matching pickup tool:

- Workshop: `ic_credits_pickup_workshop` `{ request_id }`.
- Member: `ic_credits_pickup` `{ request_id }` (an agent-inbox notice also announces approval).

While unapproved both return `{ ok: true, status: "pending" }`; poll every minute or two, not in a tight loop. On the **first** call after approval they return `{ ok: true, status: "ready", agent_token, bundle }`. The pickup window is about **15 minutes after approval** and the key is surfaced **exactly once**; a second call, a lapsed window, or a denied request returns a terminal status with what to do next (`already_retrieved_or_expired` on a member key means `ic_credits_regenerate`; on a workshop key, ask the operator for a fresh approve).

The human can instead self-serve in a browser at `https://www.immersivecommons.com/credits` (Clerk-gated): the program page, the same picker, an instant key at the ring default, and a once-only reveal of the key + both setup blocks. That page's endpoints require a signed-in session; an agent bearer token cannot drive them, by design.

> Do not fabricate a key, a `request_id`, or a `minted` status. If you only have a `queued` request, say so. Surface the `request_id` so the human (or operator) can reference it.

### 3. Configure the tool with the minted key

The `bundle` carries two paste blocks. The key only works through the gateway URL in the bundle; it is **not** an Anthropic or OpenAI key and will 401 against `api.anthropic.com` / `api.openai.com`.

**Claude Code** (`bundle.copy_paste`; fields `base_url`, `env_lines`, `install_line`, `default_model`, `small_fast_model`, `available_models`, `model_table`, `budget_usd`, `expires_at`, `note`):

```bash
export ANTHROPIC_BASE_URL=<gateway base url from the bundle>   # the IC gateway, NOT api.anthropic.com
export ANTHROPIC_AUTH_TOKEN=agt_<your minted key>
export ANTHROPIC_MODEL=<your default_model>                     # e.g. deepseek-ai/DeepSeek-V4-Flash-0731
export ANTHROPIC_SMALL_FAST_MODEL=<the paired small/fast id>    # the bundle pins it, e.g. DeepSeek V4 Flash
npm install -g @anthropic-ai/claude-code
claude
```

Why all four matter:
- **`ANTHROPIC_BASE_URL`** routes Claude Code through the IC gateway (which injects the real provider key server-side, translates Nebius traffic to the Anthropic wire shape, and meters your usage). Use the `base_url` from the bundle verbatim.
- **`ANTHROPIC_AUTH_TOKEN`** is your minted `agt_...` key. The gateway authorizes on the key's embedded proxy block (budget, expiry, model allow-list), not on a scope.
- **`ANTHROPIC_MODEL` and `ANTHROPIC_SMALL_FAST_MODEL` must BOTH be ids from the key's allow-list.** Claude Code defaults to Claude model names (`claude-sonnet-*` / `claude-haiku-*`), which the gateway **403s**. The bundle pins both for you; leave the pairing alone unless you know what the background calls will cost.
- The bundle's `# Models on this key` comment is the compact table (id, provider, $in/M, $out/M, context) of everything the key allows. Switch any time with a new `export ANTHROPIC_MODEL=...`.

**OpenAI-compatible tools** (`bundle.copy_paste_openai`; Codex CLI, OpenCode, aider, Cursor, any OpenAI SDK):

```bash
export OPENAI_BASE_URL=<gateway base url>/v1
export OPENAI_API_KEY=agt_<your minted key>
# in the tool, select a model id with a slash, e.g. deepseek-ai/DeepSeek-V4-Flash-0731
```

The gateway serves `POST /v1/chat/completions` and `GET /v1/models` (the key's allow-list, so tools that probe it just work); pick an id with a slash there. `POST /v1/messages/count_tokens` is served too (an estimate for Nebius models).

Smoke-test the wiring with a tiny prompt (`claude -p "say hi"`) before a real session, so a 401 (wrong base URL / bad key) or 403 (a Claude model name slipped through / over cap) surfaces immediately.

### 4. Live within the limits

| | Limit | Reset | Expiry | At the cap |
|---|---|---|---|---|
| **Workshop** | wall-clock **5 hours** from mint AND **$5 of credits** for the key's lifetime | none | mint + 5h | gateway returns a clean 4xx (`key budget exhausted` when the $5 is spent); request a fresh key |
| **Member** | **monthly budget of IC Credits** ($5 to $100) | **1st of the month, 00:00 UTC** | none | `429 key budget exhausted`; wait for the 1st, or ask an operator to raise the budget |
| **Nebius org cap (every key)** | shared **monthly USD cap** on all Nebius traffic across IC | 1st of the month (UTC) | none | `429 provider budget exhausted for this month`; wait for the 1st, or ask an operator to raise the cap |

- **How spend is counted.** The gateway prices each call from the public Nebius rates and adds it to the key's month (or lifetime) counter. Cost is known after each turn, so a budget can overshoot by at most one call.
- **429 semantics.** Two different 429s, same fix: `key budget exhausted` is YOUR key's budget (month, or lifetime for a workshop key); `provider budget exhausted for this month` is the shared org cap. Both come in the wire shape of the route you called (Anthropic shape on `/v1/messages`, OpenAI shape on `/v1/chat/completions`). Wait for the 1st, or (member keys) ask an operator for a bigger budget. A regenerate does NOT reset a budget: the spend carries over.
- **Notices.** At 80% and 100% of a monthly budget the member gets an IC notification ("IC Credits: 80% of your $20 used this month") pointing at `/credits`. Every 2xx from the gateway also carries `x-ic-budget-used-usd` and `x-ic-budget-usd` headers so a client can show "$x.xx of $20.00".
- **Check your own spend** with `ic_credits_usage` and **no arguments** (member keys): it resolves your one live key from your identity and returns `{ ok: true, has_key: true, token_prefix, budget_usd, budget_used_usd, budget_remaining_usd, budget_period: "month" | "lifetime", budget_resets: "YYYY-MM-01" | "never", by_model: [{ model, provider, tokens }], default_model }`. Read it as "$x.xx of $20.00". Pass `{ request_id }` only to read a specific request (that shape adds `month_cost_usd`, `month`, `weekly_used`, `reset_date`). No live key: `{ ok: false, has_key: false, error_kind: "not_found" }` (plus `pending_request` if one is queued); call `ic_credits_request`. Workshop keys are time-boxed and return `ok: false` here (check `expires_at` instead).
- The **org cap is shared by every IC Key**, on top of each key's own budget. Operators watch both on `/floor10/admin/credits`.

### 5. Regenerate a lost or leaked key

`ic_credits_regenerate` with no arguments (member keys; scope `keys:request`). It **revokes** the live key and mints a fresh one with the **same budget, models and default model**, and **this month's spend carries over**. The new `agent_token` + `bundle` come back once, in this response, and are never stored. Use it when the key leaked, was lost, or the pickup window lapsed. `ok: false, error_kind: "not_found"` means the human holds no live member key; use `ic_credits_request` instead. Anything still running on the old key 401s at the gateway from that moment, so warn the human before calling it.

## What you DON'T do

- **Do not try to mint outside the ring rule.** The request tools mint only at or under the ring default; anything above queues for an operator. There is no scope, env var, or endpoint that lets an agent self-issue more than the ring allows, and a token without a minted proxy block 403s at the gateway.
- **Do not point the key at `api.anthropic.com` or `api.openai.com`.** It is an IC gateway key; it only authenticates against the gateway URL in the bundle.
- **Do not leave `ANTHROPIC_MODEL` on a Claude model name.** That is the #1 cause of a 403 on an otherwise-valid key. Both model vars must be ids from the key's allow-list.
- **Do not put an id without a slash on the OpenAI route.** `/v1/chat/completions` serves ids with a slash only.
- **Do not invent a model id.** If it is not in the table at `/credits`, the request is rejected and the gateway would 403 it anyway.
- **Do not request a member key below ft-member.** `ic_credits_request` answers `not_allowed` for public tier; the fix is a tier upgrade (`ic_request_tier`), not a re-mint at the same tier. Below ft-member, use the workshop path instead.
- **Do not request a second member key.** One live key per person: a second request answers `mode: "existing"`. Regenerate instead.
- **Do not promise the exact budget on a queued request.** The operator can adjust it. Report what was actually minted (`bundle.budget_usd`).
- **Do not poll the pickup tool in a tight loop.** Once a minute is plenty; the window opens on approval and stays open about 15 minutes.
- **Do not log or echo the plaintext key** beyond handing it to the human / setting it in env. It is a live credential; treat it like a password.
- **Do not regenerate speculatively.** It cuts off whatever is running on the current key. Only when the human asks, or the key is gone.

## Edge cases

- **`token missing required scope: keys:request`**: your token's tier did not grant `keys:request` (it is granted at every tier, so this usually means a deliberately narrowed mint). Re-mint including the scope.
- **`error_kind: "renamed"`**: you called a pre-2026-09-15 tool name (`ic_request_workshop_key`, `ic_get_my_workshop_key`, ...). The answer carries `use: "<new name>"`; call that with the same arguments and update your cached skill.
- **`error_kind: "needs_event"` / `"event_not_found"`**: workshop requests need a valid upcoming-event `event_id`. The response carries the eligible `events[]` list; show it, re-pick, re-call.
- **`default_model is not in the IC Key catalog`**: the id is misspelled or not served. Copy it exactly from `https://www.immersivecommons.com/credits` (Nebius ids are case-sensitive and contain a slash).
- **`token has no tied Clerk identity (legacy token?)`**: the token predates Clerk binding. Re-mint via `ic-onboarding` or `/floor10/agent-console`.
- **`error_kind: "not_allowed"` on the member tool**: you are below ft-member. Request the upgrade with `ic_request_tier` (operator approves; you get a `tier_approved` event), then re-request the key.
- **`error_kind: "rate_limited"` / `credits request cap reached`**: requests and regenerates share an hourly per-person cap. Wait for the next hour; do not retry in a loop.
- **Pickup returns `already_retrieved_or_expired`**: the key was already surfaced once, or the ~15-minute window closed. Member key: `ic_credits_regenerate`. Workshop key: ask the operator for a fresh approve. Never pretend a key was retrieved.
- **Key 401s**: almost always `ANTHROPIC_BASE_URL` / `OPENAI_BASE_URL` (must be the gateway, not the vendor), a revoked key (a regenerate revokes the previous one), or a stale key. Re-check the base URL from the bundle; if revoked, regenerate or file a fresh request.
- **Key 403s**: a Claude model name leaked into `ANTHROPIC_MODEL` / `ANTHROPIC_SMALL_FAST_MODEL` (pin both to allow-listed ids), an id without a slash on the OpenAI route, or you are past the 5h window.
- **429 `key budget exhausted`**: this key's own dollar budget is spent (month, or lifetime for a workshop key). Wait for the 1st, or ask an operator for a bigger budget.
- **429 `provider budget exhausted for this month`**: the shared Nebius org cap is spent. Wait for the month to roll; tell the human the operator can raise the cap.
- **503 on a Nebius model**: the gateway is missing its Nebius credential or KV is unreachable; it fails closed rather than falling back. Report it via feedback (below).
- **Web reveal window closed**: the browser page's once-only reveal has the same ~15 min TTL for queued requests. A member regenerates from `/credits`; a workshop walk-in files a new request.

## Useful reference

- **MCP endpoint**: `https://www.immersivecommons.com/api/mcp` (streamable-http; bearer `agt_*`).
- **Request tools** (scope `keys:request`, every tier): `ic_credits_request_workshop` (`{ event_id?, default_model?, note? }`) and `ic_credits_request` (`{ budget_usd?, default_model?, note? }`). Branch on `mode`: `minted` | `queued` | `existing`.
- **Pickup tools** (queued requests only, same scope, once, ~15 min window): `ic_credits_pickup_workshop` / `ic_credits_pickup` (`{ request_id }`).
- **Usage** (member keys): `ic_credits_usage` (no arguments for your live key; `{ request_id }` for a specific request) with `budget_usd` / `budget_used_usd` / `budget_remaining_usd`, `by_model` and `default_model`.
- **Regenerate** (member keys): `ic_credits_regenerate` (no args): revoke + fresh key, same budget, spend carried over.
- **Operator-side** (scope `admin:llm_keys`, operator only, NOT for member agents): `ic_credits_admin_pending` / `ic_credits_admin_approve` (`budget_usd` sets the monthly credits) / `ic_credits_admin_deny` / `ic_credits_admin_set_budget` (change a live key's budget in place) / `ic_credits_admin_usage` (month-to-date per provider, model and key with each key's "$x of $y", plus the Nebius org cap %). Covered by the [`ic-operator-admin`](https://www.immersivecommons.com/skills/ic-operator-admin/SKILL.md) skill.
- **Human web front door**: `https://www.immersivecommons.com/credits` (program page; Clerk-gated console with instant key, usage box, regenerate). The model table with prices lives there.
- **Console** (mint browser-paste tokens, revoke keys): `https://www.immersivecommons.com/floor10/agent-console`.
- **Claude Code env**: `ANTHROPIC_BASE_URL` (IC gateway) / `ANTHROPIC_AUTH_TOKEN` (your `agt_*` key) / `ANTHROPIC_MODEL` (your default) / `ANTHROPIC_SMALL_FAST_MODEL` (the paired small/fast id). Install line: `npm install -g @anthropic-ai/claude-code`.
- **OpenAI-compatible env**: `OPENAI_BASE_URL=<gateway>/v1` / `OPENAI_API_KEY=<agt_ key>`; ids with a slash only.
- **Sister skills**: [`ic-onboarding`](https://www.immersivecommons.com/skills/ic-onboarding/SKILL.md) (mint a token with `keys:request`), [`ic-events`](https://www.immersivecommons.com/skills/ic-events/SKILL.md) (find the event to tie a workshop key to), [`ic-operator-admin`](https://www.immersivecommons.com/skills/ic-operator-admin/SKILL.md) (the operator approve side).

## When something looks broken

The IC agent surface evolves; a cached URL or schema can drift. Recovery, in order:

1. **Re-fetch discovery.** `GET https://www.immersivecommons.com/.well-known/ai-agent.json`; compare `last_modified` to your cached copy. If newer, re-read the tool list + scopes. Most "this used to work" failures resolve here.
2. **Retry with the fresh values**; the live discovery wins over any cached copy.
3. **File a structured report** if still broken: `POST https://www.immersivecommons.com/api/agent/feedback` (anonymous, rate-limited, returns a `ticket_id`):
   ```bash
   curl -X POST https://www.immersivecommons.com/api/agent/feedback \
     -H "Content-Type: application/json" \
     -d '{
       "kind": "schema_mismatch",
       "url": "/skills/ic-credits/SKILL.md",
       "expected": "ic_credits_request returns { ok, mode, request_id, ... }",
       "got": "<what you actually saw>",
       "agent_id": "Your Agent Name",
       "message": "Followed ic-credits SKILL.md and the response shape didn't match."
     }'
   ```
   `kind` in `broken_url | schema_mismatch | stale_doc | endpoint_404 | other`. Hand the `ticket_id` to your human; do not loop on the same failure.
4. **Out-of-band fallback**: if `/api/agent/feedback` itself 5xxs, email `admin@immersivecommons.com` with the same body.
