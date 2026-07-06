# C-020 — Testing Scenarios script checklist (future)

**Backlog:** C-020  
**Status:** **Blocked** — wait for OMNI final **Testing Scenarios** field list on DEV  
**Environment:** DEV only (`appTetnuCZlCZdTCT`) until promotion doc + Mike approval

**Architecture:** [testing-and-intake-architecture.md](../testing-and-intake-architecture.md) § C-020  
**Do not start GitHub script until:** OMNI completes final **Testing Scenarios** table revision and field list is recorded in a promotion doc.

---

## Engineering Test Framework — script behavior (required)

When implemented, the Cursor script **must** follow these steps in order:

| Step | Action | Writes to |
|------|--------|-----------|
| **1** | Read one **Testing Scenarios** row (trigger record) | — |
| **2** | Validate **Related Enrollment** (linked enrollment exists and is allowed test enrollment) | — |
| **3** | Create a **normal Submission** shaped like Fillout (Enrollment pre-linked, activity date, shot fields, attachments as scenario specifies) | **Submissions only** — production-shaped, **no test metadata** |
| **4** | Link created **Submission** back to the **Testing Scenarios** row | **Testing Scenarios** link field only |
| **5** | Let **normal pipeline automations** run (do not manually chain **005**, **009**, **013**, **070**, etc.) | — |
| **6** | Write **Last Run Status**, **Last Run At**, **Actual Result**, and **Pass/Fail Notes** back to **Testing Scenarios** only | **Testing Scenarios** only |
| **7** | **Never** write test metadata to pipeline tables (Submissions, Submission Assets, Homework Completions, Video Feedback, XP Events, Weekly Athlete Summary, etc.) | — |

---

## Fields that live on Testing Scenarios only

| Field | Role |
|-------|------|
| **Scenario Type** | Scenario preset / label |
| **Test Status** | Operator workflow state (not on pipeline) |
| **Expected Result** | What a pass looks like |
| **Actual Result** | Filled by script or operator after run |
| **Pass/Fail Notes** | Operator notes |
| **Last Run Status** | Script run outcome |
| **Last Run At** | Timestamp |
| **Related Enrollment** | Schmidt/testing or DEV test enrollment |
| **Created Submission** (or equivalent link) | Back-link from step 4 |

**Final field names and types:** OMNI authoritative list — paste into this checklist when ready.

---

## Hard rules

- Pipeline records must look as if created by **Fillout** — no `Is Test Record?`, no **Test Status** on pipeline tables.
- **Testing Scenario Library** table — **future option only**; do not build now.
- DEV first → promotion doc → Production mirror (structure only).

---

## After script exists

- [ ] Dry-run on DEV with one scenario row
- [ ] Verify downstream automations per [testing-and-intake-architecture.md § downstream map](../testing-and-intake-architecture.md#downstream-automations-expected-to-fire)
- [ ] Stages A–H audit dry-run on test Enrollment
- [ ] Promotion doc committed before prod
