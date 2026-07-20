# C-025 Stage 17 — PROD Automation 117 verification (2026-07-20)

**Backlog ID:** C-025  
**PROD base:** `appn84sqPw03zEbTT`  
**Automation:** `117 - Zoom Recording Credit - Orchestrator`  
**Script version:** **v1.1.1**  
**Paste source:** [C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt](./C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt)  
**Mode:** Mike-authorized PROD verification close-out (documentation)  
**Stage 17 status:** **COMPLETE** (2026-07-20)  
**Permanent enable:** **Yes — 117 / 057 / 042 ON** (after this verification); **101** unchanged; **`webhookUrl` blank**

**Companions:**

- [Final rollout checklist](./C-025-stage17-prod-final-rollout-checklist.md)
- [Automation enable order](./C-025-stage17-automation-enable-order.md)
- [Current PROD progress](../status/C-025-stage17-current-prod-progress.md)
- [PROD live / COMPLETE](./C-025-stage17-prod-live-2026-07-20.md)

---

## Verdict

# PASS — Creation + idempotency (controlled smoke)

Automation **117 v1.1.1** created the expected recording XP Event and returned **`skipped_exists`** on the second run against the same Zoom Attendance row.

**Historical note:** During this controlled smoke, 117 was returned **OFF** between runs. **Stage 17 is now COMPLETE** with **117 / 057 / 042 ON** (see [prod-live](./C-025-stage17-prod-live-2026-07-20.md)).
---

## Fixture records

| Role | Record ID | Notes |
|------|-----------|--------|
| Zoom Attendance (recording) | `recfqsgM7zDobxsPf` | Trigger record for both runs |
| XP Event (recording) | `recOceuW34jQz7suD` | Created on first run |
| Enrollment (expected) | `recgP9qZYjAhE7NXm` | Schmidt Testing — from Source Key |
| Zoom Meeting (expected) | `reczeUT0AJUWMmEOb` | From Source Key |

**Source Key:** `ZOOM_CREDIT|recgP9qZYjAhE7NXm|reczeUT0AJUWMmEOb`

---

## Run 1 — Creation

| Check | Expected | Result |
|-------|----------|--------|
| XP Points | **30** | **PASS** |
| XP Bucket | `Zoom Attendance` | **PASS** |
| XP Source | `Zoom Meeting Recording Quiz` | **PASS** |
| Source Key | `ZOOM_CREDIT\|recgP9qZYjAhE7NXm\|reczeUT0AJUWMmEOb` | **PASS** |
| Enrollment linked | `recgP9qZYjAhE7NXm` | **PASS** |
| Zoom Meeting linked | `reczeUT0AJUWMmEOb` | **PASS** |
| Zoom Attendance linked | `recfqsgM7zDobxsPf` | **PASS** |
| Active? | checked | **PASS** |
| Awarded By | `117-orchestrator-v1.1.1` | **PASS** |
| Second XP Event for same key | none | **PASS** (one row) |

---

## Run 2 — Idempotency

| Check | Expected | Result |
|-------|----------|--------|
| Re-trigger target | Same ZA `recfqsgM7zDobxsPf` | Done |
| `actionOut` | `skipped_exists` or `updated` | **`skipped_exists`** — **PASS** |
| XP Event count for Source Key | still **1** | **PASS** |
| Same XP Event id | `recOceuW34jQz7suD` | **PASS** |
| No new `ZOOM_CREDIT|…` row | true | **PASS** |

---

## PROD formula fix — `Zoom Meetings.Effective Recording XP Percentage`

**Problem:** Preferring Program Config rollup solely via `{Program Config: Recording XP %} != BLANK()` can select Program Config when the **Program Config link is empty** (or otherwise unreliable), preventing a clean Global Config fallback.

**Rule (PROD applied):** Use Program Config XP percentage **only when** `Config (Program Scope)` is populated; otherwise fall back to Global Config (then default **50**). Meeting override still wins first.

**Authoritative field-name formula** (also updated in [formula build order § C10](./C-025-stage17-formula-build-order.md)):

```airtable
IF(
  {Recording XP Percentage — Meeting Override} != BLANK(),
  {Recording XP Percentage — Meeting Override},
  IF(
    AND(
      {Config (Program Scope)} != BLANK(),
      {Program Config: Recording XP %} != BLANK()
    ),
    {Program Config: Recording XP %},
    IF(
      {Global Config: Recording XP %} != BLANK(),
      {Global Config: Recording XP %},
      50
    )
  )
)
```

**Expected with live base 60 × 50%:** recording XP = **30** (matches Run 1).

---

## Safety state after verification

At verification smoke time 117 was OFF between controlled runs. **Stage 17 is COMPLETE:** 117 / 057 / 042 are **ON**; 101 unchanged; webhook blank. See [prod-live](./C-025-stage17-prod-live-2026-07-20.md).

