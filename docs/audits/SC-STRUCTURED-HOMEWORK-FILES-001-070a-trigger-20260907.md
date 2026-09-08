# SC-STRUCTURED-HOMEWORK-FILES-001 — 070a trigger & staging notes

**Date:** 2026-09-07  
**Repo:** `127-si-shooting-challenge`  
**Branch work:** Structured Curriculum file uploads via HC + Submission Assets  

---

## REQUIRED MANUAL Airtable step (not complete in this PR)

Live automation **070a** (`wflIYVOmRRaHu9cl2`) trigger still includes:

| Field | Operator | Effect |
|-------|----------|--------|
| `Submission - Linked` (`flddRCbWCegg4WCoZ`) | `isNotEmpty` | Blocks HC-only Structured Curriculum assets |

**Script gate (GitHub v4.8)** now allows blank Submission when:

- `Upload Destination` = `Homework Completions`, and  
- Homework Completions link **or** Homework Completions RID present, and  
- Enrollment - Linked present  

Legacy Daily Submission / Video Feedback paths still require Submission in the script.

**Until the live trigger condition is removed (or OR-grouped), HC-linked Curriculum assets will not fire 070a even though the script would accept them.**

### Operator checklist

1. Paste GitHub **070a v4.8** (and matching **070b** shared body) into Production / confirm draft.  
2. Edit 070a trigger: **remove** `Submission - Linked isNotEmpty` (keep Send to Make Trigger, Ready to Send to Make? contains READY_TO_SEND, Upload Status = Pending Link, Reviewer File URL empty, Upload Destination = Homework Completions, Enrollment - Linked present, Airtable Attachment present, Homework Completions present).  
3. Do **not** claim end-to-end Make upload complete until this trigger change is published and disposable-proofed.  
4. 070a may remain operationally OFF in Production; enabling it is a separate launch decision.

Evidence of prior trigger attestation: [`SC-156-070A-LIVE-TRUTH-AND-CHANGE-CONTRACT-20260904.md`](./SC-156-070A-LIVE-TRUTH-AND-CHANGE-CONTRACT-20260904.md).

---

## Staging store cleanup (disposable)

Curriculum staging uploads (`POST /shoot/api/curriculum/homework/upload-staging`) store bytes in:

1. Private S3 prefix `curriculum-staging/...` when `CURRICULUM_STAGING_S3_BUCKET` + AWS creds exist (optional `@aws-sdk/client-s3`), else  
2. Upstash Redis key `curriculum-upload-staging:{stagingId}` with **24h TTL**, else  
3. In-process memory Map (local/tests only)

Staging does **not** create permanent Submission Assets. Bind happens on final submit. Entries expire after 24h; consumed staging is marked but TTL still applies. No separate Airtable “Curriculum Upload Staging” table is required for v1.

---

## SA field mapping (Curriculum bind)

| Field | Value |
|-------|--------|
| Homework Completions | HC id |
| Enrollment - Linked | enrollment id |
| Submission - Linked | **blank** |
| Asset Purpose | `Homework 1` (→ Upload Destination = Homework Completions) |
| Asset Slot | `HW1` (schema singleSelect; not free-text) |
| Asset Label | `questionKey` (traceability) |
| Asset Type | MIME-inferred (`Homework Image` / `Homework PDF`) |
| Source Attachment ID | stable `curriculum:{sha256-prefix}` from HC+Attempt+questionKey+stagingId |
| Upload Status | Pending Link |
| Send to Make Trigger | armed after attachment present |

`file_upload` answers are **not** written as Homework Response rows; association is Asset Label = questionKey.
