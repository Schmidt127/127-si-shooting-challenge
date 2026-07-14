# Pipeline audit — Weekly Summary + Communications (Stage 8)

**Date:** 2026-07-13  
**Package:** `pipeline-summary-comms-audit`  
**Branch:** `overnight/v2-run/worker-c-s8-summary-comms-pipeline`  
**Base SHA:** `76aed76`  
**Scope:** Repo analysis + offline mocks

---

## 1. Weekly summary chain

```
Submission counted → 031 WAS → 032/033/030/034 helpers
  → (manual) 072 build → (manual) 074 send
```

| Script | Today | C-010 / C-011 target |
|--------|-------|----------------------|
| **031** | Submission-driven WAS | Respect progress flag |
| **072** | Manual `Build Weekly Email Now?` | Schedule + `Active?` + Schmidt skip |
| **074** | Manual `Send to Make?` | Auto after **072**; retain trigger on webhook fail |

Reference: Stage 5 C-011 design audit.

---

## 2. Other communications

| Script | Event | Unattended change |
|--------|-------|-------------------|
| **071** | Homework feedback | Gates only later |
| **073** | Video feedback | Gates only later |
| **075** | Welcome | Review `Active?` |
| **076**/**077** | Daily package | **No new ordinary daily notifications** (C-027) |

---

## 3. Risks

| Risk | Mitigation |
|------|------------|
| Hidden athlete weekly email | **072** skip when `Active?` false |
| Schmidt weekly email | Enrollment ID guard |
| Duplicate WAS | **031** one per enrollment+week |
| Presentation labels | Prefer Assignment Title (C-022) |

---

## 4. Offline tests

`tools/airtable/tests/test_pipeline_comms_gates.py` — send decisions for **071**/**073**/**072** under C-010 states.

**Status:** **COMPLETE**
