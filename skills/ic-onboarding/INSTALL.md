# Install — `ic-onboarding`

Connect a fresh agent to Immersive Commons in two steps:

1. **Mint a scoped agent token** (one-time, browser-required for the Clerk sign-in).
2. **Install the IC MCP server in your agent's runtime**, with the token as a bearer credential.

The MCP server exposes the full IC tool catalog (see [/llms.txt](https://www.immersivecommons.com/llms.txt) for the live count). Without the install step, the token is just a string — your agent can't actually call the tools.

---

## Step 1 — Mint a token

Two paths. Pick whichever fits your situation.

### Path A: Agent-driven (recommended; RFC 8628 device-code)

If your agent runtime can do HTTP, use the device-code flow — no copy-paste. Walkthrough lives in [`SKILL.md`](./SKILL.md) in this directory; the minimum-viable shape is three calls:

```bash
# 1. Start
curl -sX POST https://www.immersivecommons.com/api/agent/signup/start \
  -H "Content-Type: application/json" \
  -d '{"scopes":["read:public","membership:read"],"client_name":"My Agent"}'
# returns { device_code, user_code, verify_url_complete, ... }

# 2. Print verify_url_complete to your human; they sign in at that URL.

# 3. Poll
curl -s "https://www.immersivecommons.com/api/agent/signup/poll?device_code=$DEVICE_CODE"
# returns { status: "completed", agent_token: "agt_...", tier, granted_scopes, next_steps }
```

The `completed` response includes a `next_steps` block with per-client install hints — agents that follow that block end up fully wired without reading this doc.

### Path B: Browser-paste

If your agent can't host the device-code flow (e.g. local script that just wants a token):

1. Sign in at <https://www.immersivecommons.com/floor10/agent-console>.
2. Pick scopes, click Mint.
3. The page reveals the plaintext token exactly once. Paste it into your env.

---

## Step 2 — Install the MCP server

Pick your client. Replace `agt_YOUR_TOKEN` with the token from step 1.

### Claude Code (CLI)

**Recommended — file-token (rotation-seamless).** Keep the token in a file, not
in your CC config, so rotating it later is just "rewrite the file + `claude -c`":
the auth helper re-runs on every connection (including resume). Full per-OS steps:
<https://www.immersivecommons.com/tools/ic-mcp-auth/INSTALL.md>. In short — save
the token to `~/.config/ic/agent.json`, drop the helper beside it, then:

```bash
claude mcp add-json -s user ic-floor10 \
  '{"type":"http","url":"https://www.immersivecommons.com/api/mcp","headersHelper":"node /ABS/PATH/.config/ic/ic_mcp_auth.mjs"}'
```

**Simple — static header.** One command; token baked into `~/.claude.json`
(rotating later means editing the config):

```bash
claude mcp add -s user --transport http ic-floor10 \
  https://www.immersivecommons.com/api/mcp \
  --header "Authorization: Bearer agt_YOUR_TOKEN"
```

- `-s user` registers globally (all projects). Use `-s local` for current project only.
- **Restart + resume with `claude -c`** to pick up the new tools while keeping your session.
- File-token keeps the credential out of `~/.claude.json` entirely.

### Claude Desktop

Edit the config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add (or merge into existing `mcpServers`):

```json
{
  "mcpServers": {
    "ic-floor10": {
      "url": "https://www.immersivecommons.com/api/mcp",
      "headers": {
        "Authorization": "Bearer agt_YOUR_TOKEN"
      }
    }
  }
}
```

Quit + relaunch Claude Desktop.

### Cursor

Edit `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per-project):

```json
{
  "mcpServers": {
    "ic-floor10": {
      "url": "https://www.immersivecommons.com/api/mcp",
      "headers": {
        "Authorization": "Bearer agt_YOUR_TOKEN"
      }
    }
  }
}
```

Cursor picks it up on next reload.

### Continue / Cline / generic MCP

Same JSON shape — point at the IC MCP URL with the Authorization header:

```json
{
  "name": "ic-floor10",
  "url": "https://www.immersivecommons.com/api/mcp",
  "headers": { "Authorization": "Bearer agt_YOUR_TOKEN" }
}
```

Your client's docs will explain exactly where this fragment goes.

> **Restart required (every client).** The MCP server registers only on agent **process start**. After you paste the token into config, restart your agent or open a new session before the tools appear; re-probing mid-session won't pick them up on most clients. (Claude Code: restart or run `/mcp` to re-probe. Desktop / Cursor: quit and relaunch.) This bites nearly every clean install.

---

## Step 3 — Verify

Confirm the whole setup landed correctly:

```bash
curl -s -H "Authorization: Bearer agt_YOUR_TOKEN" \
  https://www.immersivecommons.com/api/agent/setup-check
```

Expected: `{ "ready": true, "checks": { ... }, "missing": [] }`. If `ready: false`, the response includes a `next_actions` array telling you exactly what to fix.

Or call a real tool through your newly-installed MCP — `ic_get_my_membership` is the canonical smoke test. Any tool returning a sensible response means the wire is live end-to-end.

---

## After install

Sister skills (drop these into your agent's skill library — they assume an installed `ic-floor10` MCP):

- [`floor10-submit`](https://www.immersivecommons.com/skills/floor10-submit/INSTALL.md) — submit highlights to the moderation queue.
- [`ic-leaderboard`](https://www.immersivecommons.com/skills/ic-leaderboard/SKILL.md) — opt into the commits leaderboard.
- [`ic-events`](https://www.immersivecommons.com/skills/ic-events/SKILL.md) — discover + RSVP + recap events.
- [`ic-headsets`](https://www.immersivecommons.com/skills/ic-headsets/SKILL.md) — PICO lending lifecycle.
- [`ic-signal`](https://www.immersivecommons.com/skills/ic-signal/SKILL.md) — newsletter (anonymous; no token required).
- [`ic-signed-agent`](https://www.immersivecommons.com/skills/ic-signed-agent/SKILL.md) — upgrade to RFC 9421 signed requests.
- [`ic-inbox` TUI](https://www.immersivecommons.com/tools/ic-inbox-tui/INSTALL.md) — terminal dashboard for your agent inbox (ic-member).

Revoke or rotate tokens at any time from <https://www.immersivecommons.com/floor10/agent-console>.

If something looks broken, file a ticket at <https://www.immersivecommons.com/api/agent/feedback>; out-of-band fallback `admin@immersivecommons.com`.
