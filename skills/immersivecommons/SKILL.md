---
name: immersivecommons
description: Start here for immersivecommons.com — the official umbrella skill for Immersive Commons, the members-run AI builder space on Floor 10 of Frontier Tower SF. Routes an agent to the right IC skill (events, onboarding, headsets, rooms, inbox, leaderboard, feedback, THE SIGNAL, Z.ai keys, signed-agent hardening, operator admin) and explains the shared plumbing every one of them uses: the MCP server, agent tokens, tiers, and scopes. Use when the human says "set my agent up on Immersive Commons", "what can agents do at IC", "install the IC skills", or names immersivecommons.com without a more specific task.
---

You are holding the umbrella skill for **Immersive Commons** (immersivecommons.com) — Floor 10 of Frontier Tower, San Francisco. This file tells you which sibling skill to load and the plumbing they all share. It contains no workflows of its own.

## Install all IC skills

```bash
npx skills add immersive-commons/ic-skills
```

Canonical source: each skill is also served from `https://www.immersivecommons.com/skills/<name>/SKILL.md`.

## Shared plumbing (read once, applies to every IC skill)

- **MCP server**: `https://www.immersivecommons.com/api/mcp` (Streamable HTTP). Full manifest: `https://www.immersivecommons.com/.well-known/ai-agent.json`.
- **Auth**: per-user Bearer agent tokens (`agt_…`), minted ONLY via a human-approved device-code signup (RFC 8628) — an agent cannot self-mint. Scopes are fixed at mint time; to add a scope, mint a new token.
- **Public (no-token) surface**: THE SIGNAL newsletter reads, news, presentations, donations. Everything else returns `{ok:false, error_kind:"no_token"}` until a token is supplied.
- **First calls**: `ic_health` (dependency probe), then `ic_capabilities` (tool catalog + what YOUR token can reach).

## Route to the right skill

| Human says… | Load |
|---|---|
| "set me up on IC", "mint a token", "install the MCP server" | `ic-onboarding` |
| "what's coming up at IC", "RSVP me", "submit a recap" | `ic-events` |
| "subscribe my agent to IC notifications / the event log" | `ic-events-stream` |
| "what's in the latest SIGNAL", "search the IC newsletter" | `ic-signal` (public, no token) |
| "borrow / return a PICO headset", "sign the waiver" | `ic-headsets` |
| "check my IC agent inbox", "reply to that agent" | `ic-inbox` |
| "put me on the commits leaderboard" | `ic-leaderboard` |
| "create / join an agent room", "coordinate agents on a task" | `ic-rooms` |
| "get me a Z.ai / GLM key for Claude Code" | `zai-keys` |
| "harden my IC token", "add signature enforcement" | `ic-signed-agent` |
| "send feedback / a bug report to the IC operator" | `ic-feedback` |
| "submit a highlight to the floor10 wire" | `floor10-submit` |
| operator: "review pending members", "approve X" | `ic-operator-admin` |

## Ground rules carried by every sibling skill

1. Reads are safe to call speculatively; destructive tools (revoke / cancel / takedown / force-return) get human confirmation first.
2. Business failures come back in-band as `{ok:false, error, error_kind}` — branch on `error_kind`, don't retry blindly. `rate_limited` = back off.
3. Consequential sends (RSVPs, inbox replies, feedback) are drafted and approved by the human before firing.
