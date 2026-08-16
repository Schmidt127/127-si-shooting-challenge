# PKG-038 paste packet — Automation 053 v5.5

**Automation:** 053 — Achievements and Milestones — Streak Occurrences — Rebuild and Upsert From Submissions  
**Target version:** **5.5**  
**Repository file:** `airtable/automations/shooting-challenge/053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js`  
**Paste order:** **1 of 4** (before 054)

---

## Before paste — capture rollback baseline

Record and save:

- Automation internal ID (if visible)
- Installed version string from Airtable editor
- ON/OFF state
- Full trigger configuration (table, type, conditions, watched fields)
- Input variable mapping (`recordId` = dynamic triggering record)
- Most recent successful run timestamp (if any)

**Rollback:** restore prior script body from saved editor export or Git tag matching captured version — see [PKG-038-ROLLBACK-PLAN.md](./PKG-038-ROLLBACK-PLAN.md). Do not delete Streak Occurrences or XP Events.

---

## Paste instructions

1. Turn **053 OFF**.
2. Open the GitHub file above at `git rev-parse HEAD`.
3. Copy from the production docblock (`/************************************************************************************************` or `* Version: 5.5`) through end of script.
4. **Skip** the GitHub-only header block at lines 1–23 (`/* Automation: … Status: Production Copy … */`).
5. Paste into the existing **053** automation script action; save.
6. Verify editor shows **Version: 5.5** / Last Updated **2026-08-14**.
7. Leave **053 OFF** until all four scripts are pasted and preflight audit passes.

---

## Trigger requirements (Airtable UI)

| Setting | Required value |
|---------|----------------|
| Table | **Submissions** |
| Trigger type | **When record updated** (or equivalent that fires on field corrections) |
| Watched fields (minimum) | **Enrollment**, **Activity Date**, **Count This Submission?**, **Total Shots Counted** |
| Conditions | Must fire on positive eligibility, exclusion (`Count This Submission?` → 0), date changes, and Enrollment-link corrections — **not** only on new submissions |
| Input `recordId` | **Dynamic** — Airtable record ID from triggering Submission |
| Fixed `rec…` input | **Forbidden** |

**Do not** require `Count This Submission? = 1` as the only positive filter if that blocks exclusion-driven rebuilds.

---

## Expected input fields (script reads)

From triggering Submission and related queries:

- `Enrollment` (link)
- `Activity Date`
- `Total Shots Counted`
- `Count This Submission?` (formula numeric)

From Enrollment (via link):

- `Program Instance`

From config queries:

- Achievements where `Trigger Type = Streak Length`, `Active?` checked
- Existing Streak Occurrences for that Enrollment
- Weeks scoped to Program Instance

---

## Output fields (automation script action outputs)

| Output | Values |
|--------|--------|
| `statusOut` | `success` \| `skipped` \| `error` |
| `errorOut` | message or empty |
| `debugStep` | last step reached |

Additional outputs may include counts — map all script `output.set` keys in Airtable if prompted.

---

## Fields written by 053

**Streak Occurrences:** Active?, Enrollment, Achievement, Streak Days, Streak Start/End Date, Week, Source Status, Source Submission Date, Trigger Submission Date, Last Evaluated At, Notes.

**Never written:** XP Events, Streak Occurrence Key (formula), Submission Base XP.

**v5.5 behavior:** new/restored occurrences created **without** `Source Status = Ready for XP`; separate batch update sets Ready for XP so **054** receives a record-update event.

---

## Enablement

Enable **053** only after:

1. 053/054/059/066 pasted (053 first)
2. Read-only audit preflight PASS
3. Trigger contracts verified per [PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md](./PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md)

Enable order: **053 → 054 → 066 → 059**.

---

## Post-paste smoke (controlled)

On one Schmidt Submission linked to `recCyFEPeATOVNlr9`:

1. Toggle `Count This Submission?` eligible state on a middle date in an existing streak block.
2. Confirm 053 run `statusOut=success`.
3. Confirm affected Streak Occurrence `Active?` and `Source Status` reconcile without duplicate canonical rows.
4. Confirm **054** runs afterward (Ready for XP handoff).

---

## Rollback instructions

1. Turn **053 OFF**.
2. Paste back the **captured pre-paste script** (prior version).
3. Restore trigger configuration from baseline screenshot.
4. Turn **053 ON** only if returning to known-good state.
5. Re-run read-only audit; do **not** delete occurrences or XP Events created during failed test.
