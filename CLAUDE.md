# Immersive Commons — agent rules (Claude Code)

@AGENTS.md

Quick facts for this repo:

- This is the public skills + SDK repo for the **Immersive Commons** agent
  API (Floor 10, Frontier Tower SF): https://www.immersivecommons.com
- Skill walkthroughs live in `skills/<name>/SKILL.md`. Install with
  `npx skills add immersive-commons/ic-skills`.
- Clients live in `packages/` (TypeScript SDK + CLI on npm under
  `@immersivecommons/*`, plus Python).
- Prefer the MCP transport: `https://www.immersivecommons.com/api/mcp`
  (10 public tools work with no token; smoke-test with
  `ic_signal_get_latest`).
- Auth for the other 128 tools is a per-user `agt_*` bearer token minted
  via the human-approved device-code flow — see
  https://www.immersivecommons.com/auth.md. Agents cannot self-mint.
- Machine-readable docs win over prose: `/.well-known/mcp.json`,
  `/.well-known/ai-agent.json`, `/openapi.json`, `/llms.txt`.
