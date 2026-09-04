# SC-152–157 coordinator wave closeout — 2026-09-04

## Classification

| Field | Value |
|-------|-------|
| Type | Workflow reliability remediation |
| Priority | P0 SC-152/153 · P1 SC-154–157 |
| Phase | 3 / 5 |
| Correct tool | Cursor + Airtable MCP |
| Repo | `127-si-shooting-challenge` |

## SHAs

| | SHA |
|--|-----|
| Start `origin/master` | `ec8070a7` |
| End tip (before this closeout PR) | `97769698` (PR **#406**) |
| Functional web baseline (prior wave) | `42cc97cf` / `dpl_hnPCeD3gELNcQkJyQe9Mugao1jYc` |
| Production tip deploy after docs wave | `dpl_AgTNjiVMVogiHhpwgk67Msmi1i7y` @ `ec8070a7` |

## Agent worktrees / branches

| Agent | Branch | Worktree |
|-------|--------|----------|
| A1 | `audit/sc-152-153-pw-truth-a1` | `wf-sf-wave-20260904/a1-truth` → PR **#402** |
| A2 | `fix/sc-152-153-pw-lifecycle-a2` | `…/a2-remediate` → PR **#406** |
| A3 | `fix/sc-154-156-p1-workflows-a3` | `…/a3-p1` → PR **#404** |
| A4 | `verify/sc-152-157-pw-verify-a4` | `…/a4-verify` → PR **#401** |
| Coord | `coord/wf-sf-closeout-20260904` | `…/coord` |

## Root causes

**SF-01:** 057 `recordMatchesConditions` on formula Queue that stayed 1 while Status=Ready → no re-entry after first run.

**SF-02:** 058 positive-only trigger (Eligible=1 ∧ Unlock empty ∧ Ready) blocked script withdraw/restore paths.

## Before / after 057–058

**Before:** Queue sticky on Ready; 058 create-only.

**After (intended):** Queue = Pending OR Recalc Needed; 057 v2.4 clears Recalc; 058 v1.6 lifecycle on `recordUpdated`.

**Live now:** Queue formula + Recalc checkbox **live**. Scripts/058 trigger **UI paste pending** (Airtable API rejects `customScript` edits).

## Holds confirmed

Season Simulation **not run**. Airtable field cleanup/deletion **not run**. Closed items stayed closed: SC-109, SC-112, SC-147, SC-148, SC-149, SC-151, FUT-025, SC-057/058 attestations, SEO.

## Mike’s next action

1. Paste **057 v2.4** + **058 v1.6** and change 058 trigger per [`docs/deploy-checklists/SC-152-153-perfect-week-lifecycle-057-058.md`](../deploy-checklists/SC-152-153-perfect-week-lifecycle-057-058.md).
2. Publish 070a graph fix per [`docs/deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md`](../deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md).
3. Run disposable Perfect Week matrix on Schmidt fixtures; mark SC-152/153 Complete.
