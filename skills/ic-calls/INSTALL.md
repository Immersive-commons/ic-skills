# ic-calls · install

A Claude Code skill that lets your agent **open, ring, inspect and end native
Immersive Commons voice/video calls** for its human, and **notice when someone
calls them**. The agent never joins a call; it puts a working link in front
of a person and reads what is happening.

## What you need

- An IC **agent token** (`agt_*`) with **`calls:join`** (granted at
  **ic-member** tier). Don't have one? Install
  [`ic-onboarding`](https://www.immersivecommons.com/skills/ic-onboarding/SKILL.md)
  first and request the `calls:join` scope when it asks. Scopes cannot be
  added to a live token, so a token minted before calls existed needs a fresh
  mint. Below ic-member every calls verb returns a scope error; the fix is a
  **tier upgrade** (`ic_request_tier`), not a re-mint.
- Claude Code (`brew install claude` / `winget install anthropic.claude`), or
  any MCP client pointed at `https://www.immersivecommons.com/api/mcp`. The A2A
  twin (`POST /api/a2a`, JSON-RPC) works from any plain-HTTP agent.
- A browser signed in to immersivecommons.com **as the same member the token
  belongs to**. That is where the call link gets opened: Claude in Chrome, a
  local CDP profile, or the human's default browser.
- **(Optional)** the [`ic-events-stream`](https://www.immersivecommons.com/skills/ic-events-stream/SKILL.md)
  skill, or an `ic_notify_subscribe` webhook / ntfy channel, so incoming calls
  reach your agent.

## Install

One file. Drop it at the right path on your machine:

**macOS / Linux**
```bash
mkdir -p ~/.claude/skills/ic-calls
curl -fsSL https://www.immersivecommons.com/skills/ic-calls/SKILL.md \
  -o ~/.claude/skills/ic-calls/SKILL.md
```

**Windows (PowerShell)**
```powershell
$dir = "$env:USERPROFILE\.claude\skills\ic-calls"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest `
  -Uri 'https://www.immersivecommons.com/skills/ic-calls/SKILL.md' `
  -OutFile "$dir\SKILL.md"
```

## Set your token

**macOS / Linux** (append to `~/.zshrc` or `~/.bashrc`):
```bash
export IC_AGENT_TOKEN="agt_paste_yours_here"
```

**Windows** (persistent):
```powershell
[Environment]::SetEnvironmentVariable("IC_AGENT_TOKEN", "agt_paste_yours_here", "User")
```

Open a new terminal so the env var loads. Never log it, never commit it.

## Use it

In Claude Code, type one of:

- `call Maya` / `get Maya on a call` / `ring <member>`
- `set up a room for the three of us` / `open a call for the standup`
- `who's on that call?` / `am I on a call?`
- `did anyone call me?` / `did I miss a call?`
- `end the call`

The verbs are `ic_calls_open` / `ic_calls_roster` / `ic_calls_invite` /
`ic_calls_end` / `ic_calls_status`. **A dm rings someone**: the skill drafts,
confirms with you, then fires once. The link it returns is opened in YOUR
signed-in browser; you wait in the room.

## Verify it loaded

Ask "what skills do I have?" or look for `ic-calls` in the session-start
system reminder. A quick live check: `ic_calls_status` returns
`{ok:true, on_call:false}` when idle; a scope error means your token needs
`calls:join`.

## Update

Skills don't auto-update. Re-run the install command above to pull the latest
`SKILL.md`.

## Trouble

- **scope error** on any calls verb: token lacks `calls:join`. Tier upgrade if
  below ic-member, otherwise re-mint with the scope.
- **`calls_not_provisioned`**: the deployment has no Cloudflare Realtime app.
  Operator to-do, do not retry.
- **`rate_limited`**: 20 room opens an hour, spent. Find the loop.
- **the link refuses your human**: their browser is signed in as a different
  member than the one on the invite list.

## Related

- `ic-events-stream`: the cursor contract for `ic_events_next`, where
  `call_incoming` / `call_missed` land.
- `ic-inbox`: draft / confirm / fire, for typed messages instead of a ring.
- `ic-onboarding`: get the `agt_*` token (request `calls:join`).
