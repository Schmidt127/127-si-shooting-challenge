# Core Record Uniqueness Audit — 2026-07-24

**Base:** PROD `appn84sqPw03zEbTT`  
**Related SC:** SC-007, SC-016, SC-035, SC-049, SC-083, SC-124  

---

## 1. Weekly Athlete Summary

| Contract | One record per Enrollment + Week |
|----------|----------------------------------|
| Intended key | Formula `Summary Key` (Enrollment Key + season + Week Key). Scripts must **not** write it (031). |
| Writers | **031** (primary from Submission); **101** (`findOrCreateWeeklySummaryId` on Zoom XP); **118** (repo-ready, not installed) |
| Duplicate risk | Classic check-then-create race: concurrent 031×2, or **031+101**, or **031+118**, can both create before either sees the other |
| Existing dedupe | 031/101 search by Summary Key or Enrollment+Week; throw on multiples; 118 uses Summary Key map |
| Live PROD evidence | Schmidt: exactly **1** WAS `rechWp330MqSgRWzN` for Enrollment `recgP9qZYjAhE7NXm` + Week `recVDKiYATgzsfpmE` despite **3** Submissions |
| Orphan pollution | 392 WAS rows with empty Enrollment (legacy) — uniqueness noise for Week-scoped scans |
| Tests | `tools/testing/tests/test_expected_actual.mjs` (WAS uniqueness FAIL path); scenario SCN-016 |
| Missing tests | Concurrent create race simulation |

## 2. Homework Completion

| Contract | One HC per Enrollment + assignment/asset slot (product: one assignment response) |
|----------|----------------------------------------------------------------------------------|
| Intended key | **020:** Submission + Homework + HW slot (not bare Enrollment+Homework). **067 quiz:** Enrollment + Week + Homework |
| Writers | **020** (primary); **067** quiz path (possible second writer — SC-013/014 open) |
| Multi-asset | Many Submission Assets → one HC (allowed) |
| Duplicate risk | Dual writers 020+067; partial failure leaving extras (historical C-004) |
| Rerun | 020 should link existing |
| Live PROD evidence | **0** Homework Completions post-reset |
| Tests | Scenario fixtures only; live duplicate attempt not run |

## 3. Achievement Unlock

| Contract | One unlock per achievement source key per athlete/enrollment |
|----------|--------------------------------------------------------------|
| Streak unlocks | Via streak occurrence pipeline / achievements |
| Shot milestones | 066 `SHOT_MILESTONE\|{enr}\|{ms}` |
| Perfect Week | 058 `PERFECT_WEEK\|{enr}\|{week}` |
| XP from unlocks | 059 — one XP Event per unlock Source Key |
| Historical | H-001 / SC-124 false-duplicate audit fix Complete |
| Live PROD evidence | **0** Athlete Achievement Unlocks post-reset |
| Risk | Orphan XP may still reference deleted unlocks |

## 4. Video Feedback

| Contract | One VF per video submission/asset path (not per enrollment alone) |
|----------|-------------------------------------------------------------------|
| Writers | **013** canonical (`VIDEO_FEEDBACK\|{assetId}`). **112** is a **duplicate writer** with different key shape (raw asset RID) — keep OFF / retire |
| Duplicate risks | If 112 ON: asset link may stay empty → 013 creates a second VF; also duplicate assets / upload callbacks |
| XP | 114 keys on VF RID — duplicate VF ⇒ duplicate XP risk |
| Live PROD evidence | 1 Video Feedback row (Schmidt-linked 2026-07-23 per baseline) |
| Note | Mike UI: confirm **112 OFF/deleted**; **013 alone** owns create |

## 5. Submission Base XP

| Contract | Exactly one XP Event per Submission (`SUBMISSION_XP\|{submissionId}`) |
|----------|----------------------------------------------------------------------|
| Writer | 010 |
| Live PROD evidence | **PASS** — 0 Submissions with >1 XP Event; observed keys match pattern |
| Rerun | Safe skip/repair |

## 6. Testing Scenario Linked Submission

| Contract | Single link field — stores newest only |
|----------|----------------------------------------|
| Writer | 115 |
| Risk | History not in link field (by design) |
| Not a uniqueness defect | Documented in AUTOMATION-115-AUDIT |

---

## Dual-writer / race flags

| Area | Flag | Severity |
|------|------|----------|
| HC 020 + 067 | Different dedupe keys → possible two HCs for same assignment context | High (SC-013/014) |
| WAS 031 + 101 (+ 118 later) | Concurrent check-then-create race | High |
| VF **013 + 112** | Key-format mismatch; second VF if both ON | **Critical if 112 ON** |
| Weekly Threshold XP | Writer missing | High (XP-D1) |
| Zoom XP 117 + 117c | Same `ZOOM_CREDIT` family | High (XP-D2) |

## Fixes applied tonight

- Verifier uniqueness checks + SCN-016 fixture  
- No production writer removals (proof incomplete for 067/threshold)
