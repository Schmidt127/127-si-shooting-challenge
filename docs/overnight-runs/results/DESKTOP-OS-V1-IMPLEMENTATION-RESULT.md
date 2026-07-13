# Desktop Agent Operating System — Version 1 Implementation Result

**Date:** 2026-07-13  
**Branch:** `overnight/lead-integration`  
**Base SHA before change:** `ef09acc`  
**Implementation commit:** `57a4576`  
**Status:** **READY FOR TWO-SESSION TRIAL**

---

## Files created or changed

| Path | Action |
|------|--------|
| `docs/overnight-runs/CONTROL.json` | Created — resume source of truth + seeded queue |
| `.cursor/rules/overnight-operating-system.mdc` | Created — always-apply overnight law |
| `docs/overnight-runs/results/UNATTENDED-RUN-STATUS.md` | Created — milestone log |
| `docs/overnight-runs/stages/_TEMPLATE-AUTHORIZED.md` | Created — stage auth template |
| `tools/overnight/assert_git_lane.py` | Created — branch guard |
| `tools/overnight/tests/test_assert_git_lane.py` | Created — offline guard tests (9) |
| `tools/overnight/__init__.py` | Created |
| `tools/overnight/tests/__init__.py` | Created |
| `docs/overnight-runs/APPROVAL-PROFILE.md` | Created — Conservative / Balanced / Higher-autonomy |
| `.cursor/permissions.json` | Created — Balanced terminalAllowlist + autoRun steering |
| `AGENTS.md` | Updated — pointer to CONTROL.json |
| `docs/overnight-runs/results/DESKTOP-OS-V1-IMPLEMENTATION-RESULT.md` | Created — this file |

**Not created (deferred by design):** QUEUE.md, master plan, stage manifests, manifest verifier, stale-branch tool, hooks, Cloud Agent wiring.

---

## Configuration choices

| Choice | Value |
|--------|-------|
| Approval profile | **Balanced** |
| Run Mode (manual) | **Auto-review** |
| Active write lanes default | 1 |
| Stage size | 30–90 min integration unit |
| Allowlist style | Specific prefixes only (no bare `git`) |
| Guard staged roots | `docs/`, `tools/`, `airtable/`, `lambda/`, `web/`, `.cursor/` |
| Merge/push auto-allow | **No** — remain manual under Balanced |

---

## Tests and totals

| Suite | Command | Result |
|-------|---------|--------|
| Branch guard | `python -m unittest tools.overnight.tests.test_assert_git_lane -v` | **10/10 PASS** |
| Lambda | `cd lambda/upload-asset && python -m unittest discover -s tests -p "test_*.py" -v` | **66/66 PASS** |
| Offline | `python tools/airtable/c070a_overnight_offline_suite.py` | **97/97 PASS** |
| Carry-forward | C-010 lifecycle + post-OMNI + C-024 modules | **26/26 PASS** |

---

## Resume self-test (post-implementation)

| Check | Result |
|-------|--------|
| Read CONTROL.json | OK |
| Stored SHA vs `git rev-parse HEAD` | Matched baseline `ef09acc` before this commit; updated after push |
| Next READY package | `pipeline-homework-video-audit` (priority 1) |
| BLOCKED not selected | C-010 OMNI / C-019 views / C-026 / C-023 prod remain BLOCKED_* |
| Guard lead on lead | PASS |
| Guard worker on lead | FAIL (expected) |
| Guard valid/invalid worker + staged paths | Covered by 9 unit tests |

---

## Manual Cursor setting still required

**Cursor Settings → Agents → Approvals & Execution → Run Mode → Auto-review**

`.cursor/permissions.json` activates on Auto-review / Allowlist / Run Everything. It does **not** change the UI by itself.

---

## Known limitations

- `git merge` / `git push` still require approval under Balanced.
- Branch guard must be **invoked** before commit (no Cursor hook yet).
- Compaction still forces re-read of CONTROL.json.
- Worktrees outside the open workspace still need careful `cd`.
- Cloud Agents not wired.

---

## Rollback instructions

1. Revert this commit on `overnight/lead-integration` (or delete the listed new files).
2. Remove `.cursor/permissions.json` to restore IDE-only allowlists.
3. Remove `.cursor/rules/overnight-operating-system.mdc`.
4. Leave AI workflow standards in AGENTS.md / other rules intact.

---

## Trial readiness

**Yes — Version 1 is ready for its two-session Desktop trial.**

**Next READY package:** `pipeline-homework-video-audit`

Do not start Cloud Agents. Do not promote to Higher-autonomy until Mike approves after trial.
