# Manual actions — overnight run 2026-07-11

**Owner sync:** Cloud Lead copies every open GitHub issue labeled `overnight-blocker` into this file.

**When Mike resolves:** Comment `RESOLVED — [what you did]` on the blocker issue. Lead verifies, closes issue, resumes task.

**Lead note (2026-07-11T22:30Z):** Cloud Lead GitHub token cannot label/assign/comment/close issues (HTTP 403). Please apply labels `overnight-blocker` + `overnight-run`, assign `@Schmidt127`, close duplicates as noted, and paste the live status update from `_live-status-update.md` into issue #1.

---

## Open actions

### MA-001 — T2 Make-DEV Module 2 homework router
- **GitHub issue:** [#8](https://github.com/Schmidt127/127-si-shooting-challenge/issues/8) (canonical; duplicate #6)
- **Task / agent:** T2 / Worker-B
- **System:** Make.com DEV
- **Location:** Scenario `Shooting Challenge - DEV - Upload Engine - Lambda - v1` → Module **2** Router
- **Exact error / why blocked:** Cloud agents cannot edit Make UI; DEV scenario currently routes 070b/`video_feedback` only
- **Actions attempted:** Sanitized blueprint + runbook shipped on `overnight/worker-b-070a-backend` (merged to lead)
- **Exact action:**
  1. Open Make → DEV scenario **`Shooting Challenge - DEV - Upload Engine - Lambda - v1`** (do **not** touch PROD).
  2. Module **2** Router — add branch **or** OR-filter: `automationNumber` = `070a` **AND** `routeKey` = `homework_completion`.
  3. Wire that branch to the **same** Module 3 HTTP POST → DEV Lambda Function URL (reuse video path).
  4. Confirm Module 5 returns **complete Lambda JSON** for manual smoke (preferred over plain `Accepted`).
  5. Save; leave scheduling **OFF**; use **Run once** only.
  6. Confirm DEV Lambda env `ALLOW_ROUTE_KEYS` includes `homework_completion`.
  7. Put webhook URL in local ops / `tools/airtable/.env` as `MAKE_DEV_UPLOAD_WEBHOOK_URL` — **never commit**.
  8. **Do not** enable Airtable automation **070a** yet.
- **Blocks:** T2 live smoke + T3 live smoke (not full run)
- **Continuing meanwhile:** Offline tests merged; Worker A continues; Worker D P-D1 docs
- **Branch / commit / result:** `overnight/worker-b-070a-backend` @ `0dd0ac5` · `docs/overnight-runs/worker-results/worker-b-t2-070a-backend.md` · https://cursor.com/agents/bc-29524ab2-f376-4153-83ba-920a12ffe8c2
- **Verify when done:** Comment `RESOLVED — Module 2 homework branch wired; Run once ready` on #8

### MA-002 — T2 AWS-DEV / Cursor env credentials
- **GitHub issue:** [#9](https://github.com/Schmidt127/127-si-shooting-challenge/issues/9) (canonical; duplicate #7)
- **Task / agent:** T2 / Worker-B (also unblocks T3)
- **System:** Cursor cloud environment / local ops (DEV-only secrets)
- **Location:** Env for repo `127-si-shooting-challenge` — **not** PROD
- **Exact error:** No `tools/airtable/.env`, no AWS creds, no `LAMBDA_FUNCTION_URL` / `UPLOAD_WEBHOOK_SECRET` / `MAKE_DEV_UPLOAD_WEBHOOK_URL` / `AIRTABLE_TOKEN`
- **Actions attempted:** Offline unit tests + expected-fail preflight documented
- **Exact action:**
  1. Provision **DEV-only**: `AIRTABLE_TOKEN` (DEV base `appTetnuCZlCZdTCT`), `LAMBDA_FUNCTION_URL` (DEV `127si-upload-asset-dev`), `UPLOAD_WEBHOOK_SECRET`, `MAKE_DEV_UPLOAD_WEBHOOK_URL` (after MA-001), optional AWS keys for `us-east-2`.
  2. Confirm DEV Lambda `ALLOW_ROUTE_KEYS=video_feedback,homework_completion`.
  3. Re-run smoke (local or follow-up agent) per issue #9 body.
- **Hard stops:** No PROD secrets; do not enable 070a until smoke PASS; never commit secrets
- **Blocks:** Live Make/Lambda/Airtable smoke for T2/T3 (not full run)
- **Continuing meanwhile:** Repo deliverables merged to lead
- **Verify when done:** Comment `RESOLVED — DEV env keys present` + sanitized `envPresent` JSON only

### MA-003 — T3 live 070a DEV smoke
- **GitHub issue:** [#11](https://github.com/Schmidt127/127-si-shooting-challenge/issues/11) (canonical; duplicate #10)
- **Task / agent:** T3 / Worker-C
- **System:** Tests-DEV (Airtable + Make + Lambda)
- **Location:** `tools/airtable/c070a_dev_smoke_run.py` live modes (`C070A_ALLOW_LIVE=1`)
- **Exact error:** Live invoke gated; missing Worker A result + DEV webhook/token creds
- **Actions attempted:** 73 offline tests PASS; mock smoke 5/5 PASS; aligned to Worker B env names
- **Exact action:**
  1. Wait for Worker A result `worker-a-t1-070a-airtable.md` + DEV paste of 070a script (may stay OFF).
  2. Complete MA-001 and MA-002.
  3. Provide disposable DEV homework Submission Asset id.
  4. Set `C070A_ALLOW_LIVE=1` and run live-preflight / live-upload against DEV only.
- **Blocks:** T3 live verification only
- **Continuing meanwhile:** Offline harness merged to lead
- **Note:** Worker B result **is** published (PR #12) — issue body partially stale

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
  3. Inputs: `recordId` from trigger; `makeWebhookUrl` = DEV webhook (after MA-001); `automationNumber` = `070a`.
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
| — | — | — | — | — |

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
