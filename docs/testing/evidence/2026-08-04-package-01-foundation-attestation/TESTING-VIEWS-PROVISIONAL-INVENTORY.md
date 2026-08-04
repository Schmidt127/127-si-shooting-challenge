# Testing Views — Provisional Inventory (Omni-reported)

| Field | Value |
|-------|--------|
| Date | 2026-08-04 |
| Source | Omni Package 1 Part 1 |
| Spec authority | `docs/overnight/testing-integrity/TESTING-VIEWS-MIKE-ACTIONS.md` |
| Creation claim | **Omni-reported** — not screenshot-proven |
| Record counts | **Unverified** |
| Schmidt visibility | **Unverified** (no screenshots; Omni “Yes” alone insufficient) |
| Field lists | Omni used “etc.” / generic labels — **need UI confirmation** |

Schmidt Enrollment RID (spec): `recgP9qZYjAhE7NXm`

---

## Inventory

| Table | Omni view name | Omni: existed before? | Omni filter | Omni sort | Omni # records | Omni Schmidt present | Spec target name (Mike-actions) | Evidence status |
|-------|----------------|----------------------|-------------|-----------|----------------|----------------------|---------------------------------|-----------------|
| Enrollments | `Testing - Schmidt Only` | Created | Record Id = `recgP9qZYjAhE7NXm` | Full Athlete Name - Backward (asc) | 1 | Yes | `Testing - Schmidt Enrollment` | Omni-reported; screenshot missing; name ≠ spec |
| Weeks | `Testing - All Weeks` | Created | None | Start Date (asc) | 25 | Yes (via links) | `Testing - Seeded Weeks` (manual include foundation week) | Omni-reported; **unfiltered**; weaker than spec |
| Submissions | `Testing - Schmidt Submissions` | Created | Enrollment = RID | Activity Date (desc) | 7 | Yes | `Testing - Schmidt Submissions` | Omni-reported; count unverified |
| Submission Assets | `Testing - Schmidt Assets` | Created | Enrollment - Linked = RID | Created Time (desc) | **280** | Yes | `Testing - Schmidt Assets` | Omni-reported; **280 ≈ base-wide orphan scale** — filter suspect |
| Homework Completions | `Testing - Schmidt Homework` | Created | Enrollment = RID | Submission Date (desc) | 0 | Yes (if present) | `Testing - Schmidt Homework Completions` | Omni-reported; empty ⇒ Schmidt not shown |
| XP Events | `Testing - Schmidt XP` | Created | Enrollment = RID | Created (desc) | **2547** | Yes | `Testing - Schmidt XP Events` | Omni-reported; **2547 ≈ full-table legacy** — filter suspect |
| Weekly Athlete Summary | `Testing - Schmidt Weekly Summary` | Created | Enrollment = RID | Week (asc) | 2 | Yes | `Testing - Schmidt WAS` | Omni-reported; name ≠ spec; count unverified |
| Video Feedback | `Testing - Schmidt Video Feedback` | Created | Enrollment = RID | Created (desc) | 1 | Yes | `Testing - Schmidt Video Feedback` | Omni-reported |
| Zoom Meetings | `Testing - All Meetings` | Created | None | Start Time (desc) | 2 | Yes (if linked) | *(not in priority 1–10 list)* | Omni-reported; extra / unfiltered |
| Zoom Attendance | `Testing - Schmidt Zoom Attendance` | Created | Enrollment = RID | Id (desc) | 4 | Yes | *(not in priority 1–10 list)* | Omni-reported; useful if filter real |
| Athlete Achievement Unlocks | `Testing - Schmidt Achievements` | Created | Enrollment = RID | Date Unlocked (desc) | 0 | Yes (if present) | `Testing` or `Testing - Schmidt Unlocks` | Omni-reported; empty |
| Testing Scenarios | `Testing - All Scenarios` | Existed | None | Test Intake Name (asc) | 21 | Yes (if linked) | `Testing - Schmidt Scenarios` (Enrollment filter) | Omni-reported; **unfiltered** vs spec Schmidt filter |

Omni also claimed email/queue coverage via WAS + XP Testing views only — no separate queue tables. Treat as **plausible** pending UI check.

---

## Spec gaps / mismatches to confirm in UI

1. **Name drift** — Omni names vs Mike-actions names (Enrollment, WAS, Homework Completions, Scenarios, Weeks).
2. **Missing Schmidt filter** — Weeks, Testing Scenarios, Zoom Meetings reported as unfiltered “All …”.
3. **Impossible Schmidt visibility** — HC / Unlocks at 0 records cannot show Schmidt; Omni still said Yes (if present).
4. **Filter efficacy** — Assets 280 and XP 2547 match `CURRENT-PROD-BASELINE.md` orphan totals (~278 assets / ~2538 orphan XP). If filters worked, Schmidt-only XP should be a handful, not ~2547.
5. **Visible fields** — Omni lists use “etc.” and non-canonical labels (`Award Status`, `XP Reason Debug`). Confirm exact field picker against Mike-actions visible-field lists.
6. **Screenshots** — Omni `[Screenshot 1]`–`[Screenshot 12]` were **not** provided; do not treat labels as proof.

---

## Provisional conclusion for SC-003

Views are **provisionally reported created**. SC-003 may advance **only after** Mike confirms in Airtable (sidebar names + open view showing Schmidt where data exists + non-orphan counts). See [`MANUAL-AIRTABLE-EVIDENCE-CHECKLIST.md`](./MANUAL-AIRTABLE-EVIDENCE-CHECKLIST.md) and [`PACKAGE-01-STATUS.md`](./PACKAGE-01-STATUS.md).
