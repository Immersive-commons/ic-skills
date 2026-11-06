# Install: `ic-credits` (IC Key + IC Credits)

Teach your agent to get and use **IC Credits** from Immersive Commons: an **IC Key** (one `agt_` key) carrying a monthly budget of model credits in dollars, spent through the IC gateway on **open-weight models** (DeepSeek, Kimi, Qwen, Llama, gpt-oss, Nemotron; metered in USD), from **Claude Code** or any **OpenAI-compatible tool**. A member request at or under the ring default (operator $50, ic-member $20, ai-floor and ft-member $10 per month) mints instantly; a 5-hour workshop pass (any tier, $5 of credits, event-tied) mints instantly too. Two steps:

1. **Drop the skill** into your agent's skill library.
2. **Have an IC agent token with `keys:request`** so the agent can request, pick up, check and regenerate the key.

The request / pickup / usage / regenerate tools live on the IC MCP server (already installed if you ran `ic-onboarding`'s INSTALL). This skill is the workflow + judgement layer on top.

---

## Step 1: install the skill

### Claude Code

```bash
mkdir -p ~/.claude/skills/ic-credits
curl -sSL https://www.immersivecommons.com/skills/ic-credits/SKILL.md \
  -o ~/.claude/skills/ic-credits/SKILL.md
```

Then ask Claude Code to use it: `"use the ic-credits skill"` or just describe the task (`"get me an IC Key for the workshop"`, `"set me up with DeepSeek through IC"`, `"how many credits do I have left"`) and it picks it up via the skill description.

### Claude Desktop / Cursor / ChatGPT (Skills)

Same shape: drop `SKILL.md` into your client's skills directory. Path varies per client; check your client's Skills docs.

Had an older IC key skill installed? Delete it and keep this one. Its tool names were renamed on 2026-09-15; a call to an old name now answers `{ ok: false, error_kind: "renamed", use: "<new name>" }`.

---

## Step 2: token with `keys:request`

The tools are on the IC MCP server (`https://www.immersivecommons.com/api/mcp`). To call them, the agent needs an `agt_*` token carrying **`keys:request`**, granted at **every tier** (public through operator).

- **No token / no IC MCP yet?** Run [`ic-onboarding`](https://www.immersivecommons.com/skills/ic-onboarding/INSTALL.md). When it asks for scopes, **include `keys:request`** (`events:read_upcoming` is nice-to-have for picking the workshop event, though the workshop tool fetches events server-side so it is not required).
- **Already have a token but missing the scope?** Re-mint with `keys:request` added, either via the device-code flow (`ic-onboarding`) or browser-paste at `https://www.immersivecommons.com/floor10/agent-console`. A re-mint at the same tier is fine here; `keys:request` is available to every tier.

Set the token in your agent's env:

```bash
export FLOOR10_AGENT_TOKEN=agt_...
```

### Verify the scope

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_credits_request_workshop","arguments":{}}}' \
  https://www.immersivecommons.com/api/mcp
```

- `{ ok: false, error_kind: "needs_event", events: [...] }` means token + scope are good; you just need to pick an event.
- `token missing required scope: keys:request` means re-mint with the scope.

---

## What the agent can and can't do

- **Can:** get a workshop or member key with a default model (`ic_credits_request_workshop` / `ic_credits_request`; instant at or under the ring default, queued above it), pick a queued key up once (`ic_credits_pickup_workshop` / `ic_credits_pickup`), read its own usage (`ic_credits_usage`), regenerate a lost key (`ic_credits_regenerate`; same budget, spend carried over, old key revoked), and configure Claude Code or an OpenAI-compatible tool from the bundle.
- **Can't:** mint above the ring default. That queues for an **operator** (`admin:llm_keys`), who approves, denies, sets budgets and revokes. The plaintext is surfaced exactly once: in the request response when instant, or at pickup within about 15 minutes of approval when queued. Humans can instead self-serve at the Clerk-gated page `https://www.immersivecommons.com/credits`. This is by design; see `SKILL.md`.

---

## Configure the tool with the minted key

The `bundle` (in the request response, or at pickup) carries two paste blocks. Use the one for the tool at hand; both point at the IC gateway, never at the vendor.

**Claude Code** (`bundle.copy_paste`): four env vars + the install line.

```bash
export ANTHROPIC_BASE_URL=<gateway base url from the bundle>   # IC gateway, NOT api.anthropic.com
export ANTHROPIC_AUTH_TOKEN=agt_<minted key>
export ANTHROPIC_MODEL=<your default_model>                     # e.g. deepseek-ai/DeepSeek-V4-Flash-0731
export ANTHROPIC_SMALL_FAST_MODEL=<paired small/fast id>        # the bundle pins it, e.g. DeepSeek V4 Flash
npm install -g @anthropic-ai/claude-code
claude
```

**OpenAI-compatible tools** (`bundle.copy_paste_openai`; Codex CLI, OpenCode, aider, Cursor):

```bash
export OPENAI_BASE_URL=<gateway base url>/v1
export OPENAI_API_KEY=agt_<minted key>
# select a model id with a slash in the tool
```

Both model vars in the Claude Code block **must** be ids from the key's allow-list (Claude model names 403 at the gateway). Usage spends the key's monthly IC Credits, and above that a shared monthly org cap (`429 key budget exhausted` vs `429 provider budget exhausted`). Full detail, the model table, limits and troubleshooting in [`SKILL.md`](./SKILL.md); prices at `https://www.immersivecommons.com/credits`.

---

## After install

Sister skills (same `ic-floor10` MCP server / `agt_*` token):

- [`ic-onboarding`](https://www.immersivecommons.com/skills/ic-onboarding/SKILL.md): mint a token with `keys:request`.
- [`ic-events`](https://www.immersivecommons.com/skills/ic-events/SKILL.md): discover the upcoming event to tie a workshop key to.
- [`ic-operator-admin`](https://www.immersivecommons.com/skills/ic-operator-admin/SKILL.md): the operator side (approve / deny queued requests, set budgets, month-to-date usage; operator tier only).

Revoke or rotate keys at any time from `https://www.immersivecommons.com/credits` (regenerate) or `https://www.immersivecommons.com/floor10/agent-console` (revoke).

If something looks broken, file a ticket at `https://www.immersivecommons.com/api/agent/feedback`; out-of-band fallback `admin@immersivecommons.com`.
