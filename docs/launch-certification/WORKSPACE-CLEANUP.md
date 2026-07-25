# Launch Certification — Workspace Cleanup

**Authority:** Final Launch Closure Lead  
**Date:** 2026-07-25  
**Branch:** `launch/final-production-certification`  
**Master tip:** `267d473`

**Policy:** Inventory + proposed local cleanup only. **Do not delete remote branches** from this list without Mike explicit authorization. Preserve `stash@{1}` (go-live schema dumps/probes) as historical — do not commit secrets.

---

## Active worktrees (live inventory 2026-07-25)

| Path | HEAD | Branch | Proposed disposition |
|------|------|--------|----------------------|
| `…/127-si-shooting-challenge` | `267d473` | `launch/final-production-certification` | **KEEP** — certification work |
| `…/127-si-agent5-lead-wt2` | `267d473` | `master` | KEEP or remove after cert (duplicate of origin/master tip) |
| `…/127-si-go-live-agent2-merge` | `713f3fa` | `integration/go-live-promotion-2026-07-24` | Local remove OK — tip already ancestor of master |
| `…/127-si-agent5-lead-wt` | `c6103e3` | `agent5/lead-reconciliation-2026-07-24` | Local remove OK after confirming no unique unpushed work |
| `…/127-si-agent11-homework-wt` | `19d6a25` | `agent11/homework-pipeline` | Local remove OK if PR/work absorbed |
| `…/127-si-agent2-data-model` | `55795ed` | `agent2/airtable-data-model-cleanup` | Local remove OK if merged/absorbed |
| `…/127-si-shooting-challenge-agent-a` | `8edd437` | `audit-followup/agent-a-xp-automation-contracts` | Local remove OK |
| `…/127-si-shooting-challenge-agent-b` | `07c6e95` | `audit-followup/agent-b-web-docs-release-hygiene` | Local remove OK |
| `…/127-si-shooting-challenge-agent4` | `7b6f408` | `agent4/testing-qc-prod-safety` | Local remove OK |
| `…/127-si-shooting-challenge-agent9` | `c0c0ca9` | `agent9/automation-ownership-contract` | Local remove OK |
| `…/127-si-shooting-challenge-c025-stage17-audit` | `0510663` | `audit/c025-stage17-prod-readiness` | Local remove OK |
| `…/127-si-shooting-challenge-e2e-wt` | `71cc020` | `overnight/lead-integration` | Local remove OK |
| `…/127-si-shooting-challenge-integration` | `441ea5e` | `agent13/final-reconciliation` | Local remove OK |
| `…/127-si-shooting-challenge-mvp-wt` | `3ec489a` | `feature/shooting-challenge-mvp` | KEEP only if Mike still needs MVP branch; else local remove |
| `…/127-si-shooting-challenge-repo-health` | `612403b` | `overnight/repository-health-2026-07-21` | Local remove OK |
| `…/127-si-worktrees/pr25-light-theme` | `bb74dd0` | detached | Local remove OK |
| `…/127-si-worktrees/pr26-release-readiness` | `e24f9f2` | detached | Local remove OK |
| `…/127-si-worktrees/worker-a` … `worker-d` | overnight tips | `overnight/v2-run/*` | Local remove OK |
| `…/_sc_pr26_temp` | `e24f9f2` | detached | Local remove OK |
| `…/_wt-handoff-2026-07-21` | `147b5f7` | `overnight/project-handoff-2026-07-21` | Local remove OK |

### Local worktree prune commands (Mike-authorized local only)

```bash
# Example — only after confirming no unique uncommitted work:
git worktree remove --force "PATH_HERE"
```

Do **not** run mass remote `git push origin --delete` from this packet.

---

## Stashes (preserve; do not drop without review)

| Index | Message | Guidance |
|-------|---------|----------|
| stash@{0} | agent5-partial-docs | Review then drop if superseded by master docs |
| stash@{1} | go-live-preserve-untracked-probes-snapshots-2026-07-24 | **PRESERVE** — DEV+PROD schema dumps / overnight notes; historical; mostly similar to `airtable/schema`; **do not commit secrets** |
| stash@{2} | wip-all-agents | Review / drop after inventory |
| stash@{3} | agent9-temp-preserve | Likely droppable after ownership package on master |
| stash@{4} | agent11-temp-keep-staged | Review |
| stash@{5} | agent5-118-wip-preserve | Likely superseded by 118 v1.5 on master — review before drop |
| stash@{6} | docs-cleanup-wip-preserved-for-send-key-run-2026-07-21 | Historical |
| stash@{7} | wip worker-a incomplete package | Historical |
| stash@{8} | lead-prep-uncommitted-2026-07-12 | Historical |

---

## Local branches — prune candidates (local delete OK)

Safe to delete locally after merge check (`git branch -d` / `-D` only with Mike OK for `-D`):

- `integration/go-live-promotion-2026-07-24` (already on master via `713f3fa`)
- `agent5/lead-reconciliation-2026-07-24`, `agent5/lead-recon-v2`
- `continuation/go-live-second-pass`, `continuation/go-live-second-pass-review`
- Overnight / audit-followup / agent worker branches listed in BASELINE once tips confirmed ancestors or abandoned
- Detached PR25/PR26 tips after worktree removal

**Keep:** `master`, `launch/final-production-certification`, any branch Mike still uses for live work.

---

## Remote branches — BLOCKED without Mike auth

| Action | Status |
|--------|--------|
| Delete remote agent/overnight/cursor/* branches | **BLOCKED** — requires Mike UI/CLI authorization |
| Delete PR #33 source branch | **BLOCKED** until port merges and Mike closes #33 |
| Force-push / rewrite history | **FORBIDDEN** |

Open PR remaining: **#33** only ([GITHUB-PR-CLOSEOUT.md](./GITHUB-PR-CLOSEOUT.md)).

---

## Explicit non-actions

1. Do not discard `stash@{1}` blindly.  
2. Do not commit schema dump secrets from stash into git.  
3. Do not delete remotes as part of certification closeout automation.  
4. Do not reset hard / clean force across worktrees.