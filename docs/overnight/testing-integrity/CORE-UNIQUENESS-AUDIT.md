# Core Record Uniqueness Audit — 2026-07-24

**Base:** PROD `appn84sqPw03zEbTT`  
**Related SC:** SC-007, SC-016, SC-035, SC-049, SC-083, SC-124  

---

## 1. Weekly Athlete Summary

| Contract | One record per Enrollment + Week |
|----------|----------------------------------|
| Intended key | Formula `Summary Key` (Enrollment Key + season + Week Key). Scripts must **not** write it (031). |
| Writers | **031** find-or-create from Submission; **118** (repo-ready, not installed) creates missing WAS |
| Duplicate risk | Race if two 031 runs create before either sees the other; formula key enables detection |
| Existing dedupe | 031 searches by Summary Key; errors if duplicates found |
| Live PROD evidence | Schmidt: exactly **1** WAS `rechWp330MqSgRWzN` for Enrollment `recgP9qZYjAhE7NXm` + Week `recVDKiYATgzsfpmE` despite **3** Submissions |
| Orphan pollution | 392 WAS rows with empty Enrollment (legacy) — uniqueness noise for Week-scoped scans |
| Tests | `tools/testing/tests/test_expected_actual.mjs` (WAS uniqueness FAIL path); scenario SCN-016 |
| Missing tests | Concurrent create race simulation |

## 2. Homework Completion

| Contract | One HC per Enrollment + assignment/asset slot (product: one assignment response) |
|----------|----------------------------------------------------------------------------------|
| Intended key | Enrollment + Homework (curriculum) (+ Week where used); 067 quiz uses Enrollment+Week+Homework |
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
| Writers | 013 (and historically 111/112 — **111 deleted** per overnight baseline) |
| Duplicate risks | Duplicate assets; automation reruns; multiple upload callbacks; status transitions |
| XP | 114 keys on VF RID — duplicate VF ⇒ duplicate XP risk |
| Live PROD evidence | 1 Video Feedback row (Schmidt-linked 2026-07-23 per baseline) |
| Note | Confirm 013 alone owns create after 111 deletion (Mike UI attest) |

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
| HC 020 + 067 | Possible second writer | High (decision SC-013/014) |
| WAS 031 + 118 | Future dual when 118 installed | Medium — must share Summary Key find-or-create |
| VF 013 vs deleted 111 | Attest 111 gone | Medium |
| Weekly Threshold XP | Writer missing | High (see XP audit) |

## Fixes applied tonight

- Verifier uniqueness checks + SCN-016 fixture  
- No production writer removals (proof incomplete for 067/threshold)
