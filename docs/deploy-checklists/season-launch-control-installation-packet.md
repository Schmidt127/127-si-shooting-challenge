# Season Launch Control System — Production Installation Packet

**Status:** Repository complete — **not live-installed**  
**Date:** 2026-07-24  
**Scope:** Shooting Challenge only  
**Branch tooling:** `cursor/challenge-year-rollover-engine-ef9e` (Season Launch continuation)  
**Front end:** Next.js `/shoot` — **Softr is Obsolete / Not Used**

This packet is the exact operator path from repository artifacts → controlled PROD activation. Agents do not mutate Airtable / Fillout / Make / website unless Mike authorizes a named step.

---

## 1. Exact Airtable PROD installation steps

1. Pull latest branch; run tests in [GO-LIVE-CHECKLIST.md](../challenge-year/GO-LIVE-CHECKLIST.md).
2. Export Config, Weeks, Enrollments, WAS, XP Events, Unlocks (JSON/CSV usable by CLI).
3. Generate week package:
   ```bash
   node tools/challenge-year/cli.js generate-week-package \
     --challenge-year YYYY-YYYY \
     --week-zero-start YYYY-MM-DD \
     --regular-weeks N \
     --output tmp/season-launch-weeks
   ```
4. In Airtable → Weeks: CSV import. Map Week Name, Start Date, End Date; **linked Program Instance may require record IDs** (see package warning).
5. Create/verify Config row for new Active School Year; do **not** delete prior Config.
6. Optional (Mike-authorized only): add proposed Launch Status fields from `lib/challenge-year/launch-state.js` (includes **Web Validated**, not Softr).
7. Paste/run dry-run extension scripts under `airtable/extension-scripts/audits/preview-challenge-year-*.js` and `preview-season-launch-*.js` with:
   - `configRecordId` = new Config `rec…`
   - `challengeYear` = `YYYY-YYYY`
   - `dryRun` = true
8. Create Season Launch views per [SEASON-LAUNCH-DASHBOARD-VIEWS.md](../challenge-year/SEASON-LAUNCH-DASHBOARD-VIEWS.md) (OMNI) — do not duplicate RCC email/XP integrity views; do not create Softr checklist views.
9. Run:
   ```bash
   node tools/challenge-year/cli.js launch-preflight --config <REC> --input <export.json> --output tmp/launch
   node tools/challenge-year/cli.js activation-preview --config <REC> --input <export.json>
   ```
10. Only after Mike approval: set operational “current” flags / Launch Status → Live.

## 2. Exact Fillout update steps

Follow numbered steps in [FILLOUT-SEASON-ACTIVATION.md](../challenge-year/FILLOUT-SEASON-ACTIVATION.md). Complete F-ATT-01…05 before claiming Forms Updated.

## 3. Exact Make update steps

Follow [MAKE-SEASON-ACTIVATION.md](../challenge-year/MAKE-SEASON-ACTIVATION.md).

**Preserve:** scenario `Weekly Athlete Summary - Bulk Email - May 18`.  
**074 PROD:** `sendMode=Live` or blank + WAS Live — never fixed Test.

## 4. Exact website (`/shoot`) update steps

Follow [WEB-SEASON-ACTIVATION.md](../challenge-year/WEB-SEASON-ACTIVATION.md). Complete W-ATT-*.

**Softr:** Obsolete / Not Used — [SOFTR-SEASON-ACTIVATION.md](../challenge-year/SOFTR-SEASON-ACTIVATION.md) is Historical Reference Only. Do not perform Softr activation steps.

## 5. Controlled Schmidt test

Execute [SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md](../challenge-year/SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md) tests 1–22 as applicable.

## 6. Go-live / rollback

- [GO-LIVE-CHECKLIST.md](../challenge-year/GO-LIVE-CHECKLIST.md)
- [ROLLBACK-CHECKLIST.md](../challenge-year/ROLLBACK-CHECKLIST.md)

## 7. Mike actions still required (no agent PROD UI)

| # | Action |
|---|--------|
| 1 | Authorize any new Config Launch Status fields |
| 2 | Import Weeks + link Program Instance |
| 3 | Fillout attestations + hidden field updates |
| 4 | Make filter attestation (M-ATT-*) |
| 5 | Website `/shoot` attestation (W-ATT-*) |
| 6 | Approve Live activation after Schmidt tests |
| 7 | Monitor first Sunday 118/119 run |

## 8. What this agent will not do

- Create/rename Airtable fields without authorization  
- Paste production automations without Mike  
- Disable 118/119 for routine launch (abort-only)  
- Introduce Team Shot Tracker features  
- Treat Softr as an active launch dependency  
