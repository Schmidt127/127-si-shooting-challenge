# C-025 Stage 17 — Automation enable order

**Status:** **COMPLETE** (2026-07-20) — Stage 17 PROD verification PASS; **117 / 057 / 042 ON**; **101 unchanged**; **`webhookUrl` blank**. Do not install 115 in PROD.

**CONFIRMED:** Preferred package is 117 v1.1.1 orchestrator (not 117a–f alongside).

**Evidence:** [prod-live-2026-07-20](./C-025-stage17-prod-live-2026-07-20.md) · [117 verification](./C-025-stage17-prod-117-verification-2026-07-20.md)

## Preconditions

| Gate | Evidence required |
|---|---|
| Schema | [Implementation checklist](./C-025-stage17-prod-implementation-checklist.md) completed, including select values, Config values, linked fields, formulas rebuilt for PROD field references, and re-audit pass. |
| XP | `ZOOM_ATTEND_BASE` remains active at 60; `Zoom Meeting Recording Quiz` exists as an XP Source; approved recording fixture resolves to 30 XP. |
| Backups | Capture current production 101/057/042 text and enabled state before paste. |
| Test isolation | Dedicated synthetic test athlete, Enrollment, Zoom Meeting, ZA, XP Event, and WAS records only. |
| Email | `webhookUrl` blank and approval-email delivery disabled for smoke. |
| Approval | Mike authorizes each production UI action and permanent enablement. |

## Exact sequence

| Order | Action | State / proof | Stop if |
|---:|---|---|---|
| 1 | Finish schema, select choices, Config values, and read-only re-audit. | 117/057/042 remain OFF. | Zoom Attendance or critical fields/formulas remain missing. |
| 2 | Paste 117 v1.1.1, 057 v1.3, and 042 v3.1 while OFF. Map `recordId`; leave 117 `webhookUrl` blank. | Verify paste sources: [117](./C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt), [057](./C-025-stage17-057-perfect-week-v1.3-PASTE.txt), [042](./C-025-stage17-042-level-gates-v3.1-PASTE.txt). | Any script or configuration can write `Attendees`. |
| 3 | Run formula checks and dry-run/single-record smoke preparation. | No production automation enablement. | Recording fixture does not produce approved key/amount controls. |
| 4 | Verify 101 live control first. Leave it ON **only if it was already the running production live path**; do not change its script unless separately required. | Live-only fixture creates one 60-point `ZOOM_ATTEND_BASE|…`; recording remains absent. | 101 behavior changes or a recording action writes Attendees. |
| 5 | Enable 117 briefly; run recording XP smoke; immediately turn it OFF. | One 30-point `ZOOM_CREDIT|…`, no Attendees write, rerun dedupes, conflict soft-voids/skips. | Duplicate XP, conflict keeps recording active, or any historical live XP changes. |
| 6 | Enable 057 briefly; run PW smoke; immediately turn it OFF. | Recording-only qualifying week counted once; only 057 sets `Perfect Week Credit Applied?`. | It counts a live/recording meeting twice or writes Attendees. |
| 7 | Enable 042 briefly; run gate smoke; immediately turn it OFF. | Gate count is unioned by meeting; only 042 sets `Gate Credit Applied?`. | It counts a live/recording meeting twice or writes Attendees. |
| 8 | Obtain Mike’s explicit approval for controlled permanent enablement. | Record approval and test record IDs in deployment log. | Any unsatisfied stop condition. |
| 9 | Permanently enable in this order: **117 → 057 → 042**. | 101 remains on as its unchanged live path. Monitor initial records and retain rollback copies. | Unexpected XP/gate/PW or email behavior. |

## OFF/ON interpretation during schema work

| Automation | Required state during schema paste and smoke | Clarification |
|---|---|---|
| 101 v5.5 | May remain ON if already live and unchanged | Do not disable or repaste merely for Stage 17. It is the live control and only its normal live path may write Attendees. |
| 117 v1.1.1 | OFF except the short recording smoke window | Preferred package. |
| 117a–f | OFF / not installed when 117 is used | Modular alternative only. |
| 057 v1.3 | OFF except short PW smoke window | It owns the PW Applied? write. |
| 042 v3.1 | OFF except short gate smoke window | It owns the Gate Applied? write. |
| 115 v1.8 | Not installed in PROD | DEV-only ETF; requires `Testing Scenarios`, which PROD lacks. |

## Why 115 is prohibited in PROD

**CONFIRMED:** 115 creates or orchestrates synthetic testing scenarios/submissions and forces 057/042 test flow. Production has no `Testing Scenarios` table. Installing it risks fake data plus unintended XP and Weekly Athlete Summary writes. It is a DEV-only harness, not a production dependency.

## Required log entry

Use the template in [rollback plan](./C-025-stage17-rollback-plan.md) for every paste, temporary enablement, permanent enablement, and rollback decision. Execute the detailed cases in [expanded smoke tests](./C-025-stage17-expanded-smoke-tests.md).
