# 070a DEV overnight package — 2026-07-11

**Run:** `overnight-run-2026-07-11`  
**Compiled by:** Worker D (T4 Phase 2)  
**Environment:** DEV `appTetnuCZlCZdTCT` only  
**PROD:** Do not paste or enable 070a · do not reset `recGQ8EjAMz3bEBiW`

Full evidence and merge notes:  
[`docs/overnight-runs/worker-results/worker-d-t4-070a-docs.md`](../overnight-runs/worker-results/worker-d-t4-070a-docs.md)

---

## Architecture

```text
070a v4.4 (Airtable, OFF until enable gate)
  → Make DEV webhook
  → automationNumber=070a AND routeKey=homework_completion
  → DEV Lambda (ALLOW_ROUTE_KEYS includes homework_completion)
  → S3 + Submission Assets writeback (+ C-023 hash/review)
  → Accepted async → 070c v1.1  OR  immediate Lambda JSON success
```

---

## Worker deliverables

| Worker | PR | Repo status | Live status |
|--------|-----|-------------|-------------|
| A — script v4.4 | [#18](https://github.com/Schmidt127/127-si-shooting-challenge/pull/18) | DONE | Paste blocked #17 |
| B — Make/Lambda pack | [#12](https://github.com/Schmidt127/127-si-shooting-challenge/pull/12) | DONE | Make/creds blocked #8 #9 |
| C — tests/smoke | [#13](https://github.com/Schmidt127/127-si-shooting-challenge/pull/13) | 73/73 mock PASS | Live blocked #11 |
| D — docs | [#5](https://github.com/Schmidt127/127-si-shooting-challenge/pull/5) | DONE | — |

### Key docs on worker branches (merge these)

| Doc | Branch |
|-----|--------|
| [C-070a-dev-airtable-v4.4-prep.md](./C-070a-dev-airtable-v4.4-prep.md) | Worker A |
| [C-013-dev-070a-make-lambda-homework-route.md](./C-013-dev-070a-make-lambda-homework-route.md) | Worker B |
| [C-013-dev-070a-homework-lambda-runbook.md](../../make/documentation/C-013-dev-070a-homework-lambda-runbook.md) | Worker B |

---

## Mike ordered checklist

| # | Action | Done |
|---|--------|------|
| 1 | Lead merges PRs #18 → #12 → #13 → #5 (or cherry-pick) | ☐ |
| 2 | Paste 070a v4.4 into DEV (skip GitHub header); `automationNumber=070a`; **leave OFF** | ☐ |
| 3 | Ensure 070c trigger allows homework (not video-only) | ☐ |
| 4 | Make DEV Module 2: `070a` + `homework_completion` → same Lambda HTTP | ☐ |
| 5 | Confirm Lambda `ALLOW_ROUTE_KEYS=video_feedback,homework_completion` | ☐ |
| 6 | Load DEV env: token, webhook URL, upload secret, Lambda URL | ☐ |
| 7 | Smoke: `c013_dev_h1_homework_smoke.py` and/or `c070a_dev_smoke_run.py live-*` | ☐ |
| 8 | Probe `allPass=true`; attachment retained | ☐ |
| 9 | Explicit approval → enable **070a ON** (DEV only) | ☐ |
| 10 | Update automation-index + PROJECT_STATE after first live PASS | ☐ |

---

## Pass criteria

- `automationNumber=070a` · `routeKey=homework_completion`
- `actionOut=uploaded` or `skipped_already_uploaded` (or Accepted → 070c clear)
- Writeback: Canonical File URL · Storage Key · File Content Hash · SHA-256 · Uploaded At
- C-023 review fields written by Lambda (flag-only; no auto-block)
- **No PROD changes**

---

## Hard stops

- Do not enable PROD 070a
- Do not set Processing from 070a (Lambda claim owner)
- Do not delete S3 / attachments / fixture records
- Do not start C-023 T5 implementation until 070a locks clear (unless OMNI/docs-only carve-out)
