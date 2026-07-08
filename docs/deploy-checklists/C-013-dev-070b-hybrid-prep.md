# C-013 — DEV 070b hybrid webhook prep plan

**Date:** 2026-07-08  
**Status:** **PREP ONLY — 070b remains OFF** until Mike approves this plan and dry-run passes  
**Parent:** [C-013-sdk-hybrid-runtime.md](./C-013-sdk-hybrid-runtime.md)  
**Prerequisites (PASS):** SDK upload + hash + C-023 duplicate on DEV; C-020 H2 harness (`recL9r4a7navUxEhg`); commit `8dcc460`

---

## Current locked state (inspected)

| Item | State |
|------|--------|
| **DEV base** | `appTetnuCZlCZdTCT` |
| **Production base** | `appn84sqPw03zEbTT` — **untouched** |
| **070a** (homework → Make) | **OFF** per [development-base-setup.md](../development-base-setup.md) |
| **070b** (video → Make) | **OFF** per development-base-setup |
| **Make Amazon S3 Upload** | **PARKED / blocked** — do not use |
| **SDK runtime** | [`c013_dev_s3_upload_proof.py`](../../tools/airtable/c013_dev_s3_upload_proof.py) — authoritative upload + hash + duplicate + writeback |
| **Existing DEV Make scenario** | `Shooting Challenge - DEV - Upload Engine - S3 - v1` — webhook + Get Record + HTTP download + **S3 module (parked)** + Airtable update — **must be refactored** for hybrid |
| **H2 harness asset** | `recL9r4a7navUxEhg` — already **Uploaded** via manual SDK (not usable for 070b first-fire without fresh asset) |

---

## 1. Automation / table / view / filter inventory

### Airtable automations (GitHub source of truth)

| Automation | File | Table | Documented trigger | Input `automationNumber` |
|------------|------|-------|-------------------|---------------------------|
| **070a** | `070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js` | Submission Assets | `Send to Make Trigger` checked + homework ready | `"070a"` |
| **070b** | `070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js` | Submission Assets | `Send to Make Trigger` checked + video ready | `"070b"` |

**Shared script body (v4.1):** Both use the same logic. **070b** is distinguished only by Airtable automation **input** `automationNumber = "070b"` and (must verify) **trigger conditions** limiting to video assets.

**Mike must verify in DEV Airtable UI (not exportable via API):**

- [ ] Automation **070b** is **OFF**
- [ ] Automation **070a** is **OFF**
- [ ] **070b** trigger table = **Submission Assets**
- [ ] **070b** trigger type = **When a record matches conditions** (expected)
- [ ] **070b** `makeWebhookUrl` input = **empty or DEV placeholder** — not Production hook
- [ ] **070b** trigger conditions include **video-only** filters (see §3)

### Submission Assets — formula gates (DEV schema snapshot 2026-07-06)

| Field | Role |
|-------|------|
| **Send to Make Trigger** | Checkbox — **013** sets `true` after VF link; **070b** clears on webhook success |
| **Ready to Send to Make?** | Formula — returns `READY_TO_SEND` when attachment + destination + target link present |
| **Why Not Ready for Make?** | Formula — blank when trigger + attachment + Video Feedback link OK |
| **Upload Status** | Ladder: `Pending Link` → `Processing` (070b after Make 200) → `Uploaded` (SDK writeback) |
| **Upload Destination** | `Video Feedback` for **070b** route |

**013 behavior (unchanged):** After VF link, sets `Upload Status = Pending Link`, checks **Send to Make Trigger** when `Ready to Send to Make? = READY_TO_SEND`.

### Views (DEV schema snapshot)

| View name | View id | Table (expected) | Use |
|-----------|---------|------------------|-----|
| **070 - Ready to Send Asset to Make** | `viwPlmXDSf78jt6Ht` | Submission Assets (verify in UI) | Operator triage; **recommended** as 070b trigger scope |

**Note:** View filter formula is **not** in schema export. Mike must open the view in DEV and confirm filters align with §3 before enabling **070b**.

### Intake chain (video — unchanged)

```text
115 Testing Scenario (Video)
  → Submission + Video Upload attachment
  → 005 Week assignment (may need Week 10 patch for harness dates — see H2 runbook)
  → 009 Submission Asset(s)
  → 013 Video Feedback link + Pending Link + Send to Make Trigger
  → [070b OFF today] → Make webhook → SDK hybrid
  → 022 (Drive URL copy — legacy; not in scope)
```

---

## 2. Make webhook vs local/manual bridge

| Path | Role in interim slice | Recommendation |
|------|----------------------|----------------|
| **A — 070b → Make DEV webhook → HTTP → SDK** | Production-shaped; orchestration in Make; upload in SDK | **SELECT for enable** |
| **B — Manual webhook POST** (070b OFF) | Same payload; tests Make + SDK without Airtable trigger | **Required dry-run step 1** |
| **C — Direct SDK CLI** (`c013_dev_s3_upload_proof.py`) | Proven; bypasses 070b + Make | **Already PASS (H2);** use for regression only |

**Decision:** **070b should call the DEV Make webhook directly** when enabled. A **local/manual bridge** is still required **before** enable:

1. POST v4.1 payload to DEV Make webhook (scenario **Run once**) — validates Make routing without firing Airtable.
2. Optionally run SDK CLI on same asset — compares outcomes.

**Do not** re-enable the Make **Amazon S3 Upload** module. Replace upload steps with **HTTP → SDK handler**.

### Target Make scenario (new or refactor)

**Name (proposed):** `Shooting Challenge - DEV - Upload Engine - SDK Hybrid - v1`

```text
Module 1  Custom webhook          ← 070b POST (v4.1 payload)
Module 2  Router                  ← automationNumber = "070b" AND routeKey = "video_feedback"
Module 3  HTTP → SDK handler      ← POST { submissionAssetRecordId, routeKey, … }
Module 4  Webhook response 200    ← required: 070b sets Processing only on response.ok
```

**Remove / do not wire:** Amazon S3 Upload, Google Drive modules, legacy S3 Get+Put chain from `…S3 - v1`.

**SDK handler gap:** No HTTP wrapper exists in repo yet (build sequence step 2). Options for Mike:

| Option | Pros | Cons |
|--------|------|------|
| **ngrok + thin Flask/FastAPI** wrapping `c013_dev_s3_upload_proof.py` | Fast DEV proof | Ephemeral URL; ops overhead |
| **Vercel/serverless** in `web/` | Stable HTTPS URL | Small code deploy; env vars |
| **Make → subprocess** | N/A | Make cannot run local Python/boto3 |

**Until SDK HTTP endpoint exists:** dry-run uses **manual webhook POST** with Make scenario calling HTTP module pointed at stub (returns 200) OR Mike runs SDK CLI after webhook receive logged.

---

## 3. Proposed 070b trigger criteria

### Airtable automation trigger (recommended — Mike verify/paste)

**Table:** Submission Assets  
**Type:** When a record matches conditions  
**Recommended conditions (all AND):**

| # | Field | Operator | Value |
|---|-------|----------|-------|
| 1 | **Send to Make Trigger** | is | checked |
| 2 | **Upload Destination** | is | `Video Feedback` |
| 3 | **Ready to Send to Make?** | is | `READY_TO_SEND` |
| 4 | **Upload Status** | is | `Pending Link` |
| 5 | **Airtable Attachment** | is not empty | — |
| 6 | **Video Feedback** | is not empty | — |
| 7 | *(optional scope)* | Record is in view | **070 - Ready to Send Asset to Make** |

**Enrollment scope (test window):** Restrict manual testing to Schmidt `recgP9qZYjAhE7NXm` until first PASS documented. Optional trigger filter: **Enrollment - Linked** contains Schmidt — **not required** if view already limits test assets.

### Script-side gates (already in 070b v4.1 — no GitHub change required for enable)

On each run, script enforces:

- `Upload Destination` resolves to **video** route (`routeKey = video_feedback`)
- **Video Feedback** link present (else skip `Pending Link`)
- **Airtable Attachment** present
- **Submission - Linked** + **Enrollment - Linked** present
- **No** `Google Drive File URL` / **Google Drive File ID** (legacy dedupe — skips if Drive already populated)
- POST v4.1 JSON to `makeWebhookUrl`
- On HTTP 200: `Upload Status = Processing`, clear **Upload Error**, uncheck **Send to Make Trigger**
- **Does not** clear **Airtable Attachment**
- **Does not** write **Canonical File URL** / S3 fields (SDK does)

**Gap (document only — optional hardening later):** Script does **not** check `Upload Status = Pending Link` or `Canonical File URL` blank before send. Rely on trigger conditions + **Send to Make Trigger** clearing.

---

## 4. Safety gates

| # | Risk | Mitigation | Verified |
|---|------|------------|----------|
| 1 | Production records processed | **070b** only on DEV base; DEV `makeWebhookUrl` only; never paste prod hook | Enforced by base isolation — **Mike verify URL** |
| 2 | Production automation ON | Do not paste into `appn84sqPw03zEbTT` | **OFF** (policy) |
| 3 | **070a** fires on homework | **070a stays OFF**; **070b** trigger includes `Upload Destination = Video Feedback` | Prep |
| 4 | Homework asset hits **070b** | Separate automations + destination filter; script routes by destination but **070b** input should never run on HW | Prep |
| 5 | Make S3 module used | Hybrid scenario **excludes** S3 module; SDK does PutObject | **Blocked** |
| 6 | Attachment cleared | SDK + 070b do not clear attachment; no Slice 4 cleanup | **Enforced** |
| 7 | Drive fields removed | No schema changes in this slice | **Enforced** |
| 8 | Formula/view cutover | No Canonical URL in formulas/views | **Enforced** |
| 9 | Duplicate upload | Drive URL guard in 070b; SDK idempotent if same asset re-run | Partial — add `Canonical File URL` trigger guard later |
| 10 | Stale **Send to Make Trigger** | 070b clears on success; audit extension warns on Uploaded + trigger checked | Ops |
| 11 | **H1** homework scope | **Do not enable 070a**; **Do not run H1** in this slice | **Enforced** |

---

## 5. Proposed webhook / runtime path

### v4.1 payload (unchanged)

```json
{
  "sourceName": "Airtable Upload Engine",
  "automationNumber": "070b",
  "sentAtIso": "<ISO>",
  "routeKey": "video_feedback",
  "uploadDestination": "Video Feedback",
  "sourceTable": "Submission Assets",
  "submissionAssetRecordId": "recXXXXXXXX",
  "targetTable": "Video Feedback",
  "targetRecordId": "recYYYYYYYY"
}
```

Reference: [`c013-manual-webhook-recBBi80bYuxXifVj.json`](../../tools/airtable/_preview/c013-manual-webhook-recBBi80bYuxXifVj.json)

### End-to-end (when enabled)

```text
Submission Asset (Pending Link, Send to Make Trigger checked)
  → DEV 070b automation
  → POST DEV Make webhook (v4.1)
  → Make router (070b / video_feedback only)
  → HTTP POST SDK handler
       → download attachment
       → SHA-256 + C-023 duplicate lookup
       → S3 PutObject (boto3)
       → Airtable PATCH writeback (Uploaded + canonical + hash)
  → Make returns 200
  → 070b sets Processing (then SDK sets Uploaded — see status note)
  → Probe allPass=true
```

**Status ladder note:** 070b sets **Processing** on webhook accept; SDK sets **Uploaded** on writeback. Final state should be **Uploaded** with **Writeback Complete? = 1**. If **Processing** persists, 022 or a small follow-up may be needed — verify on first 070b-enabled run.

---

## 6. Test record strategy

| Phase | Asset | Action |
|-------|-------|--------|
| **Regression reference** | `recL9r4a7navUxEhg` | H2 PASS artifact — **do not** re-fire 070b without reset |
| **Dry-run 1** | Fresh harness asset | `python c013_dev_h2_video_run.py --confirm-write --prepare-only` → wait for **Pending Link** asset |
| **Dry-run 2** | Same fresh asset | Manual POST v4.1 payload to DEV Make hybrid webhook (**070b OFF**) |
| **Dry-run 3** | Same asset | SDK CLI `--confirm-write` if Make HTTP not ready — compare to Make path |
| **Enable test** | New fresh asset (second H2 clone) | Enable **070b** only after Mike approves + dry-runs PASS |
| **Avoid** | Prod enrollments | Schmidt DEV only `recgP9qZYjAhE7NXm` |

**Fresh asset command:**

```powershell
cd tools/airtable
python c013_dev_h2_video_run.py --confirm-write --prepare-only
# poll → note assetId → manual webhook or wait for SDK HTTP
python c013_dev_s3_upload_proof.py <assetId> --athlete-slug schmidt-mike --out _preview/c013-dev-070b-dry-<assetId>.json
```

**Artifacts (on enable):**

- `tools/airtable/_preview/c013-dev-070b-hybrid-proof-<assetId>.json`
- `tools/airtable/_preview/c013-dev-070b-hybrid-proof-<assetId>-verify.json`

---

## 7. Disabled-state test plan (before enable)

Execute in order. **Stop if any step fails.**

| Step | Action | 070b | 070a | Pass criteria |
|------|--------|------|------|---------------|
| **0** | Confirm this doc reviewed by Mike | OFF | OFF | Approval recorded |
| **1** | Build/refactor DEV Make **SDK Hybrid** scenario (no S3 module) | OFF | OFF | Webhook URL copied to ops notes only |
| **2** | Create fresh H2 **Pending Link** video asset | OFF | OFF | `Ready to Send to Make? = READY_TO_SEND` |
| **3** | Manual POST v4.1 payload to DEV webhook | OFF | OFF | Make green; SDK path invoked or stub 200 |
| **4** | Run `_probe_c013_asset_storage_fields.py --record-id <assetId>` | OFF | OFF | `allPass=true` after SDK completes |
| **5** | Verify attachment retained; Drive URL blank | OFF | OFF | Read-only GET |
| **6** | Verify C-023 duplicate flags if same file bytes | OFF | OFF | JSON `c023Duplicate` block |
| **7** | Document DEV webhook URL in ops (not GitHub) | OFF | OFF | — |
| **8** | Paste DEV webhook into **070b** `makeWebhookUrl` input only | OFF | OFF | Input saved; automation still OFF |
| **9** | **Mike approval** | — | — | Explicit go |
| **10** | Turn **070b ON**; uncheck/recreate trigger on **one** fresh test asset | **ON** | OFF | End-to-end PASS |
| **11** | Re-run probe; save 070b hybrid artifacts | ON | OFF | `allPass=true` |

**Do not run H1. Do not enable 070a.**

---

## 8. Code changes needed

| Item | Required for prep? | Required for enable? | Owner |
|------|-------------------|---------------------|-------|
| **SDK HTTP wrapper** (POST v4.1 → invoke proof logic) | Documented | **Yes** | Cursor / Mike |
| **070b script changes** | No | No (optional: Pending Link + canonical blank guard) | — |
| **013 / 009 changes** | No | No | — |
| **Make scenario** (webhook → HTTP, no S3) | Documented | **Yes** | Mike / ops |
| **`c013_dev_h2_video_run.py`** | Exists | For fresh test assets | Done |

---

## 9. Approval checklist (Mike)

- [ ] DEV **070b** trigger conditions match §3  
- [ ] DEV **070a** remains **OFF**  
- [ ] DEV Make scenario uses **SDK hybrid** path (no S3 module)  
- [ ] DEV webhook URL recorded (ops only)  
- [ ] SDK HTTP endpoint URL decided and reachable from Make  
- [ ] Disabled-state test plan §7 steps 1–8 PASS  
- [ ] Explicit approval to turn **070b ON** (step 10)

**Until all checked:** **070b = OFF**

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-sdk-hybrid-runtime.md](./C-013-sdk-hybrid-runtime.md) | Runtime decision + H2 gate |
| [C-020-testing-scenarios-script-checklist.md](./C-020-testing-scenarios-script-checklist.md) | H2 harness |
| [development-base-setup.md](../development-base-setup.md) | DEV automation OFF list |
| [C-013-dev-s3-make-ui-runbook.md](../../make/documentation/C-013-dev-s3-make-ui-runbook.md) | Legacy Make UI (S3 parked) |
