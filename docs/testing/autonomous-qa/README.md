# Autonomous QA harness

Production-readiness orchestrator for Shooting Challenge. Uses Production base `appn84sqPw03zEbTT` with **disposable test records only** (authorized).

## Commands

```bash
# Read-only matrix (repo + live reconciliation + web probes)
node tools/testing/autonomous-qa-run.mjs

# Create disposable submission on Testing3 Schmidt + verify SUBMISSION_XP
node tools/testing/autonomous-qa-run.mjs --live-create

# Delete records listed in latest manifest
node tools/testing/autonomous-qa-run.mjs --cleanup
```

## Artifacts

| Path | Purpose |
|------|---------|
| `docs/testing/autonomous-qa/latest-manifest.json` | Machine-readable audit trail |
| `docs/testing/autonomous-qa/latest-report.md` | Human summary from last run |
| `/opt/cursor/artifacts/autonomous-qa/` | Per-run JSON reports |

## Related

- Final report: [AUTONOMOUS_QA_20260823_FINAL_REPORT.md](./AUTONOMOUS_QA_20260823_FINAL_REPORT.md)
- **Weekly email E2E (2026-08-24):** [WAS_EMAIL_QA_20260824_FINAL_REPORT.md](./WAS_EMAIL_QA_20260824_FINAL_REPORT.md)
- **065/066 closeout (2026-08-24):** [2026-08-24-065-066-dynamic-trigger-closeout.md](../../deploy-checklists/2026-08-24-065-066-dynamic-trigger-closeout.md)
- **Historical audit artifacts:** [2026-08-24-historical-audit-artifacts.md](../../deploy-checklists/2026-08-24-historical-audit-artifacts.md)
- E2E matrix: `tools/testing/run_e2e_matrix.mjs`
- **Perfect Week disposable E2E (SC-PW-E2E):** [`docs/testing/perfect-week/SC-PW-E2E.md`](../perfect-week/SC-PW-E2E.md) — `node tools/testing/sc-pw-e2e.mjs --case qualifying --apply`
- **Individual athlete workflow (SC-ATHLETE-WF-001):** [`docs/testing/athlete-workflow/SC-ATHLETE-WF.md`](../athlete-workflow/SC-ATHLETE-WF.md) — dry-run default; Testing3 gated; no email; pre–season-sim
- **Future / Planned (not active):** **SC-SEASON-SIM-001** — 60-day five-enrollment season simulation. Canonical entry: [`docs/127-SI-MASTER-FUTURE-WORK-LIST.md`](../../127-SI-MASTER-FUTURE-WORK-LIST.md) · remaining-work: `MRW-H11` in [`MASTER_REMAINING_WORK_LIST.md`](../../../MASTER_REMAINING_WORK_LIST.md). Do **not** implement yet; intended later reuse/extension of SC-PW-E2E. **FUT-010** remains separate.
- XP reconciliation: `web/scripts/full-xp-reconciliation.mjs`
