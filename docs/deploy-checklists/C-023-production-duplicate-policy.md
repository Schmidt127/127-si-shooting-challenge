# C-023 — Production duplicate policy (specification)

**Date:** 2026-07-10  
**Status:** **Planning only** — Mike approval required before implementation  
**Backlog:** C-023 (parents: C-013, C-024)  
**Evidence:** [C-023-dev-h3-duplicate-bytes-test.md](./C-023-dev-h3-duplicate-bytes-test.md) — H3 **PASS** on DEV  
**Hard stops:** No Lambda deploy · no Airtable writes · no Production changes in this doc task  

---

## 1. H3 baseline (proven today)

| Finding | Proven on DEV |
|---------|----------------|
| SHA-256 computed and written back | Yes — `rec1ZyqOfljt4foEX` |
| Lookup timing | After download, **before** S3 PutObject |
| Lookup scope today | **Global** hash match in Submission Assets |
| On global match | Flag-only — upload continues, **new S3 key** created |
| Duplicate fields written | `File is Duplicate?`, `Exact Duplicate`, `Duplicate Match Record`, notes |
| Same-record retry | `skipped_already_uploaded` — idempotent |
| Upload blocked on duplicate | **No** (`uploadBlocked: false` in Lambda report) |

**H3 does not close C-023.** It proves hash plumbing and global flag-only behavior. Production needs scoped actionable duplicates and canonical reuse.

---

## 2. Owner-approved policy direction (proposed for final sign-off)

This section restates Mike’s approved direction for Production. **Not implemented in code yet.**

### 2.1 Global hash matches are evidence, not automatic blocking

A matching SHA-256 anywhere in Submission Assets may be recorded for diagnostics, audit, and review. A **global match alone must not block upload** or force S3 object reuse.

**Implementation intent:** Lambda performs a **two-phase** lookup:

1. **Informational pass** — global hash query (optional cap, e.g. 10 records) → notes / debug report only.  
2. **Actionable pass** — scoped filter (§2.2) → determines block/reuse behavior.

### 2.2 Actionable duplicate scope

An exact duplicate becomes **actionable** only when **all** of the following hold:

- SHA-256 matches exactly; **and**
- Records share the **relevant business scope** for the asset class (below).

#### Homework assets

Require:

| Dimension | Airtable source (DEV schema) |
|-----------|------------------------------|
| Same Enrollment | `Enrollment - Linked` |
| Same Asset Type | `Asset Type` (e.g. Homework PDF / Image / Document) |
| Same homework assignment | Linked `Homework Completions` record **or** matching logical key: `Asset Purpose` (`Homework 1` / `Homework 2`) + `Asset Slot` / `Asset Label` + `Week` |
| Same Week (when assignment recurs) | `Week` — required when the same homework slot can appear in multiple weeks |

**Logical homework key (fallback when HC link missing):**  
`enrollmentId | assetPurpose | assetSlotOrLabel | weekId` — stable string built in Lambda from loaded fields.

#### Video assets

Require:

| Dimension | Airtable source |
|-----------|-----------------|
| Same Enrollment | `Enrollment - Linked` |
| Same Asset Type | `Asset Type` = Video Feedback (or equivalent) |
| Same source Submission | `Submission - Linked` — **primary** scope key |
| Activity period fallback | If `Submission - Linked` unavailable: same `Week` + same `Asset Purpose` (`Video For Feedback`) + same `Activity Date` / submission date on linked Submission |

**Video scope key (preferred):** `enrollmentId | submissionId | assetPurpose`  
**Fallback:** `enrollmentId | weekId | activityDateKey | assetPurpose`

#### Headshots

Require:

| Dimension | Airtable source |
|-----------|-----------------|
| Same Athlete or Enrollment | `Enrollment - Linked` (and/or Athlete link via Enrollment) |
| Same headshot role | `Asset Purpose` = `Registration Headshot` **or** `Asset Type` = `Athlete Headshot` |

**Headshot scope key:** `enrollmentId | headshotRole`

#### Unclassified asset types

`Asset Type` = Other, unknown `Upload Destination`, or scope fields incomplete → **flag-only** (current H3 behavior) until Mike defines business scope.

### 2.3 Actionable duplicate behavior

When an **actionable** duplicate is found **before** S3 PutObject:

| Step | Behavior |
|------|----------|
| S3 | **Do not** call PutObject for a new object |
| Duplicate marking | `File is Duplicate? = true`, `Duplicate File Status = Exact Duplicate` (or `Allowed Reuse` — see §2.4) |
| Canonical link | `Duplicate Match Record` → **canonical original** Submission Asset (§5) |
| Reuse fields | Copy from canonical: `Canonical File URL`, `Storage Key`, `File Content Hash`, `File Hash Algorithm`, `File Size Bytes`, `File MIME Type`, `Storage Bucket` (if populated) |
| Terminal status | Non-error terminal state (§2.4) |
| Record retention | **Keep** the new Submission Asset as submission history — no auto-delete |
| Attachment | Retain `Airtable Attachment` on the new record (consistent with C-013 slice) |
| Lambda `actionOut` | New value recommended: `reused_canonical_duplicate` (distinct from `uploaded`) |

**Make compatibility:** Make still receives HTTP 200 with `statusOut=success`. Response body must expose `actionOut` and `c023Duplicate` so operators can distinguish fresh upload vs reuse.

### 2.4 Terminal status assessment (no new single-select in this planning task)

**Question:** Is `Upload Status = Uploaded` plus duplicate fields sufficient, or is a new status such as `Duplicate — Reused` required?

| Option | Pros | Cons |
|--------|------|------|
| **A — `Uploaded` + duplicate fields** (recommended for v1) | No schema change; `Writeback Complete?` likely already passes when canonical + hash populated; downstream **022** sync treats as uploaded | Operators must read `File is Duplicate?` / `Duplicate File Status` to distinguish fresh vs reused |
| **B — New `Upload Status` value** e.g. `Duplicate — Reused` | Clear in views and ops | Requires **Mike approval** for new single-select option + formula updates (`Writeback Complete?`, Make gates, audits) — **out of scope for this planning doc** |
| **C — `Duplicate File Status = Allowed Reuse`** (existing option) | Semantically clear for reuse without new Upload Status | Must confirm formulas and coach views accept `Allowed Reuse` alongside `Uploaded` |

**Planning recommendation:** **Option A + C** for implementation v1 — `Upload Status = Uploaded`, `Duplicate File Status = Allowed Reuse` (actionable reuse) vs `Exact Duplicate` (informational global-only match). Defer Option B until Mike reviews operator UX in DEV.

**Do not create** new single-select values in the implementation slice without explicit approval.

### 2.5 Ambiguous matches

Hash matches but business scope is **incomplete or ambiguous** (e.g. missing Week on homework, missing Submission link on video):

| Behavior |
|----------|
| Do **not** hard-block |
| Upload normally (new S3 key) |
| Set `Duplicate File Status = Needs Review` (existing option) |
| Set `Duplicate Review Status = Needs Review` (existing option on Submission Assets) |
| Record informational global matches in `Duplicate Match Notes` |
| Retain independent storage key |

### 2.6 Cross-enrollment matches

Cross-enrollment exact hashes:

- **Must not** block upload or reuse S3 objects automatically  
- **May** be recorded as informational matches in notes / Lambda debug report  
- Rationale: privacy, ownership, legitimate family file reuse across siblings require separate policy

### 2.7 Idempotency (preserve current behavior)

| Case | Behavior |
|------|----------|
| Same asset already **Uploaded** with canonical URL + valid hash | `skipped_already_uploaded` — no S3, no PATCH |
| Retry after actionable reuse | Same skip path — canonical already on record |
| Duplicate resolution | **Deterministic** — same inputs → same canonical original |
| Concurrent invokes | Must not create a second object (see §7 race — separate fix) |

### 2.8 Audit requirements (future)

After policy deploy, audits should flag:

| Check | Failure signal |
|-------|----------------|
| Duplicate without canonical match | `File is Duplicate? = true` but `Duplicate Match Record` blank |
| Actionable duplicate with extra S3 key | Reuse expected but `Storage Key` differs from canonical original’s key (post-cutover records) |
| Duplicate chain | `Duplicate Match Record` points to another duplicate, not root canonical |
| Reused field mismatch | Reused record’s canonical URL / storage key / hash ≠ canonical original |
| Global match over-action | Cross-enrollment or out-of-scope match caused reuse (scope bug) |
| Retry inconsistency | Second invoke changed canonical, hash, or storage key |

**Future tooling:** extend `airtable/extension-scripts/audits/` or `tools/airtable/_probe_c013_asset_storage_fields.py` with a C-023 duplicate audit mode (read-only).

---

## 3. Canonical original selection rule

When multiple records match hash **and** actionable scope, choose **one** canonical original deterministically:

### 3.1 Eligibility filter (all required)

1. Same actionable business scope as current asset (§2.2)  
2. **Successful terminal upload** — `Upload Status = Uploaded`  
3. Complete storage metadata — non-empty `Canonical File URL`, `Storage Key`, valid 64-char `File Content Hash`  
4. **Exclude** current record (`RECORD_ID() != current`)  
5. **Exclude** failed / abandoned — `Upload Status` in `Error`; blank canonical with non-Uploaded status  
6. **Exclude test-invalid** where identifiable **without new test flags** — e.g. `Upload Error` populated, or `Duplicate File Status = Error`  

**Test records (Schmidt DEV):** defer explicit test exclusion to a later slice unless a reliable existing field is identified (e.g. enrollment slug + naming pattern). Do not add test flags in this slice without approval.

### 3.2 Tie-break (stable ordering)

Among eligible records, pick:

1. **Earliest `Uploaded At`** (ascending)  
2. If tied: **lowest record id** (lexicographic `rec…` — stable surrogate)

This matches “earliest stable uploaded record” and keeps selection stable across retries.

### 3.3 Informational vs actionable match records

| Match type | `Duplicate Match Record` | `Duplicate File Status` |
|------------|--------------------------|-------------------------|
| Actionable + reuse | Canonical **root** original | `Allowed Reuse` (proposed) or `Exact Duplicate` |
| Global only (cross-enrollment / out of scope) | Optional first informational match | `Exact Duplicate` or notes only — **no reuse** |
| Ambiguous scope | Empty or informational | `Needs Review` |

---

## 4. Duplicate-chain prevention

### 4.1 Problem

If record B is a duplicate of A, and record C is a duplicate of B, linking C → B leaves a **chain**. Consumers and audits need the **root canonical** object (A).

### 4.2 Root resolution algorithm (proposed)

After scoped hash lookup returns candidate set:

```
function resolve_canonical_root(candidateRecord):
  visited = set()
  current = select_canonical_original(candidateRecord)  // §3
  while current has Duplicate Match Record pointing to next:
    if next in visited: break  // cycle guard
    visited.add(current.id)
    if next is canonical original (Uploaded, hash, own storage key, not duplicate-of-another):
      return next
    current = next
  return current
```

**Writeback rule:** `Duplicate Match Record` on the **new** asset always points to the **resolved root**, not an intermediate duplicate.

**Notes field:** Include root id:  
`"Reused canonical storage from Submission Asset {rootId} (SHA-256 match in scope)."`

### 4.3 Canonical original definition

A record is a **root canonical** when:

- `Upload Status = Uploaded`  
- Valid hash and canonical URL populated  
- Either `File is Duplicate?` is false/blank **or** `Duplicate File Status` indicates it holds the authoritative object (not `Allowed Reuse` pointing elsewhere)  
- `Duplicate Match Record` empty **or** points to self (should not happen — treat as root)

Records with `Allowed Reuse` that copied from a root **are not** canonical originals for future matches — resolver must walk to root.

---

## 5. Processing race investigation (read-only)

**Incident:** H3 first Lambda invoke on `rec1ZyqOfljt4foEX` failed with  
`Upload Status must be "Pending Link"; got "Processing"`.  
**Recovery:** Manual reset to Pending Link + second invoke succeeded.

### 5.1 What sets `Processing` on Submission Assets?

Code review shows **only automations 070a / 070b** set Submission Assets `Upload Status = Processing` on the upload-engine path, and **only after** the Make webhook returns HTTP 2xx (`070b` §9 Success Writeback). The H3 prep harness (`c013_dev_h3_duplicate_bytes_prep.py`) does **not** set Processing. Automation **013** sets **Pending Link** + checks `Send to Make Trigger`.

### 5.2 Likely sequence for H3 first failure

| Step | Actor | Effect |
|------|-------|--------|
| 1 | C-020 / 013 chain | Asset `Pending Link`, `Ready to Send = READY_TO_SEND`, `Send to Make Trigger` checked |
| 2 | **070b or manual Make webhook** (external to Cursor invoke) | Make returns **200 Accepted** |
| 3 | **070b** (if automation ON) or prior Make run | `Upload Status → Processing` |
| 4 | Make HTTP→Lambda path **does not complete** (same class as `recIYFnfmsPcy7iop`) | No writeback; asset stuck Processing |
| 5 | Direct `c013_dev_lambda_invoke.py` | Lambda rejects **Processing** → `error_invalid_upload_status` |

**Conclusion:** The H3 failure is **orchestration timing / false-positive Make 200**, not duplicate-policy logic. It parallels the documented `recIY` diagnosis: 070b trusts Make webhook HTTP 2xx before Lambda writeback completes.

**Unresolved without Airtable automation history:** Whether **070b was ON** on DEV at that moment despite checklist “OFF”. Mike should confirm automation toggle in DEV UI. No automation run log was captured in Git.

### 5.3 Architectural tension (even when 070b works)

| Layer | Expectation |
|-------|-------------|
| **070b** | Sets `Processing` after Make 2xx |
| **Lambda** | Requires `Pending Link` at invoke time |
| **Make scenario** | Module 1 webhook → Module 3 Lambda HTTP → Module 5 respond 200 to 070b |

When Module 5 responds **after** Module 3, Lambda should still see **Pending Link**. When Make returns **early Accepted** without Module 3 success, or 070b fires twice, Lambda sees **Processing** and fails.

### 5.4 Manual direct Lambda testing

| Topic | Finding |
|-------|---------|
| Dedicated prep status | **None today** — tests must use `Pending Link` |
| Stale Processing lease | **No TTL** — Processing persists until manual fix or error writeback |
| Concurrent workers | Possible — 070b re-trigger, Make retry, overlapping manual invoke |
| Recommendation | **Separate fix slice (C-013-OPS or C-023-OPS):** (1) Mike verify 070b OFF for manual Lambda tests; (2) consider Lambda accepting `Processing` **only** when `Writeback Complete?` is false and a single-flight token is present; **or** 070b delay Processing until Lambda success callback; (3) document manual test SOP: invoke only while `Pending Link`, within seconds of prep |

**Do not combine** this orchestration fix with C-023 duplicate implementation unless a shared root cause is proven. They are related at the upload gate but separable in delivery.

---

## 6. Implementation plan (not started)

### 6.1 Lambda / Python (code-only — local + DEV testable)

| File | Changes |
|------|---------|
| `lambda/upload-asset/upload_core/duplicate.py` | Scoped lookup formulas; informational vs actionable classification; `resolve_canonical_root()`; extended `build_duplicate_writeback()` for reuse vs review |
| `lambda/upload-asset/upload_core/processor.py` | Branch before `upload_s3()`: actionable → reuse writeback; ambiguous → upload + Needs Review; global-only → upload + informational flags; new `actionOut` values |
| `lambda/upload-asset/upload_core/airtable.py` | Load scope fields for current asset + match records (Enrollment, Submission, Week, Asset Purpose, HC links) |
| `lambda/upload-asset/tests/test_duplicate_scope.py` | **New** — homework / video / headshot / cross-enrollment / ambiguous cases |
| `lambda/upload-asset/tests/test_duplicate_root.py` | **New** — chain resolution, tie-break, cycle guard |
| `lambda/upload-asset/tests/test_processor_reuse.py` | **New** — no S3 PutObject on actionable duplicate; idempotent skip |

### 6.2 Airtable schema / formulas (DEV — Mike approval required)

| Item | Notes |
|------|-------|
| `Writeback Complete?` | Confirm formula treats reused duplicates as complete |
| `Duplicate File Status` | Use existing `Allowed Reuse`, `Needs Review` — **no new options** without approval |
| `Upload Status` | Defer new value unless Mike chooses Option B (§2.4) |
| Views / interfaces | Coach views showing duplicate vs fresh upload |

### 6.3 Controlled DEV runtime test

| Test | Pass criteria |
|------|---------------|
| **H3b** — same enrollment + submission bytes | Actionable reuse — **no** new S3 key; canonical copied; `actionOut = reused_canonical_duplicate` |
| **H3c** — same bytes, different enrollment | Upload proceeds; global match informational only |
| **H3d** — ambiguous scope | `Needs Review`; new S3 key |
| **H3e** — idempotent retry | `skipped_already_uploaded` |
| **H3f** — chain | Third asset links to root, not intermediate duplicate |

Use `c013_dev_h3_duplicate_bytes_prep.py` + Make or Lambda invoke helper. **070b OFF** unless testing full chain.

### 6.4 Production promotion prerequisites

- H3b–H3f PASS on DEV  
- C-023 audit extension dry-run on DEV  
- Mike sign-off on §2 policy + terminal status choice (§2.4)  
- Processing race disposition (§5) — at minimum SOP for manual tests  
- [C-013 production promotion plan](./C-013-production-promotion-plan.md) updated with C-023 gate  
- Migration note for existing DEV duplicates (flag-only records with extra S3 keys) — **no mass delete**; optional audit report only  

### 6.5 Migration — existing duplicate records

| Record class | Treatment |
|--------------|-----------|
| Pre-policy `Exact Duplicate` + own S3 key | Leave as evidence; audit may list for optional cleanup |
| Pre-policy global flags only | No automatic rewrite |
| Post-policy actionable duplicates | Must not create separate S3 keys |

---

## 7. Decisions requiring Mike approval

| # | Decision | Options |
|---|----------|---------|
| 1 | **Terminal status UX** | `Uploaded` + `Allowed Reuse` (recommended) vs new `Upload Status` value |
| 2 | **Homework scope** when `Homework Completions` link missing | Block reuse (Needs Review) vs fallback key (§2.2) |
| 3 | **Video fallback** when Submission link missing | Week + date vs Needs Review only |
| 4 | **Test enrollment exclusion** from canonical selection | Pattern-based vs none for v1 |
| 5 | **Cross-enrollment informational notes** | Verbosity / PII in `Duplicate Match Notes` |
| 6 | **Processing race fix** | Prioritize before or after duplicate reuse slice |
| 7 | **Production cutover** | Big-bang vs flag-only period |

---

## 8. C-023 closure criteria (reminder)

C-023 may be marked **done** only when:

1. This policy is **approved** by Mike  
2. Scoped actionable reuse is **implemented** and proven on DEV  
3. Audit checks (§2.8) exist or are scheduled  
4. Production promotion prerequisites (§6.4) are met  

**Current state:** H3 PASS · policy **documented** · implementation **not started** · Processing race **open**.

---

## Related

| Doc | Topic |
|-----|--------|
| [C-023-dev-h3-duplicate-bytes-test.md](./C-023-dev-h3-duplicate-bytes-test.md) | H3 evidence |
| [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md) | Wave 7 gates |
| [C-013-production-promotion-plan.md](./C-013-production-promotion-plan.md) | Prod promotion |
| [C-013-dev-070b-hybrid-prep.md](./C-013-dev-070b-hybrid-prep.md) | 070b / Make / Lambda path |
