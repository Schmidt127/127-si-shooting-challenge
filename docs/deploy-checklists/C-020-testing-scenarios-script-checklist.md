# C-020 — Testing Scenarios script checklist (future)

**Backlog:** C-020  
**Status:** **Paused** — schema complete; **G1–G3** doc gaps + sequencing approval before implementation ([review](./phase-2b-engineering-review-2026-07-06.md) § C-020)  
**Environment:** DEV only (`appTetnuCZlCZdTCT`) until promotion doc + Mike approval

**Architecture:** [testing-and-intake-architecture.md](../testing-and-intake-architecture.md) § C-020  
**Table:** **Testing Scenarios** (`tblEQLsXTCwx0iOd8`) on DEV

---

## Why C-020 exists (justification)

| Finding | Why it matters |
|---------|----------------|
| **Manual DEV Submissions are not reliable** | Rows typed into Submissions may not run **023**, **005**, **009**, **010**, **031**, etc. unless shaped exactly like Fillout |
| **Manual rows are not enough** | Operator-created incomplete rows cannot validate pipeline behavior |
| **Testing Scenarios must create Fillout-shaped Submissions** | Only production-shaped intake produces trustworthy downstream state for **066**, upload, homework, and video tests |
| **066 depends on real pipeline state** | Shot milestone logic uses counted submissions from a enrollment that went through intake — not ad-hoc manual fields |

**066 DEV test** waits until C-020 can create a pipeline-ready Submission **or** until an existing real DEV Submission is identified that already completed intake. See [066 dev checklist](./066-v3.1-dev-deploy.md).

---

## C-020 Script Start Gates

### Required

- **Pipeline-ready submission path defined** for DEV testing — Fillout-shaped Submission via C-020 **or** verified existing DEV row ([066 dev deploy checklist](./066-v3.1-dev-deploy.md))

Do **not** begin GitHub script work until Mike approves starting C-020 implementation (after sequencing decision with ChatGPT/OMNI).

**Note:** **066** sandbox test is **blocked** on the same pipeline-ready submission requirement. Manual incomplete Submissions must **not** be used for **066** testing.

### Recommended (non-blocking)

- **Operator Assigned** uses **Collaborator** field (operator UX only — no effect on Testing Scenarios architecture or future script behavior)

---

## Engineering Test Framework — script behavior (required)

When implemented, the Cursor script **must** follow these steps in order:

| Step | Action | Writes to |
|------|--------|-----------|
| **1** | Read one **Testing Scenarios** row (trigger: **`Run Test?`** checked, unless automation design changes) | — |
| **2** | Validate **Related Enrollment** (linked enrollment exists and is allowed test enrollment) | — |
| **3** | Create a **normal Submission** shaped like Fillout (Enrollment pre-linked, activity date, shot fields, attachments as scenario specifies) | **Submissions only** — production-shaped, **no test metadata** |
| **4** | Link created **Submission** back to the **Testing Scenarios** row (**Linked Submission**) | **Testing Scenarios** link field only |
| **5** | Let **normal pipeline automations** run (do not manually chain **005**, **009**, **013**, **070**, etc.) | — |
| **6** | Write **Last Run Status**, **Last Run At**, **Actual Result**, and **Pass/Fail Notes** back to **Testing Scenarios** only | **Testing Scenarios** only |
| **7** | **Never** write test metadata to pipeline tables (Submissions, Submission Assets, Homework Completions, Video Feedback, XP Events, Weekly Athlete Summary, etc.) | — |

**After successful run:** uncheck **`Run Test?`** (operator trigger lives on **Testing Scenarios** only).  
**Dry Run?:** if checked, preview/log without pipeline writes — design detail at implementation time.

---

## Final DEV field list (OMNI — 2026-07-05)

Authoritative export: DEV base `appTetnuCZlCZdTCT`, table **Testing Scenarios** (`tblEQLsXTCwx0iOd8`).

| Field | Airtable type | Field ID | Script / operator role |
|-------|---------------|----------|------------------------|
| **Test Intake Name** | singleLineText (primary) | `fldqfcodjXsPpyl05` | Operator label — cosmetic rename to “Scenario Name” optional later |
| **Scenario Type** | singleSelect | `fldcTd7qaFhyKZp5Q` | Preset — Daily Submission, Homework, Homework + Video, Three Video Upload, Milestone Crossing, Perfect Week, Backdated Submission, Parent Feedback, Weekly Summary, Award Generation, Other |
| **Test Status** | singleSelect | `fldji9YCoxcTIR6Cu` | Operator workflow — Not Started, Queued, In Progress, Blocked, Completed, Rejected |
| **Operator Assigned** | collaborator | `fldTGPN6emJvYb03J` | Operator UX — recommended; does not affect script behavior |
| **Related Enrollment** | link → Enrollments | `fldPylkKBdhFTTDCL` | Required — Schmidt/testing or DEV test enrollment; pre-link on created Submission |
| **Submission Date** | date | `fldNCS0y5Ez4pFccA` | Maps to Submission activity date |
| **Intake Attachments** | multipleAttachments | `fldYubBWgAKHstQ6P` | Video/HW files → Fillout-shaped Submission attachments |
| **Scenario Requirements** | multilineText | `fldVWP6MVqrBXqa6J` | Operator scenario inputs / constraints |
| **Test Notes** | multilineText | `fldD8y9YrgIhjiqfu` | Operator notes |
| **Operator Feedback** | multilineText | `fldslXpxwlEBxousb` | Operator feedback |
| **Relevant Homework Completion** | link → Homework Completions | `fldD1xEqr5fyFluuN` | Optional — homework-linked scenarios |
| **Pipeline Entity Linked** | link → Final Reflection Quiz Submissions | `fldNtyAo1tZsRQXmB` | Optional — non-Submission pipeline targets when scenario requires |
| **Operator Priority** | singleSelect | `fldTJ17facY3V6rUf` | P1 - Urgent, P2 - High, P3 - Routine |
| **Automation Platform** | singleSelect | `fldEMLXIjQYgPpB4k` | Manual, Fillout, Make, Other — metadata only |
| **Expected Result** | multilineText | `fldvIibzIarXIOHlw` | Pass criteria |
| **Actual Result** | multilineText | `fld41YuEuFYTNAaOC` | Filled after run (script or operator) — **step 6** |
| **Pass/Fail Notes** | multilineText | `fldDfIl3muCcjV8U2` | Operator notes — **step 6** |
| **Last Run Status** | singleSelect | `fld4tedtEbwfa1cMB` | Not Run, Pass, Fail, Blocked, Error — **step 6** |
| **Last Run At** | dateTime (UTC) | `fld498KtmqKzJEOog` | Run timestamp — **step 6** |
| **Run Test?** | checkbox | `fldAjFqic7nEBWgBT` | Operator trigger — check to fire automation |
| **Dry Run?** | checkbox | `fldSSRZKRBMv9UfuA` | Preview without writes |
| **Linked Submission** | link → Submissions | `fld4DCoxCVBqmBzfh` | Back-link from created Submission — **step 4** |
| **Last Updated** | lastModifiedTime | `fldNrhrZIVIuhCctc` | Audit — read-only |
| **Test Submission Summary** | aiText | `fldcFA3EQZ4Btfvzc` | AI summary — read-only; not written by script |

### Inverse links on pipeline tables (read-only for script)

| Pipeline table | Inverse field | Purpose |
|----------------|---------------|---------|
| **Submissions** | **Testing Scenarios** | Back-link from **Linked Submission** |
| **Enrollments** | **Testing Scenarios** | Scenarios for test enrollment |
| **Homework Completions** | **Testing Scenarios** | HW-linked scenarios |
| **Final Reflection Quiz Submissions** | **Testing Scenarios** | Reflection-linked scenarios |

**Hard rule unchanged:** no test flags, **Test Status**, or framework fields on pipeline tables — only the normal inverse link field where OMNI added it.

---

## Open schema notes

| Item | Detail |
|------|--------|
| **Test Intake Name** (primary) | Legacy label from earlier naming — acceptable; optional rename to **Scenario Name** later. |

---

## Future Enhancements (Not Phase 2)

Intentionally deferred — do not build during Phase 2:

- **Testing Scenario Library**
- **Automatic Expected vs Actual validation**
- **Regression test suites**
- **Release certification runs**

---

## Hard rules

- Pipeline records must look as if created by **Fillout** — no `Is Test Record?`, no **Test Status** on pipeline tables.
- Framework fields (**Scenario Type**, **Test Status**, **Expected/Actual Result**, **Pass/Fail Notes**, **Last Run** fields) live on **Testing Scenarios only**.
- DEV first → promotion doc → Production mirror (structure only).

---

## After script exists

- [ ] Dry-run on DEV with one scenario row
- [ ] Verify downstream automations per [testing-and-intake-architecture.md § downstream map](../testing-and-intake-architecture.md#downstream-automations-expected-to-fire)
- [ ] Stages A–H audit dry-run on test Enrollment
- [ ] Promotion doc committed before prod
