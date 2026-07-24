# Agent 11 — Homework and Learning-Activity Pipeline Completion

**Date:** 2026-07-24  
**Branch:** `agent11/homework-pipeline`  
**Exclusive paths:** `docs/next-wave/homework-pipeline/`, `lib/homework-contracts/`, `tests/homework-contracts/`

---

## Executive conclusions

| Item | Result |
|---|---|
| **020 classification** | `PARTIALLY REPLACES 063` |
| **063 deletion safe?** | **Not fully** — forward asset path covered; orphan blank-GB HCs not |
| **013 / 111** | **013 v2.0 replaces 111** (confirmed) |
| **Quiz recommendation** | **Option B** (attachment-less); Mike decides |
| **Learning Activities readiness** | **Contract-ready** (schema/routing/JSON/tests); **not** schema-installed |
| **Canonical 020 file** | Already PROD **v3.0.0** via commit `444046e`; Agent 11 did not re-edit |

---

## A. PROD 020 comparison

Deliverable: `020-PROD-VS-REPO-COMPARISON.md`  
PROD paste archive: `docs/overnight/homework-learning/020-PROD-v3.0.0-as-copied.js`

PROD **v3.0.0** creates/links HC, merges multi-file assets, blank-repairs Grade Band from Enrollment, and best-effort dedupes — but does **not** restore HC-triggered repair for rows that never re-enter via Submission Assets, and does not overwrite mismatched non-blank GB (063 did).

Prior repo **v2.3** did **not** prove 063 replacement.

---

## B. Pipeline map

Deliverable: `HOMEWORK-PIPELINE-MAP.md`  
Maps Submission → Assets → HC → Grade Band → WAS → upload → review → XP → parent feedback with automations and gates.

---

## C. Uniqueness contract

Code: `lib/homework-contracts/uniqueness.js`  
Tests: `tests/homework-contracts/uniqueness.test.js`  
Schema/fixtures: `schemas/homework-completion-identity.schema.json`, `fixtures/homework-identity-cases.json`

Canonical dimensions: Enrollment + Homework assignment + item/asset slot + applicable Submission.

| Scenario | Canonical key sufficient? |
|---|---|
| Multiple attachments | Yes (many assets → one HC) |
| Written-only | Yes (`responseKind=written`) |
| Quiz | **No** alone — 067 uses Enr+Week+Homework |
| Resubmission | **No** without new Submission / attempt index |
| Correction | Yes (same HC) |
| Duplicate Fillout | **No** — needs upstream 007 |

---

## D. Quiz packets

Deliverable: `QUIZ-PATH-DECISION.md` + `lib/homework-contracts/quiz-path.js`  
Option A = Quiz Result PDF field + Fillout + assets/upload.  
Option B = existing 067 attachment-less path.  
**Recommend B** given current PROD schema.

---

## E. Learning Activities

Deliverables:

- `LEARNING-ACTIVITIES-SCHEMA.md`
- `LEARNING-ACTIVITY-ROUTING-CONTRACT.md`
- `schemas/learning-activity.schema.json`
- `lib/homework-contracts/learning-activity-routing.js` + tests

XP ownership locked to **064 → 065** — no competing path.

---

## F. Stale 063/111 inventory

Deliverable: `STALE-063-111-PATCH-MANIFEST.md` for Agent 14.  
Shared docs were **not** broadly edited.

---

## Tests

```
node tests/homework-contracts/run-all.js
```

Expected: all uniqueness, learning-activity-routing, and quiz-path asserts pass.

---

## Out of scope / untouched

Completion master, Config helpers, WAS/email scripts, Zoom scripts, website code, other agents’ folders (except listing stale lines for Agent 14).
