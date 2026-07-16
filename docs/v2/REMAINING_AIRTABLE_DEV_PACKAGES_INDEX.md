# Remaining Airtable DEV Installation Packages — Index (Worker A)

**Date:** 2026-07-16 (updated after field/trigger inventory)  
**PR:** [#35](https://github.com/Schmidt127/127-si-shooting-challenge/pull/35)  
**Branch:** `cursor/remaining-airtable-dev-packages-2565`  
**Base:** DEV `appTetnuCZlCZdTCT` only  
**Hard stops:** No PROD · No live sending · No secrets · No CONTROL.json edits  
**Inventory:** [DEV_FIELD_TRIGGER_INVENTORY_2026-07-16.md](./DEV_FIELD_TRIGGER_INVENTORY_2026-07-16.md)  
**Migration safety:** [C009_C010_C011_MIGRATION_SAFETY.md](./C009_C010_C011_MIGRATION_SAFETY.md)

---

## Auth note

Authenticated live DEV API access was **blocked** (no PAT in environment). Field/option evidence is from DEV schema snapshot **2026-07-06**. Automation ON/OFF, 059 live trigger filters, Make webhook, and view filters remain **live-blocked**.

---

## Packages

| ID | Document | Repo implementation | Label summary |
|----|----------|---------------------|---------------|
| **C-009** | [C009_HW17_ATTACHMENT_DEV_INSTALL.md](./C009_HW17_ATTACHMENT_DEV_INSTALL.md) | **067 v2.0** | Options **verified**; quiz PDF field missing → Mike create; **requires DEV paste** |
| **C-010** | [C010_ACTIVE_GUARDS_DEV_INSTALL.md](./C010_ACTIVE_GUARDS_DEV_INSTALL.md) | **072 v3.8** Active?/Schmidt; PPE absent | PPE **requires Mike approval**; progress patches after PPE |
| **C-011** | [C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md](./C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md) | **118/119 v1.0** + 072 v3.8 | WAS fields **verified**; webhook **live-blocked**; do not enable schedule |
| **C-019** | [C019_DEV_TESTING_VIEWS.md](./C019_DEV_TESTING_VIEWS.md) | Spec only | 1/8 Testing views in snapshot; UI create **requires Mike** |
| **059** | [AUTOMATION_059_TRIGGER_RESOLUTION.md](./AUTOMATION_059_TRIGGER_RESOLUTION.md) | Spec | Formula **verified**; live trigger **live-blocked** |
| **043** | [AUTOMATION_043_RETIREMENT_PLAN.md](./AUTOMATION_043_RETIREMENT_PLAN.md) | Spec | 042 view **verified**; ON/OFF **live-blocked** |
| **112** | [AUTOMATION_112_OFF_STATE_VERIFICATION.md](./AUTOMATION_112_OFF_STATE_VERIFICATION.md) | Spec | Must stay OFF; UI attest **live-blocked** |

---

## Exact live DEV steps (updated)

1. Mike: provide read-only DEV PAT **or** complete Automations UI attest checklist.  
2. Mike/OMNI: create `Progress Processing Enabled?` + `Quiz Result PDF`.  
3. **C-019** — create missing `Testing` views.  
4. Paste **067 v2.0**, **072 v3.8**, then **118/119** (leave schedules OFF; dryRun=true).  
5. After PPE exists: paste progress guards for 010/031/053/065.  
6. Attest **059** trigger (created, no Ready), **112** OFF, **042** gate writes, **043** soak.  
7. C-011 Test-mode smoke only with DEV Make webhook.

---

## Script implementation status

| Item | Status |
|------|--------|
| 067 v2.0 | **Implemented** — **requires DEV paste** |
| 072 v3.8 Active?/Schmidt/Sent guards | **Implemented** — **requires DEV paste** |
| 118 / 119 v1.0 | **Implemented** — **requires DEV paste**; do not enable |
| 010/031/053/065 PPE guards | Spec only until PPE field exists |
| Live Airtable / PROD | **Untouched** |

---

## Offline tests

```bash
python3 -m unittest \
  tools.airtable.tests.test_c009_hw17_attachment_contract \
  tools.airtable.tests.test_c010_active_guards_contract \
  tools.airtable.tests.test_c011_weekly_email_contract \
  tools.airtable.tests.test_c019_testing_views_contract \
  tools.airtable.tests.test_automation_059_043_112_contracts \
  tools.airtable.tests.test_dev_inventory_contracts -v
```

---

## Mike approvals needed (rollup)

1. DEV PAT or UI attest for automation ON/OFF + 059 trigger  
2. Create PPE + Quiz Result PDF (+ Fillout map)  
3. C-019 Testing views UI  
4. DEV paste authorization for 067/072/118/119  
5. DEV Make weekly webhook (Test only)  
6. 043 disable/delete and 112 delete timing  
7. No PROD / no Live email
