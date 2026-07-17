# immersivecommons (Ruby) — Immersive Commons client

Thin, spec-derived Ruby client for the [Immersive Commons](https://www.immersivecommons.com) Agent REST API. Immersive Commons is Floor 10 of Frontier Tower, a members-run AI builder space in San Francisco — this gem gives Ruby agents and services typed access to events & RSVPs, the members directory, resource booking, research Q&A, the donor wall, and RFC 8628 device-code token minting.

- **Homepage:** <https://www.immersivecommons.com>
- **Developer docs:** <https://www.immersivecommons.com/developers>
- **OpenAPI spec:** <https://www.immersivecommons.com/openapi.json> (vendored here as `lib/immersivecommons/openapi.json`)
- **Siblings:** [`@immersivecommons/sdk`](https://www.npmjs.com/package/@immersivecommons/sdk) (npm), [`immersivecommons`](https://pypi.org/project/immersivecommons/) (PyPI), [`ic-go`](https://pkg.go.dev/github.com/immersive-commons/ic-go) (Go)

## Install

```sh
gem install immersivecommons
```

Zero runtime dependencies — stdlib `net/http` only. Ruby >= 3.0.

## Use

```ruby
require "immersivecommons"

# Public reads need no token.
ic = ImmersiveCommons::Client.new
events = ic.list_upcoming_events(limit: 5)
puts events["count"]

# Authenticated calls take an agent bearer token (agt_...).
authed = ImmersiveCommons::Client.new(token: "agt_your_token")
puts authed.setup_check

# Writes that the spec marks idempotent accept an Idempotency-Key.
receipt = authed.rsvp_to_event("https://luma.com/your-event",
                               email: "you@example.com",
                               name: "Your Name",
                               idempotency_key: "rsvp-key-1")
```

### Minting a token (device-code grant)

```ruby
res = ic.authorize(["events:rsvp"], client_name: "my-agent",
                   on_prompt: ->(start) {
                     puts "Visit #{start['verify_url']} and enter code #{start['user_code']}"
                   })
ic.token = res["token"]
```

A human approves the grant in the browser; the loop polls until `completed`. Pass `sandbox: true` to `Client.new` (or `authorize`) to mint a sandbox token whose writes return simulated receipts.

## How it derives from the spec

`lib/immersivecommons/generated.rb` is emitted from the vendored `openapi.json` by `scripts/generate.py`: an operations table (operationId → method, path, query params, scopes, auth, idempotency, sandbox behavior). The transport is table-driven — one generic `call(operation_id, ...)` builds the URL, attaches the bearer token, and adds an `Idempotency-Key` only on operations the spec marks idempotent. The named methods are facades over that one call, so they cannot drift from the spec. Errors raise `ImmersiveCommons::ApiError` with `status`, `error_kind`, and `retry_after_seconds`.

23 operations are in the table; the 4 Clerk-cookie-only operations (`tailAgentEvents`, `getMyTier`, `requestTier`, `cancelTierRequest`) have no facade methods — agents use the equivalent MCP tools instead. `batchPublicReads` is reachable via the generic `call`.

## Test

```sh
ruby -Ilib test/test_client.rb
```

Mock transport, no network, no live writes.

## Source of truth

This gem is generated from and mirrored out of the [immersivecommons.com](https://www.immersivecommons.com) site repo; skills and sibling SDKs live in [immersive-commons/ic-skills](https://github.com/immersive-commons/ic-skills). MIT license.
