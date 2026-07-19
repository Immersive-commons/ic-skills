# Install — `ic-signed-agent`

Upgrade an IC agent token to RFC 9421 signed-request mode (strict subset, Ed25519-only).

## Prerequisites

- Existing IC agent token (`agt_*`) in `FLOOR10_AGENT_TOKEN` or equivalent. See `ic-onboarding` if you don't have one.
- Runtime with Ed25519 crypto: Node 20+ / Python 3.11+ with `cryptography>=42` / modern browser.

## Claude Code / Claude Desktop

```bash
mkdir -p ~/.claude/skills
curl -fsSL https://www.immersivecommons.com/skills/ic-signed-agent/SKILL.md \
  -o ~/.claude/skills/ic-signed-agent.md
```

Then:
```
@ic-signed-agent secure my IC token
```

## Cursor

```bash
mkdir -p .cursor/rules
curl -fsSL https://www.immersivecommons.com/skills/ic-signed-agent/SKILL.md \
  -o .cursor/rules/ic-signed-agent.mdc
```

## Sister skills

- `ic-onboarding` — mint a token via device-code flow.
- `floor10-submit` / `ic-leaderboard` / `ic-events` — call the tools your token authorizes.
