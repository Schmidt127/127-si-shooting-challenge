# Empty-Week Weekly Email — Decision Preparation (SC-035)

**Status: DECISION NEEDED — Mike decides. This document prepares the decision; it does not make it.**

| Field | Value |
|---|---|
| Prepared | 2026-07-23 (Agent 5 overnight — communications) |
| SC item | SC-035 (guaranteed Weekly Athlete Summary) — email-send policy portion |
| Current design default | **Send always** (C-011 / 118 design arms every Active enrollment with a cleaned email) |
| Blocking? | No — 118/119 are not yet installed in PROD; decision needed before Live enable |

## Question

When an athlete has **zero activity** in a week (no submissions, no homework, no Zoom, no video), should the Sunday parent email still send?

Important distinction: the **Weekly Athlete Summary record is always created** for every Active enrollment × ended week regardless of this decision (that is the SC-035 guarantee, and 118 does it). This decision only controls whether the **email sends** for an empty week.

## Option 1 — Send always (current design default)

Every Active enrollment with a cleaned email gets the Sunday email even when every section reads "No items recorded this week."

- **Parent experience:** Predictable weekly rhythm; parents learn to expect the email. But an all-zero email can read as a public report card of inactivity — some parents experience this as nagging, others as useful accountability.
- **Operational impact:** Simplest pipeline: no new logic; volume = active enrollment count every week; easiest to monitor ("N active = N sends or investigate").
- **Implementation impact:** None. 072/118/119/074 already behave this way.
- **Risk:** Repeated empty-week emails train parents to ignore the email — the weeks that matter get lost.

## Option 2 — Skip silently

118 (or 072) skips arming/building when the WAS shows zero activity.

- **Parent experience:** No noise, but also no signal — a parent whose athlete quietly stopped for three weeks hears nothing, which undermines the program's accountability promise.
- **Operational impact:** Send counts fluctuate; "missing" emails become indistinguishable from failures without checking the skip reason. Monitoring needs a `skipped_empty_week` action code.
- **Implementation impact:** Small: one gate in 118 (arm loop) with a new action output. 072/074 unchanged. ~15 lines + tests.
- **Risk:** Silence during drop-off is exactly when a touchpoint helps.

## Option 3 — Send abbreviated encouragement

Empty weeks send a short template: "No activity logged this week — here's the weekly goal and the fastest way to get back on track," instead of the full zero-filled stats email.

- **Parent experience:** Best of both — rhythm preserved, message honest, framing positive rather than a wall of zeros.
- **Operational impact:** Same predictable volume as Option 1; one extra template to maintain.
- **Implementation impact:** Moderate: 072 needs an `emptyWeek` branch selecting an alternate body (subject suffix "Let's get back out there"), plus tests. The build/send/dedupe machinery is unchanged. Roughly a half-day including template copy (copy should come from ChatGPT per workflow, Phase 2/4).
- **Risk:** Template tone must be encouragement, not shame; needs Mike/ChatGPT copy review before Live.

## Recommendation

**Option 3** for the season, **Option 1** as the interim behavior until the encouragement template copy exists. Rationale: the weekly email is the program's accountability heartbeat; skipping silently (Option 2) deletes the heartbeat exactly when it matters, while full zero-stat emails (Option 1) are technically honest but motivationally poor. Option 1 is acceptable to launch with because early weeks with an empty base will have Schmidt-only traffic anyway.

## What Mike should do

1. Pick 1, 2, or 3 (or 1-now-3-later as recommended).
2. If 3: request the empty-week template copy from ChatGPT (Phase 2), then hand to Cursor for the 072 branch + tests.
3. Record the decision in `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` SC-035 "Mike Decision" column.
