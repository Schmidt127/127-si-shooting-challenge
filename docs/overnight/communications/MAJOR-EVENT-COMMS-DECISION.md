# Major-Event Notifications — Decision Preparation (SC-044)

**Status: DECISION NEEDED — Mike decides. This document prepares the decision; it does not make it.**

| Field | Value |
|---|---|
| Prepared | 2026-07-23 (Agent 5 overnight — communications) |
| SC item | SC-044 (major-event notifications: level-ups, milestones — not daily XP) |
| Prior material | C-027 brainstorm; athlete/parent cell number fields already exist on Enrollments |
| Blocking? | No — nothing else depends on this; P2 |

## Scope

Notify on **major events only**: level-up, shot milestone crossed, achievement unlocked, Perfect Week earned. Explicitly **not** per-submission or per-XP-event noise. Weekly recap remains the Sunday email; major events are the "moment of celebration" channel.

## Decision 1 — Channel: email vs SMS

| | Email (existing Make/Gmail path) | SMS (new: Twilio or Make SMS module) |
|---|---|---|
| Infrastructure | Already exists — one more email type through the same 07x → Make pipeline; **no second email system** | New vendor/account, new secrets, new cost per message, new failure modes |
| Celebration feel | Weak — lands next to homework feedback | Strong — immediate, feels like an event |
| Compliance | Covered by existing enrollment contact | SMS requires explicit opt-in (TCPA); need consent capture in Fillout + stored flag |
| Cost | ~zero incremental | per-segment fees + Twilio number |

**Prepared recommendation:** start with **email** through the existing pipeline (fits "do not create a second email system"), design the send-key so SMS can be added later as a second delivery of the *same* message record, not a second system.

## Decision 2 — Recipient: athlete vs parent

- K–6: parent only (athlete emails are often parent-owned anyway).
- 7–12: parent + athlete (athlete cell/email where provided).
- Existing fields support both (`Parent Email - Cleaned`, `Athlete Email - Cleaned`, cell number fields exist but are unvalidated).

## Decision 3 — Opt-in model

- Email major-event notes: default ON with an "email Mike to opt out" line (consistent with current program emails).
- SMS (if ever): **default OFF, explicit opt-in only**, captured at enrollment (new Fillout field + Enrollments checkbox) — legal requirement, not a style choice.

## Engineering requirements (whichever way Mike decides)

- **Dedupe:** one notification per source record, enforced with the existing Source-Key discipline: `MAJOR_EVENT|{type}|{sourceRecordId}` (e.g. `MAJOR_EVENT|LEVEL_UP|recXpEvent…`). Rerun-safe: recheck before send, same pattern as 114.
- **Quiet hours:** send window 08:00–20:00 America/Denver; events detected outside the window queue until the next window (a `Notify After` field). Email can arguably ignore quiet hours; SMS must not.
- **Batching:** multiple events for one athlete within an hour collapse into one message ("2 new achievements + Level 3!") to avoid burst spam after a backfill or catch-up review.
- **Event types (initial catalog):** `LEVEL_UP`, `SHOT_MILESTONE`, `ACHIEVEMENT_UNLOCK`, `PERFECT_WEEK`. Each maps to an existing table so source linkage is a record link, not text.

## Implementation dependencies

1. **Email Message Center schema (SC-042)** — the natural home; see `EMAIL-MESSAGE-CENTER-DESIGN.md`. Building major events on EMC message rows avoids inventing per-event checkbox/status fields on four different tables.
2. Level-up detection hook (041/042 chain) and milestone/achievement/PW writers (066/059/057) each need one "create message row" step — no new XP logic.
3. Make scenario: reuse the existing email scenario with a new `sendType`; SMS would need a new scenario + secrets (never committed).
4. If SMS: Fillout consent field + Enrollments opt-in checkbox + number validation pass (SC-063 overlap).

## What Mike should do

1. Decide channel (recommendation: email first, SMS later or never).
2. Decide recipient split by grade band (recommendation above).
3. Decide opt-in posture for SMS if chosen.
4. Record decisions in the master (SC-044) and, if proceeding, authorize the EMC schema (SC-042) since major events should ride on it.
