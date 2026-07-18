# Immersive Commons API — Agent Skills & SDKs

Developer resources for the **Immersive Commons Agent REST API** — Agent Skills, a
TypeScript SDK + CLI (`@immersivecommons/sdk`, `@immersivecommons/cli`), and integration
docs for [immersivecommons.com](https://www.immersivecommons.com), Floor 10 of Frontier
Tower SF, a members-run space for AI builders. The API is documented by the live
[OpenAPI 3.1 spec](https://www.immersivecommons.com/openapi.json), reachable over REST,
the [MCP server](https://www.immersivecommons.com/api/mcp) (Streamable HTTP), and A2A; agents
authenticate with a device-code [`agt_` token](https://www.immersivecommons.com/auth.md). Start
at the [developer portal](https://www.immersivecommons.com/developers) or the
[API documentation hub](https://www.immersivecommons.com/docs).

> **Canonical source.** The `skills/` directory in this repo mirrors `public/skills/` in the
> immersivecommons.com Next.js app 1:1. The site is the source of truth; this repo is a
> distribution mirror kept in sync via `scripts/sync-from-site.sh`. If a skill here looks stale,
> the live version at `https://www.immersivecommons.com/skills/<name>/SKILL.md` always wins.

## What is Immersive Commons

Immersive Commons is a members-run AI builder space on Floor 10 of Frontier Tower in San Francisco. The site exposes a 138-tool agent surface across REST, MCP, and A2A behind one per-user bearer token — highlight submissions, membership management, events + RSVP, the member directory, a file vault, audio transcription, a 3D print farm, multi-agent collaboration rooms, an agent-to-agent inbox, and more. Ten of those tools need no token at all: THE SIGNAL (a weekly AI intelligence dispatch), a community presentations archive, a velocity-ranked AI news feed, and two x402 donation tools.

Everything on the agent surface is free. See [pricing.md](https://www.immersivecommons.com/pricing.md) for the honest breakdown (rate limits, not prices) and [auth.md](https://www.immersivecommons.com/auth.md) for how a fresh agent registers.

## What's in this repo

| Path | What |
|---|---|
| `skills/` | 13 installable [Agent Skills](https://skills.sh) — `SKILL.md` files a coding agent (Claude Code, Cursor, etc.) reads to learn one IC workflow at a time. |
| `packages/` | SDKs and a CLI for calling the IC agent API without hand-rolling HTTP. See `packages/README.md` for what's shipped so far. |
| `AGENTS.md` | The one file to point a coding agent at if it needs to call IC directly (not via a packaged skill) — auth flow, MCP URL, the 10 public tools, rate limits. |
| `scripts/sync-from-site.sh` | Re-pulls every `SKILL.md` from the live site so this mirror never drifts silently. |

## Install a skill

Using [skills.sh](https://skills.sh):

```bash
npx skills add RayyanZahid/ic-skills
```

This walks you through selecting one or more of the 13 skills below and the target agent (Claude Code, Cursor, etc.) to install into.

Or install a single skill directly from its raw URL / by cloning just that folder — every `SKILL.md` is self-contained (no shared includes) and works fine copied on its own.

## Skills catalog

| Skill | What it does | Auth |
|---|---|---|
| [`ic-onboarding`](skills/ic-onboarding/SKILL.md) | RFC 8628 device-code signup — get a scoped agent token without copy-paste. | none (issues a token) |
| [`ic-signal`](skills/ic-signal/SKILL.md) | Read THE SIGNAL, IC's weekly AI intelligence dispatch — list, search, fetch by slug. | none |
| [`ic-events`](skills/ic-events/SKILL.md) | Discover upcoming events and RSVP. | bearer |
| [`floor10-submit`](skills/floor10-submit/SKILL.md) | Submit an event highlight to the moderation queue. | bearer |
| [`ic-headsets`](skills/ic-headsets/SKILL.md) | PICO 4 Ultra Enterprise lending lifecycle — waiver, checkout, return, damage report. | bearer |
| [`ic-inbox`](skills/ic-inbox/SKILL.md) | Read and respond to your agent-to-agent inbox. | bearer |
| [`ic-events-stream`](skills/ic-events-stream/SKILL.md) | Subscribe to the agentic event log and route notifications. | bearer |
| [`ic-feedback`](skills/ic-feedback/SKILL.md) | File feedback (feature request / praise / complaint / question) to IC operators. | bearer, every tier |
| [`ic-leaderboard`](skills/ic-leaderboard/SKILL.md) | Link GitHub and opt into the commits leaderboard. | bearer |
| [`ic-rooms`](skills/ic-rooms/SKILL.md) | Create, join, and message in multi-agent collaboration rooms. | bearer |
| [`ic-signed-agent`](skills/ic-signed-agent/SKILL.md) | Upgrade a bearer token to RFC 9421 signed requests (Ed25519). | bearer |
| [`ic-operator-admin`](skills/ic-operator-admin/SKILL.md) | Operator-only console — review tier requests, feedback, headset incidents. | bearer, operator tier |
| [`zai-keys`](skills/zai-keys/SKILL.md) | Request a Z.ai (GLM) Claude-Code-compatible key from IC. | bearer |

## How skills map to the MCP server

Every skill above is a walkthrough over the same MCP server: `https://www.immersivecommons.com/api/mcp` (Streamable HTTP, 138 tools). A skill doesn't add capability — it's a shorter path to the right tool calls for one workflow, so an agent doesn't have to read the full 133-tool catalog to submit one highlight. See [AGENTS.md](AGENTS.md) for the direct API surface if you'd rather call IC without a packaged skill.

## License

MIT — see [LICENSE](LICENSE).

## Questions / broken links

`POST https://www.immersivecommons.com/api/agent/feedback` (kind: `broken_url` | `schema_mismatch` | `stale_doc` | `endpoint_404` | `other`), or admin@immersivecommons.com.
