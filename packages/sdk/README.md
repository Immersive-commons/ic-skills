# @immersivecommons/sdk

Thin, typed TypeScript client for the [Immersive Commons](https://www.immersivecommons.com) Agent REST API — the surface an AI agent uses to act on Floor 10 of Frontier Tower SF (RSVP to events, submit highlights, search the directory, query the research corpus, and more).

The client is **derived from the OpenAPI spec**: the operations table and every request/response type are generated from a vendored copy of [`openapi.json`](https://www.immersivecommons.com/openapi.json). The transport is table-driven, so the methods cannot drift from the spec.

## Install

```sh
npm install @immersivecommons/sdk
```

Requires Node ≥ 20 (uses the global `fetch`). Zero runtime dependencies.

## Quickstart

```ts
import { IcClient } from "@immersivecommons/sdk";

// Public reads need no token:
const ic = new IcClient();
const { events } = await ic.listUpcomingEvents({ limit: 5 });

// Authed calls take an agt_ bearer token:
const agent = new IcClient({ token: process.env.IC_AGENT_TOKEN });
await agent.rsvpToEvent(
  { event_url: "https://luma.com/some-event", email: "me@example.com" },
  { idempotencyKey: "rsvp-2026-07-16-me" } // safe retries
);
```

## Minting a token (device-code flow)

```ts
const ic = new IcClient();
const { token, grantedScopes } = await ic.authorize({
  scopes: ["events:read_upcoming", "events:rsvp"],
  clientName: "my-agent",
  onPrompt: ({ verifyUrl, userCode }) =>
    console.log(`Approve at ${verifyUrl} with code ${userCode}`),
});
ic.setToken(token); // now authed
```

## Sandbox / test mode

Mint a **sandbox token** (`sandbox: true`) and every WRITE returns a *simulated receipt* — `{ ok, sandbox: true, simulated: true, would_have, note }` — instead of mutating; reads serve real data. The client's `sandbox` option is documentation of that flag; it does not change how requests are sent (a sandbox token already behaves sandbox server-side).

```ts
const ic = new IcClient({ sandbox: true });
const { token } = await ic.authorize({ scopes: ["events:rsvp"] }); // sandbox token
const sandboxed = new IcClient({ token, sandbox: true });
const receipt = await sandboxed.rsvpToEvent({ event_url: "...", email: "..." });
// receipt.simulated === true — scoped + well-formed, not guaranteed to pass in prod.
```

A green receipt means the call was well-formed and scoped, **not** that it would pass every production business rule (tier/role/ownership are not evaluated in sandbox). `POST /agent/feedback`, `POST /agent/token/revoke`, and research reads are always real even with a sandbox token.

## Errors

Non-2xx responses throw `IcApiError` (`.status`, `.errorKind`, `.retryAfterSeconds`, `.body`). It understands both the flat `{ error: "..." }` shape and the `/api` catch-all's nested `{ error: { code, message } }`.

## Escape hatch

Every operation is reachable generically without a named method:

```ts
await ic.call("getDonorWall", { query: { limit: 10 } });
```

The generated `OPERATIONS` table (path, method, scopes, idempotency, sandbox behaviour) is exported for inspection.

## Coverage

18 bearer-reachable operations get typed methods. The 4 Clerk-cookie-only operations (`/events/next`, `/tier/me`, `/tier/request`) are in the `OPERATIONS` table but have no methods — agents use the equivalent MCP tools (`ic_events_next`, `ic_get_my_membership`, `ic_request_tier`).

Regenerate types after a spec bump: `npm run generate`.

## License

MIT
