# PKG-038 paste packet — Automation 066 v3.8

**Automation:** 066 — Achievements and Milestones — Create Shot Milestone Unlocks  
**Target version:** **v3.8**  
**Repository file:** `airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js`  
**Paste order:** **3 of 4** (after 054, before 059)

---

## Before paste — capture rollback baseline

Last attested PROD: **v3.5** on `recCyFEPeATOVNlr9` (2026-08-08) — `skipped_existing`, 8 unlocks, 25510 shots.

---

## Paste instructions

1. Turn **066 OFF**.
2. Copy from `* Version: v3.8` / `SCRIPT` block through end of file.
3. Paste into **066** script action; save.
4. Confirm **v3.8** / Last Updated **2026-08-14**.
5. Leave OFF until preflight audit passes.

---

## Trigger requirements (Airtable UI)

| Setting | Required value |
|---------|----------------|
| Table | **Enrollments** |
| Trigger type | **When record updated** (or matches conditions) |
| Condition | **Run Shot Milestone Check?** is checked |
| Optional | Active? checked (script also skips inactive) |
| Input `recordId` | Dynamic Enrollment ID |

**Re-entry after submission corrections:** **010** reconciliation or Mike must re-check `Run Shot Milestone Check?` after eligible shot-total changes.

---

## Expected input fields

**Enrollment:** Active?, Grade Band, Program Instance, Run Shot Milestone Check?

**Submissions (query):** Enrollment link, Activity Date, Total Shots Counted, Count This Submission? (= 1 only)

**Shot Milestones (config):** Active/Active?, Grade Band, Milestone Shot Count, Points Awarded

**Achievements (config):** Shot Milestone achievement by name / `SHOT_MILESTONE` rule key

**Existing unlocks:** Milestone Source Key, Active?, XP Award Status

**Weeks:** Start/End Date, Program Instance

---

## Output fields

| Output | Values |
|--------|--------|
| `statusOut` | `success` \| `skipped` \| `error` |
| `actionOut` | `created` \| `updated` \| `skipped_inactive` \| `skipped_no_submissions` \| `skipped_no_milestones` \| `skipped_zero_total` \| `skipped_existing` \| `error` |
| `errorOut` | message or empty |
| `debugStep` | last step |
| `enrollmentIdOut` | enrollment ID |
| `createdUnlocksOut` | count |
| `updatedUnlocksOut` | count |
| `skippedExistingUnlocksOut` | count |

---

## Fields written by 066

**Athlete Achievement Unlocks:** Enrollment, Achievement, Shot Milestone, Milestone Source Key, Milestone Activity Date, Week, XP Award Status (Pending), Active?, Notes (optional v3.8).

**Enrollments:** clears `Run Shot Milestone Check?` on success/skip (not on error).

**Never:** XP Events (059 owns); Unlock Key formula; deletes unlock rows.

**Canonical key:** `SHOT_MILESTONE|<Enrollment ID>|<Shot Milestone ID>`

**Below threshold:** sets `Active?` false on exact unlock — never deletes.

---

## Enablement

Enable after 053 and 054, before 059.

---

## Post-paste smoke

1. On `recCyFEPeATOVNlr9`, check `Run Shot Milestone Check?`.
2. Expect `skipped_existing` if 8 unlocks still valid (no new creates).
3. On controlled Submission, reduce counted shots below one milestone threshold → rerun 066 → target unlock `Active?` false.
4. Restore shots → rerun → same unlock ID `Active?` true, `XP Award Status` Pending.

---

## Rollback

OFF → paste **v3.5** capture → restore trigger. Do not delete unlocks or XP Events.
