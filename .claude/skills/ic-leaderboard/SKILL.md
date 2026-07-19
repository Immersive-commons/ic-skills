---
name: ic-leaderboard
description: Connect a user's GitHub account to the Immersive Commons commits leaderboard, opt them in, and verify their rank. Use when the human says "put me on the leaderboard", "get me on /floor10/commits", "connect my GitHub to IC", "show me my leaderboard rank", or "opt me out of the commits board". Requires an IC agent token with scopes `github:link` + `leaderboard:manage` (granted at ft-member tier and above). Official immersivecommons.com skill.
---

You help an agent's human join the IC commits leaderboard at https://www.immersivecommons.com/floor10/commits. The leaderboard counts weekly commits across the linked GitHub account and renders on the FT10 kiosk TV. Three steps: confirm the user can grant the scopes, link their GitHub, opt them in.

## AI-assisted onboarding (end-to-end, what to do AND what to say)

This is the whole arc an agent runs on its human's behalf. Each step lists the
tool call AND the one thing to **communicate** to the human — the detailed
request/response handling lives in the sections below.

1. **Link GitHub.** Call `ic_leaderboard_connect_github` with a PAT the human
   pastes (discarded after username verification), OR have the human link via the
   Clerk OAuth browser flow. Both end at the same linked-username state.
   → **Say:** "I linked your GitHub as `<login>`. I only stored your username —
   the token is discarded and IC never gets write access to your account."

2. **Opt in.** Call `ic_leaderboard_set_optin` with `optIn: true`. Requires a
   linked GitHub identity (step 1).
   → **Say:** "You're opted in. Your row shows up on the next leaderboard refresh
   (~20 min)."

3. **(Optional) Count private work.** By default only PUBLIC commits count. To
   fold in private/restricted contributions, the human enables one GitHub setting
   — **web-only, one click, no API, no deep-link**: open their GitHub profile →
   click **"Contribution settings"** above the contribution graph → enable
   **"Private contributions"**. IC reads only the COUNT, never repo names or
   content.
   → **Say:** "If you want your private work counted too, flip one GitHub toggle:
   profile → 'Contribution settings' above your contribution graph → enable
   'Private contributions'. IC only ever sees the number, never your repos. I
   can't flip it for you — there's no API for it — so it's a quick click on your
   end."

4. **Verify.** Call `ic_leaderboard_get_status`. Confirm `optIn: true`, the linked
   `github_username`, and (if they did step 3) `private_counting: "on"`.
   → **Say:** "Confirmed: you're on the board as `<username>`, rank `<rank>`"
   — and if they enabled private: "and your private contributions are now counted
   (`private_counting: on`)." If `private_counting` still reads `"off"` right
   after they toggled, tell them the cron just needs a refresh cycle.

## Pre-flight (always)

1. **Token check.** Need `FLOOR10_AGENT_TOKEN` (or equivalent) with scopes `github:link` AND `leaderboard:manage`. If missing either, the user's tier is below ft-member or they minted a narrower token. Either way: stop and tell them.

   Smoke probe:
   ```bash
   curl -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
     https://www.immersivecommons.com/api/leaderboard/me
   ```
   A 401 means no token. A 403 means wrong scope. A 200 with `optIn: false` is the starting state for the rest of this flow.

2. **GitHub PAT.** You'll need a GitHub Personal Access Token from the user. Tell them:
   > Make a PAT at https://github.com/settings/tokens — fine-grained is fine, no scopes required (the `/user` endpoint is open to any valid PAT). Paste it back here. The IC server discards it after verification; only your GitHub username gets stored.

   They paste. You read once into a runtime variable; **do not log it, do not echo it back, do not write it to a file**.

## The pipeline (always this order)

### 1. Connect GitHub

```bash
curl -X POST https://www.immersivecommons.com/api/leaderboard/connect-github \
  -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"pat\": \"$GITHUB_PAT\"}"
```

Possible responses:

- **`200 { ok: true, github: { login, id, name?, avatarUrl? } }`** — linked. Tell the user "linked GitHub as `<login>`."
- **`422`** — GitHub rejected the PAT. Ask the user to mint a fresh one (their existing PAT may be expired or wrong-scoped). Don't auto-retry.
- **`400`** — PAT was missing/empty/oversized. Validation issue on our side.
- **`403`** — your token doesn't have `github:link`, OR your tier was demoted. Stop.
- **`502`** — GitHub had a transient. Retry once after 10s; if it fails again, abort and tell the user.
- **`500`** — Clerk write failed. Tell the user; offer to retry.

If your client speaks MCP, use the tool form instead:
```jsonc
{
  "name": "ic_leaderboard_connect_github",
  "arguments": { "pat": "<value>" }
}
```

**After this call returns**, drop the PAT variable. Don't keep it in memory.

### 2. Opt in

```bash
curl -X POST https://www.immersivecommons.com/api/leaderboard/optin \
  -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"optIn": true}'
```

Possible responses:

- **`200 { ok: true, optIn: true, github_username }`** — you're on. Next rendered snapshot (weekly cron) will include them.
- **`409 { error_kind: "no_github_link" }`** — opt-in refused because there's no linked GitHub. Step 1 didn't complete OR was never run. Tell the user; go back to step 1.
- **`403`** — wrong scope or demoted. Stop.

MCP form:
```jsonc
{
  "name": "ic_leaderboard_set_optin",
  "arguments": { "optIn": true }
}
```

### 3. Verify status

```bash
curl -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
  https://www.immersivecommons.com/api/leaderboard/me
```

Response shape:
```json
{
  "ok": true,
  "optIn": true,
  "github_username": "vmihalis",
  "github_link_source": "agent_pat",
  "github_verified_at": "2026-05-12T18:30:00.000Z",
  "private_counting": "on",
  "this_week": {
    "count": 47,
    "rank": 3,
    "total": 12,
    "generated_at": "2026-05-12T09:00:00.000Z"
  }
}
```

`private_counting` reports whether the member's private-contribution COUNT is
being folded into their total: `"on"` once GitHub's private-contributions toggle
is detected on the last cron, otherwise `"off"`. Use it to confirm the toggle
landed — if it still reads `"off"` after the member says they enabled it, the
cron hasn't refreshed yet (give it a cycle) or the toggle didn't save on GitHub's
side. See **Counting private commits** below for the exact toggle path.

If `this_week` is missing, the user is opted in but the refresh cron hasn't run since they joined. Tell them: "you're on; your rank populates at the next refresh (~20 min)." Don't poll tightly — the cron fires about every 20 minutes (running totals for the current Mon–Sun PT week).

MCP form:
```jsonc
{
  "name": "ic_leaderboard_get_status",
  "arguments": {}
}
```

### 4. Read the full board (optional)

`ic_leaderboard_get_status` returns only the **caller's own** row. To show the
whole ranked board (e.g. "who's top 10 this week?") without scraping the
`/floor10/commits` kiosk HTML, use `ic_leaderboard_get_board`. Read-only, scope
`membership:read` (no extra grant beyond what status already needs).

MCP form:
```jsonc
{
  "name": "ic_leaderboard_get_board",
  "arguments": { "limit": 200 }   // limit optional; default 200, max 200
}
```

Response shape:
```json
{
  "ok": true,
  "generated_at": "2026-06-30T09:00:00.000Z",
  "week": { "from": "...", "to": "..." },
  "total": 12,
  "stale": false,
  "age_min": 4,
  "members": [
    { "rank": 1, "handle": "vmihalis", "name": "Michalis", "commits": 91, "private": 12 },
    { "rank": 2, "handle": "rayyanzahid", "name": "Rayyan", "commits": 47 }
  ]
}
```

`members` is already rank-sorted (`rank` is 1-based). `commits` is the ranking
total. `private` is present only for members who enabled GitHub's private-
contributions toggle (see below). Honor `stale` / `age_min`: if `stale` is true
the snapshot is older than the ~5min refresh window — tell the human the numbers
may be behind rather than quoting them as live.

## Counting private commits

By default the leaderboard counts only **public** commit contributions. A member
who wants their private/restricted work folded into their total enables one
GitHub setting. **It is WEB-ONLY** — there is NO GitHub API for this toggle, so
neither IC nor any agent can flip it; the human has to click it themselves.

Exact path (no deep-link exists — don't try to construct one, walk the human
through the clicks):

> Open your **GitHub profile** (`github.com/<your-username>`) → above the green
> contribution graph, click **"Contribution settings"** → enable **"Private
> contributions"**.

Once enabled, the weekly cron folds that member's private-contribution **count**
into their `commits` total, and `ic_leaderboard_get_board` exposes it as the
optional `private` field (a "+N private" badge on the kiosk). The change takes
effect at the next refresh, not instantly.

**Two ways the private count gets picked up:**

- **Browser OAuth link** — if the member linked GitHub via the Clerk OAuth
  browser flow, the toggle is honored automatically on the next cron.
- **Headless PAT link** — if the member linked via `ic_leaderboard_connect_github`
  (PAT path), the toggle still works the same way; the toggle is what unlocks the
  count, independent of how the username was linked.

**Guarantee — count, not content.** IC only ever reads the *number* of private
contributions. It never reads, stores, or displays private repo names, commit
messages, diffs, or any repo content. IC has **no write access** to anyone's
GitHub (a deliberate security boundary). The PAT the member supplies in step 1 is
discarded after username verification; the cron's server-side query returns only
aggregate counts.

## What you DON'T do

- **Don't store the PAT.** Read it once, send it once, drop the variable.
- **Don't log the PAT** in any form (no `console.log(pat)`, no `console.log(body)` if `body` includes it, no error message that echoes it).
- **Don't echo the PAT** back to the user — they already have it.
- **Don't ask for the PAT before tier-checking.** If the user is below ft-member, getting their PAT first is wasted trust. Smoke-probe `/api/leaderboard/me` first; only ask if you get past the 403 gate.
- **Don't auto-opt-out without asking.** "Hide me from the leaderboard" should be an explicit user request.
- **Don't retry a 422 (PAT rejected) silently.** Bad PATs reflect on the user's GitHub account state, not a transient — they need to fix it on GitHub's side.

## Edge cases

**"I already linked via the Clerk OAuth browser flow."** No problem. `connect-github` is idempotent — re-running it overwrites the publicMetadata field. The OAuth link stays put. `/api/leaderboard/me` shows `github_link_source: "agent_pat"` after a successful PAT flow.

**"I'm an ic-member but my tier just got demoted to public."** The Layer-3 live-tier check will refuse both `connect-github` and `set_optin` with 403. Tell the user; point them at `/membership` to re-request ft-member (or higher).

**"My PAT works for me but the cron says 'GITHUB_LEADERBOARD_PAT not configured'."** That's a server-side ops problem (Ray hasn't set the env var yet). The link is recorded, but the weekly cron can't fetch your commits. Surface this to the user with the caveat that their rank won't populate until Ray fixes the env.

**"My GitHub username changed on GitHub.com."** The link stores the old username. Re-run `connect-github` with a fresh PAT for the renamed account — `publicMetadata.github_username` overwrites.

**"Can I be on the leaderboard with multiple GitHub accounts?"** No. The PAT path stores ONE username. If you want to track commits across multiple accounts, link your "main" one and ask Ray about adding a multi-account model (Phase 5+).

## Useful reference

- **Endpoint base**: `https://www.immersivecommons.com`
- **Leaderboard page (human-visible)**: `/floor10/commits`
- **Cron cadence**: every ~20 min (running totals for the current Mon–Sun PT week)
- **Required scopes**: `github:link` (write), `leaderboard:manage` (write + read)
- **Tier minimum**: `ft-member`
- **Sister skills**: `floor10-submit` (highlights), `ic-onboarding` (sign-up via device-code), `ic-events` (Phase 4)
