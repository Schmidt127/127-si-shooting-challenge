# Pipeline audit — Homework + Video (Stage 6)

**Date:** 2026-07-13  
**Package:** `pipeline-homework-video-audit`  
**Branch:** `overnight/v2-run/worker-a-s6-homework-video-pipeline`  
**Base SHA:** `e511ed3`  
**Scope:** Repo analysis only — no Airtable / PROD changes

---

## 1. Pipeline map

| Stage | Scripts | Tables | Existing audit |
|-------|---------|--------|----------------|
| E — HW upload | **020**, **070a**, **022**, **063** | Submission Assets → Homework Completions | `audit-homework-completion-upload-edge-cases.js` |
| F — HW XP + email | **064**, **065**, **071** | Homework Completions → XP Events | `audit-homework-pipeline-integrity.js` |
| F2 — HW17 quiz | **067** | Final Reflection Quiz Submissions | `audit-homework17-reflection-quiz-pipeline.js` |
| G — Video upload | **013**, **070b**, **022**, **111** | Submission Assets → Video Feedback | `audit-video-pipeline-integrity.js` |
| H — Video XP + email | **113**, **114**, **073** | Video Feedback → XP Events | `audit-video-xp-pipeline-integrity.js` |
| Asset reuse | **116** | Submission Assets | C-023 Stage 5 DEV validated |

**Legacy:** **112** OFF — duplicate of **013**; monitor before delete.

---

## 2. Homework path — behavior contract

```
Submission (homework) → 009 asset → 020 HC link/create → 070a Make/Lambda → 022 writeback
  → coach review → 064/065 XP → 071 parent email
```

| Checkpoint | Idempotency / dedupe | C-010 gate needed | C-024 key |
|------------|---------------------|-------------------|-----------|
| **020** HC create | One official HC per athlete+assignment+week | `Progress Processing Enabled?` before XP chain | DK-03 composite |
| **070a** upload | Claim + synchronous JSON (DEV PASS) | No comms gate on upload | SHA-256 → Needs Review (**116**) |
| **065** HW XP | Source Key per HC | Skip XP when progress disabled | DK-01 XP Source Key |
| **071** email | Send-once trigger | `Active?` + Schmidt exclusion | Send idempotency TBD |

**Repo gaps:**

1. **065** / **071** do not yet read `Progress Processing Enabled?` (C-010 Stage 4 inventory).
2. **071** unchanged in copy/scope per owner rule — enrollment gates only when C-010 is pasted.
3. **067** bypasses Submission Asset path — Learning Activities successor must not break HW17 until migration approved.

---

## 3. Video path — behavior contract

```
Submission (video) → 009 asset → 013 VF link → 070b Make/Lambda → 070c (async Accepted only) → 022
  → coach review → 113/114 XP → 073 parent email
```

| Checkpoint | Status | Notes |
|------------|--------|-------|
| **013** VF create | Canonical (not 112) | Links asset to Video Feedback |
| **070b** v4.4 | PROD proven | Async `Accepted` needs **070c** v1.1 |
| **114** XP | Source Key `VIDEO_SUBMISSION\|{vfId}` | Idempotent create/update |
| **116** reuse | DEV+PROD PASS | Confirmed Duplicate / Approved Reuse |
| **073** email | Unchanged scope | Add `Active?` gate only (C-010) |

**Repo gaps:**

1. Homework **070a** sync JSON path does not need **070c** — keep documented.
2. **073** lacks Schmidt / hidden-athlete guard (same pattern as **071**).
3. Upload naming gate via formula — verify in DEV before season.

---

## 4. Cross-cutting risks

| Risk | Severity | Mitigation (repo-safe) |
|------|----------|------------------------|
| Double XP on resubmit | High | C-024 Source Key guards + **116** |
| Hidden athlete gets parent email | High | C-010 two-field gates on **071**/**073** |
| Duplicate file awards twice | High | **116** + Needs Review (approved rule) |
| 112 accidentally enabled | Medium | Keep OFF; delete only after audit window |
| HW17 quiz orphan | Medium | **067** audit before Learning Activities migration |

---

## 5. Recommended DEV verification order (manual — Mike/OMNI)

1. Run Stage E audit dry-run on Schmidt enrollment.
2. Homework 1-file + 2-file via **115** (C-020).
3. Video 2-file via **115**; confirm **070c** only on Accepted path.
4. After C-010 paste: `Active?` false → **071**/**073** skip.
5. Spot-check **116** on a homework asset after C-023 homework path.

---

## 6. Owner decisions not reopened

- Duplicate files allowed, flagged Needs Review, no double award.
- **071** / **073** communications remain unchanged in scope.
- Existing **Homework** table stays authoritative.

**Status:** **COMPLETE** (repo audit)
