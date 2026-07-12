# C-023 — Schema impact (Stage 1 inventory)

**Date:** 2026-07-12  
**Worker:** A · Overnight V2 Stage 1  
**Branch:** `overnight/v2-run/worker-a-s1-c023-schema`  
**Base SHA:** `ba6c8440890e4db97e65c48224250dc02bb961a0`  
**Environment:** DEV schema inventory + repo docs — **no PROD**, **no field creation**

**Authoritative policy:** [C-023-production-duplicate-policy.md](./C-023-production-duplicate-policy.md)  
**Stage 6 gate:** [C-023-stage6-production-readiness-checklist.md](./C-023-stage6-production-readiness-checklist.md)  
**DEV snapshot (read-only, uncommitted):** `airtable/schema/snapshots/c023-stage3-verify-dev/schema_doc_appTetnuCZlCZdTCT_20260710_052425.md`  
**Base ID:** `appTetnuCZlCZdTCT` (DEV)

---

## Executive summary

C-023 duplicate/hash/review fields on **DEV Submission Assets** are **present and typed correctly** per Stage 3 verification (policy §19). Stage 1 tonight does **not** require new Airtable columns — it requires **OMNI views/lookups** and documentation alignment so Mike can operate the review queue.

**Locked behavior:** Lambda always uploads a new S3 object; `Potential Asset Reuse?` flags same-enrollment contextual matches for manual review; uploads and downstream pipelines **continue**; automation **116** applies consequences only after Mike sets `Asset Reuse Decision = Confirmed Duplicate`.

---

## 1. Field inventory — Submission Assets

Sources: DEV snapshot `schema_doc_*_20260710_052425.md` (primary); policy §11; [field-map.md](../../airtable/schema/current/field-map.md); Stage 6 §2.

### 1.1 Upload + hash (Lambda writer — C-013 / C-023)

| Field | Type (DEV) | Writer | Authoritative meaning | Citation |
|-------|------------|--------|----------------------|----------|
| `File Content Hash` | singleLineText | Lambda | SHA-256 of uploaded bytes | snapshot L419–423; policy §11.1 |
| `File Hash Algorithm` | singleSelect (`SHA-256`) | Lambda | Algorithm label | snapshot L424–429 |
| `Canonical File URL` | url | Lambda | **This asset's** S3 object URL | snapshot L93–97; field-map |
| `Storage Key` | singleLineText | Lambda | **This asset's** S3 key | snapshot L98–102 |
| `Upload Status` | singleSelect | Lambda (terminal), intake scripts (Pending Link) | `Pending Link` → `Processing` → `Uploaded` / `Error` | snapshot L64–69 |
| `Uploaded At` | dateTime | Lambda | Successful upload timestamp | snapshot L203+ |
| `File Size Bytes` | number | Lambda | Post-upload size | snapshot L430–435 |
| `File MIME Type` | singleLineText | Lambda | MIME from upload | snapshot L436–440 |
| `Upload Claim Run ID` | singleLineText | Lambda | Single-worker claim token | snapshot L517–521 |
| `Processing Started At` | dateTime | Lambda | Claim lease start | snapshot L522–527 |

**Upload Status options (DEV):** `Pending Link`, `Processing`, `Uploaded`, `Error`, `Ready`, `No File`.

### 1.2 Technical duplicate detection (Lambda writer)

| Field | Type (DEV) | Writer | Authoritative meaning | Notes |
|-------|------------|--------|----------------------|-------|
| `Exact Hash Match Found?` | checkbox | Lambda | Identical bytes exist **anywhere** in base | snapshot L505–510; policy §11.2 |
| `Same Enrollment Match Found?` | checkbox | Lambda | ≥1 uploaded match under same enrollment | snapshot L511–516 |
| `Duplicate Match Record` | multipleRecordLinks (self, single preferred) | Lambda | **Primary** prior asset for review | snapshot L481–486 |
| `Duplicate Match Records (All)` | multipleRecordLinks (self) | Lambda | All same-enrollment uploaded matches | snapshot L590–601 |
| `From field: Duplicate Match Record` | multipleRecordLinks (inverse) | system | Assets that linked **to** this record as primary match | snapshot L499–504 |
| `From field: Duplicate Match Records (All)` | multipleRecordLinks (inverse) | system | Inverse of all-match link | snapshot L596–601 |
| `Duplicate Match Strength` | singleSelect | Lambda | `Exact SHA-256 Hash` when hash match | snapshot L453–458 |
| `Duplicate Match Notes` | multilineText | Lambda | Machine notes; optional global-match note | snapshot L459–463 |
| `Duplicate Checked At` | dateTime | Lambda | Last classification timestamp | snapshot L464–469 |
| `Duplicate Check Error` | multilineText | Lambda | Lookup/classification partial-failure diagnostics | snapshot L470–474 |

### 1.3 Automated review classification (Lambda writer)

| Field | Type (DEV) | Writer | Authoritative meaning |
|-------|------------|--------|----------------------|
| `Potential Asset Reuse?` | checkbox | Lambda | Same-enrollment contextual warning → **review queue** | snapshot L528–533; policy §11.3 |
| `Asset Reuse Review Primary Reason` | singleSelect | Lambda | Highest-severity reason code | snapshot L534–539 |
| `Asset Reuse Review Reasons` | multipleSelects | Lambda | All triggered reason codes | snapshot L540–545 |
| `Asset Reuse Review Summary` | multilineText | Lambda | Plain-language current vs prior comparison | snapshot L546–550 |

**Primary / multiselect reason options (DEV — match code):**  
`Same Assignment Resubmission`, `Different Assignment Reuse`, `Different Week Reuse`, `Different Submission Reuse`, `Cross-Type Reuse`, `Homework Used for Video Feedback`, `Video Feedback Used for Homework`, `Missing Context`, `Multiple Prior Uses`, `Cross-Enrollment Match — Informational`.

### 1.4 Operator decision + audit (Mike / 116)

| Field | Type (DEV) | Writer | Authoritative meaning |
|-------|------------|--------|----------------------|
| `Asset Reuse Decision` | singleSelect | **Mike / OMNI only** | Final judgment; Lambda must not overwrite nonblank decisions on retry | snapshot L551–556 |
| `Asset Reuse Reviewed At` | dateTime | Mike | Last human decision timestamp | snapshot L557–562 |
| `Asset Reuse Reviewed By` | singleLineText | Mike | Reviewer identity | snapshot L563–567 |
| `Asset Reuse Review Notes` | multilineText | Mike + 116 append | Free-text + `[C-023-S5]` audit lines | snapshot L568–572 |
| `Duplicate Resolution Applied?` | checkbox | 116 | Consequence workflow ran | snapshot L573–578 |
| `Duplicate Resolution Applied At` | dateTime | 116 | When consequences applied | snapshot L579–584 |
| `Duplicate Resolution Error` | multilineText | 116 | Apply failure message | snapshot L585–589 |

**`Asset Reuse Decision` options (DEV):** `Not Reviewed`, `Allowed — Legitimate Reuse`, `Allowed — Correction/Resubmission`, `Confirmed Duplicate`, `Unable to Determine`, `Resolved — Duplicate Record Error`.

**Not in DEV snapshot (optional per 116):** `Duplicate Resolution Last Applied Decision` — 116 falls back to `[C-023-S5-LAST]` prefix in `Asset Reuse Review Notes` ([C-023-dev-stage5-duplicate-consequences.md](./C-023-dev-stage5-duplicate-consequences.md)).

### 1.5 Legacy duplicate fields (retain; writer semantics changing)

| Field | Type (DEV) | Stage 1 rule |
|-------|------------|--------------|
| `File is Duplicate?` | checkbox | **Deprecate Lambda writer** — conflates global hash + review (policy §11.1) |
| `Duplicate File Status` | singleSelect | Technical only if written; **not** sole queue driver |
| `Duplicate Review Status` | singleSelect | Legacy submission-adjacent semantics — **do not write from Lambda** |

**`Duplicate File Status` options (DEV):** `Not Checked`, `Unique`, `Exact Duplicate`, `Possible Duplicate`, `Allowed Reuse`, `Needs Review`, `Error`.

**`Duplicate Review Status` options (DEV):** `Not Reviewed`, `Needs Review`, `Confirmed Duplicate`, `Not Duplicate`, `Allowed Reuse`.

### 1.6 Context fields (intake — read-only for Lambda classification)

Used for same-enrollment contextual comparison (policy §3.2, §7.1). All confirmed on DEV snapshot:

| Field | Type | Role |
|-------|------|------|
| `Enrollment - Linked` | link → Enrollments | Scope partition |
| `Submission - Linked` | link → Submissions | Submission scope |
| `Homework Completions` | link | Assignment scope (homework) |
| `Video Feedback` | link | VF scope |
| `Asset Type` | singleSelect | Cross-type detection |
| `Asset Purpose` | singleSelect | HW1/HW2/VF/headshot |
| `Asset Slot` | singleSelect | HW1/HW2/VIDEO-* |
| `Week` | lookup (from Submission) | Week dimension |
| `Date` | lookup (Activity Date from Submission) | Activity date |
| `Homework Name - Slot Correct` | formula | Assignment name |
| `Source Attachment ID` | singleLineText | Intake identity |
| `Original File Name` | singleLineText | Display / comparison |
| `Athlete Full Name` | lookup | Review UI |

### 1.7 DEV gaps (OMNI follow-up — not new Lambda fields)

Per policy §19 and T4 audit; **not present** in DEV snapshot export:

| Item | Status | Owner |
|------|--------|-------|
| Prior-use **lookup fields** from `Duplicate Match Record` | **MISSING** | OMNI |
| View `Asset Reuse — Pending Review` | **MISSING** | OMNI |
| View `Asset Reuse — Reviewed` | **MISSING** | OMNI |
| Interface `Asset Reuse Review` | Not verifiable via Metadata API | Mike confirms in UI |
| HC/VF `Linked Asset Reuse Decision` + `Activity XP Display Label` | Documented in Stage 5; not in Submission Assets snapshot | OMNI / schema setup script |

---

## 2. Downstream tables (read paths)

| Table | Field | Type | Role | Source |
|-------|-------|------|------|--------|
| Homework Completions | `Linked Asset Reuse Decision` | lookup → Submission Assets.`Asset Reuse Decision` | Student/coach display | Stage 5 doc |
| Video Feedback | `Linked Asset Reuse Decision` | lookup → Submission Asset.`Asset Reuse Decision` | Student/coach display | Stage 5 doc |
| Homework Completions | `Activity XP Display Label` | formula | `Confirmed Duplicate — 0 XP` when applicable | Stage 6 §2.5 |
| Video Feedback | `Activity XP Display Label` | formula | Same | Stage 6 §2.5 |
| XP Events | `Active?`, `Duplicate Status`, `Source Key` | various | 116 deactivate/restore | automation 116 CONFIG |
| Enrollments | `Level Recalc Needed?` | checkbox | 116 sets after XP change | automation 116 CONFIG |

---

## 3. Formula implications

### 3.1 Existing formulas — **no C-023 field references today**

DEV snapshot dependency section shows Submission Assets formulas depend on upload/intake fields only (`Upload Status`, `Google Drive File URL`, `Send to Make Trigger`, links, etc.). **None** reference `Potential Asset Reuse?`, hash fields, or `Asset Reuse Decision`.

| Formula | Depends on | C-023 impact |
|---------|------------|--------------|
| `Writeback Complete?` | `Upload Status`, Google Drive fields, `Uploaded At` | **No change required** for hash review; still Drive-centric (S3 cutover separate) |
| `Ready to Send to Make?` | Attachment, destination, HC/VF links | Unaffected by review flags |
| `Why Not Ready for Make?` | `Send to Make Trigger`, attachment, links | Unaffected |
| `Upload Ready?` | Attachment, `Asset Type`, enrollment | Unaffected |
| `Workflow Next Step` | Links, destination | Unaffected |
| `Ready for Homework Completion Script?` | Intake fields | Unaffected — 020 runs before upload |
| `Ready for Video Feedback Script?` | Intake fields | Unaffected — 013 runs before upload |

**Stage 1 rule:** Do **not** repoint existing formulas to C-023 fields without explicit backlog approval.

### 3.2 Recommended formula fields (OMNI — optional, not required for detection)

| Proposed use | Pattern | Purpose |
|--------------|---------|---------|
| Pending queue helper | `AND({Potential Asset Reuse?}, OR({Asset Reuse Decision} = "Not Reviewed", {Asset Reuse Decision} = BLANK()))` | View filter backup (policy §19 — blank vs `Not Reviewed`) |
| Reviewed helper | `AND({Potential Asset Reuse?}, {Asset Reuse Decision} != "Not Reviewed", {Asset Reuse Decision} != BLANK())` | Reviewed view |
| Global hash only (audit) | `{Exact Hash Match Found?}` | Ops audit view — cross-enrollment informational |

### 3.3 HC/VF display formula (Stage 5 — OMNI creates)

`Activity XP Display Label` should read `Linked Asset Reuse Decision` and emit neutral copy when `Confirmed Duplicate` ([C-023-dev-stage5-duplicate-consequences.md](./C-023-dev-stage5-duplicate-consequences.md)). **116** does not write this field.

---

## 4. View implications

### 4.1 Required OMNI views (missing on DEV)

| View name | Table | Filter (recommended) | Sort / group | Columns (minimum) |
|-----------|-------|-------------------|--------------|---------------------|
| **Asset Reuse — Pending Review** | Submission Assets | `Potential Asset Reuse?` = checked **AND** `OR({Asset Reuse Decision} = "Not Reviewed", {Asset Reuse Decision} = BLANK())` | `Uploaded At` desc | Athlete, Asset Purpose, Week, `Asset Reuse Review Primary Reason`, `Asset Reuse Review Summary`, `Duplicate Match Record`, `Canonical File URL` |
| **Asset Reuse — Reviewed** | Submission Assets | `Potential Asset Reuse?` = checked **AND** `AND({Asset Reuse Decision} != "Not Reviewed", {Asset Reuse Decision} != BLANK())` | `Asset Reuse Reviewed At` desc | Decision, Reviewed At/By, Summary, primary prior link |

**Critical filter note (policy §19):** Filtering only `Asset Reuse Decision = "Not Reviewed"` **hides** rows where Lambda has not yet written `Not Reviewed` (field blank). Always include `BLANK()`.

### 4.2 Optional ops views

| View | Filter | Use |
|------|--------|-----|
| Hash audit | `{Exact Hash Match Found?}` = true | Cross-enrollment informational matches |
| Upload errors | `{Upload Status} = "Error"` OR `{Duplicate Check Error}` not blank | Ops triage |
| Stuck Processing | `{Upload Status} = "Processing"` + age | Claim recovery (C-013) |

### 4.3 Metadata API limitation

`views_appTetnuCZlCZdTCT_20260710_052425.md` reports views endpoint unavailable — view inventory is **UI-only** confirmation. Policy §19 noted only **4** table views in metadata at Stage 3; C-023 review views were not among them.

---

## 5. Automation trigger implications

Canonical map: [automation-trigger-map.md](../../airtable/schema/current/automation-trigger-map.md).

### 5.1 Automation 116 — Apply Asset Reuse Decision Consequences

| Item | Value |
|------|-------|
| **Trigger** | Submission Assets · **When record updated** · watched field **`Asset Reuse Decision`** |
| **Input** | `recordId` |
| **Reads** | `Asset Reuse Decision`, `Upload Destination`, HC/VF links, `Enrollment - Linked`, `Canonical File URL` (evidence), resolution/notes fields |
| **Writes** | `Duplicate Resolution Applied?`, `Applied At`, `Error`, `Asset Reuse Review Notes`; VF `Do Not Award XP?` / `Award Status`; HC `Award Status`; XP `Active?` / `Duplicate Status`; Enrollment `Level Recalc Needed?` |
| **Does NOT** | Run on upload; read hash fields; block upload; delete S3 or records |
| **C-023 coupling** | **Downstream only** — fires when Mike sets `Confirmed Duplicate` (or reversal decisions) |

**Stage 1 implication:** Lambda may set `Potential Asset Reuse?` on upload; **116 does not fire** until Mike changes `Asset Reuse Decision` away from `Not Reviewed`/blank.

### 5.2 Automation 022 — Sync child upload writeback

| Item | Value |
|------|-------|
| **Trigger** | Submission Assets · `Upload Status` ∈ {`Uploaded`, `Processing`, `Error`} + child linked |
| **Reads** | `Upload Status`, Google Drive fields, `Uploaded At`, `Upload Error`, destination, HC/VF links |
| **Writes** | HC/VF: `Upload Status`, Drive URLs/IDs, `Upload Error`, `Uploaded At`, `Writeback Complete?` (HW) |
| **Does NOT** | Read/write C-023 review or hash fields; sync `Canonical File URL` today |
| **C-023 coupling** | **None** — asset reaches `Uploaded` with `Potential Asset Reuse?` = true still triggers 022 sync |

**Stage 1 implication:** Pending reuse review does **not** block child writeback. S3 canonical sync to HC/VF is a separate C-013 slice.

### 5.3 Automation 070a — Send homework asset payload to Make

| Item | Value |
|------|-------|
| **Trigger** | Submission Assets · `Send to Make Trigger` checked + homework ready (`Ready to Send to Make?` = `READY_TO_SEND`) |
| **Reads** | Attachment, destination, HC link/RID, `Upload Status`, Drive URL/ID (legacy duplicate guard), `Canonical File URL` (writeback verify) |
| **Writes** | `Upload Error`; clears `Send to Make Trigger` on verified Lambda JSON; **does not** set `Processing` (Option A) |
| **Does NOT** | Read `Potential Asset Reuse?` or review reasons; block on hash match |
| **Legacy guard** | Blocks re-send when **Google Drive File URL/ID** already present — **not** SHA-256 duplicate detection |
| **Writeback verify** | Expects `Canonical File URL`, `Storage Key`, `File Content Hash`, `File Hash Algorithm` from Lambda response (homework contract) |

**Stage 1 implication (LEAD baseline):** DEV homework E2E **PASS** via sync Lambda JSON; 070c not required on current path. Hash + review fields populated by Lambda **after** 070a fires; 070a does not gate on reuse flags.

### 5.4 Pipelines that continue during pending review (locked v1)

Per policy §12.1 and Stage 6 §4:

| Pipeline | Behavior when `Potential Asset Reuse?` = true, decision not reviewed |
|----------|-----------------------------------------------------------------------|
| 020 → 063–065 (homework XP) | Continues |
| 013 → 111–114 (video XP) | Continues |
| 022 child sync | Continues on `Uploaded` |
| 071 / 073 parent email | Not auto-blocked by reuse flag alone |
| 116 consequences | **Does not run** until Mike confirms duplicate |

---

## 6. Self-link graph (DEV)

Submission Assets self-links (snapshot warnings):

```
Current asset ──Duplicate Match Record──► Primary prior asset (single)
Current asset ──Duplicate Match Records (All)──► All same-enrollment priors
Inverse: From field: Duplicate Match Record / (All)
```

OMNI prior-use lookups should source **from** `Duplicate Match Record` only (policy §11.6).

---

## 7. Schema citation index

| Claim | Primary source |
|-------|----------------|
| 16 C-023 fields exist on DEV | policy §19; snapshot `schema_doc_*_20260710_052425.md` |
| Field types and select options | snapshot lines cited above |
| Locked upload/review behavior | [C-023-production-duplicate-policy.md](./C-023-production-duplicate-policy.md) |
| Authoritative field writers | [C-023-stage6-production-readiness-checklist.md](./C-023-stage6-production-readiness-checklist.md) §2 |
| 116 trigger and fields | [automation-trigger-map.md](../../airtable/schema/current/automation-trigger-map.md); `116-*.js` CONFIG |
| 022 / 070a field surfaces | `022-*.js`, `070a-*.js`, `lib/070a-homework-upload-contract.js` (read-only) |
| OMNI gaps | policy §19; T4 audit R1 |

---

## 8. Stage 1 open items (schema/OMNI only)

- [ ] Mike builds Pending + Reviewed views per §4.1
- [ ] Mike creates prior-use lookups from `Duplicate Match Record` per policy §11.6
- [ ] Mike builds Interface per [C-023-dev-omni-stage1-instructions.md](./C-023-dev-omni-stage1-instructions.md)
- [ ] Confirm HC/VF display fields per Stage 5 doc (if not already on DEV)
- [ ] Lead commits `c023-stage3-verify-dev` snapshot when approved (currently untracked)

---

*Worker A · Overnight V2 Stage 1 · docs-only · no automations edited*
