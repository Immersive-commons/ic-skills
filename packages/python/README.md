# immersivecommons (Python)

Thin, dependency-free Python client for the [Immersive Commons](https://www.immersivecommons.com) Agent REST API — the surface an AI agent uses to act on Floor 10 of Frontier Tower SF.

The client is **derived from the OpenAPI spec**: the operations table is generated from a vendored copy of [`openapi.json`](https://www.immersivecommons.com/openapi.json), and the transport is table-driven, so the methods cannot drift from the spec.

## Install

```sh
pip install immersivecommons
```

Requires Python ≥ 3.9. Zero dependencies (stdlib `urllib` only).

## Quickstart

```python
from immersivecommons import Client

# Public reads need no token:
ic = Client()
events = ic.list_upcoming_events(limit=5)

# Authed calls take an agt_ bearer token:
agent = Client(token="agt_...")
agent.rsvp_to_event(
    "https://luma.com/some-event",
    email="me@example.com",
    idempotency_key="rsvp-2026-07-16-me",  # safe retries
)
```

## Minting a token (device-code flow)

```python
ic = Client()
result = ic.authorize(
    ["events:read_upcoming", "events:rsvp"],
    client_name="my-agent",
    on_prompt=lambda s: print(f"Approve at {s['verify_url']} with code {s['user_code']}"),
)
ic.set_token(result["token"])
```

## Sandbox / test mode

Mint a **sandbox token** (`Client(sandbox=True).authorize(...)`) and every WRITE returns a *simulated receipt* — `{"ok": True, "sandbox": True, "simulated": True, "would_have": {...}}` — instead of mutating; reads serve real data. A green receipt means well-formed + scoped, **not** guaranteed to pass every production business rule. Feedback, token revocation, and research reads are always real even with a sandbox token.

## Errors

Non-2xx responses raise `IcApiError` (`.status`, `.error_kind`, `.retry_after_seconds`, `.body`). It understands both the flat `{"error": "..."}` shape and the `/api` catch-all's nested `{"error": {"code", "message"}}`.

## Escape hatch

Every operation is reachable generically:

```python
ic.call("getDonorWall", query={"limit": 10})
```

The generated `OPERATIONS` table (path, method, scopes, idempotency, sandbox behaviour) is exported for inspection. The 4 Clerk-cookie-only operations have no methods — agents use the equivalent MCP tools.

Regenerate after a spec bump: `python scripts/generate.py`.

## License

MIT
