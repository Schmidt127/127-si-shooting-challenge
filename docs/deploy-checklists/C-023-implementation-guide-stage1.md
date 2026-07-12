# C-023 Stage 1 — Implementation, audit, and rollback guide

**Date:** 2026-07-12  
**Status:** Stage 1 documentation complete; cross-worker implementation evidence pending Lead integration  
**Backlog:** C-023 — file deduplication by content hash  
**Environment:** Repository + DEV only  
**Policy:** [C-023-production-duplicate-policy.md](./C-023-production-duplicate-policy.md)  
**Closure gate:** [C-023-stage6-production-readiness-checklist.md](./C-023-stage6-production-readiness-checklist.md)

**PROD prohibition:** This guide does not authorize a Production Airtable, Make, Lambda, web, schema, or automation change.

---

## 1. Stage 1 outcome

Stage 1 completes and verifies the contract around the existing C-023 duplicate-detection path. It is not a destructive deduplication migration.

For each new Submission Asset upload:

1. Lambda downloads the submitted bytes.
2. Lambda computes the authoritative SHA-256 digest.
3. Lambda searches prior uploaded Submission Assets by hash.
4. Same-enrollment matches are classified with assignment, week, submission, and asset context.
5. Likely reuse is marked for manual review.
6. The upload continues to a **new** S3 object and receives its own Storage Key and Canonical File URL.
7. Airtable receives upload, hash, and review metadata.

### Locked behavior

| Rule | Required result |
|------|-----------------|
| Detection | Exact byte identity uses SHA-256, never filename/title alone |
| Review | Likely same-enrollment reuse sets `Potential Asset Reuse?` and review details |
| Upload | Continues; duplicate detection does not block a valid upload |
| Storage | Always writes a new S3 object; never copies a prior Storage Key or Canonical File URL |
| Cleanup | No S3 object, Airtable record, attachment, or hash evidence is deleted |
| Decision | Mike/OMNI controls `Asset Reuse Decision`; automation must not infer misconduct |
| Cross-enrollment match | Informational only unless policy is explicitly revised |
| Retry | An already-uploaded same record remains idempotent and does not create another object |

`uploadBlocked` must remain `false` for a hash match. A detection or lookup error must not silently convert the workflow into block, reuse, or delete behavior.

---

## 2. Component ownership

| Component | Stage 1 responsibility | Must not do |
|-----------|------------------------|-------------|
| Lambda upload core | Download bytes, compute SHA-256, lookup/classify matches, upload new object, write review metadata | Block on match, reuse object, make operator decision |
| Make | Relay request and return either complete Lambda JSON or an async `Accepted` acknowledgement | Compute hash, decide duplicate status |
| 070a / 070b | Send asset payload and interpret Make response mode | Set hash fields, poll Lambda, treat `Accepted` as completed upload |
| 070c | Verify final writeback only for an **async `Accepted`** handoff | Run as a mandatory step after synchronous complete JSON |
| Airtable | Store upload/hash/review state and present review views | Hash attachment bytes in formulas |
| Mike / OMNI | Review flagged rows and set final decision | Delete evidence as a review shortcut |
| Automation 116 | Apply consequences only after a final `Confirmed Duplicate` decision | Act merely because a hash match or pending-review flag exists |

---

## 3. Response-mode decision table

Make may expose one of two valid completion contracts. The route must follow the body actually returned; it must not assume all HTTP 2xx responses mean the same thing.

| Make response | Meaning | Sender action | 070c required? |
|---------------|---------|---------------|----------------|
| Complete Lambda JSON (`ok=true`, successful `actionOut`, final writeback data) | Lambda completed before Make responded | Validate success/writeback contract; clear sender trigger per script rules | **No** |
| Plain text `Accepted` | Gateway accepted work; Lambda/writeback continues asynchronously | Return pending; retain trigger; do not claim upload success | **Yes**, after final writeback |
| Structured error / non-2xx | Upload did not reach a verified success contract | Preserve retry signal and diagnostic output | No; fix/retry failed route |
| Malformed or ambiguous 2xx | Not verified success | Treat as error or unverified response, not as uploaded | No |

### Current DEV homework evidence

The DEV homework end-to-end PASS used:

```text
070a → DEV Make → DEV Lambda → S3 → Airtable writeback
     ← synchronous complete Lambda JSON
```

Therefore **070c was not required for that PASS**. The confirmed writeback included:

- `Upload Status = Uploaded`
- `Canonical File URL`
- `Storage Key`
- `File Content Hash`
- `File Hash Algorithm = SHA-256`
- `Uploaded At`

If the DEV or future Production homework route is later changed to return plain-text `Accepted`, 070c (or an approved destination-neutral successor) becomes required. Its trigger must verify writeback fields and must not be restricted to Video Feedback when serving homework assets.

### Current video precedent

The proven Production video route used async `Accepted`; 070b retained the trigger and 070c v1.1 verified final writeback idempotently. That precedent is valid for the async mode, but it does not make 070c mandatory for synchronous JSON routes.

---

## 4. Required writeback contract

### Upload and hash fields

| Field | Expected Stage 1 value |
|-------|------------------------|
| `Upload Status` | `Uploaded` after successful object write |
| `Canonical File URL` | URL for this newly written object |
| `Storage Key` | Key for this newly written object |
| `File Content Hash` | 64-character SHA-256 digest |
| `File Hash Algorithm` | `SHA-256` |
| `Uploaded At` | Successful upload timestamp |

### Detection and review fields

| Condition | Required state |
|-----------|----------------|
| No hash match | No reuse warning; successful upload remains valid |
| Global match, different enrollment only | Exact match may be recorded informationally; no same-enrollment suspicion |
| Same-enrollment contextual match | `Potential Asset Reuse?` plus primary/all matches, reasons, summary, and checked timestamp |
| Missing context | Upload continues; diagnostic/review reason records reduced confidence |
| Hash lookup failure | Upload continues when safe; error is visible in duplicate-check diagnostics |
| Existing human decision on retry | Preserved; Lambda must not overwrite it |

Worker A's schema-impact and OMNI documents are authoritative for confirmed field types and view construction after Lead integration. Do not invent or create fields from this guide alone.

---

## 5. Stage 1 implementation sequence

### A. Repository contract

- [ ] Worker B confirms Lambda response/writeback contract.
- [ ] `uploadBlocked` remains false for duplicate/reuse findings.
- [ ] A match still produces a new Storage Key and Canonical File URL.
- [ ] Human decisions are protected from retry overwrite.
- [ ] Make-visible response fields distinguish successful upload, review flag, and diagnostics.

### B. Test matrix

- [ ] Same file + same name.
- [ ] Same file + renamed file.
- [ ] Different bytes + same name.
- [ ] Retry after success.
- [ ] Retry after partial writeback.
- [ ] Multi-file submission with one duplicate.
- [ ] Missing hash.
- [ ] Hash lookup failure.
- [ ] Full Lambda regression passes.
- [ ] Unified 070a offline regression passes.

### C. Schema and review preparation

- [ ] Worker A cites committed schema for every field.
- [ ] Pending Review view includes flagged rows whose decision is blank **or** `Not Reviewed`.
- [ ] Reviewed view excludes pending rows and exposes final decision/audit metadata.
- [ ] Trigger implications for 116, 022, and 070a are documented.
- [ ] No Airtable field is created through an unapproved API write.

### D. Documentation

- [x] Synchronous JSON and async `Accepted` paths are distinguished.
- [x] DEV homework PASS records synchronous JSON; 070c not required.
- [x] Audit and rollback procedures prohibit deletion and object reuse.
- [x] Stage 6 receives an append-only Stage 1 status section.
- [x] Asset storage architecture is aligned to the two response modes.

---

## 6. Audit procedure

Run repository/local tests first. Any live verification remains DEV-only and requires the applicable lead/owner gate.

### 6.1 Offline audit

1. Run Worker C's C-023 matrix and record exact pass/fail totals.
2. Run the full Lambda unit suite.
3. Run `tools/airtable/tests/c070a_overnight_offline_suite.py`.
4. Confirm no assertion was weakened to obtain a pass.
5. Inspect `git diff --check` and the changed-file list.
6. Confirm no secrets, operational webhook URLs, credentials, or untracked schema snapshots entered the diff.

### 6.2 DEV record audit

For an approved DEV fixture, verify:

- Upload completed and has all six core writeback fields.
- `File Content Hash` is a SHA-256 digest and algorithm is exactly `SHA-256`.
- A matched upload has a **different** Storage Key and Canonical File URL from the prior asset.
- Same-enrollment contextual reuse produces review fields but leaves upload successful.
- A different-enrollment match is informational only.
- `Asset Reuse Decision` remains operator-controlled.
- 022 syncs the Canonical File URL to Homework Completion where applicable.
- Synchronous homework JSON does not wait for 070c.
- Async `Accepted`, if separately tested, retains the sender trigger until 070c verifies writeback.

### 6.3 Read-only duplicate audit

Use views or dry-run tooling to identify:

- Uploaded assets missing hash or algorithm.
- Duplicate hashes with missing match metadata.
- `Potential Asset Reuse?` rows missing review reasons/summary.
- Flagged rows absent from Pending Review because decision is blank.
- Rows that share a prior Canonical File URL or Storage Key unexpectedly.
- Duplicate-check errors requiring an operator retry.
- Stuck `Processing` claims after upload-path changes.

Do not bulk-edit, clear, delete, or merge records while performing this audit.

---

## 7. Rollback and containment

Rollback stops new processing and restores prior code/configuration. It does not erase uploaded objects or evidence.

### 7.1 Repository-only defect

1. Stop integration of the affected worker commit.
2. Preserve failing test output.
3. Revert the affected Stage 1 change with a normal revert commit after Lead approval.
4. Re-run the full offline matrix.

### 7.2 DEV Lambda / Make defect

1. Turn the affected DEV sender automation OFF.
2. Turn the DEV Make upload scenario OFF.
3. Disable or throttle the DEV Lambda route if necessary.
4. Redeploy the last known-good Lambda artifact/configuration.
5. Keep all S3 objects, Storage Keys, Canonical File URLs, hashes, and Airtable records.
6. Record impacted asset IDs and failure mode.
7. Re-test one approved DEV fixture only after the defect is fixed.

### 7.3 Review-classification defect

1. Stop the route if the defect can overwrite human decisions or mis-link prior assets.
2. Do not delete fields or bulk-clear decisions.
3. Hide an unsafe review view if needed; preserve row data.
4. Correct classification code or view filters.
5. Dry-run the audit before any approved repair.

### 7.4 Forbidden rollback shortcuts

- No S3 object deletion.
- No Airtable record deletion.
- No attachment clearing as part of Stage 1.
- No reuse of a prior object to “fix” a duplicate.
- No bulk reset of human review decisions.
- No Production intervention under this guide.

---

## 8. Stage 1 completion and open items

Stage 1 is complete only after Lead integrates Workers B → C → A → D and verifies:

| Gate | Current Worker D status |
|------|-------------------------|
| Locked policy documented | **Complete** |
| Sync JSON vs async `Accepted` documented | **Complete** |
| DEV homework PASS / 070c disposition documented | **Complete** |
| Lambda contract and any code fix | **Pending Worker B integration** |
| Required test matrix and exact totals | **Pending Worker C integration** |
| Schema inventory and OMNI instructions | **Pending Worker A integration** |
| Lead unified regression | **Open** |
| PROD change | **Not authorized / not performed** |

Open items after Stage 1 do not authorize Production:

1. Lead reviews cross-worker contract consistency and unified tests.
2. Mike/OMNI builds or verifies Pending/Reviewed review UX in DEV.
3. Stage 6 closure criteria are reconciled against accepted Stage 1 evidence.
4. Attachment clearing and Drive retirement remain a separate deferred migration slice.
5. Any Production promotion requires a dedicated approved checklist and DEV evidence.

---

## 9. Evidence and related documents

- [C-023 Stage 6 production readiness](./C-023-stage6-production-readiness-checklist.md)
- [C-023 production duplicate policy](./C-023-production-duplicate-policy.md)
- [C-023 DEV H3 duplicate-bytes test](./C-023-dev-h3-duplicate-bytes-test.md)
- [C-013 PROD closeout](./C-013-prod-closeout-2026-07-11.md)
- [Asset storage migration](../asset-storage-migration.md)
- [Worker D T4 read-only audit](../overnight-runs/worker-results/worker-d-t4-c023-readonly-audit.md)

---

*Worker D · Overnight V2 Stage 1 · docs-only*
