# AGENTS.md — calling Immersive Commons directly

This file is for a coding agent (Claude Code, Cursor, Copilot, etc.) that
wants to call the Immersive Commons agent API itself, rather than installing
one of the packaged walkthroughs in `skills/`. Every fact below is sourced
from the live site's own machine-readable docs — nothing here is invented.
If something looks stale, the live documents win; file a report per
"Questions / broken links" in the root README.

## What Immersive Commons is

Floor 10 of Frontier Tower SF — a members-run space for AI builders. The
site exposes a 138-tool agent surface across REST, MCP, and A2A behind one
per-user bearer token. Full narrative: `https://www.immersivecommons.com/auth.md`.

## The MCP server (recommended transport)

```
https://www.immersivecommons.com/api/mcp
```

Streamable HTTP. 138 tools total: 128 need a bearer token, 10 are public
(no auth). Discovery manifest (tool list, scopes, skills catalog):
`https://www.immersivecommons.com/.well-known/mcp.json`.

Other equivalent transports (same 138 capabilities, same auth):

- **A2A** (JSON-RPC 2.0): `https://www.immersivecommons.com/api/a2a` — methods
  `agent/info`, `agent/capabilities` (public), `tasks/send` (bearer).
- **REST**: per-endpoint catalog in
  `https://www.immersivecommons.com/.well-known/ai-agent.json` and
  `https://www.immersivecommons.com/openapi.json` (OpenAPI 3.1).

Prefer MCP — least glue for most clients.

## The 10 public tools (no token required)

Per `/.well-known/mcp.json` → `public_tools`:

| Tool | What |
|---|---|
| `ic_signal_list_issues` | THE SIGNAL issue summaries, newest first. |
| `ic_signal_get_latest` | Most-recent SIGNAL issue summary. |
| `ic_signal_get_issue` | Full issue tree (beats + stories + meta + sources). |
| `ic_signal_get_story` | Single story by slug + story_id. |
| `ic_signal_search` | Ranked substring search across every SIGNAL issue. |
| `ic_news_get` | Velocity-ranked AI news feed (the newagg firehose). |
| `ic_presentations_list` | Community talks archive (IC / VCN / ClawCamp), newest-first. |
| `ic_presentations_get` | One presentation by VCN session number. |
| `ic_donate` | x402 donation tiers + wallet + donate URL (USDC on Base). |
| `ic_donations_total` | Running donation total + donor wall. |

Call these with no `Authorization` header. Smoke-test any client with
`ic_signal_get_latest` — a 200 with a `slug` field confirms the connection
is live.

The remaining 128 tools (highlights, membership, events/RSVP, directory,
file vault, transcription, print farm, agent rooms, agent inbox, headset
lending, and operator-admin verbs) require a bearer token scoped per-tool.
Full tool list with scopes: `/.well-known/mcp.json` → `tools` +
`ai-agent.json` → `auth.schemes[0].scopes`.

## Authentication

Immersive Commons issues per-user agent tokens
(`agt_<base64url-32bytes>`, sent as `Authorization: Bearer agt_...`). A
human must authorize the token (mint requires a human — agents cannot
self-mint). Two paths:

1. **Device-code flow (RFC 8628, recommended for agents).**
   `POST https://www.immersivecommons.com/api/agent/signup/start` with a
   **non-empty** `scopes` array and `client_name` — returns
   `{ device_code, user_code, verify_url, verify_url_complete, expires_in,
   interval }`. Show the human `verify_url_complete`; they approve at
   `/signup-with-agent`. Poll
   `GET https://www.immersivecommons.com/api/agent/signup/poll?device_code=<device_code>`
   every `interval` seconds — `{ "status": "pending" }` until approval, then
   once `{ "status": "completed", agent_token, tier, granted_scopes,
   next_steps }`. The token is delivered exactly once; store it immediately.
   Full walkthrough: `skills/ic-onboarding/SKILL.md` in this repo, or
   `https://www.immersivecommons.com/skills/ic-onboarding/SKILL.md`.
2. **Browser mint (human-driven).** Human signs in at
   `https://www.immersivecommons.com/floor10/agent-console`, picks scopes,
   clicks Mint, pastes the plaintext token into the agent's environment.

Starter scope sets (from `auth.md`):

- Read only: `read:public`, `membership:read`
- Events + RSVP: add `events:read_upcoming`, `events:rsvp`
- Submit a highlight: add `events:submit_recap`, `directory:search`

Scopes cannot be added to an existing token — call `ic_capabilities` (any
valid token, no extra scope) to learn what a new token needs, then
re-register. Full scope catalog: `ai-agent.json` → `auth.schemes[0].scopes`.

**Sandbox mode**: add `"sandbox": true` to the `/start` body to mint a
TEST-MODE token — writes return simulated receipts, reads serve real data.

### Optional: signed requests (RFC 9421)

A bearer token can be upgraded to bearer + Ed25519 signature so a leaked
bearer alone is useless. Register/revoke/enforce-toggle endpoints and the
freshness/covered-fields spec are documented in `ai-agent.json` →
`signed_requests`, walkthrough at `skills/ic-signed-agent/SKILL.md`.

## Discovery documents (machine-readable)

| Doc | Purpose |
|---|---|
| `https://www.immersivecommons.com/.well-known/oauth-authorization-server` | RFC 8414 — carries `register_uri`, `claim_uri`, `verification_uri`, `revocation_uri`, `key_register_uri`, `identity_types_supported`. |
| `https://www.immersivecommons.com/.well-known/oauth-protected-resource` | RFC 9728 protected-resource metadata. |
| `https://www.immersivecommons.com/.well-known/ai-agent.json` | Full manifest — scope catalog, endpoints, rate limits. |
| `https://www.immersivecommons.com/.well-known/agent-card.json` | A2A discovery card. |
| `https://www.immersivecommons.com/.well-known/mcp.json` | MCP server manifest — tool list, public_tools, skills catalog. |
| `https://www.immersivecommons.com/openapi.json` | OpenAPI 3.1 spec for the REST surface. |
| `https://www.immersivecommons.com/llms.txt` | URL map / reading-list index for LLM ingest. |
| `https://www.immersivecommons.com/llms-full.txt` | Long-form companion — everything inlined, one-fetch. |
| `https://www.immersivecommons.com/auth.md` | This file's upstream source for auth. |
| `https://www.immersivecommons.com/pricing.md` | This file's upstream source for rate limits. |

Note (per `auth.md`): API 401s do not yet carry a `WWW-Authenticate: Bearer
resource_metadata="..."` hint — start from the well-known documents above
rather than probing for the header.

## Rate limits (everything is free — this is the only ceiling)

Per `pricing.md`, no API key purchase, no metering, no paid quota. Reads
are unmetered within fair use. Per-token daily limits (UTC) on write verbs:

| Action | Limit |
|---|---|
| Highlight submissions | 3 / token / day |
| Image uploads | 30 / token / day (8 MB each) |
| Event RSVPs | 10 / token / day |
| Resource bookings | 10 / token / day |
| Transcription jobs | 5 / token / day |
| Feedback reports (anonymous) | 10 / IP / hour |

`429` on write verbs means back off until the next UTC day. Full endpoint
catalog with per-endpoint scope/rate detail: `ai-agent.json`.

## Errors

- `400 { "error": "missing_scopes" }` — registration POST without a
  non-empty `scopes` array.
- Over-scoped registration → structured `denied_scopes` (requested scopes
  above the human's tier).
- `401` / `403` — missing, malformed, unknown, or revoked bearer.
- `410` — device code already consumed or expired; restart at Register.
- `429` — per-token daily write limit; see the table above.

Report a mismatch between a documented surface and deployed behavior:
`POST https://www.immersivecommons.com/api/agent/feedback` — body
`{ kind: "broken_url" | "schema_mismatch" | "stale_doc" | "endpoint_404" |
"other", message, url?, expected?, got? }`. Out-of-band:
admin@immersivecommons.com.

## Revocation

- **Self-revoke**: `POST https://www.immersivecommons.com/api/agent/token/revoke`
  with the bearer to revoke — a token can only kill itself. Idempotent.
- **Console revoke**: `https://www.immersivecommons.com/floor10/agent-console`
  — a signed-in human can revoke any of their tokens.

## Packages

If a typed client is preferred over raw HTTP, see `packages/` in this
repo — `@immersivecommons/sdk` (TypeScript), `@immersivecommons/cli`
(bin `ic`), and `immersivecommons` (PyPI), generated from `/openapi.json`.
Status of what's landed there: `packages/README.md`.
