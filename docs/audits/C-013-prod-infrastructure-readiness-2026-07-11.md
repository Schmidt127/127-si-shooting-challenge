# C-013 — PROD infrastructure readiness audit

**Audit date:** 2026-07-11  
**Backlog:** C-013 (Wave 7 asset storage) · C-023 (hash duplicate review)  
**Repo commit at audit start:** `5f96cac`  
**Machine-readable:** [C-013-prod-infrastructure-readiness-2026-07-11.json](./C-013-prod-infrastructure-readiness-2026-07-11.json)  
**Smoke test plan:** [C-013-prod-smoke-test-2026-07-11.md](../deploy-checklists/C-013-prod-smoke-test-2026-07-11.md)  
**Promotion plan:** [C-013-production-promotion-plan.md](../deploy-checklists/C-013-production-promotion-plan.md)

---

## 1. Executive summary

| Result | Detail |
|--------|--------|
| **Overall C-013 PROD readiness** | **CONDITIONAL GO** for one controlled 070b test after secret rotation/re-smoke + UI checks |
| **Production v2 estimate** | **~92%** (Lambda + Make manual route PASS; activation gates remain) |
| **Infrastructure blockers** | **0** — remaining gates are secret rotation and Airtable activation verification |
| **070b can be enabled** | **Not yet** — Mike approval required after secret rotation, re-smoke, UI + isolation-view verification |
| **Manual deployment actions** | **8** remaining (see §8) |

DEV proves the full design: **Airtable 070b → Make → Lambda Function URL → S3 → Airtable writeback** with Lambda-owned upload claim (v4.2). PROD Submission Assets schema promotion is **PASS**. Automation **116** schema and runtime are **PASS** and **ON**. Automation **070b** is **OFF**.

**PROD Lambda `127si-upload-asset` deployed — direct smoke PASS. PROD Make manual route also PASS (`overallPass=true`, 2026-07-11).** Repository closeout package is complete ([make build](../deploy-checklists/C-013-prod-make-build-2026-07-11.md) · [070b UI](../deploy-checklists/C-013-prod-070b-ui-verification-2026-07-11.md) · [script paste](../deploy-checklists/C-013-prod-070b-script-paste-v4.2.txt)). Operational closure waits on secret rotation + one Airtable-triggered Schmidt test. S3 bucket `shooting-challenge-assets` exists in `us-east-2`.

---

## 2. Current DEV state

| Component | Value |
|-----------|--------|
| Base | `appTetnuCZlCZdTCT` |
| Lambda | `127si-upload-asset-dev` · python3.12 · 512 MB · 120 s · x86_64 |
| Function URL | EXISTS · AuthType `NONE` · header auth in handler |
| S3 | `shooting-challenge-assets` · prefix `shooting-challenge/2026-2027/...` |
| Make | `Shooting Challenge - DEV - Upload Engine - Lambda - v1` |
| 070b script | GitHub **v4.2** · automation **OFF** |
| 070a | **OFF** · homework route proven but out of first PROD slice |
| Evidence | `recF86pJTIMFoEypJ` hybrid PASS · `recthL2wrTha5nWHL` Make PASS |

**DEV Lambda env var names (all non-empty in AWS):** `AIRTABLE_BASE_ID`, `AIRTABLE_TOKEN`, `AIRTABLE_API_TOKEN`, `S3_BUCKET`, `ENVIRONMENT`, `ALLOW_ROUTE_KEYS`, `SEASON_SLUG`, `CHALLENGE_SLUG`, `UPLOAD_WEBHOOK_SECRET`

**DEV CodeSha256 (2026-07-10):** `MiQYYa8YQER1uwh5xKimm1efXurWNqwxqq4aqhY5Qr4=`

---

## 3. Current PROD state

| Component | Status |
|-----------|--------|
| Base | `appn84sqPw03zEbTT` |
| Submission Assets schema | **PASS** (16 required fields; `Calculation` approved NO ACTION) |
| Automation 116 | **ON** · runtime fixture **PASS** |
| Automation 070b | **OFF** |
| Lambda `127si-upload-asset` | **EXISTS** · direct smoke **PASS** |
| Function URL | **CONFIGURED** (ops) |
| IAM role `127si-upload-asset-role` | **EXISTS** |
| CloudWatch `/aws/lambda/127si-upload-asset` | **EXISTS** |
| Make Lambda scenario | **BUILT · manual route PASS** |
| Schmidt Testing fixture | `recGQ8EjAMz3bEBiW` · probe `allPass=true` (direct Lambda) |

---

## 4. Intended PROD architecture (Phase 1)

```text
1. Submission Asset → Pending Link + attachment + Video Feedback link
2. 070b (later) → POST minimal JSON to Make webhook
3. Make → Router (070b + video_feedback) → HTTP POST PROD Lambda URL + X-Upload-Secret
4. Lambda → verify secret → claim (Processing, Upload Claim Run ID, Processing Started At)
5. Lambda → download attachment → SHA-256 → S3 PutObject
6. Lambda → Airtable writeback (Canonical File URL, Storage Key, hash, size, MIME, Uploaded)
7. Lambda → C-023 duplicate flag writeback (no auto-block)
8. 070b → parse Lambda JSON → clear Send to Make Trigger only on verified success
9. Retry → skipped_already_uploaded / stale_claim / skipped_concurrent_upload paths
```

### Repository components

| Path | Role |
|------|------|
| `lambda/upload-asset/handler.py` | Lambda entry |
| `lambda/upload-asset/upload_core/*` | Claim, processor, S3, Airtable, duplicate review |
| `lambda/upload-asset/deploy-prod.ps1` | PROD deploy script |
| `lambda/upload-asset/iam-policy-prod.json` | PROD S3 + logs IAM |
| `airtable/automations/.../070b-...-send-video-asset-payload-to-make.js` | 070b v4.2 |
| `tools/airtable/c013_dev_lambda_invoke.py` | Invoke helper (adapt for PROD) |
| `tools/airtable/_probe_c013_asset_storage_fields.py` | Writeback probe |
| `make/documentation/C-013-dev-make-lambda-scenario-prep.md` | Make chain reference |

**070b does NOT call Lambda directly.** Approved path is **070b → Make → Lambda**.

---

## 5. DEV vs PROD infrastructure matrix

See JSON file for full matrix. Summary:

| Item | PROD status |
|------|-------------|
| Lambda `127si-upload-asset` | **MISSING** |
| Function URL | **MISSING** |
| IAM role + S3 policy | **REQUIRES MANUAL CREATION** |
| S3 bucket | **VERIFIED READY** |
| Env vars | **REQUIRES SECRET** + **REQUIRES DEPLOYMENT** |
| Make scenario | **MISSING** |
| 070b script paste | **REQUIRES DEPLOYMENT** (after smoke) |
| Code guard DEV↔PROD | **VERIFIED READY** (after this commit) |

---

## 6. AWS read-only inspection (Phase 3)

**Credential:** `arn:aws:iam::021891587263:user/schmidt` (default profile). `mike-admin` profile unavailable in Cursor shell.

| Check | Result |
|-------|--------|
| PROD Lambda `127si-upload-asset` | **Not found** |
| DEV Lambda `127si-upload-asset-dev` | **Exists** |
| DEV Function URL | **Exists** · AuthType NONE |
| S3 `shooting-challenge-assets` | **Exists** · us-east-2 |
| DEV log group | `/aws/lambda/127si-upload-asset-dev` |
| PROD log group | **Missing** |
| DEV IAM inline S3 policy | PutObject, GetObject, HeadObject on `bucket/*`; ListBucket on bucket |

**Never log secret values.** DEV confirms `UPLOAD_WEBHOOK_SECRET` and Airtable token env vars are **non-empty**.

---

## 7. Code validation (Phase 4)

```powershell
cd lambda/upload-asset
python -m unittest discover -s tests -p "test_*.py" -v   # 38/38 PASS
python tests/test_auth.py                                   # 6/6 PASS
python tests/test_config.py                                 # 4/4 PASS
```

| Check | Result |
|-------|--------|
| PROD base when `ENVIRONMENT=PROD` | **PASS** (after config fix) |
| DEV blocks PROD base | **PASS** |
| X-Upload-Secret required | **PASS** |
| Unsupported route keys rejected | **PASS** |
| Storage key deterministic | **PASS** (`upload_core/util.py`) |
| SHA-256 writeback | **PASS** |
| Idempotent / duplicate behavior | **PASS** (processor + claim tests) |
| No hard-coded DEV endpoint in PROD deploy path | **PASS** (`deploy-prod.ps1`) |

**Failed tests:** none.

---

## 8. Automation 070b audit (Phase 5)

| Setting | Value |
|---------|--------|
| **Name** | `070b - Email, Notifications, and External Handoffs - Send Video Asset Payload to Make` |
| **Script** | `070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js` |
| **Version** | **v4.2** (Lambda owns claim; no Processing write on Make 2xx) |
| **Trigger table** | Submission Assets |
| **Trigger condition** | Send to Make Trigger checked; video asset ready; Upload Status Pending Link |
| **Inputs** | `recordId`, `makeWebhookUrl`, `automationNumber` = `"070b"` |
| **Endpoint** | Make webhook URL (input variable) |
| **Lambda interaction** | Indirect via Make HTTP module |
| **Claim** | Lambda writes Processing + Upload Claim Run ID + Processing Started At |
| **070a** | Same script; `automationNumber=070a` — **out of first PROD slice** |
| **PROD state** | **OFF** · doc record not verified populated |

---

## 9. Manual AWS promotion checklist (Phase 6)

| # | Step | Owner | Infra change | Expected PASS |
|---|------|-------|--------------|---------------|
| 1 | Approve audit + smoke plan | Mike | No | Written approval |
| 2 | Issue new PROD Airtable PAT (`appn84sqPw03zEbTT` only) | Mike | No | Token in password manager |
| 3 | Generate new `UPLOAD_WEBHOOK_SECRET_PROD` | Mike | No | Non-empty secret stored |
| 4 | Add to local `tools/airtable/.env`: `AIRTABLE_PROD_TOKEN`, `UPLOAD_WEBHOOK_SECRET_PROD` | Mike | No | Vars set locally only |
| 5 | `cd lambda/upload-asset; $env:AWS_PROFILE=$null; .\deploy-prod.ps1` | Mike | **Yes** | Function created |
| 6 | Verify: `aws lambda get-function-configuration --function-name 127si-upload-asset --region us-east-2` | Mike/Cursor | No | Runtime python3.12 |
| 7 | Verify env **names** non-empty (do not print values) | Mike | No | All required names present |
| 8 | Record Function URL in ops notes | Mike | No | URL saved locally |
| 9 | Rejection test: POST without `X-Upload-Secret` → 401 | Mike | No | `error_unauthorized` |
| 10 | Rejection test: wrong secret → 401 | Mike | No | `error_unauthorized` |
| 11 | Rejection test: routeKey `invalid` → 400 | Mike | No | Unsupported route error |
| 12 | OMNI: prepare Schmidt Testing Submission Asset fixture (see smoke doc) | Mike/OMNI | No | Asset Pending Link |
| 13 | Direct Lambda smoke: valid secret + `video_feedback` | Mike | No | `actionOut=uploaded`, `allPass=true` |
| 14 | S3 HEAD object at Storage Key | Mike | No | Object exists |
| 15 | Probe with `WAVE7_PROBE_BASE=appn84sqPw03zEbTT`: `_probe_c013_asset_storage_fields.py --record-id rec...` | Cursor/Mike | No | `allPass=true` |
| 16 | Idempotency: repeat same payload | Mike | No | `skipped_already_uploaded` |
| 17 | Build Make `Shooting Challenge - GAME - Upload Engine - Lambda - v1` | Mike | **Yes** | Scenario saved OFF |
| 18 | Make manual webhook test (070b OFF) | Mike | No | Lambda JSON in response |
| 19 | Paste Make URL into 070b input — automation **OFF** | Mike | No | Input configured |
| 20 | Paste 070b v4.2 script to PROD — automation **OFF** | Mike | No | Script saved |
| 21 | **G6 approval** — one controlled 070b enable | Mike | No | Explicit go |
| 22 | One Schmidt Testing upload via 070b | Mike | No | Uploaded + hash |
| 23 | **070b OFF immediately** | Mike | No | Automation disabled |
| 24 | CloudWatch: no secrets in logs | Mike | No | Spot-check PASS |
| 25 | `CHANGELOG.md` + backlog update | Cursor | No | Committed |
| 26 | Rollback drill: reserved concurrency 0 | Mike | Yes | Invoke blocked |
| 27 | Restore concurrency; document CodeSha256 | Mike | Yes | Rollback proven |

**Failure response (any step):** Stop · 070b OFF · Make scenario OFF · throttle Lambda · rotate secrets if exposed · document incident.

---

## 10. Isolated PROD smoke test

Full steps: [C-013-prod-smoke-test-2026-07-11.md](../deploy-checklists/C-013-prod-smoke-test-2026-07-11.md)

**Fixture enrollment only:** `recgP9qZYjAhE7NXm` (Schmidt, Testing - 2025-2026)

**070b remains OFF** until direct Lambda tests 1–16 pass.

---

## 11. Enablement gates (Phase 9)

| Gate | Pass? |
|------|-------|
| PROD Lambda exists | ✅ |
| Code matches approved commit | ✅ |
| Env vars exist | ✅ |
| Secret rejection tests | ✅ |
| S3 write + key + hash | ✅ |
| Airtable writeback | ✅ |
| Canonical URL usable | ✅ |
| Idempotency | ✅ |
| Error writeback | ✅ |
| Schmidt Testing only | ✅ |
| Rollback verified | ✅ |
| Documentation | ✅ |
| Make manual PASS | ✅ (2026-07-11 · `overallPass=true`) |
| Secret rotation + re-smoke | ⏳ pending |
| 070b UI + isolation view verified | ⏳ pending |
| One Airtable-triggered Schmidt test | ⏳ pending Mike approval |

**070b enable:** **CONDITIONAL GO** after secret rotation, re-smoke, UI/isolation verification, and explicit Mike approval for one controlled test

---

## 12. Rollback

1. **070b OFF** · **070a OFF**
2. Disable Make Production upload scenario
3. `aws lambda put-function-concurrency --function-name 127si-upload-asset --reserved-concurrent-executions 0 --region us-east-2`
4. Rotate PAT + `UPLOAD_WEBHOOK_SECRET_PROD` if exposed
5. Do **not** bulk-delete S3 objects or canonical fields

---

## 13. OMNI prompt (Phase 7)

See §15 below (full prompt for Mike).

---

## 14. Manual actions for Mike vs Cursor

| Mike | Cursor |
|------|--------|
| AWS deploy (`deploy-prod.ps1`) | Audit docs, deploy scripts, config guard |
| Issue PROD secrets | Read-only probes, unit tests |
| Make scenario build | GitHub 070b source, promotion plan updates |
| Function URL smoke tests | `_probe_*` scripts (read-only) |
| 070b paste + controlled enable | CHANGELOG after Mike PASS |
| OMNI Airtable prep | Do not enable 070b |

---

## 15. Remaining risks

1. Exposed PROD upload secret must be rotated before activation
2. Shared S3 bucket — season prefix must differ DEV vs PROD
3. Live athlete exposure if 070b enabled outside the approved Schmidt-only window
4. Isolation view missing — create/verify before controlled trigger test

---

## 16. Updated Production v2 estimate

**~92%** — Schema + automation 116 + PROD Lambda + Make manual route complete. Secret rotation, live 070b UI/isolation verification, and one controlled trigger test remain.

**Configuration package (2026-07-11):** [C-013-prod-make-build-2026-07-11.md](../deploy-checklists/C-013-prod-make-build-2026-07-11.md) · [C-013-prod-070b-ui-verification-2026-07-11.md](../deploy-checklists/C-013-prod-070b-ui-verification-2026-07-11.md) · [script paste v4.2](../deploy-checklists/C-013-prod-070b-script-paste-v4.2.txt) · [make smoke result](./C-013-prod-make-smoke-result-2026-07-11.md)

---

## 17. Exact next Cursor prompt

```
Rotate the C-013 PROD upload secret in AWS Lambda, Make X-Upload-Secret, and local tools/airtable/.env without printing it. Re-run auth checks and the full manual Make smoke on recGQ8EjAMz3bEBiW with 070b OFF. If overallPass=true, verify the 070b v4.2 Airtable builder and Schmidt isolation view, then stop for Mike's explicit approval before one controlled trigger test.
```

---

## 18. Complete Airtable OMNI prompt

```
OMNI — C-013 PROD safe preparation (read-only + documentation only)

Base: 127 SI Shooting Challenge PRODUCTION (appn84sqPw03zEbTT)

DO NOT:
- Enable automation 070b or 070a
- Modify live athlete enrollments (only Schmidt Testing recgP9qZYjAhE7NXm)
- Insert secrets, webhook URLs, or Lambda URLs
- Change field types or formulas
- Claim Lambda is deployed

TASKS:
1. Open Submission Assets table. Confirm these fields exist (read-only verify): Canonical File URL, Storage Key, File Content Hash, File Hash Algorithm, File Size Bytes, File MIME Type, Upload Status, Upload Error, Uploaded At, Upload Claim Run ID, Processing Started At, Send to Make Trigger, Writeback Complete?, Airtable Attachment, Video Feedback, Upload Destination. Report any missing field names only.

2. Open Automations documentation table. Create or update ONE documentation row for automation 070b:
   - Automation Number: 070b
   - Automation Name: 070b - Email, Notifications, and External Handoffs - Send Video Asset Payload to Make
   - Script Version: v4.2
   - Status: OFF — awaiting C-013 PROD Lambda smoke (do not enable)
   - Notes: Sends minimal payload to Make Upload Engine; Lambda owns upload claim; Make posts to PROD Lambda Function URL with X-Upload-Secret; first PROD slice video_feedback only; GitHub source 070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js

3. If a C-019 Schmidt Testing view for Submission Assets upload prep does not exist, create view "C-013 PROD Smoke — Schmidt Testing Only" filtered to Enrollment = Schmidt, Testing - 2025-2026 (recgP9qZYjAhE7NXm). View is for fixture prep only.

4. Document intended 070b trigger (do not save trigger on automation): Submission Assets when Send to Make Trigger is checked AND Upload Status = Pending Link AND Upload Destination = Video Feedback. Input variables: recordId, makeWebhookUrl (placeholder TBD after Make build), automationNumber = 070b.

Return: field verify PASS/FAIL list, automation doc record id, view name if created.
```
