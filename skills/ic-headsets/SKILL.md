---
name: ic-headsets
description: Walk an IC member's agent through the PICO 4 Ultra Enterprise lending lifecycle — check waiver status, sign waiver if needed, browse inventory, check out a unit, return it, file a damage report. Operator-tier agents can additionally triage active lends, mark / clear out-of-service, force-return stuck lends, and resolve incidents. Use when the human says "lend me a PICO", "I want to borrow a headset", "check the PICO inventory", "return IC1", "file damage on IC2", "what's still out", or any flavor of "headset / VR / PICO" against the Immersive Commons program. Requires an IC agent token with scopes from `headsets:read` (read-only) up through `headsets:lend` + `headsets:report_damage` (member writes) and `admin:headsets_review` (operator).
---

You help an agent's human use the Immersive Commons PICO lending program end-to-end. The fleet is 8 PICO 4 Ultra Enterprise units (`IC1`..`IC8`) on Floor 10 of Frontier Tower SF; through 2026-06-14 they do not leave the floor.

This skill is the agent walkthrough. The human-facing canonical doc is at https://www.immersivecommons.com/floor10/headsets/handling (markdown variant: `/floor10/headsets/handling.md`).

## Pre-flight (every session)

1. **Token check.** Need `FLOOR10_AGENT_TOKEN` with at minimum `headsets:read`. Member writes also need `headsets:lend` and/or `headsets:report_damage`. Operator triage needs `admin:headsets_review`. Smoke probe:
   ```bash
   curl -H "Authorization: Bearer $FLOOR10_AGENT_TOKEN" \
     -X POST -H "content-type: application/json" \
     -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"ic_headsets_list_inventory","arguments":{}}}' \
     https://www.immersivecommons.com/api/mcp
   ```
   200 + a tools/call result = good. 401 = no/bad token. 403 = scope missing.

2. **Identity check.** The human's IC tier (`ic-member` minimum for lending) is enforced server-side via the agent token's bound Clerk identity. If the human isn't `ic-member`, the lend tools will refuse and the agent should walk them through `ic_request_tier` first (see the `ic-onboarding` skill).

## The four common flows

### A. "Lend me a PICO"

Order matters — each step gates the next.

1. **Check waiver freshness.**
   ```jsonc
   { "name": "ic_headsets_check_waiver", "arguments": {} }
   ```
   Response `state` is one of `fresh` | `stale-version` | `expired` | `missing`.
   - `fresh` → skip to step 3.
   - `stale-version` / `expired` / `missing` → continue to step 2.

2. **Sign the waiver.** The agent supplies the human's name + email + signed_typed string (the human's actual typed name). Phone + telegram are optional but recommended. Don't fabricate values — surface the form fields to the human and let them dictate.
   ```jsonc
   {
     "name": "ic_headsets_sign_waiver",
     "arguments": {
       "name": "Jane Founder",
       "email": "jane@example.com",
       "phone": "+1...",
       "telegram": "@janef",
       "signature_typed": "Jane Founder",
       "photo_consent": "yes"
     }
   }
   ```
   Returns `{ ok, record_id, expires_at }`. Hard rules: the agent does NOT supply the `ring` field — the server derives it from the live tier. The agent does NOT fabricate the typed signature — that's the human's actual keystroke string.

3. **Browse inventory.**
   ```jsonc
   { "name": "ic_headsets_list_inventory", "arguments": {} }
   ```
   Filter to `status: "available"`. If none available, surface what's in the queue and tell the human; do NOT try to bypass the gate.

4. **Checkout.**
   ```jsonc
   { "name": "ic_headsets_checkout", "arguments": { "unit_id": "IC1" } }
   ```
   Returns `{ ok, lend_id, due_back_at }` on success. Error kinds:
   - `no_waiver` → loop back to step 1 (race; sign waiver expired between check and checkout).
   - `already_lending` (with `existing_lend_id`) → human already has a lend out; surface it.
   - `unit_not_found` / `unit_not_available` → race; re-list inventory and pick another.
   Surface the `lend_id` and `due_back_at` to the human. Default `due_back_at` is end-of-floor-day OR +4h from checkout, whichever is sooner.

### B. "Return my lend"

1. **Find the active lend.**
   ```jsonc
   { "name": "ic_headsets_get_my_lend", "arguments": {} }
   ```
   Returns `{ lend: LendRecord | null }`. If `null`, tell the human they have no active lend.

2. **Confirm condition with the human.** Ask: "clean return, or any damage / hygiene flag?"

3. **Submit return.**
   ```jsonc
   {
     "name": "ic_headsets_return",
     "arguments": { "lend_id": "lnd_...", "damaged": false }
   }
   ```
   On clean return (`damaged: false`), unit goes back to the available pool. On `damaged: true`, the unit auto-flips to `out-of-service` AND the agent MUST follow up with `ic_headsets_report_damage` so the incident details land (otherwise the unit sits OOS with no triage record).

### C. "Report damage on a unit"

Any IC member can file (the borrower, a witness, ops staff). The damage form is permissive on roles but strict on content — `description` must be 20+ chars and specific.

```jsonc
{
  "name": "ic_headsets_report_damage",
  "arguments": {
    "unit": "IC2",
    "type": "lens",
    "description": "Visible scratch on the right lens center, about 3mm long. Borrower confirms it was there at handover. Discovered during the post-flight inspection.",
    "reporter_name": "Jane Founder",
    "reporter_role": "borrower",
    "reporter_contact": "@janef",
    "lend_id": "lnd_...",
    "photo": "data:image/jpeg;base64,..."
  }
}
```

Fields:
- `type`: one of `lens` | `shell` | `controller` | `battery` | `hygiene` | `loss` | `near-miss` | `other`. Pick the closest match; `other` is fine when none fit.
- `reporter_role`: `ops-staff` | `borrower` | `member` (witness).
- `lend_id` (optional but useful): if present, the lend record's `damage_flag` + `damage_incident_id` get back-filled.
- `photo` (optional but strong): base64 data URL, capped at ~5MB raw. Decline to attach if the human doesn't have one — text-only reports still triage.

Returns `{ ok, incident_id }`. The Telegram fanout fires within 60 seconds via node-side ic-notify. Do NOT tell the human "operations was paged instantly" — tell them "within a minute."

### D. Operator triage (operator-only)

If the human is an IC operator and is asking about the queue:

```jsonc
{ "name": "ic_headsets_admin_list_active_lends", "arguments": {} }
{ "name": "ic_headsets_admin_list_open_incidents", "arguments": { "limit": 50 } }
```

Mutation verbs:
- `ic_headsets_admin_mark_oos` — pull a non-lent unit from rotation. Args: `{ unit_id, reason }`.
- `ic_headsets_admin_clear_oos` — return a unit to the available pool. Refuses if an open incident exists on it — resolve the incident first.
- `ic_headsets_admin_force_return` — close a stuck lend (member unreachable, end-of-day cleanup). Args: `{ lend_id, reason }`. Releases the per-member NX lock so the borrower can lend again.
- `ic_headsets_admin_resolve_incident` — triage verdict + audit note. Args: `{ incident_id, verdict, resolution }`. Verdicts:
  - `absorbed` — IC eats the cost (waiver §11 good-faith).
  - `willful-misuse` — member charged. Unit stays OOS.
  - `resolved` — back to rotation, no charge. Auto-clears OOS as a side effect.

Always ask the operator for the resolution note. Don't invent one.

## Hard rules

- **Do not invent typed signatures.** The `signature_typed` field is the human's actual keystrokes. If the human won't type it themselves, abort — agents that synthesize signatures break the audit trail.
- **Do not fabricate incident descriptions.** If the human can't describe the damage, surface the standard categories and let them pick, but the prose must come from them or from a photo the agent can describe.
- **Do not bypass the waiver step.** A `no_waiver` error from `ic_headsets_checkout` means the human MUST sign before the lend will work. There's no override.
- **Do not transport off-floor.** Through 2026-06-14, the lending program is floor-only. The waiver §9 is explicit; off-floor use is willful misuse under §11.
- **Do not retry on `unit_not_available` / `already_lending`.** These are race-loss states. Re-fetch inventory and either pick a different unit OR surface the existing lend to the human.
- **Surface incident IDs.** When the agent files damage, tell the human the `incident_id` and that Ray will see it on Telegram within a minute. Don't promise immediate triage.

## Quickstart for fresh agents

1. Token: see the `ic-onboarding` skill for the RFC 8628 device-code flow. Request scope set: `["read:public", "membership:read", "headsets:read", "headsets:lend", "headsets:report_damage"]` for a full member-side token.
2. Smoke probe: `ic_headsets_list_inventory` over MCP. 200 = good.
3. Loop the four flows above on demand.

## Related skills

- `ic-onboarding` — RFC 8628 device-code signup; how the human authorizes scopes.
- `ic-events` — Sister surface; same auth model.
- `ic-signed-agent` — Optional Ed25519 signed-request upgrade so a leaked bearer alone is useless.

## Discovery surfaces

- Agent card: https://www.immersivecommons.com/.well-known/agent-card.json
- Aiia manifest: https://www.immersivecommons.com/.well-known/ai-agent.json
- MCP discovery: https://www.immersivecommons.com/.well-known/mcp.json
- llms.txt URL map: https://www.immersivecommons.com/llms.txt
- Human-facing handling rules: https://www.immersivecommons.com/floor10/headsets/handling
- Markdown variant: https://www.immersivecommons.com/floor10/headsets/handling.md
