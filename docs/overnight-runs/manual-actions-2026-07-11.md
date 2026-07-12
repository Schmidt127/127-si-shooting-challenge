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

### MA-003 — T3 live 070a DEV smoke
- **GitHub issue:** [#11](https://github.com/Schmidt127/127-si-shooting-challenge/issues/11) (canonical; duplicate #10)
- **Task / agent:** T3 / Worker-C
- **System:** Tests-DEV (Airtable + Make + Lambda)
- **Location:** `tools/airtable/c070a_dev_smoke_run.py` live modes (`C070A_ALLOW_LIVE=1`)
- **Status:** Make webhook homework path **PASS** (MA-001). Full harness still needs #17 paste.
- **Exact action:**
  1. Complete MA-006 (#17 paste 070a v4.4 DEV, leave OFF).
  2. Provide a disposable DEV homework asset that is still **Pending Link** (not `rec7X6stG6utxykiG` — already Uploaded).
  3. Set `C070A_ALLOW_LIVE=1` and run live-preflight / live-upload against DEV only.
- **Blocks:** T3 live harness verification only
- **Continuing meanwhile:** Worker C **reassigned to T7**

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

### MA-006 — T1 Airtable-DEV paste 070a v4.4
- **GitHub issue:** [#17](https://github.com/Schmidt127/127-si-shooting-challenge/issues/17)
- **Task / agent:** T1 / Worker-A
- **System:** Airtable DEV `appTetnuCZlCZdTCT`
- **Location:** Automation **070a - Send Homework Asset Payload to Make**
- **Exact error:** Worker A cloud env has no `AIRTABLE_TOKEN`; cannot paste or live-verify schema
- **Actions attempted:** Repo 070a v4.4 + prep checklist + tests on `overnight/worker-a-070a-airtable` (merged to lead)
- **Exact action:**
  1. Open DEV automation 070a.
  2. Paste from GitHub script `airtable/automations/shooting-challenge/070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js` — **skip GitHub header** (lines 1–24); paste production docblock through EOF.
  3. Inputs: `recordId` from trigger; `makeWebhookUrl` = **DEV** webhook from MA-001 Phase 0 (**not** `C-013 PROD S3 Upload Webhook`); `automationNumber` = `070a`.
  4. **Leave OFF.**
  5. Confirm companion **070c** can fire for homework (`Upload Destination = Homework Completions` or no destination filter).
  6. Optional: add read-only DEV `AIRTABLE_TOKEN` to cloud env.
- **Blocks:** Live DEV enable/verify for T1 (not full run)
- **Continuing meanwhile:** Workers B/C/D continue; lead holds integrated repo
- **Branch / commit / result:** `overnight/worker-a-070a-airtable` @ `332b4f5` · `worker-a-t1-070a-airtable.md` · PR #18 · https://cursor.com/agents/bc-c1932048-b10e-416a-9810-f963343dc864
- **Verify when done:** Comment `RESOLVED — [what you did]` on #17; DEV shows v4.4; 070a still OFF

---

## Resolved actions

| ID | Task | Issue | Resolved | Verified by lead |
|---|---|---|---|---|
| MA-001 | Create DEV Make upload scenario + homework smoke | #8 | 2026-07-12 — local smoke PASS `rec7X6stG6utxykiG` → `skipped_already_uploaded` (HTTP 200, DEV, `homework_completion`/`070a`). Mike: still comment RESOLVED on #8 + scenario OFF | Lead 2026-07-12T13:50Z |

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
