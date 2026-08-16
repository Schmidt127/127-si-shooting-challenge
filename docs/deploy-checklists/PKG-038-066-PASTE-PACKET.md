# PKG-038 Paste Packet — Automation 066 v3.8

**Automation name:** `066 - Achievements and Milestones - Create Shot Milestone Unlocks`  
**Automation record ID (2026-08-04 export):** `rec0qiy0iXVqrU3c2` — **re-verify in UI**  
**Repository script:** `airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js`  
**Copy-ready body:** [PKG-038-066-v3.8-PASTE.txt](./PKG-038-066-v3.8-PASTE.txt)

---

## Paste instructions

1. Turn **066 OFF**.
2. Screenshot version, trigger, ON/OFF.
3. Paste **PKG-038-066-v3.8-PASTE.txt**.
4. Trigger: **Enrollments** when `Run Shot Milestone Check?` is checked.
5. Input `recordId` = dynamic triggering **Enrollment** ID.
6. Leave **OFF** until 053 → 054 pasted and preflight complete; enable order: 053, 054, **066**, 059.

---

## Required trigger

| Setting | Value |
|---|---|
| Table | **Enrollments** |
| Type | **When a record matches conditions** (or updated + checkbox) |
| Condition | `Run Shot Milestone Check?` is checked |
| Optional | `Active?` is checked (script also skips inactive) |
| Input `recordId` | Triggering Enrollment ID (dynamic) |

**Upstream:** 010 reconciliation sets `Run Shot Milestone Check?` after counted submission changes.

---

## Expected inputs

| Input | Source |
|---|---|
| `recordId` | Triggering Enrollment |

---

## Expected outputs

| Output | Values |
|---|---|
| `statusOut` | `success` \| `skipped` \| `error` |
| `actionOut` | `created`, `updated`, `reconciled`, `skipped_inactive`, `skipped_existing`, … |
| `errorOut` | Message or empty |
| `debugStep` | Last step |
| `enrollmentIdOut` | Enrollment ID |
| `createdUnlocksOut` / `updatedUnlocksOut` / `skippedExistingUnlocksOut` | Counts |

---

## Fields written (summary)

**Athlete Achievement Unlocks:** canonical `SHOT_MILESTONE|{enrollment}|{shotMilestone}` rows — links, `Milestone Activity Date`, `Week`, `XP Award Status` = `Pending`, `Active?`, optional `Notes` (v3.8: field may be absent).

**Enrollments:** clears `Run Shot Milestone Check?` on success/skip (not on error).

**Never writes:** `Unlock Key`, XP Events.

---

## Rollback

1. Turn **066 OFF**.
2. Restore saved pre-paste script + trigger.
3. Do not delete unlock rows; below-threshold state should be `Active?` = false, not deleted.
4. Re-run audit.

---

## Dependency sheet

[PKG-038-FIELD-DEPENDENCY-SHEET.md](./PKG-038-FIELD-DEPENDENCY-SHEET.md) § 066.
