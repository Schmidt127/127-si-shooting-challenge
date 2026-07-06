# Phase 2A Engineering Sprint — Deliverables (2026-07-05)

**Mission:** Reduce platform complexity — **not** build features tonight.  
**Rules honored:** No production Airtable pastes · No Make/Fillout prod changes · GitHub documentation only (Cursor).

---

## Role assignments tonight

| Role | Owner | Tonight's output |
|------|-------|------------------|
| Platform architect / standards | **ChatGPT** | C-020 full design · Automation Standard v4 review · Platform engineering standards · Simplification ideas |
| Lead engineer / GitHub | **Cursor** | ✅ Automation inventory complete · ✅ Common patterns · ✅ Simplification doc · ✅ Questions for Mike |
| In-base testing workspace | **OMNI** | Testing views · Test Intake table shell · Scenario matrix · Operator UX |
| Product owner | **Mike** | Review · approve · decide |

---

## Cursor deliverables (complete)

| # | Deliverable | Location |
|---|-------------|----------|
| 1 | **Complete automation classification** (46/46) | [v2-014-wave-2a-classification.md](./v2-014-wave-2a-classification.md) |
| 2 | **Common engineering patterns** | [v2-common-engineering-patterns.md](./v2-common-engineering-patterns.md) |
| 3 | **Simplification recommendations** | § Simplification in classification doc + [v2-014 roadmap](./v2-014-automation-modernization-roadmap.md) |
| 4 | **Questions requiring Mike approval** | [v2-014-questions-for-mike.md](./v2-014-questions-for-mike.md) |
| 5 | **DEV schema snapshot** (supporting OMNI/ChatGPT) | `airtable/schema/snapshots/dev-20260705/` |

---

## ChatGPT deliverables (pending from Mike's ChatGPT session)

| # | Deliverable | Store in GitHub when ready |
|---|-------------|----------------------------|
| 1 | Test Intake architecture (C-020) — workflow, field map, scenarios, acceptance, S3/Dribble notes | Extend [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) or new `docs/c-020-test-intake-design.md` |
| 2 | Automation Rewrite Standard v4 recommendations | Propose updates to [v2/06-automation-standards.md](./v2/06-automation-standards.md) |
| 3 | Platform engineering standards (Airtable vs Make vs GitHub vs Python vs OMNI vs Cursor) | New doc or § in doc 04 |
| 4 | Automation simplification cross-check | Review Cursor classification doc |

**Mike:** Paste ChatGPT outputs back to Cursor in a future session for GitHub commit (doc 04 workflow).

---

## OMNI deliverables (pending — Mike in DEV base)

| # | Deliverable | Spec reference |
|---|-------------|----------------|
| 1 | Testing views on pipeline tables | [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) § C-020 |
| 2 | Test Intake table (schema only) | Same + ChatGPT field map when ready |
| 3 | Scenario Type matrix | Sprint OMNI Mission 3 list |
| 4 | Operator UX recommendations | Interfaces/dashboards — DEV only |

Attach for OMNI: `airtable/schema/snapshots/dev-20260705/schema_doc_*.md`

---

## Success criteria checklist

| Criterion | Status |
|-----------|--------|
| Complete automation inventory | ✅ GitHub 46/46 |
| Automation classifications A–F | ✅ |
| Complexity scores + tiers | ✅ (static; OMNI refine) |
| Common engineering standards | ✅ patterns doc |
| Test Intake design | ⏳ ChatGPT |
| DEV testing workspace | ⏳ OMNI |
| Long-term workflow documented | ✅ doc 04 + V2-015 + this sprint |
| Modernization priorities clear | ✅ P0–P3 in classification |
| No unintended production changes | ✅ |

---

## What happens next (not tonight)

| When | What |
|------|------|
| After Mike reviews | Answer [questions for Mike](./v2-014-questions-for-mike.md) |
| Next DEV session | **066 v3.1** paste + test (H-002) — only if Mike chooses outside tonight rules |
| After 066 DEV pass | **C-020** build in DEV |
| Wave 2b | 066 prod paste (approved) |
| Wave 2c | **112** delete, **043** retire (approved) |

---

## Related

- [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md)
- [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md)
- [PROJECT_STATE.md](./PROJECT_STATE.md)
