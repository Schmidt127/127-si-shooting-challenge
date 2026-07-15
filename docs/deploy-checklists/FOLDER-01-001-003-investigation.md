# Folder 01 (001 / 002 / 003) — Investigation

**Stage:** S26 · Workstream 6  
**Date:** 2026-07-14  
**Scope:** Analysis + offline contracts + plan — **no Airtable UI**, no consolidation paste tonight.

**Decision file:** [S26-folder01-decision.md](../overnight-runs/results/S26-folder01-decision.md)

---

## Scripts under review

| # | File | Version | Purpose (GitHub) |
|---|------|---------|------------------|
| **001** | `001-enrollment-intake-and-setup-find-or-create-athlete-and-link-enrollment.js` | v5.1 | Find/create Athlete; link + activate Enrollment |
| **002** | `002-enrollment-intake-and-setup-assign-grade-band-initial.js` | v8.1 | Assign Grade Band when blank (needs Athlete) |
| **003** | `003-enrollment-intake-and-setup-assign-grade-band-if-grade-changes.js` | v2.0 | Refresh Grade Band when formula flag = 1 |

---

## Trigger-doc contradiction (CONFIRMED)

Evidence: `docs/audits/DEV-automations-doc-table-slim-2026-07-14.json` (Automations **documentation** table — Rank 3; not live UI attestation).

| Automation (docs name) | Conditions recorded in docs table | Script-intended conditions |
|------------------------|-----------------------------------|----------------------------|
| **001** Find or Create Athlete *(leading space in docs name)* | Grade Band **empty** · Grade not empty · Athlete **not** empty | Athlete **empty** · identity fields present · Match Status Pending *(typical)* |
| **002** Assign Grade Band — Initial | Athlete **empty** · First/Last Name + Parent Email not empty · Match Status Pending | Grade Band **empty** · Grade not empty · Athlete **not** empty |
| **003** Assign Grade Band — If Grade Changes | Grade Band not empty · Grade not empty · Athlete not empty · Refresh Needed = 1 | **Matches** script + docs |

**Conclusion:** Docs-table conditions for **001 and 002 are swapped** relative to script PURPOSE and 002/001 RECOMMENDED TRIGGER blocks. **003 is coherent.**

GitHub 002 explicitly documents:

- Grade not empty · Athlete not empty · Grade Band empty · optional Ready for Grade Band Assignment? = 1

GitHub 003:

- Grade / Athlete / Grade Band not empty · Grade Band Refresh Needed = 1

GitHub 001 has **no** RECOMMENDED TRIGGER block (legacy header) — intent inferred from writes: runs when Athlete is not yet linked.

---

## Soft dependency model

```text
Enrollment created
  → 001 (Athlete empty) → Athlete linked / Match Status Linked
  → 002 (Athlete linked, Grade Band empty) → Grade Band assigned
Enrollment Grade change
  → formula Grade Band Refresh Needed = 1
  → 003 → Grade Band refreshed
```

| Edge | Type | If broken |
|------|------|-----------|
| 001 → 002 | Soft | 002 **throws** when Athlete blank |
| 002 ↔ 003 | Lifecycle split | Lost mid-season grade refresh if 003 folded carelessly |
| Docs swap vs live UI | Unknown until Mike opens views | If UI matches docs → broken intake; if UI correct → docs stale |

---

## Field ownership (writes)

| Field / table | 001 | 002 | 003 |
|---------------|-----|-----|-----|
| Athletes create/update | Yes | — | — |
| Enrollments.Athlete | Yes | read | read |
| Enrollments.Active? / Match Status | Yes | — | — |
| Enrollments.Grade Band (+ Auto Assign, Statuses, Last Grade Used) | — | Yes (blank-only assign) | Yes (refresh) |
| Grade Band Refresh Needed (formula) | — | **never write** | **never write** |

002 and 003 share the same Min/Max Grade matching idea; 003 gates on refresh formula; 002 skips when Grade Band already set.

---

## Combine analysis (plan only)

### Why not `combine_001_002_safely` tonight

1. Live UI trigger views **not** attested — only docs-table swap evidence.
2. Different primary write targets (Athletes vs Grade Bands).
3. 002 hard-errors without Athlete — combine needs careful sequencing / skip rules.
4. HARD gate: no Airtable UI consolidation tonight.

### Why `combine_with_conditions` (long-term)

- Same table (Enrollments), sequential intake stages, shared identity → grade-band pipeline.
- A single orchestrator *could* branch: if Athlete empty → 001 path; else if Grade Band empty → 002 path; else skip.
- **Only after** Mike confirms/fixes live views and docs-table conditions.

### Keep 003 separate

- Distinct mid-season lifecycle (Refresh Needed = 1).
- Folding 003 into 002/orchestrator risks missing grade-change refreshes or overwriting bands incorrectly.

---

## Offline test package

| Artifact | Path |
|----------|------|
| Contracts | `tools/airtable/tests/test_folder01_enrollment_contracts.py` |

Scenarios modeled:

1. Docs-table swap detection (001 conditions ≠ athlete-link intent).
2. Intended view predicates for 001 / 002 / 003.
3. Grade-band range matching (min/max inclusive).
4. Soft dependency: no Athlete → cannot assign band.
5. 003 refresh gate requires Refresh Needed + existing band.

Run: `python -m unittest tools.airtable.tests.test_folder01_enrollment_contracts -v`

---

## Mike verification checklist (UI — later)

1. Open DEV Enrollments views for **001** and **002**.
2. Confirm 001 view ≈ Athlete empty + identity fields (not Grade Band empty + Athlete linked).
3. Confirm 002 view ≈ Athlete linked + Grade Band empty + Grade present.
4. Confirm 003 view matches docs (already OK).
5. Fix Automations documentation table rows if they still show swapped conditions.
6. Optionally trim leading space on 001 docs name.

**Do not** merge scripts or delete automations in this step.
