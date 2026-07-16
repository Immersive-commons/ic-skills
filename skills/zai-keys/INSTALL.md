# Install — `zai-keys`

Teach your agent to request and use a **Z.ai (GLM) Claude-Code key** from Immersive Commons — a 5-hour workshop pass (public) or a weekly-token member key (ic-member). Two steps:

1. **Drop the skill** into your agent's skill library.
2. **Have an IC agent token with `keys:request`** so the agent can file requests.

The actual request/approve tools live on the IC MCP server (already installed if you ran `ic-onboarding`'s INSTALL). This skill is the workflow + judgement layer on top.

---

## Step 1 — Install the skill

### Claude Code

```bash
mkdir -p ~/.claude/skills/zai-keys
curl -sSL https://www.immersivecommons.com/skills/zai-keys/SKILL.md \
  -o ~/.claude/skills/zai-keys/SKILL.md
```

Then ask Claude Code to use it — `"use the zai-keys skill"` or just describe the task (`"get me a Z.ai key for the workshop"`) and it'll pick it up via the skill description.

### Claude Desktop / Cursor / ChatGPT (Skills)

Same shape: drop `SKILL.md` into your client's skills directory. Path varies per client; check your client's Skills docs.

---

## Step 2 — Token with `keys:request`

The request tools are on the IC MCP server (`https://www.immersivecommons.com/api/mcp`). To call them, the agent needs an `agt_*` token carrying **`keys:request`** — granted at **every tier** (public → operator).

- **No token / no IC MCP yet?** Run [`ic-onboarding`](https://www.immersivecommons.com/skills/ic-onboarding/INSTALL.md). When it asks for scopes, **include `keys:request`** (plus `events:read_upcoming` is nice-to-have for picking the workshop event, though the workshop tool fetches events server-side so it's not required).
- **Already have a token but missing the scope?** Re-mint with `keys:request` added — either via the device-code flow (`ic-onboarding`) or browser-paste at `https://www.immersivecommons.com/floor10/agent-console`. A re-mint at the same tier is fine here; `keys:request` is available to every tier.

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
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_request_workshop_key","arguments":{}}}' \
  https://www.immersivecommons.com/api/mcp
```

- `{ ok: false, error_kind: "needs_event", events: [...] }` → token + scope are good; you just need to pick an event. ✅
- `token missing required scope: keys:request` → re-mint with the scope.

---

## What the agent can and can't do

- **Can:** file a workshop or member key request (`ic_request_workshop_key` / `ic_request_zai_key`), then configure Claude Code once the human hands over the minted key.
- **Can't:** mint its own key, or fetch the minted key over MCP. Minting is **operator-only** (`admin:llm_keys`), and the plaintext key reaches the human out-of-band (the operator hands it over) or via the Clerk-gated web page `https://www.immersivecommons.com/zai-keys`. This is by design — see `SKILL.md`.

---

## Configure Claude Code with the minted key

When the human gives the agent the minted **proxy key** (and, for a workshop, the setup bundle), point Claude Code at the IC gateway — **four** env vars + the install line:

```bash
export ANTHROPIC_BASE_URL=<gateway base url from the bundle>   # IC Z.ai gateway, NOT api.anthropic.com
export ANTHROPIC_AUTH_TOKEN=agt_<minted proxy key>
export ANTHROPIC_MODEL=glm-4.6                                 # GLM id (from the bundle / allow-list)
export ANTHROPIC_SMALL_FAST_MODEL=glm-4.5-air                  # small/fast GLM id
npm install -g @anthropic-ai/claude-code
claude
```

A workshop approval ships a `copy_paste` block with exactly this — paste and run. Both model vars **must** be GLM ids (Claude model names 403 at the gateway). Full detail + limits + troubleshooting in [`SKILL.md`](./SKILL.md).

---

## After install

Sister skills (same `ic-floor10` MCP server / `agt_*` token):

- [`ic-onboarding`](https://www.immersivecommons.com/skills/ic-onboarding/SKILL.md) — mint a token with `keys:request`.
- [`ic-events`](https://www.immersivecommons.com/skills/ic-events/SKILL.md) — discover the upcoming event to tie a workshop key to.
- [`ic-operator-admin`](https://www.immersivecommons.com/skills/ic-operator-admin/SKILL.md) — the operator side (approve / deny key requests; operator tier only).

Revoke or rotate keys at any time from `https://www.immersivecommons.com/floor10/agent-console`.

If something looks broken, file a ticket at `https://www.immersivecommons.com/api/agent/feedback`; out-of-band fallback `admin@immersivecommons.com`.
