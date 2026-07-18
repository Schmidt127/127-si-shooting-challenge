# Untracked recovery material — triage plan

**Purpose:** Document how to handle substantial **untracked** recovery folders that appear in other local checkouts (for example `chatgpt-recovery-2026-07-14/` in the original Shooting Challenge working tree).

**Hard rules for agents**

- Do **not** touch that folder from Agent B / Agent A isolated worktrees.
- Do **not** move, delete, or bulk-commit recovery material without Mike approval.
- Do **not** assume recovery zip contents are production truth — prefer `origin/master` + [PROJECT_STATE.md](./PROJECT_STATE.md).

---

## Categories

### 1. Preserve (keep local, do not commit yet)

| Pattern | Why |
|---------|-----|
| Session transcripts / ChatGPT exports used for archaeology | Historical context only |
| One-off OMNI paste notes with live record IDs | Useful for Mike; may contain PII |
| Partial schema dumps that duplicate dated snapshots | Prefer official `airtable/schema/snapshots/` |

**Action:** Leave on disk or copy to an **outside-repo** archive drive. Do not `git add`.

### 2. Archive outside repository

| Pattern | Why |
|---------|-----|
| Large zip packages (`chatgpt-recovery-*.zip`) | Bloat + possible secrets |
| Duplicate copies of docs already on `master` | Noise |
| Overnight-run CONTROL / status mirrors from old machines | Stale vs [agent-runs/CONTROL.json](./agent-runs/CONTROL.json) |

**Action:** Move to encrypted external storage or private backup. Record location in Mike’s ops notes (not necessarily in git).

### 3. Review for selective commit

| Pattern | Candidate destination |
|---------|------------------------|
| Missing deploy checklists that never landed on master | `docs/deploy-checklists/` after diff vs current |
| Automation scripts that differ from `airtable/automations/shooting-challenge/` | Diff only — Agent A owns automations |
| Web docs unique to recovery package | `web/docs/` after review |
| Valid test fixtures without secrets | `tools/` or `web/` tests |

**Action:** File-by-file diff against `origin/master`. Commit only through normal Phase 2/3 workflow with backlog ID.

### 4. Delete only after approval

| Pattern | Gate |
|---------|------|
| Exact duplicates of committed files | Mike confirms checksum / diff empty |
| Temp `_preview` outputs with PII | Mike confirms no longer needed |
| Broken partial clones | Mike confirms backup exists |

**Action:** Written Mike approval per folder. Prefer archive-before-delete.

### 5. Secret scanning before any archival commit

Before **any** path from recovery material is staged:

1. Scan for `AIRTABLE_API_TOKEN`, `pat*`, webhook URLs with secrets, AWS keys, `.env`, Make tokens.
2. Run a repo secret scanner if available (gitleaks / trufflehog / GitHub secret scanning).
3. Redact or omit; never commit live credentials “for convenience.”
4. If a secret is found in history of a zip, rotate the credential — do not only delete the file.

---

## Recommended Mike sequence

1. Inventory untracked top-level folders in the **original** checkout only.
2. Classify each folder using the table above.
3. Archive zips outside the repo.
4. Open a dedicated backlog item for any selective commit candidates.
5. Delete nothing until archive + secret scan + approval.

---

## Out of scope for Agent B

- Working in `127-si-shooting-challenge` original checkout recovery folders
- Editing `docs/agent-runs/CONTROL.json`
- Committing recovery snapshots into this branch
