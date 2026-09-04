# Draft PR disposition — Agent 6 (2026-09-04)

**Agent:** A6 — Open PRs and Airtable Cleanup Prep  
**Base SHA:** `origin/master` @ `2c113c105769e9e3a75109f4846e71fb48d2c73d`  
**Worktree branch:** `final/a6-prs-cleanup-prep-20260904`  
**Scope:** Draft PRs **#353**, **#335**, **#244** only  

## Summary

| PR | Title | Backlog / purpose | Disposition |
|----|-------|-------------------|-------------|
| **#353** | Parent-email path verification harness | Parent-email Live cutover / path verify (WELCOME cleanup + remaining paths) | **EXTRACT + MERGE** via this branch |
| **#335** | Custom Video File Name vs S3 key investigation | FUT-007 / FUT-008 / FUT-009 investigation | **CLOSE — superseded / obsolete** |
| **#244** | WAS XP reconciliation + link-repair tooling | WAS / automation **072** XP disagreement ops tooling | **EXTRACT + MERGE** via this branch |

No ambiguous stale drafts remain after close comments land.

---

## PR #353 — Parent-email path verification

**URL:** https://github.com/Schmidt127/127-si-shooting-challenge/pull/353  
**Head:** `cursor/parent-email-path-verify-09ba` @ `f0bcd249`  
**State at review:** OPEN draft  

### Purpose + backlog

Extends `tools/testing/parent-email-live-cutover.mjs` with:

- `cleanup-welcome` for scoped deletion of failed WELCOME disposable Athlete/Enrollment IDs
- `verify-all --apply --skip-welcome` for DAILY / HOMEWORK / VIDEO / WEEKLY / ZOOM path applies
- Explicit HOMEWORK/VIDEO prerequisite reporting when full upstream chains are unsafe to auto-create

Backlog alignment: parent-email Live cutover verification (hub acceptance paths). Not a numbered FUT item; operational testing for Live email cutover.

### Compare to master (`2c113c10`)

| Path | On master? | Classification |
|------|------------|----------------|
| `tools/testing/lib/parent-email-path-verify.mjs` | **Absent** | **Useful / current** — extract |
| `tools/testing/parent-email-live-cutover.mjs` diffs | Present base; missing `cleanup-welcome` / `--skip-welcome` | **Useful / current** — extract |

Master already has the base harness (`16a754ce`). PR adds the remaining-path apply layer only. CI on the draft was green (automation-contracts, python-contracts, Vercel).

### Safety notes

- Hardcoded WELCOME cleanup IDs (`recAPXHpWRINmxl6R` / `recVOEATdGqpydWCs`) are disposable test records scoped to schmidt@ — acceptable for this harness.
- Does not change Production automations, schema, or Make.
- Evidence paths under `docs/testing/evidence/parent-email-live-cutover/` remain gitignored.

### Action

1. Cherry-pick `f0bcd249` onto `final/a6-prs-cleanup-prep-20260904`.
2. Close draft **#353** as superseded by the extracted merge PR (same content, clean base).

---

## PR #335 — Custom Video File Name vs S3 mismatch investigation

**URL:** https://github.com/Schmidt127/127-si-shooting-challenge/pull/335  
**Head:** `cursor/custom-video-s3-investigation-7dc2`  
**State at review:** OPEN draft  

### Purpose + backlog

Investigation-only report for Custom Video File Name → S3 object key mismatch under **FUT-007 / FUT-008 / FUT-009**.

### Compare to master

| Path | On master? | Classification |
|------|------------|----------------|
| `docs/deploy-checklists/sc-parent-athlete-email-redesign-2026-09-01.md` | **Present** | **Superseded** (merged via redesign closeout) |
| `CHANGELOG.md` / email test tweak | Absorbed / diverged | **Superseded** |
| `docs/investigations/custom-video-file-name-s3-mismatch-2026-09-01.md` | **Absent** | **Obsolete as current truth** |

### Why close (not extract)

The remaining investigation file asserts facts that are **no longer true** on master:

| Claim in PR #335 report | Live / master truth (2026-09-04) |
|-------------------------|----------------------------------|
| “No post-upload rename worker exists (FUT-009 not built)” | **FUT-009 worker + Automation 120** exist on master (`fut009_rename.py`, `120-…-apply-fut009-s3-video-rename.js`) |
| “073 sends `originalFileName` only; `customVideoFileName` not wired” | **073 v4.5+** sends `customVideoFileName` and resolves display name |

Merging the report as written would reintroduce **stale docs**. Historical root-cause narrative is already covered by FUT-007/008/009 briefs and the Master Future Work List. No production code in the PR.

### Action

Close draft **#335** with evidence comment. Do **not** extract the stale investigation file.

---

## PR #244 — WAS XP reconciliation tooling

**URL:** https://github.com/Schmidt127/127-si-shooting-challenge/pull/244  
**Head:** `cursor/was-xp-reconciliation-f1d8` @ `200fbc5e`  
**State at review:** OPEN draft  

### Purpose + backlog

Ops tooling for Weekly Athlete Summary vs automation **072** XP disagreement:

- `tools/testing/was_xp_reconciliation.mjs` — read-only event-by-event reconciliation
- `tools/testing/repair_was_xp_links.mjs` — dry-run / `--live` link of active orphan XP Events to a WAS (no XP amount mutation)

One-time live repair for WAS `reczxTIpVI8ZJLex0` was already applied during the original agent run (link gap closed; discrepancy → 0). Tools themselves never landed on master.

### Compare to master

| Path | On master? | Classification |
|------|------------|----------------|
| `tools/testing/was_xp_reconciliation.mjs` | **Absent** | **Useful** — extract |
| `tools/testing/repair_was_xp_links.mjs` | **Absent** | **Useful** (guarded) — extract |

### Safety notes

- Reconciliation is read-only.
- Repair defaults to dry-run; requires `--live` for writes; only patches XP Event → WAS links for already-active canonical events.
- Default WAS id is the original incident record — callers should pass an explicit WAS id for new cases.
- Does not create XP Events or change point amounts.

### Action

1. Cherry-pick `200fbc5e` onto `final/a6-prs-cleanup-prep-20260904`.
2. Close draft **#244** as superseded by the extracted merge PR.

---

## Disposition matrix (change-level)

| Change | Present on master | Superseded | Useful | Unsafe | Obsolete |
|--------|-------------------|------------|--------|--------|----------|
| #353 path-verify lib + CLI | No | — | **Yes** | No (schmidt-scoped) | No |
| #335 email redesign checklist | Yes | **Yes** | — | — | — |
| #335 investigation markdown | No | Partially (by FUT-009/073) | Historical only | No | **Yes as current truth** |
| #244 WAS recon + repair tools | No | Incident repair done; tools not | **Yes** | Guarded `--live` only | No |

---

## Follow-through checklist

- [x] Classify all three drafts
- [x] Extract #353 + #244 onto `final/a6-prs-cleanup-prep-20260904`
- [x] Decline extract of #335 investigation
- [ ] Push + open clean PR for docs + extracted tools
- [ ] Close #353 / #335 / #244 with evidence comments pointing at disposition + new PR
