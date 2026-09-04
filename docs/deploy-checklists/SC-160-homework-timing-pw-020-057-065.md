# SC-160 — Homework timing / Perfect Week (020 / 065 / 057) paste checklist

**GitHub branch:** `sc160/a3-homework-timing`  
**Status:** GitHub ready — **Mike paste required** (Airtable customScript is UI-only).  
**Do not paste from agents into Production without DEV or disposable verify.**

## Scripts

| Automation | GitHub version | Notes |
|---|---|---|
| **020** — Link or Create Homework Completion | **v4.0** | HC Week = PHA.Week; Submission.Week optional; Early/Late Notes; qualifying Uploaded At |
| **065** — Create or Reconcile Homework XP Event | **v10.7** | Early/late still full HOMEWORK_XP once satisfactory |
| **057** — Calculate Perfect Week Eligibility | **2.5** | Early + on-time count for PW homework; late excluded; evaluation-window detail |

**059:** Do not change under SC-160 (SC-159 separate).

## Paste order (DEV preferred)

1. Paste **020** v4.0 (skip GitHub header through production docblock start as usual).
2. Paste **065** v10.7.
3. Paste **057** v2.5.
4. Update Automations Code tracker versions when Live.
5. Disposable proof (Agent 4 / Mike):
   - Submission with empty Week + HW PHA for a future Week → SA (Agent 2) → HC on PHA Week → timing Early in Notes.
   - Late satisfactory → XP yes, PW homework count no.
   - Placeholder early + late replacement → Late note / PW exclude.
   - Confirm 059 not edited.

## Rollback

Prior live bodies: Production Automations table / prior GitHub tags. SC-152/FUT-001 rollback copies remain under `airtable/rollbacks/` for 057 if needed.

## Related

- Audit: [`../audits/SC-160-HOMEWORK-TIMING-PW-20260904.md`](../audits/SC-160-HOMEWORK-TIMING-PW-20260904.md)
- Prior late-credit: [`homework-late-credit-policy-020-057-065.md`](./homework-late-credit-policy-020-057-065.md)
