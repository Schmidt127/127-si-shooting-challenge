# PKG-038 — Rollback plan

**Principle:** Restore **prior automation script versions and trigger configuration only**. Never delete XP Events, Athlete Achievement Unlocks, Streak Occurrences, Submissions, or athlete/enrollment records to “clean up” a test.

---

## When to rollback

- Wrong script version pasted
- Trigger contract does not match paste packet
- Duplicate or wrong-owner XP/unlock/occurrence created
- Withdrawal or restoration did not preserve same record IDs
- Audit reports new ownership/duplicate findings after paste or test
- Any email/Make activity during test window

**Not a rollback trigger:** correct inactive state on XP/unlock/occurrence (that is intended corrected-history behavior).

---

## Rollback sequence

### 1 — Stop automation immediately

Turn **OFF** the failing automation(s) only among **053, 054, 059, 066**. Do not disable 010, 031, 041, 042 unless separate incident.

| Automation | Record ID (2026-08-04 export) |
|---|---|
| 053 | `recgH5hQgJA9IfLQE` |
| 054 | `recb8cKBqAPjh1A2J` |
| 066 | `rec0qiy0iXVqrU3c2` |
| 059 | `recxDRvpiuvCeeAhC` |

### 2 — Preserve evidence

- Automation run history (all runs during test)
- Before-paste script export (saved in preflight)
- Trigger screenshots (before and after)
- Audit JSON (before, failure point, after)
- Evidence checklist rows

### 3 — Restore script body

For each affected automation:

1. Open saved **pre-paste** script text from Mike’s preflight export.
2. Paste into script action (replace PKG-038 body).
3. **Do not** paste an arbitrary older GitHub version unless Mike explicitly approves that version string matches last known good Production.

Repository pre-paste targets (for forward reference only — rollback goes **backward**):

| Automation | PKG-038 forward paste |
|---|---|
| 053 | [PKG-038-053-v5.5-PASTE.txt](./PKG-038-053-v5.5-PASTE.txt) |
| 054 | [PKG-038-054-v5.8-PASTE.txt](./PKG-038-054-v5.8-PASTE.txt) |
| 066 | [PKG-038-066-v3.8-PASTE.txt](./PKG-038-066-v3.8-PASTE.txt) |
| 059 | [PKG-038-059-v3.6-PASTE.txt](./PKG-038-059-v3.6-PASTE.txt) |

### 4 — Restore trigger configuration

Reapply **saved pre-paste** trigger table, type, conditions, watched fields, and dynamic `recordId` mapping.

**Known sensitive case:** if 059 had `Ready for 059 XP?` filter before PKG-038, restoring that trigger restores old behavior — document explicitly in rollback notes.

### 5 — Data containment (no deletes)

| Problem | Allowed | Forbidden |
|---|---|---|
| Wrong duplicate XP Event | Deactivate **exact wrong** event if Mike approves; prefer leave OFF and audit | Delete event; create replacement with new ID |
| Wrong unlock/occurrence | Deactivate exact row | Delete row |
| Test submission left disqualified | Restore submission fields per test plan | Delete submission |
| Active XP should be off | Set `Active?` false on **owned** event only | Bulk delete XP |

### 6 — Reconcile read-only

1. Run `audit-achievement-xp-pipeline-integrity.js` v2.1 → save `rollback-audit.json`.
2. Wait for formula/rollup settlement.
3. Let **041 → 042** run naturally; do not manual-write levels.

### 7 — Re-enable policy

| Outcome | Next step |
|---|---|
| Rollback to last known good script + trigger | Mike decides if/when to re-attempt PKG-038 after blocker fix |
| Partial paste (e.g. only 053) | Leave un-pasted automations at restored state; do not enable chain |
| Data ambiguous | Keep all four OFF until OMNI/schema repair package |

---

## Rollback does NOT include

- Deleting XP Events, unlocks, streak occurrences, submissions, enrollments, athletes
- Restoring retired automations **043** or **112**
- Pasting **041/042** changes as part of PKG-038 rollback
- Schema field create/rename/delete
- Reverting PKG-006R or PKG-036 work

---

## Post-rollback documentation

1. Update evidence folder with `ROLLBACK-NOTES.md` (date, cause, automations restored, final ON/OFF).
2. File blocker in ChatGPT backlog if schema/trigger could not be proven.
3. Do not mark PKG-038 complete in Completion Master until a future successful test.
