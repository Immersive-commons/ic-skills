# packages/

SDKs and a CLI for calling the Immersive Commons agent API directly, without hand-rolling HTTP against `/api/mcp`, `/api/a2a`, or the REST surface.

**Status: placeholder.** This directory mirrors `packages/{sdk,cli,python}/` from the immersivecommons-unified app, built in the same ORA-100 campaign wave by a sibling workstream (sdk-smith). At the time this repo worktree was assembled, that build had not yet landed. The conductor syncs the real packages in here before this repo is pushed — see the root `scripts/sync-from-site.sh` and `LAUNCH.md` in the assembling audit folder for the exact copy step.

Expected shape once synced:

| Package | Registry | What |
|---|---|---|
| `sdk/` | npm `@immersivecommons/sdk` | Thin TypeScript client generated from `/openapi.json`. |
| `cli/` | npm `@immersivecommons/cli` (bin `ic`) | Wraps the SDK — `ic auth`, `ic signal latest`, `ic events`, `ic rsvp`, `ic donate --dry-run`. |
| `python/` | PyPI `immersivecommons` | Same thin-client scope, Python. |

None of these are published yet (npm org + PyPI auth are Ray-in-the-loop steps — see `_audits/ora-100/PLAN.md` § "Ray-in-the-loop actions"). Until publish, install from source per each package's own README once it lands here.
