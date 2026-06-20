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
| | | | |
