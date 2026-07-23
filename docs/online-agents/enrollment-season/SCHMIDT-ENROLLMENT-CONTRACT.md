# Schmidt Enrollment Contract

**SC items:** SC-004 (related), SC-069, SC-146 (enrollment readiness)  
**IDs:** Athlete `recgqVstObQRzgXJF` · Enrollment `recgP9qZYjAhE7NXm`  
**Fixture:** `tests/fixtures/enrollment-season/schmidt-contract.json`  
**Constraint:** Do **not** change public filters or create a Schmidt exclusion rule in this package.

---

## Permanent role

Schmidt is the permanent active test and demonstration enrollment in PROD (`appn84sqPw03zEbTT`). Historical participant data preservation is not required; Schmidt must keep working.

---

## Expected behavior matrix

| Area | Expected Schmidt behavior |
|------|---------------------------|
| Processing | `Active?=true`; eligible for core intake → Week → XP → WAS paths |
| XP | Earn XP like any athlete (Source Key idempotency still applies) |
| Weekly summaries | WAS may be created/linked; useful for testing |
| Email testing | Controlled Schmidt contacts only — never mass-email real families |
| Levels | Level recalculation / gates eligible |
| Achievements / milestones | Eligible when Active? guards allow |
| Public standings | **Visible** while Active?=true |
| Website profiles | Visible under Active?-based queries |

---

## Conflicts to document (not fix here)

| Conflict | Detail |
|----------|--------|
| Legacy C-019 | Older docs say Active?=false for visibility — **superseded** by Foundation Reset Active?=true |
| 072 / 118 / 119 | Hard-coded Schmidt enrollment exclude for comms/scheduling — conflicts with email testing when Active?=true |
| Completion Master SC-004 note | Mentions leaderboard view filter excluding Schmidt — **Agent 7 direction forbids inventing/creating that exclusion** |

Owner agents for email/website may reconcile later; this package only proves the enrollment contract offline.

---

## Proof checklist (live PROD — Mike later)

1. Enrollment Active?=true.  
2. Submission → Week → XP → WAS still works (Foundation Reset evidence already exists).  
3. Schmidt appears where Active? public queries run.  
4. Email sends (if any) stay on Schmidt contacts.  
5. No new exclusion field or view invented by agents without Mike ask.
