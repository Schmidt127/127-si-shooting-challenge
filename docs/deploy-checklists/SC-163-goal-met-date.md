# SC-163 — Goal Met Date (schema + Automation 122 + backfill)

**Status:** Ready for Mike review — **not live-complete** until steps below are done  
**Backlog:** SC-163  
**Production base:** `appn84sqPw03zEbTT`  
**Do not execute until Mike approves**

**Rule:** Production changes are not official until this document exists in GitHub. See [v2/04 § Official promotion documentation](../v2/04-ai-development-standards.md#official-promotion-documentation-required).

---

## What this fixes

`Goal Met Date` is currently a **lookup** from Award Recipients → Date Awarded. Product rule: first **Activity Date** the athlete’s counted shots crossed the target. Convert field + install writer + backfill blanks only.

---

## Ownership rule (final)

| Field | Meaning |
|---|---|
| **Goal Met?** | Formula: live `Total Shots Counted >= Target Goal Shots` |
| **Goal Met Date** | Writable date: first counted-submission Activity Date that crossed the target. Blank until met. Never overwrite. |
| **Award Recipients.Date Awarded** | Conquered Goal gift-card fulfillment — keep separate |

---

## Production promotion steps

Execute **in order**.

### 1. Schema (UI-only — Mike)

| # | Action | Exact spec | Done |
|---|--------|------------|------|
| 1 | Open **Enrollments** → field **Goal Met Date** (`fldohCsXsrU4hYqrJ`) | Currently lookup of Award Recipients → Date Awarded | [ ] |
| 2 | Change field type to **Date** | Date format: **Local** / US `M/D/YYYY` (date only; no time). Description: `SC-163: first Activity Date counted shots crossed Target Goal Shots. Blank until met. Never overwrite.` | [ ] |
| 3 | Confirm field is **writable** (not lookup/formula) | Automations can write the field | [ ] |
| 4 | Optional: add checkbox **Run Goal Met Date Check?** | Used for manual re-run of Automation 122; clear after run | [ ] |
| 5 | Expect existing lookup values to clear | Normal when converting lookup → date | [ ] |

**Do not** change `Goal Met?` formula. **Do not** delete Weeks / awards / payment fields.

After schema change, refresh snapshot when convenient:

```powershell
cd tools/airtable
python export_airtable_schema.py -v --out-dir ../../airtable/schema/snapshots/prod-YYYYMMDD-sc163
```

### 2. Automation 122 (capacity check first)

Airtable automation count is limited. **Confirm a free slot** before creating. Do **not** restore retired automations (006/043/075/077/111/112/115).

| # | Action | Exact | Done |
|---|--------|-------|------|
| 1 | Create automation (or reuse a free OFF slot renamed) | Name: `122 - Achievements and Milestones - Stamp Goal Met Date` | [ ] |
| 2 | Trigger table | **Enrollments** | [ ] |
| 3 | Trigger type | When a record matches conditions | [ ] |
| 4 | Conditions | `Goal Met?` **is not empty** AND `Goal Met Date` **is empty** (and optional `Active?` is checked) | [ ] |
| 5 | Input variable | `recordId` → triggering Enrollment record ID (dynamic) | [ ] |
| 6 | Paste script | From `airtable/automations/shooting-challenge/122-achievements-and-milestones-stamp-goal-met-date.js` — **skip GitHub header**; paste from production docblock through end | [ ] |
| 7 | Outputs | Map `statusOut`, `actionOut`, `errorOut`, `debugStep`, `enrollmentIdOut`, `goalMetDateOut`, `crossingSubmissionIdOut` | [ ] |
| 8 | Turn **ON** after Schmidt disposable test | | [ ] |

### 3. Extension backfill

| # | Action | Done |
|---|--------|------|
| 1 | Run `airtable/extension-scripts/safe-backfills/backfill-goal-met-date.js` with `DRY_RUN = true` | [ ] |
| 2 | Review planned rows (Athlete1 Schmidt → `2026-08-30` expected on current disposable base) | [ ] |
| 3 | Set `CONFIRM_WRITE = true`, `DRY_RUN = false`; re-run until `remainingCount = 0` | [ ] |
| 4 | Re-run probe: `python tools/airtable/sc163_goal_met_date_probe.py` — expect no `met_blank_date` for provable rows | [ ] |

### 4. Disposable live test (Schmidt only)

| # | Test | Expected | Done |
|---|------|----------|------|
| 1 | Athlete1 Schmidt `recZEwkkXTJanDlG6` Goal Met Date | `2026-08-30` | [ ] |
| 2 | Re-trigger 122 on same enrollment | `skipped_already_set` — date unchanged | [ ] |
| 3 | Athlete 2 Schmidt (6331/12000, not met) | Goal Met Date stays blank | [ ] |

---

## Rollback

1. Turn Automation 122 **OFF**.  
2. Do **not** convert Goal Met Date back to award lookup (that reintroduces pollution).  
3. Clearing a wrongly stamped date is a controlled manual edit only when Mike confirms the date was invented (should not happen with these scripts).

---

## Evidence (pre-install)

- Audit: [`docs/audits/SC-163-GOAL-MET-DATE-RELIABILITY.md`](../audits/SC-163-GOAL-MET-DATE-RELIABILITY.md)  
- Dry-run JSON: [`docs/audits/SC-163-goal-met-date-dry-run-20260905.json`](../audits/SC-163-goal-met-date-dry-run-20260905.json)
