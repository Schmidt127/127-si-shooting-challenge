# 08 — Testing Standards

**Status:** Active — audit and integrity practices (integrity over unit tests).

**Last updated:** 2026-07-05 (C-020 Test Intake — priority DEV harness)

---

## Philosophy

**Trust is everything.** Data integrity checks (extension audits + Python tools) are the primary “tests” for this system. Safe backfills require dry-run before any write.

---

## Core principle: fix the audit, not the data

**When an audit flags rows but investigation shows the data is correct, fix the audit — do not “repair” valid data to satisfy an outdated check.**

| Situation | Correct response |
|-----------|------------------|
| Audit uses wrong dedupe key (e.g. Enrollment+Achievement+Week for shot milestones) | Update audit logic to match current business rules |
| Business rules evolved; old audit assumption no longer holds | Document the rule change; update audit + [03-business-rules.md](./03-business-rules.md) if needed |
| True duplicate rows (same Source Key, same source record) | Safe backfill or manual delete **after** dry-run proves orphan risk |

**Example (2025–26):** H-001 — 090F flagged 9 “duplicate” unlock groups. Live investigation showed **multiple legitimate shot milestones in the same week** (unique `Milestone Source Key` each). **No rows deleted.** Audit updated to dedupe shot milestones on Source Key only.

**Before any backfill that deletes or merges rows:** Confirm the audit failure is a **true positive**, not a false positive from an evolved rule.

---

## Audit-first workflow

1. Run **audit** extension script (dry-run) → JSON with counts and sample record IDs.
2. **Investigate** — if counts look wrong, re-read business rules before assuming data is broken.
3. Fix via **safe-backfill** with `DRY_RUN=true`, then `CONFIRM_WRITE=true` in batches — **only for true positives**.
4. Re-run audit until clean (or until remaining flags are accepted/documented).
5. Run **field coverage** / legacy cleanup when appropriate.

---

## Canonical sources

| Doc | Content |
|-----|---------|
| [../../airtable/extension-scripts/audits/README.md](../../airtable/extension-scripts/audits/README.md) | **Pipeline audits Stages A–J + 090** |
| [../../airtable/extension-scripts/safe-backfills/README.md](../../airtable/extension-scripts/safe-backfills/README.md) | Backfill run order |
| [../airtable/stage-j-legacy-cleanup.md](../airtable/stage-j-legacy-cleanup.md) | Stage J field cleanup |
| [../post-close-hygiene-2025-26.md](../post-close-hygiene-2025-26.md) | 2025–26 hygiene backlog |
| [../../tools/airtable/README.md](../../tools/airtable/README.md) | Python schema export and close-out tools |
| [../../.github/workflows/web.yml](../../.github/workflows/web.yml) | Web CI (lint, typecheck, test) |

---

## Pre-season checklist (2026–27)

- Stages A–J on **dev** base first, then **prod**, with test enrollments.
- Final 090A–090G adapted for new season.
- Schema export to `airtable/schema/snapshots/`.
- Re-verify audit dedupe keys match [03-business-rules.md](./03-business-rules.md) Source Key patterns.

Dev base setup: [development-base-setup.md](../development-base-setup.md) (V2-015).

---

## Test Intake harness (C-020) — priority DEV build

**After 066 v3.1 DEV test passes**, build **C-020** on DEV first. Full spec: [testing-and-intake-architecture.md](../testing-and-intake-architecture.md) § C-020.

| Rule | Standard |
|------|----------|
| Environment | **DEV first** — `appTetnuCZlCZdTCT` |
| Test identification | **No `Is Test Record?`** on pipeline tables |
| **OMNI rejected** | No **Test Status** or test flags on Submissions, Submission Assets, Homework Completions, Video Feedback, XP Events, WAS — [testing doc § OMNI correction](../testing-and-intake-architecture.md#omni-correction--rejected-2026-07-05) |
| Operator trigger | **`Run Test?`** on **Test Intake table only** |
| Enrollments | Schmidt/testing + retained DEV test enrollments (`Active?` false) |
| Verification | Testing views by Enrollment link; Stages A–H audit dry-runs |
| Downstream chain | Documented in C-020 — **023** skipped if Enrollment pre-linked; **009→013/020→070→022** expected |

**DEV build sequence (V2-015):** 066 DEV test → **C-020** → promotion doc → prod mirror (structure only).

---

## Full standalone doc

_Make webhook smoke tests: [development-base-setup.md](../development-base-setup.md) Step 3._
