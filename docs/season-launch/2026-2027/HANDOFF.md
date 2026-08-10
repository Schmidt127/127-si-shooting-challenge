# Worker 2 handoff — 2026–2027 season launch package

**Date:** 2026-08-10  
**Branch:** `cursor/season-intake-closeout-c592`  
**Role:** Worker 2 (season records, intake, Schmidt tests, comms, public config)

---

## Summary

The 2026–2027 season is **partially installed in PROD** (PI, Config, Weeks, XP rules, PHA). This branch adds the **repository install package**, offline validators, reconciled Schmidt residual matrix, executable test cards, and operator checklists. **No production systems were changed.**

---

## Branch & commits

```
git checkout cursor/season-intake-closeout-c592
```

Commits on this branch: season package, validators, operator docs, `.env.local.example` season comment.

---

## Files changed (primary)

| Path | Purpose |
|------|---------|
| `docs/challenge-year/generated/2026-2027/*` | Season import/configuration package |
| `docs/season-launch/2026-2027/*` | Operator index, decisions, test cards, checklists |
| `tools/season-launch/validate-2026-2027-package.mjs` | Offline package validator |
| `tools/season-launch/README.md` | Validator docs |
| `web/.env.local.example` | `AIRTABLE_ACTIVE_SCHOOL_YEAR` + Game Manual note |

**Not edited:** Worker 1 automations (010, 020, 023, 031, 043, 053, 066, 118, 119).

---

## Validators / tests run

| Command | Result |
|---------|--------|
| `node tools/season-launch/validate-2026-2027-package.mjs` | PASS WITH WARNINGS (week count, gates, zoom sparse) |
| `python3 -m unittest discover -s tools/enrollment-season/tests -v` | **18/18 OK** |
| `node tools/challenge-year/cli.js validate-weeks --input docs/challenge-year/generated/2026-2027/weeks-canonical-target.json` | Run after merge if needed |

---

## Completed in this package

- [x] Program Instance / Config / Weeks **as-installed** documentation with record IDs
- [x] Canonical week target (9 weeks + Early Bird Apr 2027) generated
- [x] XP rules summary (31 rules, VIDEO=25)
- [x] Level gate gap documented (no 2026–27 rows in snapshot)
- [x] Zoom config gap + prod automation posture
- [x] Fillout mapping audit + reopen gate checklist
- [x] Schmidt residual matrix reconciled to 2026-08 evidence
- [x] 16 executable test cards for OPEN/PARTIAL cases
- [x] WELCOME + Zoom final test procedures
- [x] Public/env audit + safe `.env.local.example` update
- [x] Mike decision sheet (10 items)

---

## Decisions required (Mike)

See [`DECISION-SHEET.md`](./DECISION-SHEET.md). **Blocking launch:**

1. **D2** — 9 vs 10 regular weeks  
2. **D3** — Intake open/close dates  
3. **D4** — Load 2026–27 Level Gate Rules  
4. **D7** — Copy Zoom config to `rechc1f9f4kVM1tHP`  
5. **D9** — Welcome Hub template year  

---

## Production-only actions (recommended order)

### Phase 0 — Hygiene (before tests)

1. Deactivate PWTEST week `reci5GdxEC57vfoS3` (overlaps Early Bird).
2. OMNI: verify Post-Challenge end date on `recsWuPMbRH0W5aRU`.
3. Record F-ATT-01…05 Fillout attestations.

### Phase 1 — Config alignment

4. Mike signs D1–D4 on decision sheet.
5. Align Week rows to canonical OR document intentional 10-week calendar.
6. Copy Zoom/recording fields from 2025–26 Config → 2026–27 (D7).
7. Import approved Level Gate Rules for 2026–2027 (D4).

### Phase 2 — Worker 1 paste queue (Mike)

8. Paste **033 v4.2** (START-HERE-PROD-PASTE).
9. Complete isolation paste order: 053 → 066 → 118 → 119 as needed.
10. Retire Airtable automation **075** per START-HERE.

### Phase 3 — Schmidt proof

11. Run test cards in [`SCHMIDT-TEST-CARDS.md`](./SCHMIDT-TEST-CARDS.md) order.
12. **CARD-DRYRUN** season-shaped pass.
13. `node tools/challenge-year/cli.js launch-preflight` with fresh export.

### Phase 4 — Comms

14. WELCOME controlled test ([`WELCOME-FINAL-TEST.md`](./WELCOME-FINAL-TEST.md)).
15. Zoom 117f live proof ([`ZOOM-FINAL-TEST.md`](./ZOOM-FINAL-TEST.md)).
16. Weekly email re-proof on new Week End Key (CARD-WEEKLY).

### Phase 5 — Public launch

17. Vercel: `AIRTABLE_ACTIVE_SCHOOL_YEAR=2026-2027`, `NEXT_PUBLIC_GAME_MANUAL_URL` (D10).
18. `npm run test:smoke:prod`.
19. Fillout reopen per [`FILLOUT-REOPEN-CHECKLIST.md`](./FILLOUT-REOPEN-CHECKLIST.md).
20. CHANGELOG + completion master update.

---

## Unresolved / escalate

| Item | Owner |
|------|-------|
| 067 HW17 curriculum Week vs PHA Week | Worker 1 / Mike paste |
| 079 script export to GitHub | Future repo hygiene |
| Weekly threshold XP live proof | Agent 4 / Mike |
| Schmidt hard-exclude in 118/119 vs email testing | Mike policy (D8) |
| Live Fillout form ID | Mike F-ATT-01 |

---

## Definition of done (this worker scope)

- [x] Season installable from defined records in git  
- [x] Residual tests executable without interpretation  
- [x] Fillout explicit reopen gate  
- [x] WELCOME + Zoom proof procedures  
- [x] Mike decision list (not ambiguous backlog)  

**Remaining:** Mike production execution of phases 0–5 above.
