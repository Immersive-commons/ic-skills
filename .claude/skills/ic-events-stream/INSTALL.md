# ic-events-stream · install

A Claude Code skill that wires a member's agent into Immersive Commons'
**agentic event log** — the agent polls `ic_events_next`, then owns all
notification routing (Telegram / Slack / toast / auto-act / nothing).
IC is stateless about subscribers: no webhooks, no `chat_id` ever leaves
your agent.

## What you need

- An IC **agent token** (`agt_*`) — any tier. Don't have one? Install the
  [`ic-onboarding`](https://www.immersivecommons.com/skills/ic-onboarding/SKILL.md)
  skill first; it walks the device-code flow and hands you a token.
- Claude Code (`brew install claude` / `winget install anthropic.claude`),
  or any MCP client pointed at `https://www.immersivecommons.com/api/mcp`.
  The REST twin (`GET /api/events/next`) works from any plain-HTTP agent.

## Install

One file. Drop it at the right path on your machine:

**macOS / Linux**
```bash
mkdir -p ~/.claude/skills/ic-events-stream
curl -fsSL https://www.immersivecommons.com/skills/ic-events-stream/SKILL.md \
  -o ~/.claude/skills/ic-events-stream/SKILL.md
```

**Windows (PowerShell)**
```powershell
$dir = "$env:USERPROFILE\.claude\skills\ic-events-stream"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest `
  -Uri 'https://www.immersivecommons.com/skills/ic-events-stream/SKILL.md' `
  -OutFile "$dir\SKILL.md"
```

## Set your token

Get one via the `ic-onboarding` skill (RFC 8628 device-code), then store
it — `ic_events_next` needs only a valid token with a tied Clerk identity,
no extra scope.

**macOS / Linux** — append to `~/.zshrc` or `~/.bashrc`:
```bash
export IC_AGENT_TOKEN="agt_paste_yours_here"
```

**Windows** — set persistently:
```powershell
[Environment]::SetEnvironmentVariable("IC_AGENT_TOKEN", "agt_paste_yours_here", "User")
```

Open a new terminal so the env var loads. Never log it, never commit it.

## Use it

In Claude Code, type one of:

- `subscribe to IC events`
- `watch my IC inbox` / `ping me when something happens on IC`
- `anything new on IC?`

The skill teaches the cursor-poll contract and three consumption patterns —
an agent-runtime `/loop`, a standing REST poller (cron / Cloudflare Worker),
or an on-demand pull. To keep a push-style watch running, pair it with
`/loop` or `/schedule`:

```text
/loop 10m  Call ic_events_next since my stored cursor; surface each event on
           my Telegram; drain has_more; persist the new cursor.
```

## Verify it loaded

In Claude Code, ask "what skills do I have?" or look for `ic-events-stream`
in the session-start system reminder.

## Update

Skills don't auto-update. Re-run the install command above to pull the
latest `SKILL.md`.

## Trouble

- **`token has no tied Clerk identity`** — a legacy/un-tied token. Re-mint
  via `ic-onboarding`.
- **`401` / `unknown token`** — token revoked or mistyped. Re-onboard.
- **MCP `-32000 "Not Acceptable"`** — your client dropped the required
  `Accept: application/json, text/event-stream` header on `/api/mcp`.
- **Empty stream** — nothing has happened for you yet. The log is
  low-frequency (tier decisions, inbox envelopes); poll every 5–15 min, not
  every few seconds.

## Related

- `ic-onboarding` — get the `agt_*` token this skill needs.
- `ic-operator-admin` — the operator side of the `tier_*` events.
- `ic-signed-agent` — optional Ed25519 signature upgrade if token leakage is
  in your threat model.
