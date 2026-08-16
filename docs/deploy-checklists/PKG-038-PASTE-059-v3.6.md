# PKG-038 paste packet — Automation 059 v3.6

**Automation:** 059 — Achievements and Milestones — Create XP Event from Achievement Unlock  
**Target version:** **v3.6**  
**Repository file:** `airtable/automations/shooting-challenge/059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js`  
**Paste order:** **4 of 4** (last)

---

## Before paste — capture rollback baseline

Last attested PROD: **v3.5** (Perfect Week path PASS 2026-08-05). Milestone `Active?` lifecycle in v3.6 **not** Production-proven.

**Companion:** [059-perfect-week-trigger-coverage.md](./059-perfect-week-trigger-coverage.md) — Perfect Week must remain supported.

---

## Paste instructions

1. Turn **059 OFF**.
2. Copy from `* Version: v3.6` through end.
3. Paste into **059** script action; save.
4. Confirm **v3.6**.
5. Complete preflight audit before enablement.

---

## Trigger requirements (Airtable UI)

| Setting | Required value |
|---------|----------------|
| Table | **Athlete Achievement Unlocks** |
| Trigger type | **When record updated** or **created** (lifecycle must re-enter) |
| Watched fields (minimum) | **Active?**, **XP Award Status**, **XP Events**, **Enrollment**, **Shot Milestone**, **Week**, **Milestone Source Key** |
| Forbidden filter | **Shot Milestone is not empty** — blocks Perfect Week (058) |
| Forbidden filter | **Ready for 059 XP?** or **XP Events is empty** — breaks post-link formula |
| Input `recordId` | Dynamic unlock ID |

---

## Expected input fields

**Unlock:** Achievement, Enrollment, Week, XP Events, XP Award Status, Active?, Shot Milestone, Milestone Source Key, Milestone Activity Date, Weekly Athlete Summary, Source Key

**Achievement:** Reward Rule Key (`PERFECT_WEEK` \| `SHOT_MILESTONE`), names

**XP Reward Rules:** Rule Key, XP Amount, Active?

**Shot Milestones (milestone path):** Points Awarded, labels

**Weeks:** Week End Date (Perfect Week activity date)

**XP Events:** existing by Source Key and Achievement Unlock link

---

## Output fields

| Output | Values |
|--------|--------|
| `statusOut` | `created` \| `updated` \| `skipped` \| `error` |
| `actionOut` | action token |
| `errorOut` | message or empty |
| `debugStep` | last step |

---

## Fields written by 059

**XP Events:** Active?, Source Key, Enrollment, Week, Weekly Athlete Summary, Achievement Unlock, XP Points, XP Source, XP Bucket, XP Activity Date, XP Activity Date Source, Award Mode, etc.

**Unlock (update):** XP Award Status → Awarded, XP Awarded, XP Events link, Notes

**Shot milestone lifecycle (v3.6):** inactive unlock → deactivate same canonical XP Event; restored Pending → reactivate same event.

**Perfect Week:** unchanged behavior — do not regress 058→059 handoff.

---

## Canonical Source Keys

| Type | Key |
|------|-----|
| Shot milestone | `SHOT_MILESTONE|<Enrollment ID>|<Shot Milestone ID>` |
| Perfect Week | `PERFECT_WEEK|<Enrollment ID>|<Week ID>` |

---

## Enablement

Enable **last** after 053, 054, 066.

---

## Post-paste smoke

**Milestone path (Schmidt):**

1. Select one unlock with `Milestone Source Key` `SHOT_MILESTONE|recCyFEPeATOVNlr9|recWGiiyPsv5wKeWd` (or current inventory).
2. Touch unlock → 059 idempotent skip/update; same XP Event ID.
3. After 066 withdrawal test, 059 must deactivate linked milestone XP Event.
4. After restoration, same XP Event ID reactivates.

**Perfect Week regression:**

1. Do not filter Shot Milestone in trigger.
2. If a Pending Perfect Week unlock exists in test scope, confirm 059 still awards once.

---

## Rollback

OFF → paste **v3.5** capture → restore trigger. Never delete XP Events; use Active? lifecycle only.
