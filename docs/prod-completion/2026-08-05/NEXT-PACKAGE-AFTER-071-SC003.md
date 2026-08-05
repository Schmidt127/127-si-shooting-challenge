# Next package — after 071 + SC-003 closeout (2026-08-05)

| Field | Value |
|-------|--------|
| Authority | [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md) |
| Selected | **SC-021 / SC-028 / SC-077** Perfect Week **live fixture verification** (057 **v1.5** already installed) |
| Priority | **P0** |
| Current status | **Installed in PROD** — paste done; cross-boundary verification open |
| Historical note | Earlier card asked to paste **057 v1.4** — superseded; PROD is **v1.5** (2026-08-05). Do not downgrade. |

---

## Why this is next

1. Automation **057 v1.5** is installed and running in PROD (Mike attestation).
2. Perfect Week is **not** Complete — prior tests crossed calendar dates, week boundaries, and programs.
3. Next work is controlled fixtures + read-only verifier (not another paste).
4. Do not mark SC-021 / SC-028 / SC-077 / SC-091 Complete from “enabled” alone.

Runner-up (if Mike prefers a different live path): **SC-010** PDF homework E2E — Installed, same S3/070a path as Complete SC-009, needs one Schmidt PDF controlled proof.

---

## Package card

| Item | Detail |
|------|--------|
| **SC number** | **SC-021** (pack also **SC-028**, **SC-077**, **SC-091**) |
| **Title** | Perfect Week PROD live verification (057 **v1.5**) |
| **Current status** | Installed in PROD / verification open |
| **Priority** | P0 |
| **Why next** | Install done; need CASE-01…16 isolation proof |
| **Dependencies** | 058 unlock, 059 XP, Schmidt athlete |
| **Repository work** | Fixture spec + Omni prompt + verifier — `docs/testing/perfect-week/` |
| **PROD work** | Omni creates fixtures; wait for 057/058/059; run verifier |
| **Live-test evidence required** | Verifier PASS (or documented product exceptions); `docs/testing/evidence/YYYY-MM-DD-perfect-week-fixtures/` |
| **Mike actions** | 1) Open `docs/testing/perfect-week/PERFECT-WEEK-OMNI-PROMPT.md` 2) Paste into Omni 3) Save `PWTEST-MANIFEST.json` 4) Run `node tools/testing/verify_perfect_week_fixtures.mjs` |
| **Cursor actions** | After evidence: Completion Master status update only |

**First operator action:** Paste Omni prompt from [`docs/testing/perfect-week/PERFECT-WEEK-OMNI-PROMPT.md`](../testing/perfect-week/PERFECT-WEEK-OMNI-PROMPT.md). Runbook: [`057-perfect-week-v1.5-live-verification.md`](../deploy-checklists/057-perfect-week-v1.5-live-verification.md).
