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
- E2E matrix: `tools/testing/run_e2e_matrix.mjs`
- XP reconciliation: `web/scripts/full-xp-reconciliation.mjs`
