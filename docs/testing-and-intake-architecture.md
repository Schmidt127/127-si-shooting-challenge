# Testing, intake validation, and flexible weeks

**Status:** V2 architecture / ops planning  
**Last updated:** 2026-07-04  
**Tracked in:** [close-out-considerations.md](./close-out-considerations.md) **C-017** – **C-020**

---

## Overview

| ID | Topic |
|----|--------|
| **C-017** | Fillout → **Athletes** intake validation and field hygiene |
| **C-018** | **Two calendars** — intake opens (early bird) vs challenge run dates (all in **Weeks** config) |
| **C-019** | **Schmidt test enrollment** — `Active?` = false for standings only; **no test flags** |
| **C-020** | **Test Intake harness** — production-identical pipeline, no Fillout |

---

## Owner decisions (2026-07-04)

| Decision | Choice |
|----------|--------|
| **Test identification** | **No `Is Test Record?` checkbox.** Base does not know a row is a test. |
| **Schmidt sandbox** | Dedicated Athlete + Enrollment; **`Active?` = false** — excluded from leaderboard, standings, close-out audits, production emails. |
| **Automation behavior** | **Same as production.** All intake, asset, upload, XP, and video-feedback automations run normally so failures surface. |
| **Testing views** | Filter by **Schmidt test Enrollment link** — not a test flag. |
| **Early bird** | Date on **Weeks** row = when app **starts accepting input** (intake open). |
| **Challenge run** | Separate configured period = when the **challenge officially runs** (Week 1+). |

---

## C-017 — Fillout intake validation (Athletes minimum)

### Target

1. **Fillout-side validation** — required fields, email format, name rules, duplicate warnings before Airtable.
2. **Airtable-side validation** — automation **001** fails loud on bad data.
3. **Athlete table hygiene** — Stage K pass; Fillout → Airtable field map documented.
4. **Test matrix** — new athlete, returning athlete, email variants, siblings, bad email.

### Related

- **C-012** Stage K · automation **001**

---

## C-018 — Intake open vs challenge run (date-driven Weeks)

### Two calendars (both Configuration — **Weeks** table and/or program season config)

| Concept | Meaning | Example |
|---------|---------|---------|
| **Intake open** | App and Fillout **start accepting** submissions | Early bird Mon–Wed: set **Weeks** row start date → intake opens that day |
| **Challenge run** | Official challenge period (Week 1, Week 2, …) | Week 1 starts Thursday (challenge start date) |

Early bird may be a **partial week** — still one **Weeks** row with start/end dates. When the operator sets the early bird start date, that is the day input opens.

### Target

- **All boundaries in Weeks config** — start date, end date, America/Denver, optional `Week Type` (e.g. `Early Bird`, `Regular`, `Final`).
- Optional per-row flags (Configuration): `Intake Open?`, `Counts for XP?`, `Counts for Leaderboard?` — tune per season without code changes.
- Automation **005** maps activity date → Weeks row by **date range only** — no hardcoded calendar in scripts.
- **Fillout / web** gate “form open” on intake-open date from config (not challenge-run date alone).

### Engine contract

*Submission activity date maps to the active Weeks row whose date range contains that date.*

Exact 2026–27 dates live only in **Weeks** rows at launch.

### Related

- Automation **005** · **Weeks** table schema extension

---

## C-019 — Schmidt test enrollment (visibility only)

### Intent

One permanent **Schmidt** Athlete + Enrollment exercises the **entire base** like any real athlete. The only difference is **production visibility** — not pipeline behavior.

### Rules

| Area | Schmidt test enrollment |
|------|-------------------------|
| **`Active?`** | **false** — never leaderboard, standings, close-out audits, production email cohorts |
| **Test flags on rows** | **None** — base treats all rows the same |
| **Automations** | **Run identically** — 009, 013, 020, 070, 022, 010, 065, etc. |
| **Athlete record** | **Never shared** with a live production enrollment |
| **Testing views** | `Enrollment = Schmidt test enrollment` on pipeline tables |

### Distinction from C-010

**C-010** hardens `Active?` for athletes **removed from production** mid-season (should not earn XP/emails).

**Schmidt test** is a **permanent test identity**: `Active?` = false for **visibility**, but pipeline must still run for debugging. Test Intake **pre-links Enrollment** on Submissions (because **023** will not auto-link inactive enrollments from Fillout).

### Known follow-up

Automations **056**, **066**, **101** skip inactive enrollments today. Upload/video/homework tests (009→070→S3) do not depend on those. If full streak/milestone parity is needed on Schmidt rows, revisit without adding a test checkbox (e.g. document manual trigger or narrow Active? semantics for standings only).

---

## C-020 — Test Intake harness (production-identical)

### Problem

Fillout for every pipeline test is slow. Need one Airtable row → full pipeline run → inspect results.

### Design principles

1. **No test metadata on pipeline rows** — Submission Assets, Video Feedback, etc. look like production.
2. **`Run Test?` lives only on the Test Intake table** — operator trigger, auto-unchecks after run.
3. **Creates the same shapes Fillout would** — fields 005/009/023 expect.
4. **Pre-links Schmidt Enrollment** on Submission so automations chain without Fillout.

### Test Intake table (operator)

| Field | Purpose |
|-------|---------|
| **Enrollment** | Default: Schmidt test enrollment |
| **Activity date** | Drives **005** week assignment (C-018) |
| **Shots / makes / attempts** | Daily submission fields |
| **HW attachments** | Homework file(s) as needed |
| **Video attachments** | One or **multiple** files (see example below) |
| **`Run Test?`** | Check to fire → script runs → **unchecks** for re-run |

Optional: **`Dry Run?`** on Test Intake only — preview without writes.

### Extension script behavior

1. Read Test Intake row when `Run Test?` is checked.
2. Create **Submission** with Enrollment linked, activity date, shot fields, attachments — **same as Fillout intake**.
3. Do **not** set any “test” flag on created rows.
4. Uncheck `Run Test?`.
5. Let existing automations run (009 → assets → 020/013 → 070 → Make/S3 → 022 writeback → …).

### Example — three video files

Operator goal: verify upload engine creates **3 S3 URLs** and **3 Video Feedback** rows for coach review.

```
Test Intake row:
  Enrollment → Schmidt (inactive)
  Activity date → chosen test date
  Video attachments → 3 files
  Run Test? → checked

Expected pipeline (same as production):
  Submission created
  → 009: 3 Submission Asset rows
  → 013: link/create Video Feedback per asset
  → 070b: each asset → Make → AWS S3 → Canonical File URL writeback
  → 022: sync URLs to child records

Verify in Testing views:
  Submission Assets — 3 rows, Upload Status = Uploaded, 3 canonical URLs
  Video Feedback — 3 rows ready for coach feedback
```

### Testing views (every submission-data table)

**View name:** `Testing`  
**Filter:** `Enrollment` (or linked enrollment) **= Schmidt test enrollment**

Tables (minimum): Submissions, Submission Assets, Homework Completions, Video Feedback, XP Events, Weekly Athlete Summary, Streak Occurrences, Athlete Achievement Unlocks.

### Workflow

```
1. Test Intake → new row, set scenario (date, shots, 3 video files, …)
2. Check Run Test? → script creates Submission → checkbox clears
3. Wait for automation chain (or run extension audit)
4. Open Testing views → confirm URLs, row counts, failures
5. Edit row → check Run Test? again to re-run scenario
```

---

## Implementation priority

| Order | Item | Why |
|-------|------|-----|
| 1 | **C-020** | Fast pipeline testing without Fillout |
| 2 | **C-019** | Document Schmidt enrollment ID; Testing views |
| 3 | **C-018** | Intake-open vs challenge-run dates before launch |
| 4 | **C-017** | Fillout validation before enrollment wave |

---

## Related documents

| Doc | Topic |
|-----|--------|
| [close-out-considerations.md](./close-out-considerations.md) | C-010, C-017–C-020 |
| [asset-storage-migration.md](./asset-storage-migration.md) | S3 URLs on test runs |
| [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md) | Phase 5 + 7 |
| [data-flow/submission-to-xp-flow.md](./data-flow/submission-to-xp-flow.md) | Submission pipeline |
