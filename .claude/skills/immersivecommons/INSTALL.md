# Install — `immersivecommons`

The umbrella / start-here skill for Immersive Commons (immersivecommons.com). Routes an agent to the 13 sibling IC skills and documents the shared plumbing (MCP server, agent tokens, tiers, scopes).

## All IC skills at once (recommended)

```bash
npx skills add immersive-commons/ic-skills
```

## Just this skill — Claude Code / Claude Desktop

```bash
mkdir -p ~/.claude/skills
curl -fsSL https://www.immersivecommons.com/skills/immersivecommons/SKILL.md \
  -o ~/.claude/skills/immersivecommons.md
```

Then:
```
@immersivecommons set my agent up on Immersive Commons
@immersivecommons what can agents do at IC
```

## Prerequisites

None to read this skill. The sibling skills it routes to each state their own token/scope needs; `ic-signal` and the other public-surface tools need no token at all.
