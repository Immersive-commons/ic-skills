---
name: ic-events
description: Discover upcoming Immersive Commons events, RSVP the human to one, and (after the event) submit a recap. Use when the human says "what's coming up at IC", "RSVP me to <event>", "what's the Vibe Coding Night this week", "sign me up for <luma URL>", or "I want to be at the next IC event". Requires an IC agent token with scopes `events:read_upcoming` + `events:rsvp` (ft-member or higher).
---

You help an agent's human find IC events, RSVP them, and after the event, ship a recap. The flow is read-then-write: the upcoming list is anonymous-safe; the RSVP is scoped + rate-limited + queued.

## Pre-flight (always)

1. **Token check.** Need `FLOOR10_AGENT_TOKEN` with `events:read_upcoming` AND `events:rsvp` scopes. Smoke probe:
   ```bash
   curl -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
     https://www.immersivecommons.com/api/events/upcoming
   ```
   200 = good. 401 = no token. 403 from `/rsvp` later means scope or tier issue.

2. **Email check.** RSVP requires explicit `email` on the agent path (the server doesn't infer for agent callers — trust boundary). Ask the human which email Luma should use. Default to whatever they used at IC signup.

## The pipeline (always this order)

### 1. List upcoming events

```bash
curl -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  "https://www.immersivecommons.com/api/events/upcoming?limit=10"
```

Response shape:
```json
{
  "ok": true,
  "count": 8,
  "total": 8,
  "generated_at": "2026-05-12T15:00:00.000Z",
  "age_min": 14,
  "stale": false,
  "events": [
    {
      "title": "Vibe Coding Night #32 — MCP harness showdown",
      "when": "2026-05-15T19:00:00-07:00",
      "venue": "Frontier Tower, FT9",
      "host": "Ray, Michalis",
      "luma": "https://luma.com/abc1234"
    }
  ]
}
```

**Check `stale`.** If `stale: true`, the cron hasn't refreshed in 90+ min — tell the human "the events feed is stale, here's what I have but it may be missing recent additions." Don't refuse to proceed; the data is still useful, just dated.

**Filter to what the human cares about.** Title-match on what they said; if multiple match, list and ask which. If none match, surface the full list and let them pick.

MCP form:
```jsonc
{
  "name": "ic_events_list_upcoming",
  "arguments": { "limit": 10 }
}
```

### 2. Confirm the event (optional, recommended)

If you want to show the human details before RSVPing — venue, time, description — use `/api/events/get`:

```bash
curl -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  "https://www.immersivecommons.com/api/events/get?luma=https://luma.com/abc1234"
```

A 404 means the event isn't on the upcoming cache anymore (already past, or the cron dropped it). Refuse to RSVP — past events shouldn't get new guest adds.

### 3. RSVP

```bash
curl -X POST https://www.immersivecommons.com/api/events/rsvp \
  -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_url": "https://luma.com/abc1234",
    "email": "user@example.com",
    "name": "User Name"
  }'
```

Possible responses:

- **`200 { ok: true, queued: true, was_dup: false, rate, note }`** — accepted. Tell the human "queued; you'll get a Luma email after the next processor cycle (usually < 10min)." Don't promise instant delivery.
- **`200 { ok: true, queued: true, was_dup: true, ... }`** — already queued in the last 7 days. Tell the human "you're already on the queue for this one; no new RSVP sent."
- **`400`** — event_url malformed, email missing/invalid, validation.
- **`401 / 403`** — auth/scope/tier.
- **`429`** — rate limit (10/token/UTC day). Tell the human you've hit the limit; resume tomorrow.

MCP form:
```jsonc
{
  "name": "ic_events_rsvp",
  "arguments": {
    "event_url": "https://luma.com/abc1234",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

### 4. After the event — submit a recap

This is the `floor10-submit` skill's territory (not this one). The hand-off:

> "Ray, the event happened. Want me to put together a recap for the kiosk?"

If yes, switch to `@floor10-submit` (or follow the same flow inline). The token's `events:submit_recap` scope is the gate; for ic-member+ users it's typically present.

## What you DON'T do

- **Don't RSVP without explicit human confirmation.** "Sign me up for the next VCN" is the request; "should I sign you up?" is the confirmation. Most agents skip the confirm — don't.
- **Don't RSVP someone other than the human running the agent.** The `email` you submit goes on a real guest list and the human gets a real Luma email. RSVPing a third party is impersonation.
- **Don't queue the same RSVP multiple times to bypass dedupe.** The 7-day dedupe is intentional — repeated queuing doesn't make it faster.
- **Don't RSVP past events.** If `/api/events/get` returns 404, the event isn't on the current cache; don't try to queue against a freeform URL.
- **Don't auto-RSVP-then-forget.** After queuing, tell the human you've queued. Don't claim it's confirmed (you don't know yet).

## Edge cases

**"Where's the confirmation that Luma actually added me?"** There isn't one in this flow. The /rsvp endpoint queues for life-side processing; Ray's Luma cohost session does the actual add via kernel.luma. The human gets the Luma email when Luma sends it — that's the source of truth.

**"My RSVP got `was_dup: true` but I never RSVP'd."** Either someone else RSVP'd you (operator) OR the dedupe key persisted from a previous queue that already drained but the key's TTL is still alive. Tell the human; suggest they check their Luma inbox.

**"The rate limit fires unexpectedly."** 10/UTC day is per token. If multiple agents share a token, they share the limit. Rotate to per-agent tokens at /floor10/agent-console.

**"The events feed is empty / `total: 0`."** Either the cron hasn't run yet, the KV cache was cleared, OR there genuinely are no upcoming events. Check `generated_at` and `age_min` to disambiguate.

**"My agent doesn't have `events:rsvp`."** The scope is granted at ft-member+ tier. Public-tier users can read upcoming events but not RSVP. Ask the human to upgrade tier at /membership.

## Useful reference

- **Endpoint base**: `https://www.immersivecommons.com`
- **Kiosk surface**: `/floor10/events`
- **Rate limit**: 10 RSVPs/token/UTC day
- **Dedupe window**: 7 days per (event_url, user)
- **Required scopes**: `events:read_upcoming` (ft-member+), `events:rsvp` (ft-member+)
- **Sister skills**: `floor10-submit` (recap), `ic-leaderboard` (commits opt-in), `ic-onboarding` (signup)
