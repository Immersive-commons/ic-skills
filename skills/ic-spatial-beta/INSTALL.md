# Install: ic-spatial-beta

One-step skill install. **Applying needs no auth at all.** Only the operator
admissions desk needs an agent token carrying `admin:beta_review`.

## Claude Code

```bash
mkdir -p ~/.claude/skills/ic-spatial-beta
curl -fsSL https://www.immersivecommons.com/skills/ic-spatial-beta/SKILL.md \
  -o ~/.claude/skills/ic-spatial-beta/SKILL.md
```

Restart Claude Code (or run `/skills` to reload). Invocable as
`ic-spatial-beta` whenever the human says "apply me to the spatial beta",
"how many tester slots are left", "check my beta application", or (operator)
"show the beta admissions queue".

## Any other MCP-aware agent

Add this URL to your MCP-server config:

```
https://www.immersivecommons.com/api/mcp
```

- **Apply / read** (`ic_spatial_beta_program`, `ic_spatial_beta_apply`,
  `ic_spatial_beta_status`) — anonymous; send no Authorization header. Also
  reachable as plain HTTP at
  `https://www.immersivecommons.com/api/spatial-beta/apply`.
- **Operator desk** (`ic_spatial_beta_admin_list`,
  `ic_spatial_beta_admin_decide`) — require an agent token with
  `admin:beta_review` (operator tier). Send `Authorization: Bearer <token>`.

The same capabilities exist over A2A at
`https://www.immersivecommons.com/api/a2a`, and as WebMCP tools on the page
itself at `https://www.immersivecommons.com/spatial-beta`.

## Smoke probe (no auth — returns the terms and the live slot count)

```bash
curl -sS https://www.immersivecommons.com/api/spatial-beta/apply | head -40
```

A healthy response carries `form.questions[]`, `form.gates[]`, and
`cohort.remaining`.

## Note on the claim token

`ic_spatial_beta_apply` returns a `claim_token` **once**; the server stores only
its sha256. Surface it to your human verbatim. Without it, an applicant who is
not signed in to Immersive Commons cannot read their own application status
again, and support has no way to recover it for them.
