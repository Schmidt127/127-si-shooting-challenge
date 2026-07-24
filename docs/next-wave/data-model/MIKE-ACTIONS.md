# Exact Airtable Actions for Mike (Agent 2)

**No production schema changes are required to accept this documentation pack.**  
Do these only when ready; prefer **OMNI** for in-base inspection.

---

## P0 — Confirm / protect (ops, not schema)

1. **074 PROD automation input `sendMode`**  
   - Must be **Live**, or blank with WAS `sendMode=Live` for parent sends.  
   - Must **not** be fixed `Test`.  
   - Evidence: verified Live writeback 2026-07-24.

2. **Do not enable Team Shot Tracker inactivity alerts** in this base.

---

## P1 — Attest field ownership (OMNI / Make UI)

1. Open one successfully Live-sent WAS (Schmidt proof or equivalent).  
2. Record exact values for:  
   - `Weekly Email Sent?`  
   - `Weekly Email Sent At`  
   - `Weekly Summary Sent At` (blank or filled?)  
   - `Make Send Status`  
   - `Weekly Summary Email Status`  
3. In Make scenario **Weekly Athlete Summary - Bulk Email - May 18** Live branch, list Airtable fields written on success.  
4. Paste results into a short note under `docs/next-wave/was-email/` or reply in chat for Agent 2 follow-up classification of Unknown timestamp fields.

---

## P1 — View hygiene (OMNI — no field deletes)

Create or adjust **ops views** (hide only):

| View purpose | Show | Hide |
|--------------|------|------|
| WAS Email Ops | Enrollment, Week, Build?, Ready?, Send to Make?, Sent?, Sent At, Make Send Status, sendMode, Subject, Error | Weekly Summary Email Status, Weekly Summary Sent At (until attested), Email Subject formula, Combined Recipient Emails |
| Weeks Admin | Week Name, Record ID / Week Key, Start, End, Program Instance | Homework 2, Video Feedback text, Submission Assets text, XP Events copy |
| Enrollment Season | School Year, Program Instance, Active?, Enrollment Key, Grade Band | Gate Failure Summary - Formula (keep Gate Summary) |

---

## P2 — Inventory before any retirement

For each Candidate-for-retirement field in [CLEANUP-CLASSIFICATION.md](./CLEANUP-CLASSIFICATION.md):

1. OMNI: search field usage in Interfaces.  
2. Repo: `rg "Field Name" airtable make docs`.  
3. Make blueprints: search mappings.  
4. Only then open a rename/hide ticket — **still no delete**.

---

## P2 — Year seed check (2026–2027)

1. Config row exists with `Active School Year = 2026-2027`.  
2. Weeks for the season linked to correct Program Instance.  
3. Week Name labels match product (`Week 0`… / `Post-Challenge` as required).  
4. Sample Enrollment `School Year` matches Config year.  
5. Confirm Fillout / intake defaults do **not** hardcode `2025-2026`.

---

## P3 — Optional later (requires explicit schema approval)

- Additive HC key formula using RIDs (M-06).  
- Rename `Registratioin Referrer`.  
- Formula cleanup Gate Failure Summary - Formula.

---

## Do not do

- Delete or rename `Weekly Email Sent?`, `Send to Make?`, `Summary Key`, `Source Key`, `Week Key`.  
- Change primary fields.  
- Force 074 to Test in PROD.  
- Turn on 112 or dual 117+117c.  
- Merge Config years into one row.
