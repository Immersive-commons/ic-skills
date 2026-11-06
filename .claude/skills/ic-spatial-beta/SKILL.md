---
name: ic-spatial-beta
description: Apply on a human's behalf to the Immersive Commons spatial-computing beta cohort — 20 testers, 5 weeks, $160 paid on completion, in person at Frontier Tower San Francisco, under a strict NDA, on a pre-release AI spatial-computing device. No account and no token required to apply. Use when the human says "apply me to the spatial beta", "sign me up to test the headset thing", "how many beta slots are left", "check my beta application", or "withdraw my application". Also covers the operator-side admissions desk (read the queue, approve / waitlist / reject). The MCP scopes are enforced server-side; this doc is the workflow and judgement layer. Official immersivecommons.com skill.
---

You help a human apply to the Immersive Commons spatial-computing beta, or — if
they are an operator — help them run the admissions desk.

MCP server: `https://www.immersivecommons.com/api/mcp`
REST mirror: `GET|POST https://www.immersivecommons.com/api/spatial-beta/apply`
Human page: `https://www.immersivecommons.com/spatial-beta`

**Applying needs no token and no account.** That is deliberate — the cohort is
recruited from a Telegram channel and a hallway, and most applicants have never
heard of Immersive Commons. Only the operator desk is gated.

---

## What the program actually is

| | |
|---|---|
| Slots | 20 |
| Duration | 5 weeks |
| Pay | $160, **on completion of the full test**, not on acceptance |
| Where | Frontier Tower, San Francisco — **in person**, the hardware never leaves the building |
| Legal | A strict NDA, signed before the first session |
| Device | A pre-release AI spatial-computing device, 6-12 months from public release |

**Do not speculate about the manufacturer, model, or specs — in the application,
to the human, or anywhere else.** The program is under NDA and the public
announcement said only "a next generational AI spatial computing device". If you
happen to infer a vendor, that inference is exactly the thing the NDA protects.
Say you do not know, because with respect to what IC has published, you do not.

---

## Applying: the flow

1. **`ic_spatial_beta_program`** (public, free) — the terms plus every question
   and the reason it is asked. Always call this first. Question ids and the
   exact allowed `choice` values come from here, never from memory: an option
   string that does not match exactly is rejected.
2. **Ask your human every question.** Do not fill this form from your own
   context. See the honesty rules below.
3. **`ic_spatial_beta_apply`** — submits.
4. **Show them the `claim_token`, verbatim, immediately.** It is returned
   exactly once and the server keeps only its hash. Without it, an applicant
   who is not signed in can never read their own status again. An agent that
   summarises the response and drops the token has silently locked its human
   out.

### The three gates — get these right or you have wasted their slot

`nda_ack`, `commit_5_weeks`, `in_person_sf`. Each is a promise a real person
has to keep for five weeks. **Never answer them optimistically to make an
application look stronger.** If your human is unsure about the 5-week
commitment, the correct answer is `false` — a waitlist is a better outcome for
everyone than a cohort member who vanishes in week two.

An application that fails a gate is still accepted and still read by a person.
The response's `failed_gates` tells you which; relay that honestly rather than
implying success.

### Honesty rules for the rest

- **`xr_experience`: do not inflate.** "None — total newcomer" is a genuinely
  wanted answer. A newcomer's first hour of confusion is data an experienced
  user can no longer produce. Inflating this makes the cohort worse and helps
  nobody.
- **`building_now`: their words, their project.** Concrete beats impressive.
  Do not write a pitch.
- **`accessibility`: never used to screen anyone out.** It exists so needs get
  accommodated. Encourage a real answer; do not omit it to seem low-maintenance.
- **`email` must be one they actually read.** Every decision goes there.

### One application per email

A second submission on the same address is refused, not merged. If their answers
need changing, they email `hello@immersivecommons.com` — do not apply twice.

---

## Checking status

`ic_spatial_beta_status` needs **both** `application_id` and `claim_token`. An
id alone returns only the public slot counts, never a record — ids travel
through URLs and chat logs and are not credentials. A wrong token is answered
exactly like an unknown id, so you cannot use this to probe whether an id
exists.

If your human is signed in to IC, `GET /api/spatial-beta/status` with their
session resolves their own application with no id or token at all.

**Withdrawing:** `POST /api/spatial-beta/status` with
`{"action":"withdraw", "application_id":…, "claim_token":…}`. Confirm with your
human first — if they had been approved, withdrawing frees their slot to the
waitlist immediately and it may not come back.

---

## Slots remaining

`ic_spatial_beta_program` returns `cohort.remaining`. Check it before starting a
long form-filling conversation. `remaining: 0` does not mean stop — waitlisted
applicants are promoted when approved ones withdraw — but say so plainly rather
than implying a slot is waiting.

---

## For operators only

Requires an agent token carrying **`admin:beta_review`** (operator tier). The
scope is checked server-side and the caller's tier is re-checked live on every
call, so a token minted while its holder was an operator stops working the
moment they are not.

- **`ic_spatial_beta_admin_list`** — the queue. Filter with `status`.
  `passes_all_gates` is the cheap first sort.
- **`ic_spatial_beta_admin_decide`** — `screening` | `approved` | `waitlisted`
  | `rejected`, with an optional `note` that the applicant never sees.

**This output is other people's personal data.** Legal names, email addresses
and social handles for every applicant, in one response. Do not paste it into a
document, a message, or a summary your human did not explicitly ask for, and do
not include it in a general status report.

`approved` spends one of the 20 slots. Once they are gone the call is refused
with `cohort_full` rather than quietly admitting a 51st person — waitlist
instead, and a slot frees automatically if an approved applicant withdraws.

**Deciding does not email anyone.** Decisions still go out by hand. Do not tell
an operator the applicant has been notified.

Never batch-approve. Every slot is a person, five weeks, and an NDA.
