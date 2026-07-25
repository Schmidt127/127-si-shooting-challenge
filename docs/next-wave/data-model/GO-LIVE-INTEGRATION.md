# Go-Live Integration Readiness — Agent 2

**Target integration branch:** `integration/go-live-promotion-2026-07-24`  
**Agent 2 feature branch:** `agent2/airtable-data-model-cleanup`

---

## Branch facts

| Item | Value |
|------|-------|
| Prior pack commit (already merged to go-live as `d9845a5`) | `63b6cd8` |
| This continuation | New commit(s) on agent2 after `63b6cd8` |
| master at rebase | `a8f3b00` (agent2 already based; up to date) |

Go-live already contains the first Agent 2 pack. **Re-merge / cherry-pick this continuation** so corrections (118 v1.5, Week Code, sent-field ownership, ON schedules) land on go-live.

---

## Conflicts anticipated

| Path | Risk |
|------|------|
| `docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md` | Medium — go-live already set 118/119 ON; Week Code section still needs three-way identity |
| `docs/next-wave/data-model/*` | Medium — go-live has `63b6cd8` pack; expect content updates |
| `airtable/schema/current/*` | Low — pointers |
| `118` / `119` scripts | Medium — go-live may still have v1.4; prefer Agent 2 v1.5 |
| `tests/was-email-contracts/handoff-ownership.test.js` | Low — version asserts |
| `SHOOTING_CHALLENGE_COMPLETION_MASTER.md` | Medium — schedule OFF language |

**Do not** blind-overwrite Agent 9/10/11 ownership files except where Agent 2 ownership matrix explicitly extends them.

---

## Production facts corrected in this continuation

- 072/074/118/119 ON; schedules 5AM/10AM Denver  
- 074 Live writeback; Make writes Sent? + Make Send Status + **Weekly Summary Sent At**  
- Week Key vs Week Code vs Week Name separated  
- 118 v1.5 allows Live schedule arming (no longer hardcodes Test / refuses Live)  
- HC identity safe without RID migration  
- Levels: 042 authoritative; WAS Level Number display  

---

## Mike UI attestation still required (minimal)

1. Confirm Weeks.`Week Code` exact formula in OMNI.  
2. Confirm 118 PROD inputs: `dryRun=false`, `sendMode=Live`, `includeSchmidt=false`.  
3. Confirm 119 PROD inputs: `dryRun=false`.  
4. Confirm 043 OFF (042 owns gate rule).  
5. Fillout 2026–2027 School Year / Program Instance defaults (checklist).  

---

## Merge suggestion for Lead

```text
1. Merge/rebase agent2/airtable-data-model-cleanup tip into integration/go-live-promotion-2026-07-24
2. Prefer agent2 on data-model/* + 118/119 v1.5 + was-email architecture Week identity
3. Re-run: node tests/data-model/field-contracts.test.js
           node tests/was-email-contracts/run-all.js
           node airtable/automations/shooting-challenge/lib/c011-weekly-email-schedule.test.js
```
