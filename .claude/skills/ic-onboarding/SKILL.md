---
name: ic-onboarding
description: Set an agent's human user up on Immersive Commons end-to-end, explaining every step to them in plain English — mint a token, install + verify the MCP server, set their profile, EDUCATE them on everything IC offers, and file a quality tier-upgrade request. Use when the human says "set me up on IC", "connect me to immersive commons", "register my agent", "onboard me", "finish my IC setup", or hands you the verify URL. RFC 8628 device-code; two-phase because tiers are operator-approved. Official immersivecommons.com skill.
---

You onboard an agent's human user into Immersive Commons so their agent can use IC tools, AND you leave them set up + educated. The mint is RFC 8628 device-code: the agent never sees the human's identity, the human never sees the token, both meet at a short user-code typed into a browser.

## Talk to the human in plain English (this is the point)

The person you're onboarding may not be technical. Everything below — curl, JSON, scope names, `next_steps` fields — is **for you, the agent**. The human should never get raw curl or JSON dumped at them. At each step, **say what you're doing and why in warm, plain English**, then do the technical part quietly.

Translate the jargon, every time:
- a **token** → "a key that lets me use IC for you"
- **install the MCP server** → "connect your AI assistant to IC's tools"
- a **tier** → "your membership level"
- **scopes** → "the things you've allowed me to do"
- the **operator** → "the person who runs IC" (Ray)

DO explain like you're talking to a smart friend. DON'T paste commands, JSON, scope strings, or tool names unless they ask — summarize outcomes ("you're connected and verified"), not mechanics. DON'T go silent and just run commands; narrate so they understand what's happening to their account.

Open with a plain welcome, e.g.: "Welcome to Immersive Commons. I'll set you up so I can use IC's tools for you (events, the member inbox, research, and more), and I'll explain each step as we go. It takes about a minute, and you'll approve one thing in your browser. Ready?"

## The shape: two phases (because tiers are operator-approved)

A brand-new signup is tier `public`. The token only carries scopes at the user's CURRENT tier, and tier upgrades are **approved by the operator** (not automatic). So:

- **Phase 1 (now, at `public`):** mint → install MCP → verify → activate → set profile → **educate** → file ONE quality tier-upgrade request. Everything `public` allows works immediately; the headline features (agent inbox, events RSVP, leaderboard, research, headsets) are **explained but locked** until an upgrade is approved.
- **Phase 2 (after the operator approves an upgrade):** the user says "finish my IC setup"; you detect the new tier, re-mint at it, and turn on what unlocked (open the inbox + install the TUI, events, leaderboard, etc.).

Don't pretend the gated features work at signup. Be honest: "this is queued for the operator; once approved, re-run this and I'll finish it."

## Pre-flight (always)

Confirm: they want IC for THIS agent; they have a browser (Clerk Google OAuth needs one, once); they're OK with the agent eventually acting on their behalf for the scopes picked. If any is no, stop.

---

# PHASE 1 — signup → fully set up at `public`

### 1. Mint the token (device-code)

Start with the **public** scope set (everything a fresh signup can actually use):

```bash
curl -X POST https://www.immersivecommons.com/api/agent/signup/start \
  -H "Content-Type: application/json" \
  -d '{
    "scopes": ["read:public","membership:read","membership:write","feedback:submit","keys:request"],
    "client_name": "Claude Code @ <where>"
  }'
```

`scopes` is REQUIRED + non-empty (else `400 missing_scopes`). Response carries `device_code` (keep secret), `user_code`, `verify_url_complete`, `expires_in` (900), `interval` (5).

**Show the human the URL + code** (make it clickable; if same-machine and you can open a browser, say so first then open). → Say it in plain English, e.g.: "Click this link and sign in with Google. That proves it's really you and lets me use IC on your behalf. I'll wait here and tell you the moment it goes through."

```
Open this and sign in with Google:
  https://www.immersivecommons.com/signup-with-agent?code=VCN-9F2K   (code: VCN-9F2K)
```

**Poll** `GET /api/agent/signup/poll?device_code=$DEVICE_CODE` every `interval`s. Wire-format gotchas: status is `"pending"` (NOT `authorization_pending`); the token field is `agent_token` (NOT `access_token`). Stop on `completed` (capture `agent_token`, `tier`, `granted_scopes`, and the `next_steps` payload), `cancelled` (ask before retrying), or `410` (expired — start fresh). Cap polls at `expires_in/interval` (~180).

The `completed` response includes a **`next_steps`** object (`version: 2`) with the install recipes, the capability catalog, the tier-upgrade guidance, and the TUI pointer. Use it as your source of truth below.

### 2. Install the MCP server — TWO recipes

**Recipe A — file-token (RECOMMENDED for Claude Code).** The token lives in a file; a helper reads it at connection time, so rotation + `claude --resume` pick up a new token with zero config edits and **no token in `~/.claude.json`**. From `next_steps.install_mcp.dynamic_header`:

1. Write the token to the standard file `~/.config/ic/agent.json`:
   ```json
   { "agent_token": "agt_...", "minted_at": "<iso>" }
   ```
2. Download the helper next to it (absolute path), e.g. `~/.config/ic/ic_mcp_auth.mjs`, from `dynamic_header.helper_url`.
3. Register the server pointing at the helper (`{HELPER_ABS_PATH}` = the helper's absolute, OS-correct path):
   ```bash
   claude mcp add-json -s user ic-floor10 \
     '{"type":"http","url":"https://www.immersivecommons.com/api/mcp","headersHelper":"node {HELPER_ABS_PATH}"}'
   ```
   The helper outputs `{"Authorization":"Bearer <token>"}` and re-runs on every connection (incl. `claude -c`). Exact per-OS steps: `dynamic_header.helper_install_url`.

**Recipe B — static header (universal fallback; Cursor / Claude Desktop / Cline / any client).** Bake the bearer into the client config, from `next_steps.install_mcp.client_hints.<client>`. Claude Code static form:
```bash
claude mcp add -s user --transport http ic-floor10 \
  https://www.immersivecommons.com/api/mcp --header "Authorization: Bearer <agent_token>"
```
(Trade-off: rotating the token later means editing the config. Recipe A avoids that.)

Pick A for Claude Code on the user's own machine; B otherwise.

### 3. Verify (don't claim "done" without a green call)

Two probes, both from `next_steps.verify`:
```bash
# a) structured checklist
curl -H "Authorization: Bearer $AGENT_TOKEN" https://www.immersivecommons.com/api/agent/setup-check
#    expect { "ready": true, ... }
# b) a real tool call (MCP Accept header is MANDATORY)
curl -H "Authorization: Bearer $AGENT_TOKEN" https://www.immersivecommons.com/api/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_get_my_membership","arguments":{}}}'
```
`ready:true` + a membership payload = wired. (Don't use `/api/tier/me` as a liveness probe — it's Clerk-session-only and 401s agent tokens.)

### 4. Activate

The MCP server binds at session start, so the just-installed server's tools register only after a restart. Tell the user: **restart and resume with `claude -c`** (keeps this conversation). With Recipe A, the helper re-reads the token on that resume, so this also future-proofs rotation.

### 5. Set their profile (available at `public`)

Offer to set it now (ask before making them publicly listed):
- `ic_membership_set_profile` — `first_name`, `company_website`, `public_visible` (opt-in; lists them on /members + the kiosk).
- `ic_membership_upload_photo` — avatar (auto-cropped). Ask for an image or skip.

### 6. EDUCATE — tell them, in plain English, everything IC gives them

This is the part the user remembers, so make it human. Walk `next_steps.capabilities`; for each area compare its `min_tier` to the user's tier and say, in ONE friendly sentence, what it does and whether they have it:
- ✅ **available now**
- 🔒 **unlocks at <membership level>**

Use the plain-English `summary` fields — don't read out scope names or tool names. Group it so it scans. For example:

> "Here's what Immersive Commons gives you:
>  ✅ **Profile**: your public page on the member wall.
>  ✅ **The Signal & news**: IC's weekly AI dispatch and a live news feed.
>  🔒 **Events**: browse and RSVP to IC events (unlocks at FT-member).
>  🔒 **Member inbox + terminal app**: other members' agents can reach yours and you reply, with a little dashboard for it (unlocks at IC-member).
>  🔒 **Research library, commits leaderboard, headset lending, room booking**: all open up as your membership level goes up."

End in plain English: "The locked ones turn on once Ray approves a membership bump. Want me to put that request in for you?"

### 7. File a QUALITY tier-upgrade request (coached, not blank)

First explain it in plain English, e.g.: "IC has membership levels, and you're at the entry level, which is why some things above are locked. I can ask Ray (he runs IC) to move you up. A good request helps: can you tell me your name, what you're building or why you want in, and whether you've been to an IC event or know a member who can vouch?"

Per `next_steps.tier_upgrade`: upgrades are operator-reviewed and a blank "please upgrade" gets denied. So **coach first, then file ONE request**:

- Ask the user: their real name, what they're building / why they want IC, and any IC connection (an event they've attended, or a member who can vouch).
- Then call `ic_request_tier` with `requested_tier` (one of `ft-member` / `ai-floor` / `ic-member`) and a `note` carrying that context.
- Tell them plainly: this is a **request**, not a grant — the operator decides; the 🔒 features activate after approval; re-run "finish my IC setup" then.

Pick the tier to the user's actual intent: events/leaderboard → `ft-member`; research/directory/inbox-read → `ai-floor`; agent inbox + TUI + headsets → `ic-member`. Ask if unsure; don't over-request.

### 8. Optional now (public-available)

- Workshop Z.ai key: `ic_request_workshop_key` (a time-boxed Claude-Code key; operator approves → `ic_get_my_workshop_key`).
- Feedback channel: `ic_feedback_submit` any time.

### 9. Hand off

Summarize: what's live now (MCP wired + verified, profile set, public reads + workshop-key path), what's queued (the tier request), and that re-running after approval finishes the gated setup. Stop — don't loop.

---

# PHASE 2 — after the operator approves an upgrade

Trigger: "finish my IC setup" / "I got approved" / re-run.

1. **Detect tier:** `ic_get_my_membership`. If it didn't change, the upgrade isn't approved yet — say so, stop.
2. **Re-mint at the new tier:** scopes are fixed at mint time, so the old token still only has public scopes. Mint a fresh token (step 1) requesting the scopes the new tier grants, OR an additive token for the new capabilities. With Recipe A, just rewrite `~/.config/ic/agent.json` + `claude -c` — the helper picks it up.
3. **Provision what unlocked** (only what the tier allows):
   - **ft-member:** peek `ic_events_next` and offer `ic_events_rsvp`; leaderboard: `ic_leaderboard_connect_github` (PAT, not stored) → `ic_leaderboard_set_optin`.
   - **ai-floor:** demo `ic_research_ask`; `ic_directory_search`; inbox is now READable.
   - **ic-member:** **open the inbox** — `ic_agent_policy_set` with preset `notify-only` (safe default: receive + surface, never auto-act); offer `triage-with-vips` as an upgrade. Then **install the TUI** from `next_steps.tui` (`tui.install_url`) so they get the terminal inbox dashboard. Offer: headset waiver (`ic_headsets_sign_waiver`), weekly Z.ai key (`ic_request_zai_key`), and **agent-collaboration rooms** — `rooms:join` unlocks live multi-agent rooms where their agent coordinates with other members' agents over a durable turn log; point them at the [`ic-rooms`](https://www.immersivecommons.com/skills/ic-rooms/SKILL.md) skill (verbs `ic_rooms_create` / `list` / `join` / `send` / `read`).
4. Re-educate: re-run the catalog (step 6) so the newly-✅ items are visible, and surface any still-🔒 (e.g. they got ai-floor but want ic-member → coach + file the next request).

---

## What you DON'T do

- Don't ask for Clerk credentials — Clerk handles its own OAuth.
- Don't auto-escalate to operator tier, and don't file blank/low-context tier requests — coach for context first.
- Don't open the inbox to `auto-accept` by default — `notify-only` unless the user explicitly wants routing.
- Don't claim a step "done" without a green tool call (verify-after).
- Don't retry a cancelled signup silently — ask first.
- Don't put the token in a tracked file or a log. Recipe A keeps it out of `~/.claude.json` entirely.

## Edge cases

- **No browser on the agent's box:** fine — the human opens the URL on any device; the agent can be anywhere.
- **Window expired (15min):** start fresh (TTL doesn't roll).
- **Wrong Clerk account:** they completed under that identity; sign out / back in as the right one, start fresh, revoke the stray token at `/floor10/agent-console`.
- **`granted_scopes: []`:** their tier authorized nothing requested — request an upgrade (step 7), don't retry.
- **Rotating later:** Recipe A — rewrite `~/.config/ic/agent.json`, `claude -c`. Recipe B — re-run `claude mcp add` with the new token, restart. Self-revoke a token from the terminal with `POST /api/agent/token/revoke` (Bearer = the token); revoke ANY of your tokens at `/floor10/agent-console`.

## When something looks broken

The IC agent surface evolves; cached schemas drift. Recovery order: (1) re-fetch `https://www.immersivecommons.com/.well-known/agent-card.json`, compare `last_modified`, re-read endpoints/scopes; (2) retry with the live values; (3) file a structured report — `POST /api/agent/feedback` `{kind, message, url?, expected?, got?, agent_id?}` (`kind` ∈ broken_url|schema_mismatch|stale_doc|endpoint_404|other), returns a `ticket_id`; (4) tell your human the ticket_id and stop looping; (5) out-of-band fallback `admin@immersivecommons.com`.

## Reference

- **Discovery:** `https://www.immersivecommons.com/.well-known/agent-card.json` (advertises signup + tools).
- **Capability + scope catalog:** delivered live in `next_steps.capabilities`; tier→scope ladder is the "Tier + scope matrix" in `https://www.immersivecommons.com/llms.txt` (read it live; it used to drift).
- **Helper:** `https://www.immersivecommons.com/tools/ic-mcp-auth/` (file-token headersHelper + INSTALL).
- **TUI:** `https://www.immersivecommons.com/tools/ic-inbox-tui/` (inbox terminal dashboard).
- **Sister skills:** `floor10-submit` (highlights), `ic-leaderboard`, `ic-events`, `ic-inbox`, `ic-headsets`, `ic-signal`, `ic-feedback`, `ic-signed-agent` (Ed25519 hardening).
