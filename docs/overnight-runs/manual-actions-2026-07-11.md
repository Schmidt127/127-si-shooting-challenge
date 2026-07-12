# Manual actions — overnight run 2026-07-11

**Owner sync:** Cloud Lead copies every open GitHub issue labeled `overnight-blocker` into this file.

**When Mike resolves:** Comment `RESOLVED — [what you did]` on the blocker issue. Lead verifies, closes issue, resumes task.

**Lead note (2026-07-11T22:30Z):** Cloud Lead GitHub token cannot label/assign/comment/close issues (HTTP 403). Please apply labels `overnight-blocker` + `overnight-run`, assign `@Schmidt127`, close duplicates as noted, and paste the live status update from `_live-status-update.md` into issue #1.

**Lead note (2026-07-12):** Mike confirmed Make has **no** separate DEV upload scenario — only PROD `Shooting Challenge - GAME - Upload Engine - Lambda - v1` (`C-013 PROD S3 Upload Webhook`). He did **not** edit it. **MA-001 rewritten:** create DEV scenario first; never patch PROD for #8.

**Lead note (2026-07-12T13:50Z):** Local Make homework webhook smoke **PASS** on `rec7X6stG6utxykiG` (`skipped_already_uploaded`). MA-001 Phase 0+1 verified; Mike should comment RESOLVED on #8 and keep scenario OFF when idle.

---

## Open actions

### MA-002 — T2 AWS-DEV / Cursor env credentials (partial)
- **GitHub issue:** [#9](https://github.com/Schmidt127/127-si-shooting-challenge/issues/9) (canonical; duplicate #7)
- **Task / agent:** T2 / Worker-B (also unblocks T3)
- **System:** Cursor cloud environment / local ops (DEV-only secrets)
- **Status:** **Local ops PASS** (smoke used local `.env`). Cloud agent still has no `tools/airtable/.env`.
- **Exact action (remaining — optional):**
  1. Optionally provision same DEV-only keys into Cursor cloud env for agent-side smoke.
  2. Comment `RESOLVED — DEV env keys present locally; cloud optional` on #9 if local-only is enough.
- **Hard stops:** No PROD secrets; never commit secrets; never point `MAKE_DEV_*` at PROD webhook
- **Blocks:** Cloud-side live smoke only (local Make path unblocked)
- **Continuing meanwhile:** Worker B on **T6**. Worker C on **T7**.

### MA-006 — T1 Airtable-DEV paste 070a v4.4
- **GitHub issue:** [#17](https://github.com/Schmidt127/127-si-shooting-challenge/issues/17)
- **Status:** **DONE (Mike 2026-07-12)** — v4.4 in DEV; keep **OFF**
- **Confirm before next test:**
  1. Automation still **OFF**.
  2. Input `makeWebhookUrl` = **DEV** webhook (`C-013 DEV S3 Upload Webhook`) — not PROD.
  3. Input `automationNumber` = `070a`.
  4. Comment on #17: `RESOLVED — 070a v4.4 pasted DEV, still OFF, makeWebhookUrl=DEV`
- **Blocks:** nothing further for paste; unlocks MA-003 Airtable-triggered path

### MA-003 — T3 live 070a DEV smoke
- **GitHub issue:** [#11](https://github.com/Schmidt127/127-si-shooting-challenge/issues/11)
- **Status:** **PASS (Make→Lambda)** — `recVUoPApngfRYOys` returned `actionOut=uploaded` + S3 + SHA-256 (2026-07-12T14:40Z). Smoke script exit code was a false fail (2KB truncate); fixed in repo.
- **Confirm:** `python _probe_c013_asset_storage_fields.py --record-id recVUoPApngfRYOys` → `allPass=true`
- **Then:** Comment RESOLVED on #11; Make OFF; 070a stays OFF

### MA-001 follow-up — Make path fixed
- **Related:** #8
- **Evidence:** Full Lambda JSON on Pending Link homework upload via DEV webhook. Comment RESOLVED on #8.

### MA-004 — T4 Phase 2 (STALE / closable)
- **GitHub issue:** [#15](https://github.com/Schmidt127/127-si-shooting-challenge/issues/15) (canonical; duplicate #14)
- **Task / agent:** T4 / Worker-D
- **Update (LEAD-004):** Worker A result **published** and merged to lead. Phase 2 **cleared**.
- **Exact action:** Comment `RESOLVED — worker-a-t1 published` on #15 and close (also close #14). Worker D: write `worker-d-t4-070a-docs.md`.

### MA-005 — GitHub hygiene (token 403 workaround)
- **System:** GitHub issues
- **Exact action:**
  1. Label `#8 #9 #11 #17` with `overnight-blocker` + `overnight-run`; assign `Schmidt127`.
  2. Close duplicates `#6 #7 #10 #14`; close #15 as resolved (A published).
  3. Paste contents of `docs/overnight-runs/_live-status-update.md` into issue [#1](https://github.com/Schmidt127/127-si-shooting-challenge/issues/1).
  4. On #8, paste note that DEV scenario must be **created** first (see MA-001 / create-dev checklist) — lead token cannot comment.
- **Blocks:** Remote monitoring clarity only (run continues)

---

## Resolved actions

| ID | Task | Issue | Resolved | Verified by lead |
|---|---|---|---|---|
| MA-001 | Create DEV Make upload scenario + homework smoke | #8 | 2026-07-12 — local smoke PASS `rec7X6stG6utxykiG` → `skipped_already_uploaded`. Mike: comment RESOLVED on #8 if not done | Lead 2026-07-12T13:50Z |
| MA-006 | Paste 070a v4.4 DEV | #17 | 2026-07-12 — Mike confirmed pasted; keep OFF; comment RESOLVED on #17 | Lead 2026-07-12T13:55Z |
| — | Direct Lambda homework writeback | #11 partial | 2026-07-12T14:04Z — `recv2C72is5w3YJYB` probe `allPass=true` via `c013_dev_lambda_invoke.py` (Make path still FAIL) | Lead 2026-07-12T14:05Z |

---

## Template (lead copies from blocker issues)

```markdown
### MA-NNN — [TASK-ID] Short title
- **GitHub issue:** #NNN
- **System:** [exact system]
- **Location:** [exact page/automation/scenario/field]
- **Exact action:** [numbered steps]
- **Why not automatic:** [reason]
- **Blocks:** this task only | entire run
- **Continuing meanwhile:** [other tasks]
- **Verify when done:** [expected state]
```
