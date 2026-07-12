# C-023 Stage 6 — Production readiness checklist

**Date:** 2026-07-12  
**Status:** **Open** — planning / closure gate (docs-only; no implementation in this task)  
**Backlog:** C-023 (parents: C-013, C-024)  
**Wave:** Wave 7 — asset storage + file-hash duplicate review  
**Authoritative policy:** [C-023-production-duplicate-policy.md](./C-023-production-duplicate-policy.md)  
**Phase 1 audit:** [worker-d-t4-c023-readonly-audit.md](../overnight-runs/worker-results/worker-d-t4-c023-readonly-audit.md)  
**Architecture:** [asset-storage-migration.md](../asset-storage-migration.md)

**Hard stops (this checklist):** No PROD writes · no hash-dedup implementation · never reset `recGQ8EjAMz3bEBiW` · do not enable 070a on PROD without lead approval

---

## Executive summary

C-023 Stages 1–5 are **implemented and runtime-proven** on DEV (H3 matrix 16/16; automation **116** DEV + PROD PASS 2026-07-11). **Stage 6** is the closure gate: confirm architecture decisions, prove remaining routes (homework via 070a), finish OMNI review UX, reconcile docs, and define rollback before marking C-023 complete.

**Use this document as the go/no-go checklist** — not as a second policy spec. Locked behavior lives in the production duplicate policy; this checklist tracks what must be **decided, evidenced, and signed off**.

---

## 1. Where SHA-256 is computed

| Layer | Computes hash? | Role |
|-------|----------------|------|
| **Lambda `upload_core`** | **Yes — authoritative** | After attachment download, **before** S3 `PutObject`; writes `File Content Hash` + `File Hash Algorithm = SHA-256` |
| **Make** | **No** | Webhook relay only; no byte access |
| **070a / 070b** | **No** | Payload + trigger orchestration only |
| **Airtable** | **No** | Stores hash; formulas may read it |
| **Legacy Make Drive modules 50/51/52** | Superseded | Do not implement for new routes — see [upload-asset-engine-v2-hash-duplicate-check.md](../../make/documentation/upload-asset-engine-v2-hash-duplicate-check.md) banner |

### Processing sequence (locked)

```text
1. Validate claim + attachment
2. Download submitted bytes (Airtable attachment URL)
3. Compute SHA-256
4. Global hash lookup → partition same-enrollment vs cross-enrollment
5. Classify contextual review reasons (same-enrollment only)
6. ALWAYS PutObject → new Storage Key + Canonical File URL
7. Writeback upload fields + C-023 review fields
8. Same-record retry → skipped_already_uploaded (no second object)
```

**Stage 6 sign-off:** Confirm no alternate hash path is planned (browser, Make, or Airtable formula). Hash must remain Lambda-owned for video **and** homework routes.

---

## 2. Authoritative Airtable fields

### 2.1 Submission Assets — detection (Lambda writer)

| Field | Writer | Authoritative meaning |
|-------|--------|----------------------|
| `File Content Hash` | Lambda | SHA-256 of uploaded bytes |
| `File Hash Algorithm` | Lambda | `SHA-256` |
| `Exact Hash Match Found?` | Lambda | Identical bytes exist **anywhere** in base |
| `Same Enrollment Match Found?` | Lambda | ≥1 uploaded match under same enrollment |
| `Duplicate Match Record` | Lambda | **Primary** prior asset for review (single link) |
| `Duplicate Match Records (All)` | Lambda | All same-enrollment uploaded matches |
| `Duplicate Match Strength` | Lambda | `Exact SHA-256 Hash` |
| `Duplicate Checked At` | Lambda | Last classification timestamp |
| `Duplicate Check Error` | Lambda | Lookup/classification partial-failure diagnostics |
| `Duplicate Match Notes` | Lambda | Machine notes; optional global-match note |
| `Potential Asset Reuse?` | Lambda | Same-enrollment contextual warning → review queue |
| `Asset Reuse Review Primary Reason` | Lambda | Highest-severity reason code |
| `Asset Reuse Review Reasons` | Lambda | All triggered reason codes |
| `Asset Reuse Review Summary` | Lambda | Human-readable current vs prior summary |
| `Canonical File URL` | Lambda | **This asset's** object URL (never copied from prior) |
| `Storage Key` | Lambda | **This asset's** S3 key |
| `Uploaded At` | Lambda | Successful upload timestamp |
| `Upload Status` | Lambda | Terminal `Uploaded` on success |
| `Upload Claim Run ID` / `Processing Started At` | Lambda | Claim lease (C-013) |

### 2.2 Submission Assets — operator decision (Mike only)

| Field | Writer | Authoritative meaning |
|-------|--------|----------------------|
| `Asset Reuse Decision` | **Mike / OMNI only** | Final judgment; Lambda **must not** overwrite nonblank decisions on retry |
| `Asset Reuse Review Notes` | Mike | Free-text review notes |
| `Asset Reuse Reviewed At` / `By` | Mike | Audit trail |

### 2.3 Submission Assets — consequence idempotency (automation 116)

| Field | Writer | Authoritative meaning |
|-------|--------|----------------------|
| `Duplicate Resolution Applied?` | 116 | Consequence workflow ran |
| `Duplicate Resolution Applied At` | 116 | When consequences applied |
| `Duplicate Resolution Error` | 116 | Apply failure message |
| `Duplicate Resolution Last Applied Decision` | 116 | Reversal idempotency guard |

### 2.4 Context fields (intake — read-only for Lambda classification)

`Enrollment - Linked`, `Submission - Linked`, `Homework Completions`, `Video Feedback`, `Asset Type`, `Asset Purpose`, `Asset Slot`, `Week`, `Date`, `Homework Name - Slot Correct`, `Source Attachment ID`, `Original File Name`, `Athlete Full Name`.

### 2.5 Downstream display (HC / VF)

| Table | Field | Role |
|-------|-------|------|
| Homework Completions | `Linked Asset Reuse Decision` | Lookup from linked Submission Asset |
| Video Feedback | `Linked Asset Reuse Decision` | Lookup from linked Submission Asset |
| Both | `Activity XP Display Label` | Formula — `Confirmed Duplicate — 0 XP` when applicable |

### 2.6 Deprecated / non-authoritative writers

| Field | Stage 6 rule |
|-------|----------------|
| `File is Duplicate?` | Stop Lambda writer — conflates global hash with review queue |
| `Duplicate File Status` | Technical only if written; not sole queue driver |
| `Duplicate Review Status` | Legacy — do not write from Lambda |

**Stage 6 sign-off:** Schema on DEV matches §11 field contract; PROD Submission Assets C-023 fields promoted per [pv2-prod-submission-assets-field-promotion-checklist](../audits/pv2-prod-submission-assets-field-promotion-checklist-2026-07-11.md). Commit `c023-stage3-verify-dev` snapshot when next export runs (currently uncommitted per T4 audit).

---

## 3. Duplicate scope options

Hash **lookup** is **global** (all uploaded assets with valid hash). **Review queue** scope is **same-enrollment contextual** only. Stage 6 documents the design space and the locked choice.

| Scope option | Lookup | Review queue | Locked? |
|--------------|--------|--------------|---------|
| **Same enrollment** | Filter matches to enrollment | Compare assignment, week, submission, asset type | **Yes — primary** |
| **Same week** | Subset of enrollment | Flag `Different Week Reuse` when week differs | **Yes — dimension** |
| **Same assignment** | Subset of enrollment | Flag `Different Assignment Reuse` / `Same Assignment Resubmission` | **Yes — dimension** |
| **Whole program** | Global hash (all enrollments) | **Informational only** — `Cross-Enrollment Match — Informational`; no primary review reason | **Yes — informational** |

**Not in scope:** Cross-enrollment auto-suspicion, filename-only dedup, or Drive-ID dedup.

**Stage 6 sign-off:** Mike confirms no request to narrow lookup to enrollment-only (would miss cross-enrollment informational notes) or widen review queue to cross-enrollment without policy revision.

---

## 4. Duplicate behavior options

| Behavior | Description | Locked for C-023? |
|----------|-------------|-------------------|
| **Block upload** | Reject PutObject when hash match found | **No — forbidden** |
| **Needs review** | Upload completes; `Potential Asset Reuse?` + reasons; Mike decides via `Asset Reuse Decision` | **Yes — default** |
| **Reuse existing object** | Copy prior `Canonical File URL` / `Storage Key`; skip PutObject | **No — forbidden** |

### Downstream while pending review (locked v1)

| Process | Behavior |
|---------|----------|
| Upload | Completes → `Uploaded` |
| Homework / VF pipelines | Continue |
| XP / gate credit | **Not** auto-withheld |
| Coach satisfactory | **Not** auto-revoked |
| Confirmed improper reuse | **116** applies 0 XP consequences **only** after `Confirmed Duplicate` |

**Stage 6 sign-off:** No automation or Lambda change reintroduces block-or-reuse without explicit policy amendment and backlog item.

---

## 5. Retries and partial multi-file uploads

### 5.1 Same-asset retry (idempotency)

| Condition | `actionOut` | S3 | Hash / review fields |
|-----------|-------------|-----|----------------------|
| `Upload Status = Uploaded` + canonical + hash | `skipped_already_uploaded` | No second object | No overwrite of Mike decision |
| `Processing` + matching claim + active lease | `claim_continuation` | Proceed | Re-classify if needed |
| Concurrent worker / claim conflict | `skipped_concurrent_upload` / `error_claim_conflict` | **No** PutObject | — |
| Stale `Processing` (no canonical, TTL exceeded) | `stale_claim` | Reclaim on next invoke per SOP | — |

**070b / 070a Option A:** Orchestration scripts do **not** set `Processing`; Lambda owns claim — required for reliable retries ([policy §10](./C-023-production-duplicate-policy.md#10-upload-status-claim-sequence-and-h3-collision-stage-1-assessment)).

### 5.2 Partial failure matrix

| Failure | Required behavior |
|---------|-------------------|
| S3 succeeds; review PATCH fails | Asset stays **Uploaded** with canonical + hash; `Duplicate Check Error` set; ops retry PATCH — **do not** delete S3 object |
| Hash lookup fails | Upload proceeds if bytes + S3 succeed; `Duplicate File Status = Error` or equivalent |
| Missing assignment/context | Upload proceeds; `Missing Context` in reasons; `Potential Asset Reuse?` per policy |
| Multiple same-enrollment priors | Primary on `Duplicate Match Record`; all IDs in `Duplicate Match Records (All)` or notes |

### 5.3 Multi-file uploads (video 1–3 assets per submission)

| Rule | Implication |
|------|-------------|
| **009** creates **one Submission Asset per attachment** | Each asset gets independent Lambda invoke, hash, S3 object, and review classification |
| **Asset Sequence** 1–3 | Naming only; **not** a shared dedup scope |
| Partial set upload (e.g. 2 of 3 Uploaded) | Each row idempotent independently; submission may have mixed states — audits must not assume all-or-nothing |
| Identical bytes across slots | Each row still gets own object; same-enrollment contextual rules apply per asset |

**Homework:** Typically one asset per HC slot; same per-row rules apply.

**Stage 6 sign-off:** H3i (`skipped_already_uploaded`) and H3j (multiple priors) evidence cited; homework partial-set smoke added after 070a DEV enable (§8).

---

## 6. Required audits and tests

### 6.1 Local / CI (no deploy)

| Suite | Path | Gate |
|-------|------|------|
| Duplicate review classifier | `lambda/upload-asset/tests/test_duplicate_review.py` | PASS |
| Processor + partial review writeback | `lambda/upload-asset/tests/test_processor.py` | PASS |
| Upload claim | `lambda/upload-asset/tests/test_upload_claim.py` | PASS |
| 070a homework regression | `lambda/upload-asset/tests/test_070a_homework_regression.py` | PASS after T1–T3 |

Run: `cd lambda/upload-asset && python -m unittest discover -s tests -p "test_*.py" -v`

### 6.2 DEV runtime matrix (complete)

| ID | Scope | Status | Evidence |
|----|-------|--------|----------|
| H3b–H3p | Contextual review 16 scenarios | **16/16 PASS** | [C-023-dev-h3-duplicate-bytes-test.md](./C-023-dev-h3-duplicate-bytes-test.md) |
| Stage 4C | Direct Lambda smoke | **PASS** | Policy §19; Wave 7 checklist |
| Stage 4D | Make + claim collision | **PASS** | H3l, H3m cites |
| Stage 5 S5A–S5L | Automation 116 consequences | **12/12 PASS** | [C-023-dev-stage5-duplicate-consequences.md](./C-023-dev-stage5-duplicate-consequences.md) |
| PROD 116 fixture | Forward + reversal | **PASS** | [C-023-prod-automation-116-validation-2026-07-11.md](./C-023-prod-automation-116-validation-2026-07-11.md) |

### 6.3 Extension audits (dry-run)

| Audit | Path | When |
|-------|------|------|
| Stage 5 duplicate consequences | `airtable/extension-scripts/audits/audit-c023-stage5-duplicate-consequences.js` | Before PROD consequence changes; periodic DEV health |
| Stuck upload / claim | `audit-stuck-upload-processing.js` | After any upload-path change |
| Dedupe key coverage (C-024) | `audit-dedupe-key-coverage.js` (planned) | After C-024 kickoff — XP/Source Key layer |

### 6.4 Stage 6 — still required before close

- [ ] **Homework hash smoke** on DEV after 070a v4.4 enable (H3e-class proof on live HW asset)
- [ ] **OMNI dry-run:** Pending + Reviewed views return expected rows
- [ ] **Docs reconciliation** (P-D1) — policy §13/§18, automation-index, backlog, gap inventory
- [ ] **PROD Automations table:** add row for **116**; retire stale **008** documentation row (Mike / OMNI)

---

## 7. Required DEV evidence

| Evidence | Record / artifact | Role |
|----------|-------------------|------|
| Stage 5 live confirm + reversal | DEV `recF86pJTIMFoEypJ` | 116 + XP restore |
| XP Source Key guard | DEV `recx2MvUh2WP0tbjO` | `VIDEO_SUBMISSION\|…` idempotency |
| H3 matrix assets | Per H3 doc table | Contextual reasons |
| Schema snapshot | `airtable/schema/snapshots/c023-stage3-verify-dev/` | Field contract — **commit when exported** |
| Lambda + Make DEV | Worker B/C results | Homework route readiness |
| 070a v4.4 prep | [C-070a-dev-airtable-v4.4-prep.md](./C-070a-dev-airtable-v4.4-prep.md) | Paste package — **070a OFF** until smoke |

**Protected fixtures (never reset):** PROD `recGQ8EjAMz3bEBiW` (C-013 evidence). PROD 116 fixture `recWZ4cHNYgbV60mL` — retain for regression.

---

## 8. Homework hash path (blocked on 070a enable)

| Prerequisite | Owner | Status |
|--------------|-------|--------|
| 070a GitHub v4.4 | Worker A T1/T8 | **DONE** (repo) |
| DEV Make homework route + Lambda `homework_completion` | Worker B | Published — Module 2 patch pending Mike |
| Contract tests | Worker C | **73 tests PASS** |
| DEV paste + enable 070a | Mike | **BLOCKED** — keep OFF |
| 070c verify for HW assets | Mike / lead | Confirm 070c trigger not video-only |

**Stage 6 homework gate:** After 070a DEV smoke PASS, re-run H3e-class scenario on a live homework Submission Asset; confirm hash + review writeback + optional 116 path. **Do not** mark C-023 closed until video **and** homework routes are evidenced or homework explicitly deferred with backlog disposition.

---

## 9. OMNI review UX (Mike — not Cursor)

From T4 audit §5 R1 and policy §16:

- [ ] Prior-use **lookup fields** from `Duplicate Match Record` (athlete, type, week, URLs, HC/VF)
- [ ] View **`Asset Reuse — Pending Review`:** `Potential Asset Reuse?` + (`Asset Reuse Decision` blank or `Not Reviewed`)
- [ ] View **`Asset Reuse — Reviewed`:** decision ≠ `Not Reviewed`
- [ ] **Interface:** side-by-side current vs prior; summary prominent; links to HC/VF + both canonical URLs
- [ ] HC/VF **`Activity XP Display Label`** + `Linked Asset Reuse Decision` on PROD if not already promoted

---

## 10. Documentation reconciliation (P-D1 — Cursor-safe)

Pointer checklist for follow-on doc pass (does not block reading this Stage 6 doc):

- [ ] [C-023-production-duplicate-policy.md](./C-023-production-duplicate-policy.md) — rewrite §13/§17/§18 current state
- [ ] [C-023-dev-stage5-duplicate-consequences.md](./C-023-dev-stage5-duplicate-consequences.md) — header vs body alignment
- [ ] [C-023-dev-h3-duplicate-bytes-test.md](./C-023-dev-h3-duplicate-bytes-test.md) — remove stale "not started" banners
- [ ] [docs/automation-index.md](../automation-index.md) — 116 PROD PASS + Automations-table drift note
- [ ] [docs/v2-change-backlog.md](../v2-change-backlog.md) — Stage 5 PROD PASS; Stage 6 remaining
- [ ] [docs/close-out-considerations.md](../close-out-considerations.md) — hash enforcement wording
- [ ] [pv2-dev-prod-gap-inventory](../audits/pv2-dev-prod-gap-inventory-2026-07-11.md) — mark completed promotion steps historical
- [ ] Make Drive hash doc — supersession banner → Lambda path

---

## 11. Attachment / Drive retirement (deferred)

**Not a Stage 6 blocker for 116 or hash review.** Tracked as C-023 follow-on / C-013 closeout slice:

- Intake attachments cleared after canonical URL writeback
- Retire `Google Drive File URL` gates
- Migrate archive Drive URLs per [asset-storage-migration.md](../asset-storage-migration.md)

**Disposition:** Explicit backlog child or note — do not conflate with "C-023 incomplete."

---

## 12. Prerequisites from C-013 and C-024

### 12.1 C-013 (required parent)

| Prerequisite | Evidence | C-023 dependency |
|--------------|----------|------------------|
| Lambda upload engine deployed | PROD [C-013-prod-lambda-deployment-2026-07-11.md](./C-013-prod-lambda-deployment-2026-07-11.md) | Hash computed in `upload_core` |
| S3 + canonical writeback | PROD smoke PASS `recGQ8EjAMz3bEBiW` | `Canonical File URL` / `Storage Key` authoritative |
| Claim design (Option A) | 070b v4.4 | Reliable retry + `skipped_already_uploaded` |
| Make webhook → Lambda | PROD video route ON when approved | Same path for HW after 070a |
| `ALLOW_ROUTE_KEYS` | PROD: `video_feedback`; DEV: includes `homework_completion` | Route-scoped invokes |
| 070c async verify | v1.1 video PROD PASS | Homework parity pending |

**C-013 status:** PROD video upload workflow **COMPLETE** (2026-07-11). C-023 Stages 2–5 depend on this — **met**.

### 12.2 C-024 (sibling — not blocking Stage 6 runtime)

| Prerequisite | Relationship to C-023 |
|--------------|----------------------|
| Rock-solid dedupe keys (Source Key, XP Dedupe Key) | **Separate layer** — record identity, not file bytes |
| `audit-dedupe-key-coverage.js` | Complements C-023; run after C-024 kickoff |
| Idempotent backfills | Confirmed-duplicate repairs use 116 + Source Key patterns |
| Depends on C-012 | Schema cleanup before new dedupe fields |

**Stage 6 rule:** Do not delay C-023 closure on full C-024 completion. **Do** document that file-hash review (C-023) and record-key dedupe (C-024) are complementary — see backlog § Engine principles.

---

## 13. Rollback plan

### 13.1 Upload / hash path (C-013 + C-023 Lambda)

| Step | Action |
|------|--------|
| 1 | **070b OFF** · **070a OFF** |
| 2 | Make upload scenario **OFF** |
| 3 | Lambda throttle: `put-function-concurrency` = 0 on `127si-upload-asset` |
| 4 | Redeploy prior Lambda zip by `CodeSha256` from AWS versions |
| 5 | **Do not** delete S3 objects or hash evidence rows |
| 6 | **Do not** reset `recGQ8EjAMz3bEBiW` |

Detail: [C-013-prod-lambda-deployment-2026-07-11.md § Rollback](./C-013-prod-lambda-deployment-2026-07-11.md#rollback)

### 13.2 Automation 116 (Stage 5)

| Step | Action |
|------|--------|
| 1 | Turn automation **OFF** in Airtable (DEV or PROD as applicable) |
| 2 | Revert script paste to prior version only if defect proven |
| 3 | Reverse fixture consequences manually using documented reversal path (`Approved Reuse` / `False Positive`) |
| 4 | Retain `Duplicate Resolution Applied?` audit history — no field deletes |

PROD fixture: `recWZ4cHNYgbV60mL` / XP `recYQ10pOoFlApmjZ` — use for forward/reversal validation only.

### 13.3 OMNI / schema rollback

- New C-023 fields: **hide** from views; do not delete columns with production data
- `Asset Reuse Decision` values already set: **never** bulk-clear

### 13.4 Rollback triggers (when to execute)

- Lambda writes incorrect hash or overwrites Mike decisions on retry
- 116 creates duplicate XP or fails reversal on fixture
- Upload claim regression causes mass `Processing` stuck state

---

## 14. Stage 6 closure criteria (go / no-go)

Mark C-023 **complete** in backlog only when **all** rows are checked:

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Policy + schema approved (§11) | **Yes** |
| 2 | Stage 2 local tests PASS | **Yes** |
| 3 | Stage 3 DEV schema + OMNI review queue | **Partial** — schema yes; OMNI **open** |
| 4 | Stage 4 H3b–H3p + claim PASS | **Yes** |
| 5 | Stage 5 116 DEV + PROD runtime PASS | **Yes** |
| 6 | Audit checks defined + dry-run cadence | **Yes** |
| 7 | Homework hash path evidenced or explicitly deferred | **Open** (070a) |
| 8 | P-D1 doc reconciliation | **Open** |
| 9 | Automations table row for 116 | **Open** |
| 10 | Attachment/Drive retirement disposition recorded | **Deferred** |
| 11 | This checklist reviewed by lead + Mike | **Open** |

---

## 15. Related artifacts

| Doc | Purpose |
|-----|---------|
| [C-023-production-duplicate-policy.md](./C-023-production-duplicate-policy.md) | Locked policy + schema |
| [C-023-dev-h3-duplicate-bytes-test.md](./C-023-dev-h3-duplicate-bytes-test.md) | Runtime matrix |
| [C-023-dev-stage5-duplicate-consequences.md](./C-023-dev-stage5-duplicate-consequences.md) | 116 behavior |
| [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md) | Parent upload checklist |
| [C-070a-dev-airtable-v4.4-prep.md](./C-070a-dev-airtable-v4.4-prep.md) | Homework enable gate |
| [worker-d-t4-c023-readonly-audit.md](../overnight-runs/worker-results/worker-d-t4-c023-readonly-audit.md) | T4 Phase 1 inventory |

---

*Worker D · T9 · `overnight/2026-07-12/worker-d-T9` · docs-only*
