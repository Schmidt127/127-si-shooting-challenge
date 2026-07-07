# C-019 — Testing views verification checklist (manual Airtable UI)

**Backlog:** C-019 (Schmidt test enrollment) · pairs with **C-020** (Engineering Test Framework)  
**Wave:** 6 — Testing & sandbox  
**Status:** **Manual verification required** — repo cannot confirm live view definitions  
**Environment:** DEV base `appTetnuCZlCZdTCT` (verify on prod only if Mike explicitly promotes the same pattern)

**Related:**

- [testing-and-intake-architecture.md](../testing-and-intake-architecture.md) § C-019 / Testing views
- [C-020 Testing Scenarios script checklist](./C-020-testing-scenarios-script-checklist.md) — Automation **115** intake runs
- [web/docs/airtable-views.md](../../web/docs/airtable-views.md) — **Web app views only** (`Web - Leaderboard`, etc.) — not Schmidt Testing views

---

## Why OMNI cannot confirm this

OMNI (and Cursor agents working from GitHub) **cannot inspect Airtable view definitions or filter groups** in the current workflow. Schema exports document **fields and tables**, not per-view UI filters, sort order, or hidden columns.

| What the repo *can* document | What only Mike can confirm in Airtable UI |
|------------------------------|------------------------------------------|
| Required view name (`Testing`) | Whether a view named `Testing` exists on each table |
| Required filter field + value | Whether the filter group matches exactly |
| Forbidden filters (no test flag, no `Active?`) | Whether extra AND/OR conditions were added |
| Schmidt enrollment record ID | Whether the picker shows the correct enrollment label |

**Do not ask OMNI to audit view metadata.** Use this checklist in the Airtable UI after C-020 runs or when onboarding a new DEV clone.

---

## Schmidt test enrollment (locked reference)

| Item | Value |
|------|--------|
| **Enrollment label** (filter picker) | `Schmidt, Testing - 2025-2026` |
| **Enrollment record ID** | `recgP9qZYjAhE7NXm` |
| **Athlete record ID** | `recgqVstObQRzgXJF` |
| **`Active?`** | **false** (standings/audits only — pipeline still runs) |
| **Test flag on pipeline rows** | **None** — filter by **Enrollment link**, not a checkbox |

Source: [C-020 script checklist](./C-020-testing-scenarios-script-checklist.md) § G3.

---

## Required Testing view pattern (all pipeline tables)

| Rule | Requirement |
|------|-------------|
| **View name** | `Testing` (exact spelling; create if missing) |
| **Filter** | Linked enrollment field **=** `Schmidt, Testing - 2025-2026` |
| **Forbidden** | `Is Test Record?`, `Active?`, `Test Status`, or any test-checkbox filter on pipeline rows |
| **Avoid unless documented** | Date ranges, submission status, week filters, “counted only”, upload status, etc. |
| **Why no `Active?` filter** | Schmidt enrollment is intentionally inactive for leaderboard visibility; `Active? = false` rows must still appear in Testing views |

After a **115** live run, row counts in these views should increase for the tables touched by that scenario (Daily → Submissions + downstream; Homework → + Homework Completions; Video → + Submission Assets + Video Feedback).

---

## Manual Airtable UI steps (repeat per table)

1. Open base **127 SI Shooting Challenge (DEV)** — `appTetnuCZlCZdTCT`.
2. Open the **table** from the checklist below.
3. In the view tabs, select **`Testing`**, or **Create… → Grid view** named `Testing`.
4. Open **Filter** (toolbar).
5. Confirm filter group logic is **AND** (default) unless you intentionally documented OR groups elsewhere.
6. Confirm **one** enrollment condition:
   - **Field:** the table’s enrollment link field (see table column below — usually `Enrollment`; Submission Assets uses `Enrollment - Linked`).
   - **Operator:** `is` / `=`.
   - **Value:** `Schmidt, Testing - 2025-2026` (record `recgP9qZYjAhE7NXm`).
7. Confirm **no** filter on `Is Test Record?`, `Active?`, or framework fields from **Testing Scenarios**.
8. Confirm **no** date/status/week filters unless you added them on purpose and noted them in **Notes** below.
9. Record the **visible row count** (footer) in the checklist.
10. Optional sanity check: open one visible row → enrollment link resolves to `Schmidt, Testing - 2025-2026`.

**Sign-off block** (copy per run):

| Field | Value |
|-------|--------|
| Verifier | |
| Date | |
| Base | DEV `appTetnuCZlCZdTCT` |
| Trigger context | e.g. post C-020 Test D, new clone, quarterly hygiene |

---

## Per-table verification matrix

Enrollment link field names below match **prod schema snapshot 2026-07-06** (`schema_doc_appn84sqPw03zEbTT_20260706_161830.md`). If DEV field labels differ, use the link field that points to **Enrollments** and note the label in **Notes**.

| # | Table | Required view name | Required filter field | Required filter value | Forbidden filters | Verified? | Visible row count | Notes |
|---|-------|-------------------|----------------------|----------------------|-------------------|-----------|-------------------|-------|
| 1 | **Submissions** | `Testing` | `Enrollment` | `Schmidt, Testing - 2025-2026` | `Is Test Record?`, `Active?`, date/status/week unless documented | ☐ | | |
| 2 | **Submission Assets** | `Testing` | `Enrollment - Linked` | `Schmidt, Testing - 2025-2026` | same + do not filter on upload status for default Testing view | ☐ | | |
| 3 | **Homework Completions** | `Testing` | `Enrollment` | `Schmidt, Testing - 2025-2026` | same | ☐ | | |
| 4 | **Video Feedback** | `Testing` | `Enrollment` | `Schmidt, Testing - 2025-2026` | same | ☐ | | |
| 5 | **XP Events** | `Testing` | `Enrollment` | `Schmidt, Testing - 2025-2026` | same | ☐ | | |
| 6 | **Weekly Athlete Summary** | `Testing` | `Enrollment` | `Schmidt, Testing - 2025-2026` | same | ☐ | | |
| 7 | **Streak Occurrences** | `Testing` | `Enrollment` | `Schmidt, Testing - 2025-2026` | same | ☐ | | |
| 8 | **Athlete Achievement Unlocks** | `Testing` | `Enrollment` | `Schmidt, Testing - 2025-2026` | same | ☐ | | |

---

## Post C-020 smoke (optional row-count expectations)

Use after Automation **115** live writes on DEV. Counts are **examples**, not pass/fail thresholds — record what you see.

| 115 scenario | Tables that should gain rows | DEV reference (2026-07-07) |
|--------------|------------------------------|----------------------------|
| Homework live (Test B) | Submissions, Submission Assets, Homework Completions | Submission `reca8SxXfri7aRZiB` |
| Video live (Test D) | Submissions, Submission Assets (×2), Video Feedback (×2) | Submission `recj2rU2XtmCGBNpn` |
| Daily Submission | Submissions + XP / WAS downstream per automations ON | See C-020 checklist |

If counts are zero but **115** reported Pass, check: wrong view filters, wrong enrollment picker, automations OFF, or rows linked to a different test enrollment.

---

## Out of scope for this checklist

| Item | Where instead |
|------|----------------|
| **Testing Scenarios** operator table | [C-020 script checklist](./C-020-testing-scenarios-script-checklist.md) |
| **Web** leaderboard / catalog views | [web/docs/airtable-views.md](../../web/docs/airtable-views.md) |
| Other DEV test enrollments (5 retained) | Separate views or duplicate `Testing` pattern with documented enrollment ID — not Schmidt MVP |
| Creating Airtable fields or automations | OMNI / Mike — no repo script changes |

---

## Completion criteria (C-019 Testing views)

- [ ] All **8** tables have a `Testing` view.
- [ ] Each view filters **only** by Schmidt enrollment link (no test flag, no `Active?`).
- [ ] Verifier, date, and row counts recorded above.
- [ ] Any intentional extra filters documented in **Notes** with reason.

When complete, update [v2-change-backlog.md](../v2-change-backlog.md) **C-019** status if Mike promotes from `queued` to `done (DEV)`.
