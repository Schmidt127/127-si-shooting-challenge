# WAS Uniqueness Contract — Agent 9

**Generated:** 2026-07-24  
**Table:** Weekly Athlete Summary  
**Related:** SC-007, SC-016, SC-049 · CORE-UNIQUENESS overnight audit

---

## 1. Canonical identity (exactly one)

| Contract | Value |
|----------|-------|
| Logical identity | **Enrollment + Week** |
| Formula identity | `Summary Key` = Enrollment Key + `|` + Week Key (formula) |
| Script write rule | **Never write** `Summary Key` |
| Create payload | Writable links only: `Enrollment`, `Week` (+ optional status fields) |
| Cardinality | Exactly **one** WAS row per Enrollment+Week |

Any second row for the same Enrollment+Week is a **duplicate defect**, even if `Summary Key` display is blank (orphan/legacy pollution).

---

## 2. Creator audit

### 2.1 Automation 031 — Find or Create WAS from Submission

| Check | Status |
|-------|--------|
| Script | `031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js` v3.1 |
| Trigger | Submissions · Count This Submission? · WAS empty |
| Lookup-before-create | **Yes** — builds target Summary Key; finds matching WAS; also validates Enrollment+Week |
| Summary Key usage | **Read** formula; never write |
| Race window | **Yes** — classic check-then-create between concurrent 031 runs or vs 101/118 |
| Retry behavior | Throws on duplicate Summary Key matches; links submission when found |
| Record-linking | Submission ↔ WAS bidirectional; repairs orphan XP Events for same Enrollment+Week |
| Transaction limitations | Airtable scripting has **no** multi-record transaction / unique index |
| Duplicate cleanup | Detect + throw; **no** auto-merge |
| Classification | `authoritative_writer` (submission-driven) |

### 2.2 Automation 101 — Live Zoom XP (`findOrCreateWeeklySummaryId`)

| Check | Status |
|-------|--------|
| Script | `101-zoom-attendance-xp-award-meeting-xp.js` v5.5 |
| When | Side-effect while awarding live meeting XP |
| Lookup-before-create | **Yes** — `findWeeklySummaryId(enrollmentId, weekId)` filters Enrollment+Week |
| Summary Key usage | **Not primary** — matches by Enrollment+Week links (not Summary Key string) |
| Race window | **Yes** — if 031 and 101 both miss then create |
| Retry behavior | Throws if multiples already exist for Enrollment+Week |
| Record-linking | Links new/existing WAS onto XP Event |
| Transaction limitations | Same — no unique constraint |
| Duplicate cleanup | Throw on multiples; no merge |
| Classification | XP = authoritative; WAS create = `duplicate_risk` side-effect |

### 2.3 Automation 118 — Schedule weekly summary email build

| Check | Status |
|-------|--------|
| Script | `118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js` v1.2 |
| Trigger | Sunday 5:00 AM America/Denver batch |
| Lookup-before-create | **Yes** — maps by Summary Key when present, else Enrollment for target week |
| Summary Key usage | Prefers Summary Key map; builds expected `enrollmentKey\|weekKey` |
| Race window | **Yes** vs 031/101 during batch |
| Retry behavior | Skips duplicate map entries (`duplicateWasSkipped`); creates if missing then arms Build |
| Record-linking | Creates Enrollment+Week only; arms `Build Weekly Email Now?` |
| Transaction limitations | Batch loop still check-then-create per enrollment |
| Duplicate cleanup | Skips extras in map; does not delete duplicates |
| Expected state | **OFF** until Mike authorizes schedules |
| Classification | `duplicate_risk` / keep off |

---

## 3. Race model (honest)

```
T0: Writer A lookup → none
T0: Writer B lookup → none
T1: Writer A create WAS(E,W)
T1: Writer B create WAS(E,W)   ← duplicate possible
```

Airtable automations cannot lock Enrollment+Week. Mitigation options (future work — **not implemented by this agent**):

1. Keep **118 OFF**; reduce concurrent creators  
2. Prefer link-only on 101 if WAS missing (product change)  
3. Ops cleanup views for Enrollment+Week duplicates  
4. Schema unique constraint if/when Airtable supports it for this pair  

---

## 4. Live evidence (PROD post-reset, overnight)

| Check | Result |
|-------|--------|
| Schmidt Enrollment `recgP9qZYjAhE7NXm` + Week `recVDKiYATgzsfpmE` | Exactly **1** WAS `rechWp330MqSgRWzN` despite **3** Submissions |
| Orphan WAS (empty Enrollment) | Legacy pollution exists (~392 historically) — noise for Week-scoped scans |
| Concurrent race simulation | **Not run** |

---

## 5. Contract tests (repo harness)

The automation-ownership harness statically verifies:

- 031/101/118 contain lookup-before-create patterns  
- None of 031/101/118 write `Summary Key` as a create field assignment targeting the formula  
- Inventory classifies 118 as expected OFF  

Live uniqueness remains Mike-attested + future concurrent tests.

---

## 6. Operator rules

1. Do not manually create a second WAS for an Enrollment+Week that already exists.  
2. Do not paste/enable **118** until race policy approved.  
3. If duplicates appear: stop writers, merge links onto the keeper, archive/delete extras (manual/OMNI).  
4. Never script-write `Summary Key`.  
