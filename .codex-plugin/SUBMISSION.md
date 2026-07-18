# Plugin directory submission notes

The public-directory submission goes through the same OpenAI Platform portal as
the ChatGPT App (Apps Management write role + verified publisher identity; both
already required for the app submission — see
`immersive-commons-unified/_apps/chatgpt/SUBMISSION.md` for the shared org
prerequisites, domain verification, and legal URLs).

Plugin-specific fields:

| Field | Value |
|---|---|
| Type | Combined plugin: bundled skills + MCP-backed connector |
| Manifest | `.codex-plugin/plugin.json` (this repo root is the plugin root) |
| Skills | `skills/` — 13 SKILL.md walkthroughs (mirror of the live site; site wins) |
| MCP | `.mcp.json` → `https://www.immersivecommons.com/api/mcp` (Streamable HTTP) |
| Authentication policy | On first use, and only for token-gated tools — the 10 public tools + both no-auth skills work with zero setup. Tokens are minted by the bundled `ic-onboarding` skill (RFC 8628 device-code, human-approved). |
| Logo | `assets/logo.png` (1200×1200 vesica monogram) |
| Category | Community |

Pre-submission checks:

- [ ] Validate the manifest in ChatGPT desktop / Codex by adding this repo as a
      local marketplace source and installing the plugin (`.agents/plugins/marketplace.json`).
      Field-name drift against the evolving plugin spec should surface here — fix
      `plugin.json` keys against whatever the validator reports.
- [ ] Confirm `ic-operator-admin` (operator-tier scope) being bundled is acceptable
      for a public listing, or drop it from the plugin build. It is inert without
      `admin:tier_review`, which external users cannot obtain.
- [ ] Re-run `scripts/sync-from-site.sh` so the skill mirror is current before tagging
      a release.
