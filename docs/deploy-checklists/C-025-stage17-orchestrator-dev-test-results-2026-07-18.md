# C-025 Stage 17 — Orchestrator DEV test results (2026-07-18)

**Branch:** `feature/c025-stage17-zoom-attendance`
**Docs stop commit (prior):** `0293ed5`
**Repo feature tip at test time:** see git log
**DEV:** `appTetnuCZlCZdTCT` · **PROD:** `appn84sqPw03zEbTT` (untouched)

---

## Execution mode (important)

Automations Meta API remains **403**. Cursor **cannot** enable/disable/run Airtable Automations.

Mike confirmed paste of **117 - Zoom Recording Credit - Orchestrator v1.1.0** with corrected trigger, `recordId` mapped, blank `webhookUrl`, no post-script actions, and automation **OFF**.

Controlled tests were executed with a **REST harness** that mirrors the repository **v1.1.0** orchestrator logic against the approved fixtures, while leaving Automation **117 OFF** the entire time (safer than leaving it ON).

Evidence JSON: `tools/airtable/_preview/c025_stage17_orchestrator_test_results.json`
Harness: `tools/airtable/_c025_stage17_run_orchestrator_tests.py`

Optional: Mike may still use Airtable **Test** on `reciRsLuiJGYcea3U` once for UI run-history evidence (then leave OFF).

---

## Mike confirmation (accepted)

| Item | Value |
|------|--------|
| Automation name | `117 - Zoom Recording Credit - Orchestrator` |
| Version | **v1.1.0** |
| Trigger | Corrected (Zoom Attendance · Recording Quiz · links present) |
| `recordId` | Mapped |
| `webhookUrl` | Blank |
| Post-script actions | None |
| State | **OFF** |
| Automation ID | **Not visible via API** (Mike can paste ID if shown in UI) |

---

## Fixtures

| Role | ID |
|------|-----|
| Schmidt enrollment | `recgP9qZYjAhE7NXm` |
| Eligible | `reciRsLuiJGYcea3U` |
| Missing approval | `recRMXO3Yy6olFlrk` |
| Needs Correction | `recRhwglba8cK7NUH` |
| Missing Enrollment | `recf3nLZDDCEupt3e` |
| Missing Meeting | `recgwpubxhs76fXUZ` |
| Live sibling (conflict meeting) | `recVgsm8Zzg51gqNF` |
| Recording conflict | `recwbD9fKLPRzVhQn` |
| Meeting eligible | `recwnEKJAW8hxPSNL` |
| Meeting conflict | `rechIfspgLxgO4tL0` |

**Note:** Eligible / missing-approval / needs-correction share Enrollment+Meeting ⇒ **same Zoom Credit Key**. Running missing-approval therefore soft-voids the eligible XP Event for that key (correct exclusivity). Soft-void / resolve cases continue from that state.

---

## Results summary

| # | Case | Result | Key outputs |
|---|------|--------|-------------|
| 1 | Eligible approved | **PASS** | `actionCOut=created` · XP `recuPdEjQv3hS8N7X` · 30 pts |
| 2 | Eligible rerun | **PASS** | `skipped_exists` · same XP ID · count=1 |
| 3 | Missing approval | **PASS*** | `deactivated_on_conflict` on shared key (see note) · no Attendees change |
| 4 | Needs Correction | **PASS** | `reviewAction=marked_needs_correction` · Satisfactory cleared · no XP award |
| 5 | Missing Enrollment | **PASS** | `statusOut=error` · `Missing Enrollment link…` · no XP |
| 6 | Missing Meeting | **PASS** | `statusOut=error` · `Missing Zoom Meeting link…` · no XP |
| 7 | Live conflict fixture | **PASS** | Conflict=1 · `skipped_not_approved` · Attendees unchanged |
| 8 | Soft-void under conflict | **PASS** | XP remains inactive · no Attendees · no live XP |
| 8b | Soft-void rerun | **PASS** | Idempotent skip |
| 9 | Conflict resolution | **PASS** | Same XP `updated` / Active? restored · no duplicate |
| 10 | Date | **PASS** | Meeting start `2026-07-18T06:30:00.000Z` → Denver day `2026-07-18` → `XP Activity Date` `2026-07-18T12:00:00.000Z` |
| 11 | Email no-send | **PASS** | `actionFOut=skipped_webhook_blank` · send key/sent at null |
| 12 | Gate / PW flags | **Observed** | Gate Applied? **true** · PW Applied? **true** · downstream gaps remain |

Overall harness: **PASS** (no stop conditions).

---

## Eligible XP Event (canonical)

| Field | Value |
|-------|--------|
| XP Event ID | `recuPdEjQv3hS8N7X` |
| Active? | **true** (after conflict resolution) |
| XP Points | **30** |
| XP Bucket | `Zoom Attendance` |
| XP Source | `Zoom Meeting Recording Quiz` |
| Source Key | `ZOOM_CREDIT\|recgP9qZYjAhE7NXm\|recwnEKJAW8hxPSNL` |
| Enrollment | `recgP9qZYjAhE7NXm` |
| Zoom Meeting | `recwnEKJAW8hxPSNL` |
| XP Activity Date | `2026-07-18T12:00:00.000Z` |
| XP Reason Public | `Zoom recording quiz credit` |
| XP Reason Debug | Populated from `Zoom Credit Debug` (includes Pct=50 · XP=30 · Key=…) |
| Awarded By | `117-orchestrator-v1.1.0` |

---

## Attendees / 101 / email safety

| Check | Result |
|-------|--------|
| Attendees before/after (both meetings) | **[] → []** unchanged on every case |
| New `ZOOM_ATTEND_BASE` XP for Schmidt | **None** |
| Make / webhook | **None** |
| Email send key / sent at | **Not set** |
| Automation 117 enabled by Cursor | **No** (remained OFF) |
| Automation 101 / 057 / 042 edited | **No** |
| PROD | **Untouched** |

---

## Downstream gaps (unchanged)

| Gap | Status |
|-----|--------|
| **057** Perfect Week counts live `Attendees` only | **Still a gap** — do not claim PW total fixed |
| **042** reads live `Total Zoom Attendances` | **Still a gap** — do not claim gate total fixed |
| Recording flags | `Gate Credit Applied?` / `Perfect Week Credit Applied?` marked on eligible — observation only |

---

## Final state

- Automation **117 OFF**
- Automation **101** unchanged
- Automations **057 / 042** unchanged
- No Make / email
- PROD untouched
- No recording athlete on `Attendees`
- Eligible XP Event retained as fixture evidence (`recuPdEjQv3hS8N7X`)

---

## Recommended next task

1. Optional: Mike runs one Airtable **Test** on eligible fixture for UI run log (then OFF).
2. Plan separate backlog work to make **057** / **042** (or formulas) consume recording flags **without** writing live `Attendees`.
3. Only after that: consider PROD promotion packet (not authorized here).
