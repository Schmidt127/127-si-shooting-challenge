# SC-SEASON-SIM helper hygiene proposal

**Date:** 2026-09-03  
**Branch:** `docs/season-sim-helper-hygiene-proposal`  
**Scope:** Classify one-off Season Sim helper scripts and related audit artifacts.  
**Hard stop:** This document proposes only — **do not delete** files until Mike approves a follow-up PR.

## Classification legend

| Class | Meaning |
|---|---|
| **keep** | Needed for future simulation recovery, operator docs, or reusable harness |
| **archive** | Valuable evidence/history — move under `tools/season_simulation/archive/` or `docs/audits/archive/` later |
| **remove-after-approval** | One-off / superseded helper safe to delete only after Mike confirms |

## Guardrails (unchanged)

- No season simulation execute from this proposal
- No Airtable deletions from this proposal
- Preserve final evidence packs and canonical run registries
- Do not broad-`git clean` or force-delete untracked helpers in Mike’s working tree

---

## A. Underscore helper scripts (`tools/season_simulation/_*.py`)

Most `_*.py` files are **untracked session helpers** created during SC-SEASON-SIM-002 closeout / audits (not part of the packaged harness: `cli.py`, `execute.py`, `cleanup.py`, etc.).

### Audit helpers

| File | Classification | Rationale |
|---|---|---|
| `_audit_run_readonly.py` | **archive** | Generic readonly audit pattern; useful reference before SC-SEASON-SIM-001 |
| `_audit_run_deep.py` | **archive** | Deep pass companion; superseded by later pass scripts |
| `_audit_run_pass3.py` | **remove-after-approval** | Pass-specific; evidence already in `reports/audit-*` |
| `_audit_run_pass4.py` | **remove-after-approval** | Pass-specific; evidence already in reports |
| `_audit_investigate.py` | **remove-after-approval** | Ad-hoc investigation |
| `_audit_final_213135.py` | **archive** | Tied to final run `T213135Z` — keep until evidence pack reviewed |
| `_audit_followup_213135.py` | **archive** | Follow-up to final run |
| `_audit_settle_poll_213135.py` | **archive** | Settle/poll for final run |
| `_audit_weekly_email_072.py` | **archive** | Documents 072 weekly email probe path |
| `_audit_weekly_email_072_deep.py` | **archive** | Deep 072 companion |

### Cleanup helpers

| File | Classification | Rationale |
|---|---|---|
| `_cleanup_scan_extras.py` | **keep** (or fold into `cleanup.py`) | Scan pattern may be reused; prefer promoting logic later |
| `_cleanup_delete_extras.py` | **remove-after-approval** | Generic delete helper — dangerous if re-run blindly |
| `_cleanup_delete_extras_181332.py` | **remove-after-approval** | Run-scoped (`T181332Z`) |
| `_cleanup_delete_extras_202049.py` | **remove-after-approval** | Run-scoped (`T202049Z`) |
| `_cleanup_delete_extras_213135.py` | **remove-after-approval** | Run-scoped (`T213135Z`); evidence already recorded |
| `_cleanup_preverify_181332.py` | **archive** | Preverify for mid run |
| `_cleanup_preverify_202049.py` | **archive** | Preverify for mid run |
| `_cleanup_postverify_181332.py` | **archive** | Postverify companion |
| `_cleanup_postverify_202049.py` | **archive** | Postverify companion |
| `_prep_minimal_cleanup.py` | **keep** | Prep checklist helper for disposable cleanup |
| `_inventory_disposable_cleanup.py` | **keep** | Inventory generator — recovery useful |
| `_inventory_disposable_cleanup_v2.py` | **keep** | Newer inventory; prefer this over v1 after confirmation |
| `_execute_disposable_cleanup.py` | **keep** (gated) | Execution entry — keep but never run without Mike approval |
| `_postscan_disposable_cleanup.py` | **keep** | Post-cleanup scan |

### Probe / Hub / readiness / evidence

| File | Classification | Rationale |
|---|---|---|
| `_probe_072_hardcoded_id.py` | **remove-after-approval** | One-off WAS 072 probe |
| `_probe_072_one_was.py` | **remove-after-approval** | One-off |
| `_probe_074_079_one_was.py` | **remove-after-approval** | One-off email field probe |
| `_probe_was072.py` | **archive** | Useful 072 build reference |
| `_probe_was072_hw.py` | **archive** | Homework path reference |
| `_probe_was_build_errors.py` | **archive** | Build-error diagnosis notes in code |
| `_probe_was_email_fields.py` | **archive** | Email field contract probe |
| `_probe_disposable_leftovers.py` | **keep** | Leftover scan for recovery |
| `_hub_ensure_allowlist.py` | **keep** | Hub allowlist ensure — ops reusable (do not change Hub from hygiene PR) |
| `_hub_restrict_allowlist.py` | **keep** | Hub restrict counterpart |
| `_arm_weekly_send_213135.py` | **remove-after-approval** | Run-scoped weekly send arming |
| `_evidence_final_213135.py` | **archive** | Builds/finalizes evidence for `T213135Z` |
| `_readiness_extract.py` | **keep** | Readiness extraction reusable |

### Package markers (not underscore session helpers)

| File | Classification | Rationale |
|---|---|---|
| `__init__.py` / `__main__.py` | **keep** | Package entry |
| `cli.py`, `execute.py`, `cleanup.py`, `preflight.py`, `reports.py`, `run_registry.py`, `constants.py`, `scenarios.py`, … | **keep** | Canonical harness — out of scope for deletion |
| `README.md`, `FORMULAS-TO-PASTE.txt` | **keep** | Operator recovery |

---

## B. Audit / reconciliation docs (`docs/audits/`)

| File | Classification | Rationale |
|---|---|---|
| `SC-SEASON-SIM-002-COMPLETE-RECONCILIATION-REPORT.md` | **keep** | Canonical closeout narrative |
| `SC-SEASON-SIM-002-FINAL-LIVE-STATUS-RECONCILIATION.md` | **keep** | Final live status |
| `SC-SEASON-SIM-002-MASTER-LIST-PROPOSED-PATCH.md` | **archive** after Master List patch applied | Temporary proposed patch |
| `SC-SEASON-SIM-002-streak-pw-weekly-2026-09-02.md` | **archive** | Topic-specific investigation |
| `SC-SEASON-SIM-002-DISPOSABLE-CLEANUP-MANIFEST-20260903.md` | **keep** | Cleanup manifest |

---

## C. Reports / registries (`tools/season_simulation/reports/`)

| Pattern / examples | Classification | Rationale |
|---|---|---|
| `evidence-final-SEASON-SIM-2027-20260902T213135Z-athlete1.json` | **keep** | Final evidence pack |
| `audit-final-…213135Z…`, `audit-followup-…213135Z…` | **keep** | Final audit trail |
| `disposable-cleanup-*-latest.json` + dated siblings | **keep** | Latest pointers + dated inventory |
| Mid-run `audit-*171918*`, `*181332*`, `*202049*` | **archive** | Superseded by final `213135Z` |
| Mid-run `cleanup-*` JSON/MD for non-final runs | **archive** | Historical; not needed day-to-day |
| `probe-072-*.json`, `probe-074-079-*.json` | **archive** | Probe artifacts (may contain record ids — do not publish) |
| `old-test-data-audit*.json` | **archive** | Broader test-data audit |

**Note:** Report JSON may contain Airtable record ids. Keep in-repo for ops recovery; do not paste into public docs or emails.

---

## D. Recommended follow-up (Mike approval required)

1. **Promote** reusable pieces (`_cleanup_scan_extras`, inventory/postscan, hub allowlist helpers) into documented scripts under `tools/season_simulation/` **without** underscore ad-hoc names — or document them in README.
2. **Archive** mid-run audit/cleanup JSON + pass-specific `_audit_run_pass*` / run-scoped `_cleanup_delete_extras_*` into `tools/season_simulation/archive/2026-09-sim-002/`.
3. **Delete only after archive PR merges** the `remove-after-approval` list above.
4. Leave canonical harness + final `T213135Z` evidence untouched.

## Explicit non-actions in this PR

- No file deletions
- No `git clean`
- No edits to Automations 003 / 067 / 101 / 117 / SC-147
- No Hub / Resend / Airtable mutations
