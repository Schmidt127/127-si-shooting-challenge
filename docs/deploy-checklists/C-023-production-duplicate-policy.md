# C-023 — Production duplicate policy (specification)

**Date:** 2026-07-10
**Last revised:** 2026-07-10 — **owner policy correction** (independent upload + contextual manual review)
**Status:** **Planning only** — Mike approval required before implementation
**Backlog:** C-023 (parents: C-013, C-024)
**Evidence:** [C-023-dev-h3-duplicate-bytes-test.md](./C-023-dev-h3-duplicate-bytes-test.md) — H3 **PASS** on DEV
**Supersedes:** Prior draft sections recommending canonical S3 reuse, skip PutObject, `reused_canonical_duplicate`, and `Allowed Reuse` as automatic processing outcomes (2026-07-10 revision).

**Hard stops:** No Lambda deploy · no Airtable writes · no Production changes in this doc task

---

## Owner-approved principle (locked)

> **Always upload independently; identify and explain potential same-enrollment reuse for manual review.**

Every submitted asset:

1. Uploads to its **own** S3 object.
2. Receives its **own** Storage Key and Canonical File URL.
3. Is **never** automatically blocked because its hash matches another asset.
4. **Never** automatically reuses another asset's S3 object, storage key, or canonical URL.
5. Is **never** automatically deleted.
6. Uses SHA-256 to prove identical bytes — **not** to prove improper duplication by itself.
7. Combines SHA-256 with enrollment + submission context to flag **potential improper reuse** for Mike's manual review.
8. Treats cross-enrollment matches as **informational only** — not suspicious by default.
9. Preserves same-record retry idempotency (`skipped_already_uploaded`).

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
| Upload blocked on duplicate | **No** |

**H3 proves hash detection and independent upload.** C-023 remains open until contextual review classification, visibility fields, and DEV scenario matrix (H3b–H3i) are implemented and proven.

---

## 2. Core distinction — two separate concepts

### A. Exact hash match (technical fact)

> Another Submission Asset contains the exact same bytes.

- Detected globally via SHA-256.
- **Does not** automatically mean invalid duplication or misconduct.
- **Does not** block upload or object creation.

### B. Potential improper reuse (business-review condition)

> The same enrollment appears to have used identical file bytes in another assignment, week, submission, activity, or asset type.

- Requires SHA-256 match **plus** same-enrollment context comparison.
- May place the asset in Mike's manual-review queue.
- System message: **`Potential asset reuse — manual review required.`**
- **Does not** automatically determine fraud or invalid submission.

---

## 3. Review logic

### 3.1 Cross-enrollment matches

When identical bytes are found under a **different** Enrollment:

| Action | Behavior |
|--------|----------|
| Upload | **Normal** — independent S3 object |
| Storage | New Storage Key + Canonical File URL |
| Review queue | **Do not** enter primary reuse-review queue based solely on this match |
| Labeling | **Do not** describe as suspected misconduct |
| Reuse | **Do not** reuse prior asset's object or URLs |
| Optional | Record informational global match in notes / debug report |

Protects legitimate sibling, family, worksheet, template, and shared-document cases.

### 3.2 Same-enrollment matches

When identical bytes are found under the **same** Enrollment, compare context using all available fields:

| Context dimension | Primary Airtable source on Submission Assets |
|-------------------|-----------------------------------------------|
| Asset Type | `Asset Type` (direct) |
| Asset Purpose | `Asset Purpose` (direct) |
| Homework assignment | `Homework Completions` link; fallback `Homework Name - Slot Correct` + `Asset Slot` / `Asset Label` |
| Week | `Week` (lookup from Submission) |
| Activity Date | `Date` (lookup from Submission → Activity Date) |
| Submission | `Submission - Linked` |
| Video context | `Video Feedback` link |
| Source attachment | `Source Attachment ID` |
| Filename | `Original File Name` |
| File size | `File Size Bytes` (post-upload) |
| Upload time | `Uploaded At` |

**Flag for manual review** when same enrollment + same hash and **any** of:

1. Different Homework Assignment (HC record or homework name/slot).
2. Different Week.
3. Different Submission.
4. Different Asset Type.
5. Homework file reused for Video Feedback.
6. Video Feedback file reused for Homework.
7. Same file reused for a later program activity (different week/submission/assignment).
8. Matching hash but assignment, submission, asset type, or period context is **missing**.
9. Multiple prior assets appear to represent separate credit attempts with the same bytes.

**Same assignment resubmission** (same enrollment, same assignment, same week, same submission, same asset type): detect match, set review reason `Same Assignment Resubmission`, but treat as lower urgency — still visible to Mike; default review status may be `Not Required` unless other reasons also apply (Mike decision §10).

### 3.3 Processing sequence (implementation spec)

```
1. Receive asset (Lambda payload)
2. Validate upload request (Pending Link, attachment, links)
3. Download submitted bytes
4. Compute SHA-256
5. Search global hash matches (Uploaded records with valid hash; exclude current)
6. Partition matches → same Enrollment | different Enrollment
7. Compare same-enrollment context → review reasons[]
8. Classify → informational only | manual review required | no same-enrollment match
9. ALWAYS upload new file to new S3 key (PutObject)
10. Write new canonical URL, storage key, hash, upload metadata
11. Write match links, review reasons, summary fields, review status init
12. Upload Status = Uploaded (success terminal)
13. Same-record retry → skipped_already_uploaded (no second object)
```

**Critical:** Steps 9–10 run **regardless** of match result. Review classification failure must **not** lose the uploaded file.

### 3.4 Partial-failure handling

| Failure | Behavior |
|---------|----------|
| S3 upload succeeds; review fields PATCH fails | Asset stays **Uploaded** with canonical/hash; log error in `Duplicate Check Error`; retry PATCH in ops or idempotent re-probe — **do not** delete S3 object |
| Hash comparison / lookup fails | Upload proceeds if bytes + S3 succeed; set `Duplicate File Status = Error` or `Needs Review`; `Duplicate Check Error` documents failure |
| Linked assignment/context cannot be resolved | Upload proceeds; flag `Missing Context` + `Pending Review` |
| Multiple same-enrollment prior matches | Pick **primary** prior match (§6); store all match ids in notes and/or proposed multi-link field; summary lists count |

---

## 4. Visibility — show both uses

Mike must see **current use** and **prior matched use** side by side.

### 4.1 Current use (on the new asset — mostly existing fields)

| Display | Field / source |
|---------|----------------|
| Submission Asset | `RecordId` / record URL |
| Enrollment | `Enrollment - Linked` |
| Athlete | `Athlete Full Name` (lookup) |
| Asset Type | `Asset Type` |
| Asset Purpose | `Asset Purpose` |
| Homework Assignment | `Homework Completions` + `Homework Name - Slot Correct` |
| Week | `Week` |
| Activity Date | `Date` |
| Submission | `Submission - Linked` |
| HC / VF record | `Homework Completions` / `Video Feedback` |
| Canonical URL | `Canonical File URL` |
| Filename | `Original File Name` |
| Upload date | `Uploaded At` |

### 4.2 Prior matched use (via primary link + lookups)

| Display | Proposed source |
|---------|-----------------|
| Prior Submission Asset | `Duplicate Match Record` (primary link) |
| Prior enrollment | Lookup from linked prior asset → `Enrollment - Linked` |
| Prior athlete | Lookup → `Athlete Full Name` |
| Prior Asset Type / Purpose | Lookups from prior asset |
| Prior homework / week / date / submission | Lookups from prior asset |
| Prior HC / VF | Lookups from prior asset |
| Prior canonical URL / filename / upload date | Lookups from prior asset |

**Recommendation:** Add lookup fields on Submission Assets that pull key columns **from** `Duplicate Match Record` (Airtable native pattern — no new links required for read-only display). OMNI can build the review Interface after schema approval.

### 4.3 Difference summary

**Proposed new field:** `Duplicate Review Summary` (multilineText or formula) — example:

> Same file previously used for Week 2 / Homework 3; submitted again for Week 5 / Video Feedback.

Lambda writes human-readable summary; formula may append lookup-backed detail later.

### 4.4 Review navigation

Review view / Interface must link to:

- Current Submission Asset
- Primary prior Submission Asset (`Duplicate Match Record`)
- Current logical activity (HC or VF)
- Prior logical activity (lookup from primary prior asset)

### 4.5 Multiple prior matches

| Role | Mechanism |
|------|-----------|
| **Primary prior match** | `Duplicate Match Record` — **one** link (`prefersSingleRecordLink: true` today) |
| **Selection rule** | Most relevant to triggered review reason (e.g. cross-type → prior of opposite type); tie-break **earliest `Uploaded At`** |
| **All same-enrollment matches** | **Proposed:** `Duplicate Match Records (All)` — multipleRecordLinks **or** JSON/list in `Duplicate Match Notes` + audit export |
| **Formulas** | Use **primary** link only |

**Schema limit today:** `Duplicate Match Record` supports **one** primary link. Multiple links require a **new** multi-link field (Mike approval) or encoded list in notes for v1.

---

## 5. Review categories

### 5.1 Proposed review reasons

| Reason code | When |
|-------------|------|
| `Same Assignment Resubmission` | Same enrollment + same assignment context |
| `Different Assignment Reuse` | Same enrollment, different homework assignment |
| `Different Week Reuse` | Same enrollment, different week |
| `Different Submission Reuse` | Same enrollment, different submission |
| `Cross-Type Reuse` | Same enrollment, different asset type (generic) |
| `Homework Used for Video Feedback` | HW → VF cross-type |
| `Video Feedback Used for Homework` | VF → HW cross-type |
| `Missing Context` | Hash match, scope fields incomplete |
| `Multiple Prior Uses` | >1 same-enrollment prior uploaded match |
| `Cross-Enrollment Match — Informational` | Different enrollment only |

### 5.2 Field design (proposal — do not create in this task)

| Approach | Recommendation |
|----------|----------------|
| **Primary reason** | Single-select `Duplicate Review Reason` (new) — highest-severity reason |
| **All reasons** | Multiple-select `Duplicate Review Reasons` (new) **preferred** — preserves multiple triggers |
| **Summary** | `Duplicate Match Notes` + new `Duplicate Review Summary` |
| **Formula-only** | Insufficient alone — multiple reasons need storage |

**Repurpose existing fields:**

| Existing field | New semantics |
|--------------|---------------|
| `Duplicate File Status` | Technical match state: `Unique`, `Exact Duplicate` (hash match exists), `Needs Review` (review queue), `Not Checked`, `Error` — **not** `Allowed Reuse` for automatic processing |
| `File is Duplicate?` | **Split meaning in implementation:** `true` = global SHA-256 match exists; separate field drives review queue |
| `Duplicate Review Status` | Operator workflow (§5.3) — may need new options |

### 5.3 Manual review outcome (operator-controlled)

**Proposed field:** `Asset Reuse Review Status` (new single-select) — or extend `Duplicate Review Status` after Mike approves option list.

| Value | Who sets | Meaning |
|-------|----------|---------|
| `Not Required` | Auto or Mike | No review needed |
| `Pending Review` | **Auto only** on flag | Awaiting Mike |
| `Approved — Legitimate Reuse` | Mike | OK — resubmit, correction, shared template, etc. |
| `Approved — Correction/Resubmission` | Mike | Intentional redo |
| `Confirmed Improper Reuse` | Mike | Same file used improperly |
| `Unable to Determine` | Mike | Inconclusive |

**Automation may only initialize** `Pending Review` (or `Not Required`). **Never** write final human judgment.

### 5.4 Pending review — downstream effects (Mike decisions)

**Recommended starting point (not silently decided):**

| Process | Recommended v1 behavior | Mike decision |
|---------|-------------------------|---------------|
| Asset upload | Completes normally (**Uploaded**) | — |
| Coach review queue | Surface in **C-023 Asset Reuse Review** view | Approve view design |
| Satisfactory homework | **No auto-change** — pending match alone does not revoke satisfactory | Confirm |
| Video Feedback processing | **No auto-block** | Confirm |
| XP award | **No auto-removal** — match alone does not claw back XP | Confirm |
| Level-gate credit | **No auto-removal** | Confirm |
| Confirmed improper reuse | **Separate** operator repair slice (C-024) — not automatic | Approve later |

---

## 6. Primary prior-match selection (comparison only — not object reuse)

**Supersedes prior "canonical original for S3 reuse" rule.** Used only to pick which prior asset Mike sees first.

1. Filter: same enrollment, `Upload Status = Uploaded`, valid hash, exclude current, exclude Error.
2. Prefer record most relevant to top review reason (cross-type → opposite destination).
3. Tie-break: earliest `Uploaded At`, then lowest `rec` id.
4. Optional walk: if primary link points to a record that itself has `Duplicate Match Record`, follow to **earliest uploaded** record for summary context — **for display only**, not for URL reuse.

---

## 7. Read-only implementation assessment

### 7.1 Context fields on Submission Assets (DEV schema 2026-07-06)

| Field | Type | Writable by Lambda | Notes |
|-------|------|-------------------|-------|
| `Enrollment - Linked` | link | No (intake) | Scope partition |
| `Submission - Linked` | link | No | Video/homework scope |
| `Homework Completions` | link | No | Assignment scope |
| `Video Feedback` | link | No | VF scope |
| `Asset Type` | singleSelect | No | Cross-type detection |
| `Asset Purpose` | singleSelect | No | HW1/HW2/VF/headshot |
| `Asset Slot` / `Asset Label` | select/text | No | HW slot |
| `Week` | lookup | No | From Submission |
| `Date` | lookup | No | Activity Date from Submission |
| `Homework Name - Slot Correct` | formula | No | Assignment name |
| `Source Attachment ID` | text | No | Intake identity |
| `Original File Name` | text | No | Display |
| `Athlete Full Name` | lookup | No | Review UI |
| `File Content Hash` | text | **Yes** | Post-compute |
| `Canonical File URL` | url | **Yes** | Own object |
| `Storage Key` | text | **Yes** | Own object |
| `Uploaded At` | dateTime | **Yes** | |
| `File Size Bytes` | number | **Yes** | |

**Lambda today** loads the full asset via `get_asset()` with no field filter — all fields returned. Match lookup reads only: Canonical URL, Storage Key, Hash, Uploaded At — **insufficient for contextual review**. Implementation must request scope fields on match records.

### 7.2 Lambda must query linked records?

| Data | Available on asset | May need extra GET |
|------|-------------------|-------------------|
| Week / Activity Date | Lookups on asset | Usually no — if blank, flag Missing Context |
| Homework assignment name | Formula on asset | No |
| HC curriculum details | Link only | Optional — link id sufficient for comparison |

**Efficient same-enrollment lookup:** Airtable formula
`AND({File Content Hash} = "…", {Enrollment - Linked} = "…", RECORD_ID() != "…", {Upload Status} = "Uploaded")`
with expanded `fields[]` on GET. Global lookup remains separate query.

### 7.3 Existing duplicate fields — retain and repurpose

| Field | Keep? | New role |
|-------|-------|----------|
| `File Content Hash` | Yes | SHA-256 writeback |
| `File Hash Algorithm` | Yes | SHA-256 |
| `Duplicate File Status` | Yes | Technical classification |
| `Duplicate Match Strength` | Yes | `Exact SHA-256 Hash` |
| `Duplicate Match Record` | Yes | **Primary prior** asset for review (one link) |
| `Duplicate Match Notes` | Yes | Machine + human notes; optional all-match list |
| `Duplicate Checked At` | Yes | Audit timestamp |
| `Duplicate Check Error` | Yes | Partial-failure diagnostics |
| `File is Duplicate?` | Yes — **redefine** | Global hash match exists (not synonymous with "improper") |
| `Duplicate Review Status` | Yes — **extend?** | Operator workflow |
| `From field: Duplicate Match Record` | Yes | Inverse — assets that matched **to** this record |

### 7.4 `File is Duplicate?` conflation (today)

**Yes — conflated in current Lambda.** Any global hash match sets `File is Duplicate? = true` and `Exact Duplicate` regardless of enrollment. Implementation must **separate**:

- `File is Duplicate?` or renamed `Has Global Hash Match?` → technical
- `Asset Reuse Review Status` / `Duplicate File Status = Needs Review` → business queue

### 7.5 Proposed new fields (require Mike approval before creation)

| Field | Type | Purpose |
|-------|------|---------|
| `Duplicate Review Summary` | multilineText | Human difference summary (§4.3) |
| `Duplicate Review Reasons` | multipleSelect | All triggered reason codes (§5.1) |
| `Duplicate Review Reason` | singleSelect | Primary reason for views/formulas |
| `Asset Reuse Review Status` | singleSelect | Operator outcome (§5.3) — or extend existing `Duplicate Review Status` |
| `Duplicate Match Records (All)` | multipleRecordLinks | All same-enrollment matches (optional v1) |
| Lookups from primary prior | lookup | Prior week, assignment, VF, HC, URLs for Interface |

**Do not create** in this planning task.

### 7.6 Airtable Interface / view (OMNI later)

Filtered view **C-023 — Asset Reuse Review Queue**:
`Asset Reuse Review Status = Pending Review` (or `Duplicate File Status = Needs Review`).

Interface: two-column layout — current asset fields | prior match lookups. Build in OMNI after schema approval.

---

## 8. Removed — prior reuse policy (superseded 2026-07-10)

The following are **withdrawn** and must not be implemented:

| Removed recommendation | Replacement |
|------------------------|-------------|
| Skip S3 PutObject for contextual duplicate | **Always** PutObject |
| Copy another asset's Canonical File URL | Write **new** URL for new key |
| Copy another asset's Storage Key | Write **new** key per asset |
| `actionOut = reused_canonical_duplicate` | `uploaded` + `review_flagged` (proposed) |
| `Allowed Reuse` as automatic Lambda outcome | Operator-only judgment after review |
| Canonical root for **object** reuse | Root/earliest selection **for comparison display only** (§6) |
| Actionable duplicate = block upload | Actionable duplicate = **review queue only** |
| Post-policy audit: "reuse expected but different storage key" | Audit: "review flagged but no primary match link" / "improper reuse confirmed but duplicate objects exist by design" |

---

## 9. Implementation plan (not started)

### 9.1 Lambda / Python

| File | Changes |
|------|---------|
| `lambda/upload-asset/upload_core/duplicate.py` | Global + same-enrollment queries; context comparator; review reason builder; primary prior selection; **no** reuse writeback |
| `lambda/upload-asset/upload_core/processor.py` | Always `upload_s3()` then write review fields; new `actionOut` e.g. `uploaded` / `uploaded_review_flagged` |
| `lambda/upload-asset/upload_core/airtable.py` | Field list constants for match GET; optional batch match load |
| `lambda/upload-asset/tests/test_duplicate_review_scope.py` | **New** — H3b–H3h logic |
| `lambda/upload-asset/tests/test_processor_always_uploads.py` | **New** — S3 always called except idempotent skip |

### 9.2 Airtable (DEV — Mike approval)

New fields (§7.5), lookups from primary prior, review queue view. **OMNI** for Interface.

### 9.3 DEV test matrix (not executed)

| ID | Scenario | S3 | Review | Primary pass criteria |
|----|----------|-----|--------|----------------------|
| **H3b** | Same enrollment, same assignment, same bytes | New key | `Same Assignment Resubmission`; both uses visible | Independent URLs; match link; summary mentions same assignment |
| **H3c** | Same enrollment, different homework | New key | `Different Assignment Reuse`; Pending Review | Prior + current HC context in summary |
| **H3d** | Homework → Video Feedback | New key | `Homework Used for Video Feedback`; Pending Review | Cross-type summary |
| **H3e** | Video Feedback → Homework | New key | `Video Feedback Used for Homework`; Pending Review | Reverse cross-type |
| **H3f** | Different enrollment, same bytes | New key | Informational only; **not** Pending Review | `Cross-Enrollment Match — Informational` in notes |
| **H3g** | Same enrollment, different week | New key | `Different Week Reuse`; Pending Review | Both weeks in summary |
| **H3h** | Missing assignment/context | New key | `Missing Context`; Pending Review | Upload succeeds |
| **H3i** | Same asset-record retry | **No** second object | Unchanged | `skipped_already_uploaded` |

**Common pass criteria:** `Upload Status = Uploaded`; own `Storage Key` + `Canonical File URL`; hash matches; attachment retained; reference records untouched; no unrelated writes.

**Common fail criteria:** Blocked upload; reused prior URL/key; stuck Processing; second object on H3i; unrelated records changed.

### 9.4 Production promotion prerequisites

- H3b–H3i PASS on DEV
- Mike approves schema + review status options
- Review Interface/view in DEV
- Processing race disposition (§10) — SOP minimum for manual tests
- [C-013 production promotion plan](./C-013-production-promotion-plan.md) updated

---

## 10. Processing race (separate issue)

**Status:** **Open** — documented in H3 test and prior analysis. **Not a C-023 duplicate-policy blocker** for specification or Lambda review logic.

| Question | Answer |
|----------|--------|
| Production blocker for duplicate **policy**? | **No** — race is 070b/Make/Lambda orchestration |
| Production blocker for **upload path**? | **Yes, potentially** — asset can stick Processing if Make 200 without Lambda writeback |
| Combine fixes? | **No** unless shared root cause proven — separate C-013-OPS slice |
| Evidence | H3 first invoke; `recIYFnfmsPcy7iop` diagnosis artifact |

See [C-023-dev-h3-duplicate-bytes-test.md § Processing race](./C-023-dev-h3-duplicate-bytes-test.md).

---

## 11. Decisions requiring Mike approval

| # | Decision |
|---|----------|
| 1 | New fields vs extend `Duplicate Review Status` options |
| 2 | `File is Duplicate?` semantics vs new `Has Global Hash Match?` |
| 3 | Primary prior match rule when multiple reasons conflict |
| 4 | `Same Assignment Resubmission` — auto `Not Required` or always Pending Review |
| 5 | Pending review effects on XP, homework satisfactory, VF (§5.4) |
| 6 | Multi-link field for all matches vs notes-only v1 |
| 7 | Processing race fix priority vs C-023 implementation |
| 8 | Production cutover timing |

---

## 12. C-023 closure criteria

C-023 **done** only when:

1. This policy approved
2. Independent upload + contextual review implemented
3. H3b–H3i PASS on DEV
4. Review queue visible to Mike (view or Interface)
5. Audit checks defined

**Current state:**

| Item | Status |
|------|--------|
| H3 hash detection | **PASS** |
| Prior reuse policy | **Superseded** |
| Independent upload policy | **Approved** (this doc) |
| Contextual same-enrollment review rules | **Approved** (this doc) |
| Schema / code implementation | **Not started** |
| DEV scenario matrix H3b–H3i | **Pending** |
| Processing race | **Separate / open** |

---

## Related

| Doc | Topic |
|-----|--------|
| [C-023-dev-h3-duplicate-bytes-test.md](./C-023-dev-h3-duplicate-bytes-test.md) | H3 evidence |
| [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md) | Wave 7 gates |
| [C-013-production-promotion-plan.md](./C-013-production-promotion-plan.md) | Prod promotion |
