# Immersive Commons — client packages

Five thin, spec-derived client packages for the [Immersive Commons](https://www.immersivecommons.com) Agent REST API. All are built from one source of truth — the OpenAPI spec at [`public/openapi.json`](../public/openapi.json) — via a small generator per language, so no client can describe a route the spec does not.

| Package | Registry | Name | Entry |
|---|---|---|---|
| [`sdk/`](sdk/) | npm | `@immersivecommons/sdk` | `import { IcClient } from "@immersivecommons/sdk"` |
| [`cli/`](cli/) | npm | `@immersivecommons/cli` | `ic` binary (wraps the SDK) |
| [`python/`](python/) | PyPI | `immersivecommons` | `from immersivecommons import Client` |
| [`go/`](go/) | Go modules ([pkg.go.dev](https://pkg.go.dev/github.com/immersive-commons/ic-go)) | `github.com/immersive-commons/ic-go` | `ic "github.com/immersive-commons/ic-go"` |
| [`ruby/`](ruby/) | RubyGems | `immersivecommons` | `require "immersivecommons"` |

## How they derive from the spec

Each package vendors a copy of `openapi.json` and runs a generator that emits an **operations table** (operationId → method, path, query params, scopes, `requiresAuth`, `browserSession`, `idempotent`, `sandbox`). The client transport is table-driven: one generic `call(operationId, …)` builds the URL, attaches the bearer token, and adds an `Idempotency-Key` only on operations the spec marks idempotent. The named methods (`listUpcomingEvents`, `rsvpToEvent`, …) are typed façades over that one call — they add no routing, so they can't drift.

- TS SDK: `packages/sdk/scripts/generate.mjs` → `src/generated.ts` (operations table **and** TypeScript types for all 33 component schemas + per-op request/response aliases).
- Python: `packages/python/scripts/generate.py` → `immersivecommons/_generated.py` (operations table; responses are returned as `dict`).
- Go: `packages/go/scripts/generate.py` → `generated.go` (operations table; responses are `map[string]any`). Generator is Python so a spec bump needs no Go toolchain; the published module ships only `.go` files.
- Ruby: `packages/ruby/scripts/generate.py` → `lib/immersivecommons/generated.rb` (operations table; responses are `Hash`). Same Python-generator rationale.

Regenerate after any spec change: `npm run generate` (sdk) / `python scripts/generate.py` (python, go, ruby — run from each package dir).

## Coverage

18 of the 22 operations are bearer-reachable and get typed methods. The 4 Clerk-cookie-only operations (`/events/next`, `/tier/me`, `POST`/`DELETE /tier/request`) live in the operations table but have no methods — agents use the equivalent MCP tools (`ic_events_next`, `ic_get_my_membership`, `ic_request_tier`).

## Sandbox

The SDK/Client `sandbox` option documents the signup flag: a sandbox token's WRITE verbs return a simulated receipt (`{ ok, sandbox, simulated, would_have, note }`) instead of mutating. It's a thin client — the option changes nothing about how requests are sent; the server decides. Feedback, token revoke, and research reads are always real.

## Test locally (no network, no live writes)

```sh
# SDK — builds with tsc then runs node:test mock-fetch suite
cd packages/sdk  && npm run generate && npm run build && node --test test/*.test.mjs

# CLI — offline, SDK + fetch injected
cd packages/cli  && node --test test/*.test.mjs

# Python — mock transport
cd packages/python && python scripts/generate.py && python -m unittest discover -s tests

# Go — mock RoundTripper (needs a Go toolchain; also runs in ic-go repo CI)
cd packages/go && go test ./...

# Ruby — mock transport lambda (needs Ruby >= 3.0; also runs in ic-skills repo CI)
cd packages/ruby && ruby -Ilib test/test_client.rb
```

## Publishing

Publishing is **Ray-gated** — see [`PUBLISH.md`](PUBLISH.md) for the exact npm + PyPI commands, org prerequisites, and provenance options. No package here is published by the build.
