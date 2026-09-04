# Coordinator brief — Perfect Week SF remediation wave 2026-09-04

## Task Classification

| Field | Value |
|-------|-------|
| Type | Workflow reliability remediation (Airtable + repo) |
| Priority | P0 (SC-152/SC-153) + P1 (SC-154/SC-155/SC-156/SC-157) |
| Difficulty | High |
| Owner | Cursor coordinator + 4 specialists |
| Dependencies | Inventory + silent-failure docs from PR #395 |
| Backlog IDs | **SC-152**, **SC-153**, **SC-154**, **SC-155**, **SC-156**, **SC-157** |
| Estimated Scope | 057/058 lifecycle fix + P1 attest/fix + PR #340 disposition |
| Phase | 3 Implementation / 5 Close |
| Correct tool | Cursor (+ Airtable MCP for live config) |
| Repo | `127-si-shooting-challenge` |
| Mike's role | None required for routine steps (authorized wave) |

## Checkpoint (confirmed)

| Item | Value |
|------|-------|
| Starting `origin/master` | `ec8070a7` |
| Prior functional SHA (checkpoint) | `42cc97cf` |
| Prior functional deploy (checkpoint) | `dpl_hnPCeD3gELNcQkJyQe9Mugao1jYc` |
| Live Production tip deploy | `dpl_AgTNjiVMVogiHhpwgk67Msmi1i7y` @ `ec8070a7` READY |
| Base | Production `appn84sqPw03zEbTT` |

## Must remain closed

SC-109, SC-112, SC-147, SC-148, SC-149, SC-151, FUT-025, SC-057/SC-058 **attestations**, SEO completion.

## Holds

No Season Simulation. No Airtable field cleanup/deletion. No broad email. No secrets/PII/record IDs in public reports. No cosmetic website work.

## Agent path ownership

| Agent | Branch | Worktree | Exclusive write paths |
|-------|--------|----------|----------------------|
| A1 Truth | `audit/sc-152-153-pw-truth-a1` | `.../a1-truth` | `docs/audits/SC-152-*`, `docs/audits/SC-153-STATE-*`, `docs/audits/PERFECT-WEEK-SF-*-ANALYSIS*`, gate file below |
| A2 Remediate | `fix/sc-152-153-pw-lifecycle-a2` | `.../a2-remediate` | `airtable/automations/shooting-challenge/057-*`, `058-*`, `docs/deploy-checklists/*057*`, `*058*`, `*perfect-week*lifecycle*`, `airtable/rollbacks/`, tests for 057/058 |
| A3 P1 | `fix/sc-154-156-p1-workflows-a3` | `.../a3-p1` | `031*`, `032*`, `041*`, `042*`, `070a*`, `docs/audits/SC-154*`, `SC-155*`, `SC-156*`, related checklists/tests |
| A4 Verify | `verify/sc-152-157-pw-verify-a4` | `.../a4-verify` | `docs/audits/SC-157*`, `docs/testing/evidence/sc-152-*`, independent verify reports; PR #340 disposition |
| Coord | `coord/wf-sf-remediation-20260904` | `.../coord` | Master Future Work List, CURRENT-TRUTH, PROJECT_STATE, inventory/remediation reconcile, CHANGELOG, final closeout |

## Gate for A2 implementation

A2 must **not** change live Airtable or scripts until A1 writes:

`docs/audits/SC-152-153-STATE-MODEL-AND-ACCEPTANCE-20260904.md`

with explicit **COORDINATOR_IMPLEMENTATION_GATE: OPEN** (or coordinator sets that after review).

## Live automation IDs (Production)

| Code | automationId | Status (list 2026-09-04) |
|------|--------------|--------------------------|
| 057 | `wflVRPhgunsosFjWS` | deployed |
| 058 | `wflDinFz6FBIGEOMg` | deployed |
| 041 | `wflCRvaopntNPsc64` | deployed (cron 15m) |
| 070a | `wflIYVOmRRaHu9cl2` | deployed |

## Correction

SF-01 / SF-02 are **P0 required** — not optional later.
