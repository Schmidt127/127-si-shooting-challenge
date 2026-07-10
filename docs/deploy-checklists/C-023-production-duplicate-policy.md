# C-023 — Production duplicate policy (specification)

**Date:** 2026-07-10
**Last revised:** 2026-07-10 — **Stage 4C** direct DEV Lambda smoke test PASS
**Status:** **Stage 4C PASS** — claim + upload + writeback + reuse review + retry skip proven on DEV Lambda (no Make/070b). **Not complete** — Stage 4D Make path + H3b–H3p pending.
**Backlog:** C-023 (parents: C-013, C-024)
**Evidence:** [C-023-dev-h3-duplicate-bytes-test.md](./C-023-dev-h3-duplicate-bytes-test.md) — H3 **PASS** on DEV
**Supersedes:** Prior draft sections recommending canonical S3 reuse, skip PutObject, `reused_canonical_duplicate`, and `Allowed Reuse` as automatic processing outcomes (2026-07-10 revision).

**Hard stops:** No Lambda deploy · no Airtable field creation · no Production changes

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

### Locked operational defaults (2026-07-10)

| Rule | Behavior |
|------|----------|
| Potential reuse | **Warning, not a hold** — upload and downstream processing continue |
| Default meaning | **Not reviewed; processing normally** — not an affirmative Mike approval |
| Mike only | Confirms improper duplicate via `Asset Reuse Decision` |
| Consequences | **Only after** `Confirmed Duplicate` — separate auditable workflow, never in upload Lambda |
| Evidence | File, asset record, hash, S3 object, match links, audit history **never deleted** |

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

**v1 field:** `Asset Reuse Decision` (single-select) — see **§11.4** for final schema. Mike only.

| Value | Writer |
|-------|--------|
| `Not Reviewed` | Default — automation never implies approval |
| `Allowed — Legitimate Reuse` | Mike |
| `Allowed — Correction/Resubmission` | Mike |
| `Confirmed Duplicate` | Mike — enables Stage 5 consequence workflow only |
| `Unable to Determine` | Mike |
| `Resolved — Duplicate Record Error` | Mike |

Automation may set `Potential Asset Reuse?` and review reasons/summary. Automation **must not** write final judgment or overwrite a nonblank human decision on retry.

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

## 9. Implementation plan (superseded by §13–§18)

Sections **10–18** contain the current Stage 1 specification, staged execution, schema, claim design, test matrix, and local test plan. Stage 2 code work begins only after Mike approves §11 + §10.

## 10. Upload status, claim sequence, and H3 collision (Stage 1 assessment)

**Status:** **Open** — separate from C-023 review logic but **blocks reliable DEV/Production upload testing** until resolved.

### 10.1 Current sequence (code — Stage 2A implemented locally)

| Step | Component | Behavior (repo `master` after Stage 2A) |
|------|-----------|----------------------------------------|
| 1 | **013 / 020** | Asset → `Upload Status = Pending Link`; `Send to Make Trigger` checked |
| 2 | **070b** (when ON) | POST Make webhook — **Option A:** should **not** set `Processing` (separate Airtable approval) |
| 3 | **Make** | Module 3 POST Lambda Function URL |
| 4 | **Lambda** | `evaluate_upload_claim()` — `Pending Link` → claim PATCH (`Processing` + `Upload Claim Run ID` + `Processing Started At`) |
| 5 | **Lambda** | `Processing` + matching claim + active lease → `claim_continuation` (no second claim PATCH) |
| 6 | **Lambda** | Concurrent / stale / legacy Processing → skip or error **without S3** |
| 7 | **Lambda** | On success → `Uploaded` + storage writeback; claim audit fields **preserved** |
| 8 | **Lambda** | `already_uploaded()` → `skipped_already_uploaded` |

**There is no formal claim token in deployed Lambda yet** — Stage 2A implements `upload_core/upload_claim.py` locally; deploy blocked until Stage 4.

### 10.1b Claim-state matrix (implemented in `upload_claim.py`)

| Upload Status | Claim on record | Payload `uploadClaimRunId` | Lease | `actionOut` | S3 |
|---------------|-----------------|----------------------------|-------|-------------|-----|
| `Pending Link` | n/a | optional | n/a | `claim_acquired` | yes (after claim PATCH) |
| `Processing` | matches payload | same | active (<30 min) | `claim_continuation` | yes |
| `Processing` | differs / missing | other / blank | active | `skipped_concurrent_upload` or `error_claim_conflict` | **no** |
| `Processing` | any | any | stale (≥30 min or missing started) | `stale_claim` | **no** (not auto-reset) |
| `Uploaded` + canonical + hash | any | any | any | `skipped_already_uploaded` | **no** |

### 10.2 H3 collision root cause

| Evidence | Finding |
|----------|---------|
| H3 prep | Asset reached `Pending Link` + `READY_TO_SEND` |
| H3 invoke #1 | Lambda error: `Upload Status must be "Pending Link"; got "Processing"` |
| **070b script** | Only production path that sets Submission Assets `Processing` (after Make 2xx) |
| **recIY** diagnosis | Make returned 200 **Accepted** but Lambda never ran — stuck Processing |
| H3 recovery | Manual reset to Pending Link + invoke #2 succeeded |

**Root cause class:** Orchestration race — asset moves to `Processing` before (or without) Lambda completing writeback. Direct Lambda invoke while `Processing` fails by design. Competing 070b/Make run vs manual test is plausible when `READY_TO_SEND` is true.

**Not caused by:** duplicate-review logic, H3 prep harness, or separate asset records with identical bytes.

### 10.3 Recommended single-worker claim design (C-013-UPLOAD-CLAIM)

**Official claim owner:** **Lambda** (at processing start). **070b** must stop being the sole writer of `Processing` without a shared claim contract.

| # | Behavior |
|---|----------|
| 1 | Asset ready → `Pending Link` |
| 2 | Authorized path invokes Lambda (Make or direct test) with optional `uploadClaimRunId` in payload |
| 3 | Lambda **claims**: if `Pending Link` → PATCH `Processing` + `Upload Claim Run ID` + `Processing Started At` |
| 4 | Lambda accepts `Processing` **only** when claim id matches payload or stale-lease policy applies |
| 5 | Concurrent worker with different/missing claim → `skipped_concurrent_upload` or `error_claim_conflict` (no S3) |
| 6 | Success → `Uploaded` + clear claim fields |
| 7 | Same record already Uploaded → `skipped_already_uploaded` |
| 8 | Stale `Processing` → reclaim per §10.4 |

**070b change (separate approval):** Option **A** (preferred) — 070b **does not** set `Processing`; only clears `Send to Make Trigger` on Make 2xx. Option **B** — 070b sets `Processing` + generates `uploadClaimRunId` passed through Make payload for Lambda to validate.

**Do not combine** claim fix deployment with C-023 review field rollout unless Mike approves coordinated Stage 2 PR.

### 10.4 Stale Processing recovery

| Item | Proposal |
|------|----------|
| Detection | `audit-stuck-upload-processing.js` (exists) — extend for canonical/hash blank + age > 30 min |
| New fields | `Processing Started At` (datetime), `Upload Claim Run ID` (text) |
| Recovery | Ops or Lambda `stale_claim_recovery`: if Processing, no canonical, started > TTL → reset `Pending Link` or allow reclaim on next invoke |
| Manual DEV test SOP | **070b OFF**; invoke within seconds of prep; never leave asset `READY_TO_SEND` idle |

### 10.5 Production blocker?

| Area | Blocker? |
|------|----------|
| C-023 review specification | **No** |
| Upload path reliability with 070b ON | **Yes** until claim design deployed |
| DEV H3b–H3p runtime tests | **Yes** without claim SOP or fix |

---

## 11. Stage 1 — v1 schema proposal (final for Mike approval)

**Source:** DEV schema snapshot `dev-20260706` + Lambda field audit. **Do not create fields in Stage 1.**

### 11.1 Field reuse vs new

| Existing field | Reuse? | Stage 1 recommendation |
|----------------|--------|--------------------------|
| `File Content Hash` | **Keep** | Lambda writes SHA-256 |
| `File Hash Algorithm` | **Keep** | `SHA-256` |
| `Duplicate Match Record` | **Keep** | Primary prior comparison link (single) |
| `Duplicate Match Strength` | **Keep** | `Exact SHA-256 Hash` |
| `Duplicate Checked At` | **Keep** | Audit timestamp |
| `Duplicate Check Error` | **Keep** | Partial-failure diagnostics |
| `Duplicate Match Notes` | **Keep** | Machine debug + optional global-match note |
| `File is Duplicate?` | **Deprecate writer** | Conflates global hash + review — stop writing; migrate to `Exact Hash Match Found?` |
| `Duplicate File Status` | **Repurpose writer** | Technical only: `Unique`, `Exact Duplicate` (hash exists), `Not Checked`, `Error` — **not** review queue |
| `Duplicate Review Status` | **Do not write from Lambda** | Legacy/submission-adjacent semantics differ; avoid collision with `Asset Reuse Decision` |
| `Review Complete?` | **Unrelated** | Coach review — do not repurpose |

### 11.2 New fields — technical (Lambda writer)

| Field | Type | Writer | Meaning |
|-------|------|--------|---------|
| `Exact Hash Match Found?` | checkbox | Lambda | Identical bytes exist anywhere |
| `Same Enrollment Match Found?` | checkbox | Lambda | ≥1 same-enrollment hash match |
| `Duplicate Match Records (All)` | multipleRecordLinks (self) | Lambda | All same-enrollment uploaded matches |
| `Upload Claim Run ID` | singleLineText | Lambda / 070b | Single-worker claim token |
| `Processing Started At` | dateTime | Lambda | Claim lease start |

### 11.3 New fields — automated review (Lambda writer only)

| Field | Type | Writer | Meaning |
|-------|------|--------|---------|
| `Potential Asset Reuse?` | checkbox | Lambda | Contextual same-enrollment warning |
| `Asset Reuse Review Primary Reason` | singleSelect | Lambda | Highest-severity reason (§4.4 order) |
| `Asset Reuse Review Reasons` | multipleSelect | Lambda | All triggered reasons |
| `Asset Reuse Review Summary` | multilineText | Lambda | Plain-language current vs prior comparison |

**Queue status:** Use `Potential Asset Reuse? = true` as queue filter — **no separate** `Asset Reuse Review Queue Status` in v1 (avoids overlap with decision field). Optional formula view: `AND({Potential Asset Reuse?}, {Asset Reuse Decision} = "Not Reviewed")`.

### 11.4 Mike-controlled decision (Mike / OMNI only)

| Field | Type | Writer | Values |
|-------|------|--------|--------|
| `Asset Reuse Decision` | singleSelect | **Mike only** | `Not Reviewed` (default), `Allowed — Legitimate Reuse`, `Allowed — Correction/Resubmission`, `Confirmed Duplicate`, `Unable to Determine`, `Resolved — Duplicate Record Error` |

**Retry rule:** Lambda **must not overwrite** `Asset Reuse Decision` when not blank and not `Not Reviewed`.

### 11.5 Audit fields (Mike + consequence workflow)

| Field | Type | Writer | Purpose |
|-------|------|--------|---------|
| `Asset Reuse Reviewed At` | dateTime | Mike / consequence automation | Last human decision timestamp |
| `Asset Reuse Reviewed By` | singleLineText or collaborator | Mike | Reviewer identity |
| `Asset Reuse Review Notes` | multilineText | Mike | Free-text |
| `Duplicate Resolution Applied?` | checkbox | Consequence automation | Idempotent apply guard |
| `Duplicate Resolution Applied At` | dateTime | Consequence automation | When consequences ran |
| `Duplicate Resolution Error` | multilineText | Consequence automation | Apply failure |

### 11.6 Lookups for OMNI (create after primary link populated)

Lookups **from** `Duplicate Match Record` on Submission Assets:

- Prior `Athlete Full Name`, `Asset Type`, `Asset Purpose`, `Week`, `Date`, `Submission - Linked`, `Homework Completions`, `Video Feedback`, `Original File Name`, `Canonical File URL`, `Uploaded At`

No new links required for side-by-side display if primary link + lookups suffice.

### 11.7 Primary reason severity order (comparison only)

1. Homework Used for Video Feedback
2. Video Feedback Used for Homework
3. Different Assignment Reuse
4. Different Week Reuse
5. Different Submission Reuse
6. Cross-Type Reuse (generic)
7. Same Assignment Resubmission
8. Missing Context
9. Multiple Prior Uses

Tie-break: earliest prior `Uploaded At`, then lowest `rec` id.

---

## 12. Downstream behavior (locked v1)

### 12.1 Default and pending review

When `Potential Asset Reuse? = true` and `Asset Reuse Decision = Not Reviewed`:

- `Upload Status` = successful (`Uploaded`)
- Homework / VF workflows **continue**
- XP **not** withheld; existing XP **not** removed
- Gate credit **not** withheld
- Asset appears in Mike's review queue (view/Interface)
- Meaning: **processing normally; not yet reviewed**

### 12.2 Mike decision outcomes

| `Asset Reuse Decision` | Credit / XP | Queue | Consequence workflow |
|------------------------|-------------|-------|----------------------|
| `Not Reviewed` | Normal | Visible if `Potential Asset Reuse?` | None |
| `Allowed — Legitimate Reuse` | Normal | Cleared from pending filter | None |
| `Allowed — Correction/Resubmission` | Normal; identify credit target | Cleared | Optional correction if duplicate HC/XP row exists |
| `Unable to Determine` | Normal | May remain visible | None |
| `Confirmed Duplicate` | **No auto-change** until consequence workflow | Cleared after review | **Triggers/enables** Stage 5 workflow |
| `Resolved — Duplicate Record Error` | Normal | Cleared | None |

### 12.3 Consequence architecture — `Confirmed Duplicate` (Stage 5 — design only)

**Separate automation/extension** (not upload Lambda):

| Principle | Rule |
|-----------|------|
| Idempotent | `Duplicate Resolution Applied?` guard + Source Key per correction |
| Auditable | Write `Asset Reuse Review Notes`, resolution timestamps |
| Reversible where practical | Deactivate (not delete) XP Events; mark HC/VF ineligible flags |
| Evidence preserved | **Never** delete S3 object or Submission Asset |

**Records that may need correction (assess in Stage 5):**

| Record | Possible action |
|--------|-----------------|
| Homework Completion | Mark duplicate credit / satisfactory denied |
| Video Feedback | Mark ineligible for XP or coach completion |
| XP Events | Deactivate or reverse via existing patterns (**114** Source Key) |
| Weekly Athlete Summary | Rollup recalc via existing chains |
| Enrollment gate rollups | Recalc after XP/HC correction |

**Trigger:** Airtable automation on `Asset Reuse Decision` → `Confirmed Duplicate` (DEV first) **or** manual extension with `CONFIRM_WRITE`.

---

## 13. Staged execution

| Stage | Scope | Status |
|-------|--------|--------|
| **1** | Assessment, schema proposal, claim design, docs | **Complete** (this revision) |
| **2** | Lambda + local tests | **Blocked** — Mike approval of §11 schema + §10 claim design |
| **3** | DEV Airtable fields + OMNI Interface | **Blocked** — separate approval |
| **4** | DEV runtime H3b–H3p + claim tests | **Blocked** — after Stage 2–3 |
| **5** | Consequence workflow | **Blocked** — separate design approval |
| **6** | Production readiness | **Blocked** — after Stage 4 pass |

---

## 14. DEV runtime test matrix — **executed 2026-07-10 (H3b–H3p)**

| ID | Scenario | Result | Current asset | Primary reason / evidence |
|----|----------|--------|---------------|---------------------------|
| **H3b** | Same enrollment, same assignment | **PASS** | `recL5y7uGhDgpBgzH` | `Same Assignment Resubmission` in reasons; severity primary among many priors |
| **H3c** | Different homework assignment | **PASS** | `recgDL7dqsS1J1LUl` | `Different Assignment Reuse` |
| **H3d** | HW → VF | **PASS** | `rec9JAtfj0MMp3Tua` | `Homework Used for Video Feedback`; prior `recq9t8zWUhDJts40` |
| **H3e** | VF → HW | **PASS** | `rec1PzA7th0qJbsN4` | `Video Feedback Used for Homework` |
| **H3f** | Different enrollment | **BLOCKED** | — | No second DEV test enrollment |
| **H3g** | Different week | **PASS** | `recpj3febxqjGUHdz` | `Different Week Reuse` in reasons |
| **H3h** | Missing context | **PASS** | `recr96fs0WGBlZZ5L` | `Missing Context` in reasons |
| **H3i** | Same asset-record retry | **PASS** | `recvzxmLrjer4DLyt` | `skipped_already_uploaded` |
| **H3j** | Multiple prior same-enrollment | **PASS** | `recDlklLsYKCDwXjv` | `Multiple Prior Uses`; all-match retention |
| **H3k** | Retry with Mike decision set | **PASS** | `recgDL7dqsS1J1LUl` | Decision + notes preserved |
| **H3l** | Two workers same asset | **PASS** (4D cite) | `recbjubFiO5xqZFvw` | Stage 4D-D collision |
| **H3m** | Stale Processing recovery | **PASS** (4D cite) | `recMLMjuPcpjOjY94` | Stage 4D-E `stale_claim` |
| **H3n** | Mike → Allowed — Legitimate Reuse | **PASS** | `recF86pJTIMFoEypJ` | Decision persists |
| **H3o** | Mike → Allowed — Correction/Resubmission | **PASS** | `recF86pJTIMFoEypJ` | Decision persists |
| **H3p** | Mike → Confirmed Duplicate | **PASS** | `recF86pJTIMFoEypJ` | Evidence intact; no consequence automation |

Detail: [C-023-dev-h3-duplicate-bytes-test.md](./C-023-dev-h3-duplicate-bytes-test.md) § Wave 7 matrix.

---

## 15. Local test plan (Stage 2) — **PASS (2026-07-10)**

| Test module | Cases | Status |
|-------------|-------|--------|
| `tests/test_duplicate_review.py` | Context comparator: reason codes; cross-enrollment informational; primary match; decision guard | **PASS** |
| `tests/test_processor.py` | Always uploads; idempotent skip; review writeback partial failure; claim skip paths | **PASS** |
| `tests/test_upload_claim.py` | Claim, concurrent reject, stale claim (no auto-reset) | **PASS** |

Run: `cd lambda/upload-asset && python -m unittest discover -s tests -p "test_*.py" -v` (no deploy).

---

## 16. OMNI Interface requirements (Stage 3)

After schema approval, Mike builds in OMNI:

| Element | Requirement |
|---------|-------------|
| Filter | `Potential Asset Reuse?` + `Asset Reuse Decision = Not Reviewed` |
| Layout | Current use (left) / prior use via lookups (right) |
| Summary | `Asset Reuse Review Summary` prominent |
| Links | Open current asset, primary prior asset, HC/VF records, both canonical URLs |
| Controls | `Asset Reuse Decision`, `Asset Reuse Review Notes`, `Asset Reuse Reviewed At` |
| Read-only | Hash, storage keys, reason multiselect (Lambda-written) |

---

## 17. Decisions requiring Mike approval

| # | Decision | Status |
|---|----------|--------|
| 1 | Approve §11 v1 schema (new fields + deprecate `File is Duplicate?` writer) | **Pending** — Stage 3 |
| 2 | Approve §10 claim design (070b Option A) | **Approved** — **repo v4.2 complete** (DEV paste pending Mike) |
| 3 | `Same Assignment Resubmission` always queues (`Potential Asset Reuse?`) | **Implemented** locally |
| 4 | Skip `Asset Reuse Review Queue Status` | **Implemented** locally |
| 5 | Stage 2 code (local tests only, no deploy) | **Complete** (2026-07-10) |
| 6 | Stage 3 DEV schema + OMNI | **Pending** |
| 7 | Stage 5 consequence scope | **Pending** |
| 8 | Lambda deploy + 070b Option A Airtable change | **Pending** — Stage 4 |

---

## 18. C-023 closure criteria

C-023 **done** only when:

1. Policy + schema approved
2. ~~Stage 2 local tests pass~~ **Done (2026-07-10)**
3. Stage 3 schema + OMNI review queue live on DEV
4. Stage 4 H3b–H3p (+ claim tests) PASS
5. Stage 5 consequence workflow approved (or explicitly deferred with disposition)
6. Audit checks defined

**Current state:**

| Item | Status |
|------|--------|
| H3 hash detection | **PASS** |
| Independent upload + manual review policy | **Approved** |
| Stage 1 assessment + schema proposal | **Complete** |
| Stage 2A/2B local code + unit tests | **Complete (2026-07-10)** |
| Stage 3 DEV schema verification (read-only) | **Complete (2026-07-10)** — see **§19** |
| Stage 4–6 (deploy, runtime, consequences) | **Not started** |
| Processing claim | **Implemented locally** — deploy + 070b change pending |
| C-023 | **in progress** |

---

## 19. Stage 3 DEV schema verification (2026-07-10, read-only)

**Source:** `export_airtable_schema.py` against `appTetnuCZlCZdTCT` only (snapshot `airtable/schema/snapshots/c023-stage3-verify-dev/` — local, not committed).

### Field contract

All **16** C-023 fields exist on DEV **Submission Assets** with expected types (checkbox, `dateTime` with time, `multilineText`, links). `Duplicate Match Record` = `multipleRecordLinks` + `prefersSingleRecordLink: true`. `Duplicate Match Records (All)` = multi-link self-reference.

### Select options

All reason/decision option **sets** match code except one string corrected in repo:

| Option | DEV Airtable | Code (after fix) |
|--------|--------------|------------------|
| VF→Homework reason | `Video Feedback Used for Homework` | **Aligned** (`847aa6e` had `Used as`) |

Em dash in `Allowed — …` and `Cross-Enrollment Match — Informational` = U+2014 (matches code).

### Gaps (OMNI follow-up)

| Item | Status |
|------|--------|
| Prior-use lookup fields (`Prior Athlete Full Name`, etc.) | **MISSING** on DEV |
| View `Asset Reuse — Pending Review` | **MISSING** (only 4 table views in metadata) |
| View `Asset Reuse — Reviewed` | **MISSING** |
| Interface `Asset Reuse Review` | **Not verifiable** via Metadata API — confirm in Airtable UI |

### `Not Reviewed` vs blank

- Airtable **no default** on `Asset Reuse Decision`.
- Lambda **writes** `Not Reviewed` on first upload when decision blank (`build_review_writeback`).
- `human_decision_is_locked()` treats blank as unlocked (Mike decision not set).
- **Pending Review view** should filter `OR({Asset Reuse Decision} = "Not Reviewed", {Asset Reuse Decision} = BLANK())` AND `{Potential Asset Reuse?}` — exact `Not Reviewed` only **hides** pre-Lambda blank rows.

### Stage 4 readiness

| Step | Action |
|------|--------|
| Lambda | ~~Code-only deploy: `127si-upload-asset-dev`~~ **Done 2026-07-10** (`8c94475`, no invoke) |
| 070b Option A | ~~Remove Processing writeback~~ **Done in repo v4.2** (`c0f91d3`) — Mike paste DEV 070b script (automation OFF) |
| **4C direct Lambda smoke** | **PASS 2026-07-10** — asset `recXUc3010h16Usmo`; `uploaded` + `allPass=true`; claim `44d2b856-30cd-45b6-9cdf-d642faa58220`; retry `skipped_already_uploaded`; 1 S3 object. See [Wave 7 checklist § Stage 4C](./C-013-wave7-asset-storage-checklist.md). |
| **4D Make path** | **4D-R Part A PASS** · **Part B BLOCKED** (070b auto-upload path) — see [Make scenario prep](./C-013-dev-make-lambda-scenario-prep.md) |
| Runtime gates (remaining) | 070b DEV paste verify → Make smoke → H3l claim via Make → H3b–H3p |

---

## Related

| Doc | Topic |
|-----|--------|
| [C-023-dev-h3-duplicate-bytes-test.md](./C-023-dev-h3-duplicate-bytes-test.md) | H3 evidence |
| [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md) | Wave 7 gates |
| [C-013-production-promotion-plan.md](./C-013-production-promotion-plan.md) | Prod promotion |
