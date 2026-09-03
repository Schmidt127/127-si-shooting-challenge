# SC-112 / Season Sim — untracked hygiene classification (2026-09-03)

**Purpose:** Classify untracked Season Simulation helpers, audit reports, and related docs in the main working tree.  
**Hard stop:** Do **not** delete, `git clean`, or change Season Simulation package code from this classification. Mike approval required before archive/remove.

**Classes (this closeout):**

| Class | Meaning |
|---|---|
| **Required** | Needed for operator recovery or already-canonical package/docs — track or keep indefinitely |
| **Keep locally never commit** | Useful on Mike’s machine; may contain run-scoped IDs / disposable paths — do not commit as-is |
| **Archive after approval** | Valuable evidence/history — move under an archive folder in a later approved PR |
| **Remove after approval** | One-off / superseded; delete only after archive (if needed) and Mike confirms |
| **Unknown** | Not enough evidence to classify safely |

Cross-reference (merged proposal): [`SC-SEASON-SIM-helper-hygiene-proposal.md`](./SC-SEASON-SIM-helper-hygiene-proposal.md) (PR **#368**). This file re-states classes with the SC-112 closeout vocabulary and covers untracked `docs/audits/SC-SEASON-SIM-002-*` files still sitting outside git.

---

## A. `tools/season_simulation/_*.py` (untracked session helpers)

### Audit

| File | Class |
|---|---|
| `_audit_run_readonly.py` | Archive after approval |
| `_audit_run_deep.py` | Archive after approval |
| `_audit_run_pass3.py` | Remove after approval |
| `_audit_run_pass4.py` | Remove after approval |
| `_audit_investigate.py` | Remove after approval |
| `_audit_final_213135.py` | Archive after approval |
| `_audit_followup_213135.py` | Archive after approval |
| `_audit_settle_poll_213135.py` | Archive after approval |
| `_audit_weekly_email_072.py` | Archive after approval |
| `_audit_weekly_email_072_deep.py` | Archive after approval |

### Cleanup

| File | Class |
|---|---|
| `_cleanup_scan_extras.py` | Required (or promote into `cleanup.py` later) |
| `_cleanup_delete_extras.py` | Remove after approval |
| `_cleanup_delete_extras_181332.py` | Remove after approval |
| `_cleanup_delete_extras_202049.py` | Remove after approval |
| `_cleanup_delete_extras_213135.py` | Remove after approval |
| `_cleanup_preverify_181332.py` | Archive after approval |
| `_cleanup_preverify_202049.py` | Archive after approval |
| `_cleanup_postverify_181332.py` | Archive after approval |
| `_cleanup_postverify_202049.py` | Archive after approval |
| `_prep_minimal_cleanup.py` | Required |
| `_inventory_disposable_cleanup.py` | Required |
| `_inventory_disposable_cleanup_v2.py` | Required |
| `_execute_disposable_cleanup.py` | Required (gated — never run without Mike) |
| `_postscan_disposable_cleanup.py` | Required |

### Probe / Hub / readiness / evidence

| File | Class |
|---|---|
| `_probe_072_hardcoded_id.py` | Remove after approval |
| `_probe_072_one_was.py` | Remove after approval |
| `_probe_074_079_one_was.py` | Remove after approval |
| `_probe_was072.py` | Archive after approval |
| `_probe_was072_hw.py` | Archive after approval |
| `_probe_was_build_errors.py` | Archive after approval |
| `_probe_was_email_fields.py` | Archive after approval |
| `_probe_disposable_leftovers.py` | Required |
| `_hub_ensure_allowlist.py` | Required |
| `_hub_restrict_allowlist.py` | Required |
| `_arm_weekly_send_213135.py` | Remove after approval |
| `_evidence_final_213135.py` | Archive after approval |
| `_readiness_extract.py` | Required |

### Canonical package (tracked — out of deletion scope)

| Pattern | Class |
|---|---|
| `cli.py`, `execute.py`, `cleanup.py`, `preflight.py`, `reports.py`, `run_registry.py`, `constants.py`, `scenarios.py`, `__init__.py`, `__main__.py`, `README.md`, `FORMULAS-TO-PASTE.txt` | Required |

---

## B. Untracked `docs/audits/SC-SEASON-SIM-002-*`

| File | Class |
|---|---|
| `SC-SEASON-SIM-002-COMPLETE-RECONCILIATION-REPORT.md` | Required (commit when Mike wants the narrative in-repo) |
| `SC-SEASON-SIM-002-FINAL-LIVE-STATUS-RECONCILIATION.md` | Required (live-status authority for afternoon pass) |
| `SC-SEASON-SIM-002-DISPOSABLE-CLEANUP-MANIFEST-20260903.md` | Required |
| `SC-SEASON-SIM-002-MASTER-LIST-PROPOSED-PATCH.md` | Archive after approval (master-list patch already merged via **#375**) |

---

## C. Reports / registries (`tools/season_simulation/reports/` — often gitignored)

| Pattern | Class |
|---|---|
| `evidence-final-…T213135Z…` | Required — Keep locally never commit if gitignored; do not delete |
| `audit-final-…213135Z…`, `audit-followup-…213135Z…` | Required / Keep locally never commit |
| `disposable-cleanup-*-latest.json` + dated siblings | Required / Keep locally never commit |
| Mid-run `*171918*`, `*181332*`, `*202049*` audits/cleanups | Archive after approval |
| `probe-072-*.json`, `probe-074-079-*.json` | Archive after approval (may contain RIDs — do not publish) |
| Unrecognized new probe/report files | Unknown |

---

## D. Explicit non-actions

- No file deletions in this PR  
- No `git clean` / `git reset --hard`  
- No Season Sim package code edits  
- No Hub / Resend / Airtable mutations  
- Automations **003 / 067 / 101 / 117 / SC-147** untouched  
