#!/usr/bin/env bash
# Re-pull every SKILL.md from the live site so this mirror never drifts
# silently from public/skills/ in the immersivecommons-unified app.
#
# Usage: scripts/sync-from-site.sh
#
# Safe to re-run — overwrites skills/<name>/SKILL.md in place, does not
# touch README.md, AGENTS.md, LICENSE, or packages/.

set -euo pipefail

SITE="https://www.immersivecommons.com"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"

# The 14 skill slugs. Keep in sync with /.well-known/mcp.json "skills"[].name
# — that field is the site's own source of truth for what's installable.
SLUGS=(
  immersivecommons
  floor10-submit
  ic-onboarding
  ic-leaderboard
  ic-events
  ic-signed-agent
  ic-headsets
  ic-operator-admin
  ic-signal
  ic-feedback
  ic-events-stream
  ic-inbox
  ic-rooms
  zai-keys
)

echo "Syncing ${#SLUGS[@]} skills from $SITE ..."

fail=0
for slug in "${SLUGS[@]}"; do
  dest="$SKILLS_DIR/$slug/SKILL.md"
  mkdir -p "$SKILLS_DIR/$slug"
  url="$SITE/skills/$slug/SKILL.md"
  if curl -fsS "$url" -o "$dest.tmp"; then
    mv "$dest.tmp" "$dest"
    echo "  ok    $slug"
  else
    echo "  FAIL  $slug ($url)" >&2
    rm -f "$dest.tmp"
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  echo "One or more skills failed to sync — check the URLs above." >&2
  exit 1
fi

# Refresh the .claude/skills/ mirror so Claude Code auto-loads these as
# project skills for anyone who clones the repo. skills/ stays canonical;
# this copy must never be edited directly.
CLAUDE_SKILLS_DIR="$REPO_ROOT/.claude/skills"
mkdir -p "$CLAUDE_SKILLS_DIR"
rm -rf "${CLAUDE_SKILLS_DIR:?}"/*
cp -r "$SKILLS_DIR"/. "$CLAUDE_SKILLS_DIR"/
echo "Mirrored skills/ -> .claude/skills/"

echo "Done. Review 'git diff' before committing — the site is the source of truth, this mirror should only ever move toward it."
