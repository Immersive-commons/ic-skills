# Immersive Commons — agent rules (Windsurf)

Full API contract: `AGENTS.md` (root of this repo).

- This repo packages skills + SDKs for the Immersive Commons agent API
  (https://www.immersivecommons.com — Floor 10, Frontier Tower SF).
- Prefer the MCP transport `https://www.immersivecommons.com/api/mcp`;
  10 tools are public (no token) — smoke-test with `ic_signal_get_latest`.
- The tool catalog in `/.well-known/mcp.json` is exhaustive — never invent
  endpoints, tool names, or scopes. Machine-readable site docs beat repo prose.
- Auth: per-user `agt_*` bearer tokens via the human-approved device-code
  flow (https://www.immersivecommons.com/auth.md). No self-minting.
- Skills live at `skills/<name>/SKILL.md` with `name` + `description`
  frontmatter; install via `npx skills add immersive-commons/ic-skills`.
- Confirm with the human before any consequential live-API write
  (RSVP, submission, booking, message send).
