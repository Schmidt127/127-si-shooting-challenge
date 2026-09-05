# SC-163 — Goal Met Date (schema + Automation 066 + backfill)

**Status:** **COMPLETE / Live Tested** (2026-09-05)  
**Backlog:** SC-163  
**Production base:** `appn84sqPw03zEbTT`  
**Live + GitHub:** Automation **066 v4.1** aligned; 066 may remain **ON**

**Rule:** Production changes are not official until this document exists in GitHub. See [v2/04 § Official promotion documentation](../v2/04-ai-development-standards.md#official-promotion-documentation-required).

**Closeout evidence:** [`../audits/SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md`](../audits/SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md)

---

## Live proof summary (2026-09-05)

| Check | Result | Done |
|---|---|---|
| Goal Met Date cleared before valid retest | Yes | [x] |
| 066 v4.1 stamp | **8/30/2026** | [x] |
| Retry | Preserved **8/30/2026**; no overwrite | [x] |
| Duplicate milestones | None | [x] |
| Field type | Date-only (time off) | [x] |
| 066 ON after proof | Allowed | [x] |

---

## Live regression (fixed in 066 v4.1)

Athlete1 Schmidt live test failed with a **double date shift**:

| Step | What happened |
|---|---|
| Truth | Counted 1,000 + 1,500 on Activity Date **2026-08-30**; target 2,000 → crossing = **2026-08-30** |
| Bug 1 | 066 v4.0 took Activity Date as UTC midnight (`2026-08-30T00:00:00.000Z`) and converted through America/Denver → key **2026-08-29** |
| Bug 2 | Field was **dateTime** (not date-only). Writing `2026-08-29` stored `2026-08-29T00:00:00.000Z` → UI showed **8/28/2026 6:00 PM** |

**Fix:** 066 **v4.1** preserves date-only Activity Dates via `getCellValueAsString` / `toDateKeyFromText` / `preserveActivityDateKeyFromRecord` — never TZ-converts YYYY-MM-DD. Historical backfill was **not** part of this correction.

---

## What this fixes

`Goal Met Date` must be a writable **date-only** field (not award lookup, not dateTime). Product rule: first **Activity Date** the athlete’s counted shots crossed the target. Paste **066 v4.1**.

**Capacity:** Do **not** create Automation 122. Goal Met Date is owned by **066**.

---

## Ownership rule (final)

| Field | Meaning |
|---|---|
| **Goal Met?** | Formula: live `Total Shots Counted >= Target Goal Shots` — **do not change** |
| **Goal Met Date** | Writable **date-only**: first counted-submission Activity Date that crossed the target. Blank until met. Never overwrite once correct. |
| **Award Recipients.Date Awarded** | Conquered Goal gift-card fulfillment — keep separate |

| Automation | Role |
|---|---|
| **010** | After successful submission reconciliation, sets `Run Shot Milestone Check?` |
| **066 v4.1+** | Milestone unlocks **and** Goal Met Date stamp (isolated; date-key preserving) |
| **122** | **SUPERSEDED** — do not install |

---

## Schema checklist (completed)

| # | Check | Exact requirement | Done |
|---|--------|-------------------|------|
| S1 | Field | Enrollments → **Goal Met Date** (`fldohCsXsrU4hYqrJ`) | [x] |
| S2 | Type | **Date** (not lookup, not formula, not created time) | [x] |
| S3 | Include a time field | **OFF / disabled** — must **not** be dateTime | [x] |
| S4 | Date format | Local / US `M/D/YYYY` | [x] |
| S5 | Writable | Automations can write the field | [x] |
| S6 | Description | `SC-163: first Activity Date counted shots crossed Target Goal Shots. Blank until met. Never overwrite.` | [x] |

---

## Mike correction + retest sequence (completed)

### Step A — Schema

| # | Action | Done |
|---|--------|------|
| A1 | Confirm Goal Met Date is **date-only**, Include time = **off** | [x] |
| A2 | If dateTime: change to Date, time disabled | [x] |

### Step B — Clear wrong Athlete1 stamp

| # | Action | Done |
|---|--------|------|
| B1 | Open Athlete1 Schmidt Enrollment | [x] |
| B2 | Clear **Goal Met Date** | [x] |
| B3 | Confirm cell is blank | [x] |

### Step C — Paste Automation 066 v4.1

| # | Action | Exact | Done |
|---|--------|-------|------|
| C1 | Open **066** (`wflSMXHrUoFZEBLqf`) | Trigger unchanged: `Run Shot Milestone Check?` checked | [x] |
| C2 | Paste script | `066-achievements-and-milestones-create-shot-milestone-unlocks.js` — skip GitHub header | [x] |
| C3 | Confirm version | **v4.1** | [x] |
| C4 | Map outputs | `goalMetDateActionOut`, `goalMetDateOut` (+ existing outputs) | [x] |
| C5 | Do **not** install Automation 122 | | [x] |
| C6 | Do **not** run backfill for this fix | | [x] |

### Step D — Disposable live retest (Schmidt)

| # | Test | Expected | Done |
|---|------|----------|------|
| D1 | Clear Goal Met Date then run 066 | Stamp **2026-08-30** / UI **8/30/2026** | [x] |
| D2 | UI Goal Met Date | **8/30/2026** | [x] |
| D3 | Retry | Date unchanged; no duplicate milestones | [x] |
| D4 | Leave 066 ON | Allowed after PASS | [x] |

### Step E — Migration backfill (optional hygiene — not required for closeout)

Backfill remains available for other enrollments. **Not required** for SC-163 **COMPLETE / Live Tested**.

---

## Rollback

1. If Goal Met Date writes must stop: turn 066 OFF or re-paste prior body without Goal Met Date step.  
2. Do **not** convert Goal Met Date back to award lookup.  
3. Never install Automation 122.

---

## Evidence

- Live closeout: [`../audits/SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md`](../audits/SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md)  
- Reliability audit: [`../audits/SC-163-GOAL-MET-DATE-RELIABILITY.md`](../audits/SC-163-GOAL-MET-DATE-RELIABILITY.md)  
- Offline regression: `airtable/automations/shooting-challenge/lib/sc-163-goal-met-date.test.js`
