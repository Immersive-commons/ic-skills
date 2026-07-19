# floor10-submit · install

A Claude Code skill that walks a floor member through composing and
submitting a `HighlightStory` to the IC moderation queue at
[/floor10/highlights](https://www.immersivecommons.com/floor10/highlights).

## What you need

- A floor-member account (admin grants; talk to Ray if you're not flagged).
- An agent token from
  [/floor10/agent-console](https://www.immersivecommons.com/floor10/agent-console).
- Claude Code (`brew install claude` / `winget install anthropic.claude`).

## Install

One file. Drop it at the right path on your machine:

**macOS / Linux**
```bash
mkdir -p ~/.claude/skills/floor10-submit
curl -fsSL https://www.immersivecommons.com/skills/floor10-submit/SKILL.md \
  -o ~/.claude/skills/floor10-submit/SKILL.md
```

**Windows (PowerShell)**
```powershell
$dir = "$env:USERPROFILE\.claude\skills\floor10-submit"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest `
  -Uri 'https://www.immersivecommons.com/skills/floor10-submit/SKILL.md' `
  -OutFile "$dir\SKILL.md"
```

## Set your token

Mint at https://www.immersivecommons.com/floor10/agent-console (sign in
with the email on your member record). Copy the plaintext — it's shown
exactly once.

**macOS / Linux** — append to `~/.zshrc` or `~/.bashrc`:
```bash
export FLOOR10_AGENT_TOKEN="agt_paste_yours_here"
```

**Windows** — set persistently:
```powershell
[Environment]::SetEnvironmentVariable(
  "FLOOR10_AGENT_TOKEN",
  "agt_paste_yours_here",
  "User"
)
```

Open a new terminal so the env var loads.

## Use it

In Claude Code, type one of:

- `/floor10-submit`
- `submit a highlight from <luma-url>`
- `post my moment from <luma-url>`
- `share <event-name> to floor10`

The skill takes it from there: extracts the event metadata, asks for
your role + photo URLs, drafts a news-wire dek, shows you a preview,
and on your `y` POSTs it to the moderation queue. An admin reviews and
publishes.

## Verify it loaded

In Claude Code, ask: "what skills do I have?" or look for
`floor10-submit` in the system reminder when a session starts.

## Update

Skills don't auto-update. Re-run the install command above to pull the
latest `SKILL.md`.

## Photos

The API takes URLs, not file uploads. Acceptable sources:

- **Luma cover** — auto-extracted from the event page; you don't have
  to paste it.
- **LinkedIn post images** — right-click → copy image address.
- **Your own host** — Cloudinary / Vercel Blob / Drive shared link
  that's actually public.
- **Quick paste** — for one-off photos, upload to https://0x0.st or
  https://imgur.com, copy the URL.

If you only have iCloud / Google Photos and don't want to bother with
public URLs, just submit the Luma cover alone and tell the admin in
the dek that more photos will follow. Less ideal but workable.

## Rate limit

3 submissions per token per UTC day. The skill surfaces the count in
the response so you'll see it coming.

## Trouble

- **`401 missing bearer token`** — `FLOOR10_AGENT_TOKEN` not set in
  the shell Claude Code is running in. Check `echo
  $FLOOR10_AGENT_TOKEN`.
- **`401 unknown token`** — token was revoked or you copied wrong.
  Re-mint.
- **`429 rate limit exceeded`** — wait until UTC midnight.
- **`400 ...`** — validation failed; the skill loops back to fix.

Full API reference: https://www.immersivecommons.com/docs/agent-submissions
