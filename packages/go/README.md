# ic-go — Immersive Commons Go client

Thin, spec-derived Go client for the [Immersive Commons](https://www.immersivecommons.com) Agent REST API. Immersive Commons is Floor 10 of Frontier Tower, a members-run AI builder space in San Francisco — this module gives Go agents and services typed access to events & RSVPs, the members directory, resource booking, research Q&A, the donor wall, and RFC 8628 device-code token minting.

- **Homepage:** <https://www.immersivecommons.com>
- **Developer docs:** <https://www.immersivecommons.com/developers>
- **OpenAPI spec:** <https://www.immersivecommons.com/openapi.json> (vendored here as `openapi.json`)
- **Siblings:** [`@immersivecommons/sdk`](https://www.npmjs.com/package/@immersivecommons/sdk) (npm), [`immersivecommons`](https://pypi.org/project/immersivecommons/) (PyPI), [`immersivecommons`](https://rubygems.org/gems/immersivecommons) (RubyGems)

## Install

```sh
go get github.com/immersive-commons/ic-go
```

Zero dependencies — stdlib `net/http` only.

## Use

```go
package main

import (
	"context"
	"fmt"

	ic "github.com/immersive-commons/ic-go"
)

func main() {
	ctx := context.Background()

	// Public reads need no token.
	c := ic.New(ic.Config{})
	events, err := c.ListUpcomingEvents(ctx, 5)
	if err != nil {
		panic(err)
	}
	fmt.Println(events["count"])

	// Authenticated calls take an agent bearer token (agt_...).
	authed := ic.New(ic.Config{Token: "agt_your_token"})
	me, _ := authed.SetupCheck(ctx)
	fmt.Println(me)

	// Writes that the spec marks idempotent accept an Idempotency-Key.
	receipt, err := authed.RsvpToEvent(ctx, "https://luma.com/your-event", "you@example.com", "Your Name", "rsvp-key-1")
	fmt.Println(receipt, err)
}
```

### Minting a token (device-code grant)

```go
res, err := c.Authorize(ctx, []string{"events:rsvp"}, ic.AuthorizeOptions{
	ClientName: "my-agent",
	OnPrompt: func(start ic.JSON) {
		fmt.Printf("Visit %s and enter code %s\n", start["verify_url"], start["user_code"])
	},
})
if err == nil {
	c.Token = res.Token
}
```

A human approves the grant in the browser; the loop polls until `completed`. Pass `Sandbox: true` in `Config` (or `AuthorizeOptions.Sandbox`) to mint a sandbox token whose writes return simulated receipts.

## How it derives from the spec

`generated.go` is emitted from the vendored `openapi.json` by `scripts/generate.py`: an operations table (operationId → method, path, query params, scopes, auth, idempotency, sandbox behavior). The transport is table-driven — one generic `Call(ctx, operationID, opts)` builds the URL, attaches the bearer token, and adds an `Idempotency-Key` only on operations the spec marks idempotent. The named methods are typed facades over that one call, so they cannot drift from the spec. Errors surface as `*ic.APIError` with `Status`, `ErrorKind`, and `RetryAfterSeconds`.

23 operations are in the table; the 4 Clerk-cookie-only operations (`tailAgentEvents`, `getMyTier`, `requestTier`, `cancelTierRequest`) have no facade methods — agents use the equivalent MCP tools instead. `batchPublicReads` is reachable via the generic `Call`.

## Test

```sh
go test ./...
```

Mock transport, no network, no live writes.

## Source of truth

This module is generated from and mirrored out of the [immersivecommons.com](https://www.immersivecommons.com) site repo; skills and sibling SDKs live in [immersive-commons/ic-skills](https://github.com/immersive-commons/ic-skills). MIT license.
