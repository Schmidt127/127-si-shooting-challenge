# Field Map

Field-level reference for critical tables. Keep names aligned with live Airtable; use this doc when writing automations, formulas, and Make mappings.

> **Convention:** `{Field Name}` = exact Airtable field name. Update when production differs.

## Athletes

| Field | Type | Purpose | Notes |
|-------|------|---------|-------|
| Athlete Name | Single line text | Display name | PK / primary label |
| Enrollment Status | Single select | Active, Paused, Alumni | Gates automations |
| Total XP | Rollup or formula | Cached total from XP Events | Prefer rollup sum |
| Current Level | Lookup / formula | From Levels table | |
| Current Streak | Number / formula | Consecutive submission days | |
| Parent Email | Email / lookup | Make email scenarios | |
| Coach | Link | Primary coach | |

## Submissions

| Field | Type | Purpose | Notes |
|-------|------|---------|-------|
| Athlete | Link | Required parent | |
| Submission Date | Date | When recorded | Timezone: *(specify)* |
| Makes | Number | Shots made | |
| Attempts | Number | Total attempts | |
| Challenge Type | Single select / link | Which challenge | Drives XP rules |
| XP Awarded | Checkbox / number | Idempotency flag | Set when XP Event created |
| Source | Single select | Form, Coach entry, Import | |

## Submission Assets (C-013 / C-023 — Wave 7)

> **Ownership:** one writer per field (C-012 lite). Baselines: [c013-dev-baseline-before-fields.json](../../../tools/airtable/_preview/c013-dev-baseline-before-fields.json) · [c013-dev-baseline.json](../../../tools/airtable/_preview/c013-dev-baseline.json)  
> **Gate:** Slice 1 complete only when **Mike confirms** both new fields on DEV. Do not repoint formulas/automations until Make S3 writeback proven.

| Field | Type | Writer | Readers | Notes |
|-------|------|--------|---------|-------|
| Canonical File URL | URL (preferred) | Make S3 upload / writeback | **022**, coach views, **071/073**, audits, future web | **OMNI: missing on DEV** — add DEV only first |
| Storage Key | Single line text | Make S3 upload / writeback | Audits, C-023 duplicate detection, repair tools | **OMNI: missing on DEV** — add DEV only first |
| File Content Hash | Single line text | Future S3/Make hash step (Slice 2) | C-023 dedupe audit, duplicate lookups | Exists on DEV; not populated until upload wired |
| File Hash Algorithm | Single select (`SHA-256`) | Future S3/Make hash step (Slice 2) | C-023 dedupe audit | Exists on DEV |
| Upload Status | Single select | **009**, **020**, **013**, **070a/b**, Make | **070** triggers, formulas, views | Exists — do not change ladder |
| Airtable Attachment | Attachment | **009** (intake copy) | **020**, **013**, **070a/b** | **Transient intake/source only** — do not clear until Slice 4 |
| Google Drive File URL | Single line text (DEV) | Make Drive engine (legacy) | **022**, **Writeback Complete?**, views | **Legacy bridge** — do not delete until S3 cutover verified |

## XP Events

| Field | Type | Purpose | Notes |
|-------|------|---------|-------|
| Athlete | Link | Recipient | |
| Points | Number | XP delta (+/-) | |
| Event Type | Single select | Submission, Homework, Bonus, Adjustment | |
| Source Record | Link | Submission or Homework | Audit trail |
| Dedupe Key | Single line text | `{athleteId}-{source}-{rule}` | Prevent duplicates |
| Created At | Created time | Audit | |

## Homework

| Field | Type | Purpose | Notes |
|-------|------|---------|-------|
| Athlete | Link | Assignee | |
| Due Date | Date | | |
| Status | Single select | Assigned, Submitted, Reviewed, Complete | |
| Video URL | URL | Google Drive link | Often set by Make |
| Coach Feedback | Long text | | |
| XP Awarded | Checkbox | Idempotency | |

## Weekly Summaries

| Field | Type | Purpose | Notes |
|-------|------|---------|-------|
| Athlete | Link | | |
| Week Start | Date | ISO week anchor | |
| Submissions Count | Number / rollup | | |
| Total Makes | Number | | |
| XP Earned | Number | | |
| Email Sent | Checkbox | Make idempotency | |
| Summary Text | Long text | Email body snippet | |

## Formula & Rollup Index

Document non-obvious formulas in [../../formulas/README.md](../../formulas/README.md). List field names here for quick lookup:

| Field | Table | Type | Doc link |
|-------|-------|------|----------|
| | | | |

## Change Log (Field Level)

| Date | Table | Field | Change |
|------|-------|-------|--------|
| 2026-07-07 | Submission Assets | Canonical File URL, Storage Key | OMNI confirmed missing on DEV; ownership + before-fields baseline |
| 2026-07-07 | Submission Assets | File Content Hash, Upload Status, … | C-013 — existing fields protected; baseline probe |
