# Remaining Airtable DEV Installation Packages — Index (Worker A)

**Date:** 2026-07-16  
**Role:** Worker A (continuation after Airtable readiness audit)  
**Base:** DEV `appTetnuCZlCZdTCT` only  
**Hard stops:** No PROD · No live sending · No secrets · No CONTROL.json edits

---

## Packages delivered

| ID | Document | Offline tests |
|----|----------|---------------|
| **C-009** | [C009_HW17_ATTACHMENT_DEV_INSTALL.md](./C009_HW17_ATTACHMENT_DEV_INSTALL.md) | `test_c009_hw17_attachment_contract.py` |
| **C-010** | [C010_ACTIVE_GUARDS_DEV_INSTALL.md](./C010_ACTIVE_GUARDS_DEV_INSTALL.md) | `test_c010_active_guards_contract.py` |
| **C-011** | [C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md](./C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md) | `test_c011_weekly_email_contract.py` |
| **C-019** | [C019_DEV_TESTING_VIEWS.md](./C019_DEV_TESTING_VIEWS.md) | `test_c019_testing_views_contract.py` |
| **059** | [AUTOMATION_059_TRIGGER_RESOLUTION.md](./AUTOMATION_059_TRIGGER_RESOLUTION.md) | `test_automation_059_043_112_contracts.py` |
| **043** | [AUTOMATION_043_RETIREMENT_PLAN.md](./AUTOMATION_043_RETIREMENT_PLAN.md) | same |
| **112** | [AUTOMATION_112_OFF_STATE_VERIFICATION.md](./AUTOMATION_112_OFF_STATE_VERIFICATION.md) | same |

---

## Design authorities used (not re-audited)

- Stage-4 C-010 two-field contract (`Active?` vs `Progress Processing Enabled?`)
- Stage-5 C-011 weekly email design audit
- S26 / LEVELS 043→042 recommendation
- V2-014 retirement dispositions (112 OFF, 043 retire)
- Existing C-019 UI work order + verification checklist

---

## Exact live DEV steps (operator order)

1. **C-019** — Create/verify eight `Testing` views (UI only).  
2. **C-010** — Confirm/create `Progress Processing Enabled?`; paste guards for 010/031/053/065/072 per packet.  
3. **059** — Align DEV trigger to **record created** without Ready formula.  
4. **112** — Complete OFF-state verification packet (keep OFF).  
5. **043** — DEV soak that 042 writes Level Gate Rule; do **not** delete yet.  
6. **C-009** — Confirm Fillout PDF field name; implement 067 v2.0; Schmidt fixtures.  
7. **C-011** — After C-010 072 gate: add 118/119 schedules; `sendMode=Test` only.

---

## Script implementation status in this commit

| Item | In this commit |
|------|----------------|
| Install / resolution docs | **Yes** |
| Offline contract tests | **Yes** |
| 067 v2.0 asset rewrite | Spec only (field name UNKNOWN) |
| 010/031/053/065/072 paste-ready patches | Spec + pseudocode in C-010 packet |
| 118/119 scheduled scripts | Spec only (C-011) |

---

## Mike approvals needed (rollup)

1. PPE field create (if missing) + C-010 DEV pastes  
2. Fillout HW17 attachment field name / A1 vs A2 (C-009)  
3. Sunday 5 AM / 10 AM schedule + DEV Make test webhook (C-011)  
4. 059 Perfect Week trigger coverage choice  
5. 043 disable/delete timing; 112 delete only at maintenance window  
6. C-019 UI view creation sign-off  
7. No PROD / no Live email from these packets
