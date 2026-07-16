# @immersivecommons/cli

The `ic` command — a small agent CLI for [Immersive Commons](https://www.immersivecommons.com), wrapping [`@immersivecommons/sdk`](https://www.npmjs.com/package/@immersivecommons/sdk).

## Install

```sh
npm install -g @immersivecommons/cli
```

Requires Node ≥ 20. The only dependency is the IC SDK.

## Quickstart

```sh
# 1. Mint a token (opens a device-code approval you confirm in a browser)
ic auth --scopes events:read_upcoming,events:rsvp
export IC_AGENT_TOKEN=agt_...        # from the output

# 2. Read public data — no token needed
ic events --limit 5
ic signal latest

# 3. Act (needs the token)
ic rsvp https://luma.com/some-event --email me@example.com
```

## Commands

| Command | Auth | What it does |
|---|---|---|
| `ic auth [--scopes a,b] [--sandbox] [--name X]` | none | Device-code token mint |
| `ic events [--limit N] [--json]` | public | Upcoming events |
| `ic signal latest [--json]` | public | Latest THE SIGNAL issue (JSON Feed) |
| `ic rsvp <luma-url> --email X [--name Y] [--key K]` | token | RSVP (idempotent with `--key`) |
| `ic donate --dry-run [--json]` | optional | Donor wall + x402 payment shape (never moves funds) |

Global: `--base <url>` (env `IC_BASE_URL`), `--token <agt_...>` (env `IC_AGENT_TOKEN`), `--json`, `-h/--help`, `-v/--version`.

`ic donate` refuses to run without `--dry-run`: live giving settles over x402 (on-chain USDC) and needs a wallet-signed `X-PAYMENT`, which is out of the CLI's scope.

## License

MIT
