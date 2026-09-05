# SC-163 — Goal Met Date (schema + Automation 066 + backfill)

**Status:** **HOLD — Production 066 OFF** until v4.1 paste + schema date-only verified  
**Backlog:** SC-163  
**Production base:** `appn84sqPw03zEbTT`  
**Do not turn 066 ON or run further live tests until corrected**

**Rule:** Production changes are not official until this document exists in GitHub. See [v2/04 § Official promotion documentation](../v2/04-ai-development-standards.md#official-promotion-documentation-required).

---

## Live regression (2026-09-05) — fixed in 066 v4.1

Athlete1 Schmidt live test failed with a **double date shift**:

| Step | What happened |
|---|---|
| Truth | Counted 1,000 + 1,500 on Activity Date **2026-08-30**; target 2,000 → crossing = **2026-08-30** |
| Bug 1 | 066 v4.0 took Activity Date as UTC midnight (`2026-08-30T00:00:00.000Z`) and converted through America/Denver → key **2026-08-29** |
| Bug 2 | Field was **dateTime** (not date-only). Writing `2026-08-29` stored `2026-08-29T00:00:00.000Z` → UI showed **8/28/2026 6:00 PM** |

**Do not run backfill as part of this correction.** Clear Athlete1’s wrong Goal Met Date manually before retest.

**Fix:** 066 **v4.1** preserves date-only Activity Dates via `getCellValueAsString` / `toDateKeyFromText` / `preserveActivityDateKeyFromRecord` — never TZ-converts YYYY-MM-DD.

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

## Schema checklist (required — date-only, time disabled)

| # | Check | Exact requirement | Done |
|---|--------|-------------------|------|
| S1 | Field | Enrollments → **Goal Met Date** (`fldohCsXsrU4hYqrJ`) | [ ] |
| S2 | Type | **Date** (not lookup, not formula, not created time) | [ ] |
| S3 | Include a time field | **OFF / disabled** — must **not** be dateTime | [ ] |
| S4 | Date format | Local / US `M/D/YYYY` | [ ] |
| S5 | Writable | Automations can write the field | [ ] |
| S6 | Description | `SC-163: first Activity Date counted shots crossed Target Goal Shots. Blank until met. Never overwrite.` | [ ] |

If live schema still reports **dateTime**, convert/fix to **date-only with time disabled** before pasting v4.1. A dateTime Goal Met Date will shift display even when the script stamps the correct calendar key.

---

## Mike exact correction + retest sequence

Keep **066 OFF** until S1–S6 and paste are done.

### Step A — Schema (if not already date-only)

| # | Action | Done |
|---|--------|------|
| A1 | Confirm Goal Met Date is **date-only**, Include time = **off** (table above) | [ ] |
| A2 | If currently dateTime: change to Date, time disabled | [ ] |

### Step B — Clear wrong Athlete1 stamp (manual; no backfill)

| # | Action | Done |
|---|--------|------|
| B1 | Open Athlete1 Schmidt Enrollment | [ ] |
| B2 | Clear **Goal Met Date** (currently shows ~8/28/2026 from v4.0 bug) | [ ] |
| B3 | Confirm cell is blank | [ ] |

### Step C — Paste Automation 066 v4.1

| # | Action | Exact | Done |
|---|--------|-------|------|
| C1 | Open **066** (`wflSMXHrUoFZEBLqf`) — keep OFF while pasting | Trigger unchanged: `Run Shot Milestone Check?` checked | [ ] |
| C2 | Paste script | `066-achievements-and-milestones-create-shot-milestone-unlocks.js` — skip GitHub header; paste from production docblock through end | [ ] |
| C3 | Confirm version | **v4.1** | [ ] |
| C4 | Map outputs | `goalMetDateActionOut`, `goalMetDateOut` (+ existing outputs) | [ ] |
| C5 | Do **not** install Automation 122 | | [ ] |
| C6 | Do **not** run backfill | | [ ] |

### Step D — Disposable live retest (Schmidt only)

| # | Test | Expected | Done |
|---|------|----------|------|
| D1 | Clear Goal Met Date (Step B) then check `Run Shot Milestone Check?` and turn 066 ON for one run | `goalMetDateActionOut=stamped`, `goalMetDateOut=2026-08-30` | [ ] |
| D2 | UI Goal Met Date | **8/30/2026** (not 8/29, not 8/28 6:00 PM) | [ ] |
| D3 | Re-check `Run Shot Milestone Check?` | `skipped_already_set`; date unchanged; no duplicate milestones | [ ] |
| D4 | Not-met athletes | Goal Met Date blank | [ ] |

**After D passes:** leave 066 ON only if Mike is satisfied. Otherwise turn OFF again.

### Step E — Migration backfill (later — not this correction)

Backfill remains available for other enrollments after v4.1 is proven. **Do not run it for this timezone fix.**

---

## Rollback

1. Keep 066 **OFF** if retest fails.  
2. Re-paste prior **066 v3.9** only if Goal Met Date writes must stop entirely.  
3. Do **not** convert Goal Met Date back to award lookup.  
4. Never install Automation 122.

---

## Evidence

- Reliability audit: [`../audits/SC-163-GOAL-MET-DATE-RELIABILITY.md`](../audits/SC-163-GOAL-MET-DATE-RELIABILITY.md)  
- Offline regression: `airtable/automations/shooting-challenge/lib/sc-163-goal-met-date.test.js` (Athlete1 1000+1500 → `2026-08-30`)
