# Field Map (pointer)

> **Canonical field ownership & contracts:**  
> - [`docs/next-wave/data-model/FIELD-OWNERSHIP-MATRIX.md`](../../../docs/next-wave/data-model/FIELD-OWNERSHIP-MATRIX.md)  
> - [`docs/next-wave/data-model/UNIQUE-KEY-AUDIT.md`](../../../docs/next-wave/data-model/UNIQUE-KEY-AUDIT.md)  
> - [`docs/next-wave/automation-ownership/xp-source-key-registry.json`](../../../docs/next-wave/automation-ownership/xp-source-key-registry.json)  
> - [`docs/next-wave/reliability-audit-2026-07-24/FIELD-OWNERSHIP-AUDIT.md`](../../../docs/next-wave/reliability-audit-2026-07-24/FIELD-OWNERSHIP-AUDIT.md)  
> - PROD schema doc in `../snapshots/prod-foundation-reset-20260723-post-ts/`

## Quick identity contracts (verified against 2026-07-23 snapshot)

| Table | Field | Type | Contract |
|-------|-------|------|----------|
| Enrollments | Enrollment Key | formula | `{Athlete ID Lookup}\|{School Year}` |
| Weeks | Week Key | formula | `RECORD_ID()` — **not** `2026-2027\|Week N` |
| Weeks | Week Name | text (primary) | Human label (`Week 0` … `Post-Challenge`) |
| WAS | Summary Key | formula | `{Enrollment Key - Lkp}\|{Week Key - Lkp}` |
| XP Events | Source Key | text | Script-written; see registry |
| XP Events | XP Dedupe Key / Normalized | formula | Never write |
| Unlocks | Unlock Key | formula | Never write |
| Unlocks | Milestone Source Key | text | `SHOT_MILESTONE\|…` via 066 |

## Weekly email fields (WAS)

See WAS architecture + ownership matrices: Build?, Ready?, Send to Make?, Sent?, Make Send Status, sendMode, package fields.

**Verified PROD (2026-07-24):** 074 sendMode **Live** (never fixed Test); Make Live writeback PASS; **118 and 119 schedules ON** (Sun 5:00 / 10:00 AM America/Denver).

## Submission Assets (C-013)

Ownership notes for Canonical File URL / Storage Key / Drive bridge remain valid; prefer snapshot for live types.
