# Manual actions — overnight run 2026-07-11

**Owner sync:** Cloud Lead copies every open GitHub issue labeled `overnight-blocker` into this file.

**When Mike resolves:** Comment `RESOLVED — [what you did]` on the blocker issue. Lead verifies, closes issue, resumes task.

**Lead note (2026-07-11T22:30Z):** Cloud Lead GitHub token cannot label/assign/comment/close issues (HTTP 403). Please apply labels `overnight-blocker` + `overnight-run`, assign `@Schmidt127`, close duplicates as noted, and paste the live status update from `_live-status-update.md` into issue #1.

**Lead note (2026-07-12):** Mike confirmed Make has **no** separate DEV upload scenario — only PROD `Shooting Challenge - GAME - Upload Engine - Lambda - v1` (`C-013 PROD S3 Upload Webhook`). He did **not** edit it. **MA-001 rewritten:** create DEV scenario first; never patch PROD for #8.

---

## Open actions

### MA-001 — Create DEV Make upload scenario, then homework router (#8)
- **GitHub issue:** [#8](https://github.com/Schmidt127/127-si-shooting-challenge/issues/8) (canonical; duplicate #6)
- **Task / agent:** T2 / Worker-B (Mike UI)
- **System:** Make.com — **new DEV scenario only**
- **Checklist:** [C-013-create-dev-make-upload-scenario.md](../deploy-checklists/C-013-create-dev-make-upload-scenario.md)
- **Exact error / why blocked (updated 2026-07-12):** Prior plan assumed scenario `Shooting Challenge - DEV - Upload Engine - Lambda - v1` already existed. **Mike inventory:** that DEV scenario is **missing**. Only live upload scenario is PROD:
  - Name: `Shooting Challenge - GAME - Upload Engine - Lambda - v1`
  - Webhook label: `C-013 PROD S3 Upload Webhook`
  - Mike: **did not edit it** (correct)
- **Actions attempted:** Sanitized DEV blueprint + runbook in repo; lead updated plan after Mike report
- **Exact action (Phase 0 — do this before any Module 2 “patch” language):**
  1. **Do not open/edit** the PROD GAME scenario or `C-013 PROD S3 Upload Webhook`.
  2. Create a **new** Make scenario named **`Shooting Challenge - DEV - Upload Engine - Lambda - v1`** (from [blueprint](../../make/blueprints/upload-asset-engine-lambda-dev-v1.template.json) **or** clone PROD into a **new** scenario then immediately re-point all URLs/secrets to **DEV** — see checklist Phase 0a).
  3. Module 1: **new** Custom webhook labeled e.g. `C-013 DEV S3 Upload Webhook` (must **not** share the PROD webhook).
  4. Module 2 Router — include **both** branches from the start:
     - `automationNumber=070b` **AND** `routeKey=video_feedback`
     - `automationNumber=070a` **AND** `routeKey=homework_completion`
  5. Module 3 → **DEV** Lambda Function URL + **DEV** `X-Upload-Secret` only.
  6. Prefer webhook response = **complete Lambda JSON** for manual smoke.
  7. Save; scheduling **OFF**; Run once only.
  8. Put the **new** webhook URL in local ops / `tools/airtable/.env` as `MAKE_DEV_UPLOAD_WEBHOOK_URL` — **never commit**; never use the PROD webhook URL here.
  9. Confirm PROD GAME scenario remains unmodified.
  10. **Do not** enable Airtable **070a** yet.
- **Phase 1 (only after Phase 0):** Confirm DEV Lambda `ALLOW_ROUTE_KEYS` includes `homework_completion`; run homework webhook smoke against DEV asset.
- **Blocks:** T2/T3 live Make smoke (not full run)
- **Continuing meanwhile:** Worker B **T6** (offline validator); Worker C **T7**; no idle wait on this issue
- **Branch / commit / result:** blueprint on lead · Worker B T2 result · PR #12
- **Verify when done:** Comment on #8: `RESOLVED — DEV scenario created; Module 2 homework wired; Run once ready` (and note webhook is DEV-labeled, not PROD)

### MA-002 — T2 AWS-DEV / Cursor env credentials
- **GitHub issue:** [#9](https://github.com/Schmidt127/127-si-shooting-challenge/issues/9) (canonical; duplicate #7)
- **Task / agent:** T2 / Worker-B (also unblocks T3)
- **System:** Cursor cloud environment / local ops (DEV-only secrets)
- **Location:** Env for repo `127-si-shooting-challenge` — **not** PROD
- **Exact error:** No `tools/airtable/.env`, no AWS creds, no `LAMBDA_FUNCTION_URL` / `UPLOAD_WEBHOOK_SECRET` / `MAKE_DEV_UPLOAD_WEBHOOK_URL` / `AIRTABLE_TOKEN`
- **Actions attempted:** Offline unit tests + expected-fail preflight documented
- **Exact action:**
  1. Provision **DEV-only**: `AIRTABLE_TOKEN` (DEV base `appTetnuCZlCZdTCT`), `LAMBDA_FUNCTION_URL` (DEV `127si-upload-asset-dev`), `UPLOAD_WEBHOOK_SECRET`, `MAKE_DEV_UPLOAD_WEBHOOK_URL` (**after MA-001 Phase 0 creates the DEV webhook** — must not be the PROD webhook), optional AWS keys for `us-east-2`.
  2. Confirm DEV Lambda `ALLOW_ROUTE_KEYS=video_feedback,homework_completion`.
  3. Re-run smoke (local or follow-up agent) per issue #9 body.
- **Hard stops:** No PROD secrets; do not enable 070a until smoke PASS; never commit secrets; never point `MAKE_DEV_*` at `C-013 PROD S3 Upload Webhook`
- **Blocks:** Live Make/Lambda/Airtable smoke for T2/T3 (not full run)
- **Continuing meanwhile:** Worker B on **T6** (offline-only). Worker C on **T7**. No idle wait.
- **Verify when done:** Comment `RESOLVED — DEV env keys present` + sanitized `envPresent` JSON only

### MA-003 — T3 live 070a DEV smoke
- **GitHub issue:** [#11](https://github.com/Schmidt127/127-si-shooting-challenge/issues/11) (canonical; duplicate #10)
- **Task / agent:** T3 / Worker-C
- **System:** Tests-DEV (Airtable + Make + Lambda)
- **Location:** `tools/airtable/c070a_dev_smoke_run.py` live modes (`C070A_ALLOW_LIVE=1`)
- **Exact error:** Live invoke gated; DEV webhook/token creds + **DEV Make scenario** + Airtable paste
- **Actions attempted:** **73/73** offline tests PASS; mock smoke 5/5 PASS; aligned to Worker B env names; Worker A+B results published
- **Exact action:**
  1. Complete MA-006 (#17 paste 070a v4.4 DEV, leave OFF).
  2. Complete **MA-001 Phase 0+1** (create DEV scenario; not PROD) and MA-002.
  3. Provide disposable DEV homework Submission Asset id.
  4. Set `C070A_ALLOW_LIVE=1` and run live-preflight / live-upload against DEV only.
- **Blocks:** T3 live verification only
- **Continuing meanwhile:** Worker C **reassigned to T7** (contract alignment + offline suite — does not wait on live smoke)
- **Note:** Worker A+B results published; issue body partially stale on “Worker A/B unpublished”

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
