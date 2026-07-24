# Overnight Agent 1 — Testing / Integrity REPORT

**Date:** 2026-07-24  
**Branch:** `master`  
**Scope:** Packages A–L (testing framework, scenario catalog, verifier, XP/uniqueness/field-writer audits, safe PROD Schmidt tests)

---

## Executive result

| | |
|--|--|
| Overall status | **PASS with documented blockers** |
| Major accomplishments | 20 scenario fixtures; expected-vs-actual verifier; XP + uniqueness + field-writer audits; live 115 rerun PASS; offline tests 24/24; completion-master updates with evidence |
| Major defects | **XP-D1** Weekly Threshold XP writer missing in repo; **FW-D1** 115 `Count It` dual-writer vs 007a; ARRAYJOIN RID filter pitfall |
| Major blockers | Testing views require Airtable UI; automation inventory UI attest; Threshold XP writer location; prior Week seed for backdate tests; product decisions on Count It / Test Status gate |

---

## Work completed

### PACKAGE A — Current PROD baseline
- **Result:** Refreshed `CURRENT-PROD-BASELINE.md` with 2026-07-24 re-verify + deliverable index  
- **Files:** `docs/overnight/testing-integrity/CURRENT-PROD-BASELINE.md`  
- **Evidence:** `prod-probe-latest.json` (verifier PASS)

### PACKAGE B — Automation 115 audit
- **Result:** Prior audit retained; live rerun proved create + Linked Submission overwrite; no direct XP writes  
- **Files:** `AUTOMATION-115-AUDIT.md` (existing); `live-115-rerun-latest.json`  
- **Tests:** 17 offline 115 tests PASS

### PACKAGE C — Scenario catalog
- **Result:** SCN-001–020 JSON fixtures + README + catalog.json  
- **Files:** `docs/testing/scenarios/*`

### PACKAGE D — Expected-versus-actual verifier
- **Result:** Read-only library + CLI + fixture; live probe integration  
- **Files:** `tools/testing/lib/expected_actual.js`, `verify_scenario.mjs`, `fixtures/live-115-bundle.json`  
- **Tests:** 7 verifier tests PASS

### PACKAGE E — XP idempotency audit
- **Result:** Full source catalog MD+JSON; XP-D1 documented  
- **Files:** `XP-IDEMPOTENCY-AUDIT.md`, `xp-idempotency-audit.json`

### PACKAGE F — Core uniqueness audit
- **Result:** WAS / HC / Unlock / VF / Submission XP contracts documented  
- **Files:** `CORE-UNIQUENESS-AUDIT.md`  
- **Live:** WAS uniqueness PASS after 115 rerun (still 1 WAS; 4 Subs; 100 shots)

### PACKAGE G — Field writer audit
- **Result:** High-risk ownership matrix expanded; dual writers flagged; stale Schmidt exclusion advice superseded  
- **Files:** `FIELD-WRITER-AUDIT.md`

### PACKAGE H — Testing views Mike actions
- **Result:** Exact view specs for 11 tables  
- **Files:** `TESTING-VIEWS-MIKE-ACTIONS.md`

### PACKAGE I — E2E matrix
- **Result:** Evidence categories added; A3/A4/B1/B2 updated; B3/B5 blocked notes; 115 evidence block  
- **Files:** `docs/V2_END_TO_END_TEST_MATRIX.md`

### PACKAGE J — Safe PROD testing
- **Result:** Read-only probe PASS; controlled 115 rerun EXECUTE PASS  
- **Created:** Submission `recjt6QpUcprSIxAk`; XP `recovVbiZynRUtDwF`  
- **Unchanged uniqueness:** WAS `rechWp330MqSgRWzN`  
- **Not run:** email failure inject; backdate (no prior Week); 010 UI re-trigger

### PACKAGE K — Repository tests
- **Result:** 115 offline expanded (null shot, high shot, stale link); verifier suite  
- **Tests run:** 24 pass / 0 fail (`node --test tools/testing/tests/test_115_offline.mjs tools/testing/tests/test_expected_actual.mjs`)

### PACKAGE L — Safe fixes
- **Result:** Probe defaults to PROD base (ignore DEV `AIRTABLE_BASE_ID` in `.env.local`); no XP amount/key format changes; no second pipelines

---

## PROD activity

| Action | Detail |
|--------|--------|
| Records read | Schmidt Enrollment, seed Scenario, Week, 3–4 Submissions, WAS, XP Events by Source Key |
| Records created | Submission `recjt6QpUcprSIxAk` (via 115 after API set `Run Test?=true`) |
| Records changed | Testing Scenario `recPdyfYRFgDtpzQ8` (Run Test? pulse; Linked Submission → new; result fields) |
| Records deleted | none |
| Downstream auto-created | XP Event `recovVbiZynRUtDwF` (010); WAS link update on existing summary |
| Cleanup | none (test rows retained intentionally) |
| Secrets | never logged |

---

## Defects found

| ID | Severity | System | Description | Evidence | Impact | Fix status | Remaining |
|----|----------|--------|-------------|----------|--------|------------|-----------|
| XP-D1 | High | XP / WAS | Weekly Threshold XP writer not in repo despite rules + WAS fields | XP audit grep | Threshold XP untestable | Documented | Mike UI attest / rebuild |
| FW-D1 | High | 115/007 | Dual writer on Duplicate Review Status (`Count It` preset) | 115 audit; live Subs | Bypasses duplicate-day review | Documented | Product decision |
| FW-D2 | High | HC | Possible 020+067 dual create | Uniqueness audit | Duplicate HC risk | Documented | SC-013/014 |
| PROBE-1 | Medium | tooling | ARRAYJOIN(link) returns names not RIDs | Failed FIND filters | False empty counts | **Fixed** in probe | Use Source Key / direct RID |
| 115-D2 | Medium | 115 C025 | DEV fixture IDs in CONFIG | Prior audit | C025 fails in PROD without overrides | Documented | Seed PROD fixtures |
| SCN-018 | Low | 115 | No Test Status=Rejected gate | Scenario catalog | Disabled scenarios can still run | Documented | Product decision |

---

## Completion-master updates

| SC | Old | New | Evidence | Reason |
|----|-----|-----|----------|--------|
| SC-001 | Live Tested | Live Tested (evidence+) | live rerun JSON | Rerun + catalog |
| SC-002 | Planned | Built in Repository | scenarios/ | Catalog shipped |
| SC-003 | Planned | Planned (specs+) | TESTING-VIEWS-MIKE-ACTIONS | Still needs UI |
| SC-005 | Planned | Planned (matrix+) | E2E matrix | Partial evidence only |
| SC-006 | Planned | Built in Repository | verifier | Read-only auto-compare |
| SC-007 | Planned | Live Tested in PROD | live rerun | Daily/WAS/XP path proven |
| SC-046 | Built | Built (expanded) | FIELD-WRITER-AUDIT | High-risk matrix |
| SC-049 | Planned | Built in Repository | XP audit | Keys cataloged; XP-D1 open |
| SC-069 | Built | Live Tested in PROD | prod probe | Active + pipeline inclusion |

---

## Git activity

See `RESULTS.json` `commits` array (filled at push time).

---

## Remaining Mike actions

See `MIKE-ACTIONS.md` (ordered P0–P2).
