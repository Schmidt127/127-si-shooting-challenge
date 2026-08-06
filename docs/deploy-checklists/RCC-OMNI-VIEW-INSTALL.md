# OMNI / UI — Reliability Command Center view install (SC-147)

**Date:** 2026-08-05  
**PROD base:** `appn84sqPw03zEbTT`  
**No new fields.** Create views only.  
**Authority:** [`MVP-PRODUCTION-RELEASE.md`](../reliability-command-center/MVP-PRODUCTION-RELEASE.md)

## Paste this prompt into OMNI

```text
Create four saved views on Weekly Athlete Summary in PROD (no new fields):

1) Name: RCC — Weekly Email Health
   Filter: OR({Build Weekly Email Now?}, {Weekly Email Ready?}, {Send to Make?}, {Weekly Email Sent?})
   Sort: Last Modified Time descending
   Optional group: Make Send Status
   Show fields: Enrollment, Week, Build Weekly Email Now?, Weekly Email Ready?, Send to Make?, Weekly Email Sent?, Weekly Email Subject, Weekly Email Recipients, Weekly Email HTML, Make Send Status, Weekly Summary Sent At, Weekly Email Sent At, sendMode, Weekly Email Error

2) Name: RCC — P0 Ready package incomplete
   Filter: AND({Weekly Email Ready?}, OR({Weekly Email Subject}="", {Weekly Email Recipients}="", {Weekly Email HTML}=""))
   Sort: Last Modified Time descending
   Same visible fields as view 1

3) Name: RCC — P0 Send armed not Ready
   Filter: AND({Send to Make?}, NOT({Weekly Email Ready?}))
   Sort: Last Modified Time descending
   Same visible fields as view 1

4) Name: RCC — P0 Sent / Make writeback mismatch
   Filter: OR(
     AND({Weekly Email Sent?}, {Make Send Status}!="Sent"),
     AND({Make Send Status}="Sent", NOT({Weekly Email Sent?})),
     AND({Weekly Email Sent?}, {Send to Make?})
   )
   Sort: Last Modified Time descending
   Same visible fields as view 1

Optional day-1 aid on XP Events:
5) Name: RCC — Source Key duplicate review
   Group by Source Key
   Sort Created time descending
   Fields: Source Key, Enrollment, XP Points, Active?, Week

Do not create RCC formula fields. Do not enable automatic repairs. Do not turn 118/119 OFF.
```

## After views exist

```bash
node tools/testing/ops_rcc_export_prod.mjs --run-cli
```

Review `docs/testing/evidence/2026-08-05-agent4-ops/rcc-report/` P0 list against the new views.

## Agent 4 evidence note (2026-08-05)

- Sanitized PROD export written: `rcc-prod-export.sanitized.json`
- Counts: WAS 6 · Enrollments 2 · Weeks 26 · XP Events 2579
- Offline RCC CLI exited **0** (findings present — mostly Missing Dependency / historical XP noise after wipe; weekly-email P0s still operator-relevant)
- Views themselves are **not installed** until Mike/OMNI runs the prompt above

## Status advancement rule

SC-147 may move to **Installed in PROD** only after views 1–4 exist and a dated attestation is recorded. Do not mark Complete until Mike reviews first Sunday health.
