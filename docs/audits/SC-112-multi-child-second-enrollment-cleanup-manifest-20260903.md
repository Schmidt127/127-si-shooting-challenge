# SC-112 — Multi-child second enrollment cleanup manifest

**Date:** 2026-09-03  
**Agent:** Agent 1 (`verify/sc-112-multi-child-prod-a1`)  
**Base:** Production `appn84sqPw03zEbTT`  
**Purpose:** Disposable Active enrollment created for SC-112 multi-child auth verification.  
**Do not delete Weeks, schemas, automations, payment records, or secrets.**

---

## Authorized creation (this task)

| Entity | Record ID | Notes |
|--------|-----------|--------|
| Athlete | `rec0DOgWwzfDQxMaS` | First Name `VERIFY`, Last Name `VERIFY-SC112-20260903` |
| Enrollment | `recr3OaRi1HdFCB2V` | Active?=true; Program Instance `rec5mEM0YPqPqq0hZ`; School Year 2026-2027; Grade Band K-2 `recK7BDVSpHy2ipCS`; School `recvQPRTplZeTmV0Y` (same as Athlete1) |
| Parent email | *(approved school address — same as Athlete1)* | Required for multi-child resolve; omit from public docs |

## Protected — do not modify as cleanup of this fixture

| Entity | Record ID | Notes |
|--------|-----------|--------|
| Athlete1 athlete | `recTfxT6WMsPvobAW` | Pre-existing; leave intact |
| Athlete1 enrollment | `recZEwkkXTJanDlG6` | Pre-existing; leave intact |

## Pre-existing Active enrollment observed at create time (not created by this task)

| Entity | Record ID | Notes |
|--------|-----------|--------|
| Enrollment "Athlete 2" | `rec2UamYHzyc9ELd9` | Already Active; linked to **same** athlete as Athlete1 (`recTfxT6WMsPvobAW`). Not a distinct multi-child identity. Coordinator may decide later whether to deactivate/delete separately. |

## Email / queue (no send)

| Entity | Record ID | Action taken |
|--------|-----------|--------------|
| Email Handoff Queue | `rec6VgBXOtasiPbbH` | Handoff Key `WELCOME\|ENROLLMENTS\|recr3OaRi1HdFCB2V` created Ready (Test Mode?); **Status set to Cancelled** before Accepted/dispatch. Do not re-arm. |

---

## Suggested later cleanup (separate task; not executed here)

1. Confirm multi-child Production walkthrough complete.  
2. Optionally deactivate or delete enrollment `recr3OaRi1HdFCB2V`.  
3. Optionally delete athlete `rec0DOgWwzfDQxMaS` if unused.  
4. Leave queue row `rec6VgBXOtasiPbbH` Cancelled (or delete only if ops policy allows).  
5. Do **not** touch Athlete1 athlete/enrollment unless Mike directs.  
6. Decide fate of pre-existing `rec2UamYHzyc9ELd9` separately.

**Evidence JSON (IDs OK):** `docs/audits/SC-112-multi-child-second-enrollment-evidence-20260903.json`
