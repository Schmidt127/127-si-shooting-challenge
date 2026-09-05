# SC-163 — Live verification closeout (2026-09-05)

**Status:** **COMPLETE / Live Tested**  
**Backlog:** SC-163  
**Production base:** `appn84sqPw03zEbTT`  
**Automation:** 066 — Create Shot Milestone Unlocks (+ Goal Met Date)  
**Live + GitHub version:** **v4.1** (aligned)  
**PR:** [#444](https://github.com/Schmidt127/127-si-shooting-challenge/pull/444) (`480771fc`)

---

## Live proof (Mike attestation)

| Check | Result |
|---|---|
| Goal Met Date cleared before valid retest | Yes |
| 066 v4.1 stamped crossing date | **8/30/2026** |
| Retry | Preserved **8/30/2026** (`skipped_already_set`) |
| Duplicate milestone unlocks | None |
| Goal Met Date field type | **Date-only** (time disabled) |
| Automation 066 | May remain **ON** |

Truth crossing for Athlete1 Schmidt remains **2026-08-30** (counted 1,000 + 1,500 vs target 2,000). Prior v4.0 double-shift (`2026-08-29` / UI **8/28/2026 6:00 PM**) is corrected.

---

## What shipped

1. Schema: Enrollments **Goal Met Date** is writable **date-only** (not award lookup, not dateTime).  
2. Automation **066 v4.1** owns Goal Met Date stamp (isolated; never overwrite once set).  
3. Date-key preservation: `getCellValueAsString` / `toDateKeyFromText` / `preserveActivityDateKeyFromRecord` — no TZ convert of `YYYY-MM-DD`.  
4. Automation **122** remains **SUPERSEDED** — do not install.  
5. Historical backfill **not** required for this closeout (timezone fix only; Athlete1 cleared + restamped).

---

## Version alignment

| Surface | Version |
|---|---|
| GitHub `066-…create-shot-milestone-unlocks.js` | **v4.1** |
| Production Airtable 066 (Mike paste + live proof) | **v4.1** |
| Inventory / automation-index | **Live / GitHub v4.1** |

---

## Explicit non-claims

- Do **not** install Automation 122.  
- Do **not** convert Goal Met Date back to award lookup.  
- Broader enrollment backfill remains optional hygiene, not required for SC-163 live-complete status.

---

## Evidence links

- Checklist: [`../deploy-checklists/SC-163-goal-met-date.md`](../deploy-checklists/SC-163-goal-met-date.md)  
- Reliability audit: [`SC-163-GOAL-MET-DATE-RELIABILITY.md`](./SC-163-GOAL-MET-DATE-RELIABILITY.md)  
- Offline tests: `airtable/automations/shooting-challenge/lib/sc-163-goal-met-date.test.js`  
- Wave closeout: [`SC-WAVE-20260905-CLOSEOUT.md`](./SC-WAVE-20260905-CLOSEOUT.md)
