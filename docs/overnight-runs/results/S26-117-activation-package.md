# S26 — Automation 117 activation package

**Package ID:** `automation-117-activation-package`  
**Status:** **READY_FOR_MIKE_ACTIVATION**  
**Date:** 2026-07-14  
**Agent:** Workstream 3  
**Lead branch:** `overnight/lead-integration`  
**Repo HEAD at package write:** see `git rev-parse HEAD` on Lead (CONTROL tip may lag)

---

## Hard constraints (honored)

| Constraint | Result |
|------------|--------|
| Do **not** enable 117 in Airtable | **Honored** — no UI/API enable |
| Do **not** configure a real webhook | **Honored** — docs require blank `webhookUrl` |
| Do **not** change PROD / Folder 07 / send real email | **Honored** |
| Mark package READY_FOR_MIKE_ACTIVATION | **Yes** |

---

## Deliverables created

| # | Path |
|---|------|
| 1 | `docs/deploy-checklists/AUTOMATION-117-trigger-design.md` |
| 2 | `docs/deploy-checklists/AUTOMATION-117-interaction-map.md` |
| 3 | `tools/airtable/phase_117_activation_smoke_plan.py` (offline 20 + `--list-live`) |
| 4 | `docs/deploy-checklists/AUTOMATION-117-mike-activation-sheet.md` |
| 5 | This file: `docs/overnight-runs/results/S26-117-activation-package.md` |

Related SoT already present:
- `airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js`
- Library `117a`–`117f` (do not paste ×6)
- `101-zoom-attendance-xp-award-meeting-xp.js`

---

## Trigger verdict (summary)

**Use:** Zoom Attendance · **When record matches conditions** · AND:
1. Attendance Method is Recording Quiz  
2. Enrollment is not empty  
3. Zoom Meeting is not empty  

**Avoid:** view-entry · bare when-updated · Zoom Meetings table · Live rows  

Full analysis: trigger-design doc.

---

## Interaction / double-award (summary)

- 117 XP key: `ZOOM_CREDIT|{Enrollment RID}|{Zoom Meeting RID}`  
- 101 XP key: `ZOOM_ATTEND_BASE|{Zoom Meeting Key}|{enrollmentId}`  
- Same Event cannot collide (disjoint prefixes + 117 recheck-before-create)  
- **Residual hazard:** D/E Attendees link + 101 supplemental Create XP Events → full base XP stack — **forbidden during 117 DEV smoke**  

Full map: interaction-map doc.

---

## Defects fixed (proven)

| Defect | Evidence | Fix |
|--------|----------|-----|
| Orchestrator claimed recheck-before-create but created after a single query | Docblock + step C lacked second `selectRecordsAsync` before `createRecordAsync` | **117 orchestrator → v1.0.1** — true recheck; shared `applyExistingXp` helper |
| Library 117c labeled “Recheck before create” without second query | Same gap in library reference | **117c → v1.0.2** — aligned true recheck |

No Airtable paste performed for these fixes — Mike should re-paste orchestrator **v1.0.1** before first ON if DEV paste is still v1.0.0.

---

## Offline test results

Command:

```bash
python tools/airtable/phase_117_activation_smoke_plan.py
```

Also carried forward:

```bash
python -m unittest tools.airtable.tests.test_c025_117_orchestrator tools.airtable.tests.test_c025_117_contracts -q
```

| Suite | Result |
|-------|--------|
| `phase_117_activation_smoke_plan.py` | **22/22 PASS** (20 activation + 2 source guards) |
| `test_c025_117_orchestrator` + `test_c025_117_contracts` | **34/34 PASS** |

---

## Confirmation

- **117 remains OFF** in Airtable for this workstream (agent made no enable call).  
- **No webhook** configured.  
- **No email** sent.  
- Package is ready for Mike to wire trigger (may stay OFF) and later turn ON with blank webhook per activation sheet.

---

## Suggested Mike next step

1. Run offline suite locally.  
2. Re-paste orchestrator v1.0.1 if needed (still OFF).  
3. Wire preferred trigger + blank webhook (still OFF).  
4. When ready: ON → follow activation sheet L01–L20 → restore fixture → park OFF or leave blank-webhook ON.
