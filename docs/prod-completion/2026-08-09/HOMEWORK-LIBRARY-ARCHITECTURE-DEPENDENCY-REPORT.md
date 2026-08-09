# Homework Library Architecture — Dependency Report

Date: 2026-08-09  
Environment: PROD `appn84sqPw03zEbTT` (code/repo side; no live writes from this PR)  
Related audit: [HOMEWORK-CURRICULUM-PHA-CROSS-YEAR-AUDIT.md](./HOMEWORK-CURRICULUM-PHA-CROSS-YEAR-AUDIT.md)

## Canonical model (target)

```text
Homework Library (tblUuxwYlX4EQ9MKE) — reusable content identity
        ↓
Program Homework Assignments (tblhA3maf7xOa8EUS) — sole current scheduling authority
        ↓
Submissions.Homework Name 1/2 — library RID (Fillout intake)
        ↓
Submission Assets → Homework Completions
```

**Schedule Key:** `Program Instance RID | Week RID | Grade Band RID | Homework Slot | Homework Library RID`

**Current PROD truth (reconciled):** PHA table is **empty**. No 90-row season seed. No historical PHA IDs are protected. Homework is assigned **just-in-time**.

---

## Classification legend

| Class | Meaning |
|-------|---------|
| **content** | Reads/writes reusable Homework Library fields only |
| **scheduling** | Uses PHA or Weeks/PI/calendar for when homework applies |
| **legacy-fallback** | Used library Week/Grade Band as schedule (removed in this PR) |
| **test-fixture** | Test harness / PWTEST / schema probes |
| **documentation** | Docs, snapshots, deploy checklists |
| **public-website** | `/shoot` homework catalog |
| **fillout** | External intake writing Homework Name 1/2 |
| **automation** | Airtable automation scripts |
| **migration** | Seed/backfill tools |

---

## `FBC Curriculum - SYNC` / Homework Library

| Location | Reference | Class | Action in this PR |
|----------|-----------|-------|-------------------|
| `005-…assign-week…js` | Removed library Week read | legacy-fallback → **removed** | v5.0 Activity Date + PHA validate |
| `033-…assign-homework…js` | Legacy Week+GB match | legacy-fallback → **removed** | v4.0 PHA-only |
| `067-…reflection-quiz.js` | `curriculum.Week` for HW17 | legacy-fallback → **removed** | v3.0 PHA week |
| `068-…deferred-summary…js` | HW17 library identity only | content | Renamed table; no Week read |
| `009-…create-submission-assets.js` | Homework Name 1/2 slot guard | content | **No change** (content only) |
| `020-…homework-completion.js` | Library via Submission HW Name | scheduling via PHA | **No weakening** (v3.3.0) |
| `072` / `076` email builders | `curr` table alias | content lookup | Renamed to Homework Library |
| `115` ETF scenario | pass/fail notes | test-fixture | Renamed |
| `web/lib/airtable/homework-queries.ts` | Catalog content load | public-website + PHA scheduling | Renamed; PHA-first unchanged |
| `web/lib/data/homework.ts` | Maps library → display | public-website | Content fields only |
| Extension audits / backfills | Historical probes | migration / documentation | Table name updates where active |
| Schema snapshots `airtable/schema/snapshots/**` | Historical schema | documentation | **Not edited** (point-in-time) |
| `tools/testing/seed_pha_from_curriculum.mjs` | Seeds PHA from library Week | migration | **Fail-fast obsolete** |
| Fillout forms (external) | Writes Homework Name 1/2 RIDs | fillout | **Operator:** filter choices to current PHA-assigned library RIDs per athlete context |

---

## `Program Homework Assignments`

| Location | Class | Notes |
|----------|-------|-------|
| `020` v3.3.0 | scheduling | Exact active PHA match; duplicate → fail closed |
| `033` v4.0 | scheduling | Sole WAS homework assign path |
| `005` v5.0 | scheduling | Validates HW1/HW2 selections against PHA after Week assignment |
| `067` v3.0 | scheduling | HW17 Week from PHA |
| `072` / `076` | scheduling | Email package reads PHA for display context |
| `web/…/homework-queries.ts` | public-website | Only active current-PI PHA rows surface on `/shoot` |
| HC.`Program Homework Assignment` | scheduling | Written by 020 |

---

## Homework Name 1 / Homework Name 2

| Location | Class | Notes |
|----------|-------|-------|
| Fillout → Submissions | fillout | Stores **library RID** (content identity) |
| `005` v5.0 | content + scheduling validation | Does not derive Week from names; validates PHA |
| `009` | content | Requires name for attachment slot |
| `020` | content + scheduling | Exact library RID + PHA provenance |
| Submission Assets lookups | content | Display only |

---

## Library scheduling fields (obsolete)

| Field | Class | Recommendation |
|-------|-------|----------------|
| `Week` | legacy-fallback | **DELETE** after PROD paste + proof |
| `Grade Band` | legacy-fallback | **DELETE** |
| `Homework Number` | content hint | **REVIEW** — keep as content metadata, not schedule |
| `Assignment Number` / `Order` | content | **KEEP** |
| `Active?` / `Published?` | content gate | **KEEP** (public catalog) |
| `Program` / `Program Instance` | legacy | **DELETE** if present |
| School-year fields | legacy | **DELETE** |
| `Assignment Full Name - Display` | display | **REVIEW** — refactor formula (see field matrix) |
| `Lesson Key` | legacy identity | **DELETE** or refactor without Week |
| Linked PHA / Submissions / Completions | inverse | **KEEP** |

---

## Fillout integration (repository trace)

Fillout writes directly to `Submissions.Homework Name 1/2` as linked Homework Library records. There is **no** in-repo Fillout webhook code; integration is configured in Fillout + Airtable.

**Required behavioral change (operator / Fillout config, not repo):**

1. Participant sees only homework **currently assigned** via active PHA for their enrollment context.
2. Stored value remains the **Homework Library RID**.
3. `005` validates that RID against PHA after Activity Date assigns Week.
4. `020` requires exact PHA match — misaligned Fillout choices fail closed (intentional).

---

## Regression coverage

`tools/testing/tests/test_homework_architecture_offline.mjs` — 17 cases per work package H.

---

## Files changed in this PR (active code)

- Automations: `005` v5.0, `033` v4.0, `067` v3.0, `068`, `072`, `076`, `115`
- Web: `homework-queries.ts`, `homework-queries.test.ts`
- Tests: `067`/`068` contracts, `test_homework_architecture_offline.mjs`, `run_005_023_chain.mjs`
- Tools: `seed_pha_from_curriculum.mjs` (obsolete guard)
- Docs: this report, field matrix, PROD checklist
