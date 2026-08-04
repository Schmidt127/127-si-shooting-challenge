# Automation 067 v2.0 — PROD Install Log

| Field | Value |
|-------|--------|
| Date started | 2026-08-04 |
| Date completed | 2026-08-04 |
| Base | `appn84sqPw03zEbTT` |
| Target | Paste repo **v2.0** Option B; prove Schmidt T1/T2 + 064→065 XP |
| Result | **PASS — complete PROD proof** |
| Comparison authority | [`067-PROD-V1-COMPARISON.md`](./067-PROD-V1-COMPARISON.md) |
| Install packet | `docs/next-wave/homework-pipeline/067-OPTION-B-PROD-INSTALL.md` |

## Install procedure status

| Step | Status | Evidence |
|------|--------|----------|
| 1. Confirm automation name / ON-OFF | **Done** | Mike paste + live runs succeeded (HC + Processed quiz rows) |
| 2. Trigger = Final Reflection Quiz Submissions | **Confirmed** | Two quiz attempts triggered 067 |
| 3. Input `recordId` | **Confirmed** | |
| 4. Save v1.0 rollback | **Done** | [`067-PROD-v1.0-baseline-from-git-1fa4e01.js`](./067-PROD-v1.0-baseline-from-git-1fa4e01.js) |
| 5. Paste v2.0 script | **Done** | Mike pasted from [`067-v2.0-PROD-PASTE.txt`](./067-v2.0-PROD-PASTE.txt) |
| 6. Do not modify 020 | Preserved | |
| 7. Do not change 064/065 scripts | Preserved | 064/065 awarded exactly one XP after coach review |
| 8. No manual XP Events | Preserved | |
| 9. Preserve trigger | Preserved | |
| 10. Header reports v2.0 | **Confirmed by live behavior** | HW1 Item/Asset slots; 0 fake assets; multi-attempt link |

## Live tests

| Test | Status | Evidence file |
|------|--------|---------------|
| T1 Option B zero-asset | **PASS** | [`067-T1-OPTION-B-ZERO-ASSET.md`](./067-T1-OPTION-B-ZERO-ASSET.md) |
| T2 idempotency / multi-attempt | **PASS** | [`067-T2-IDEMPOTENCY.md`](./067-T2-IDEMPOTENCY.md) |
| Coach → 064/065 XP | **PASS** | [`067-HOMEWORK-XP-CONTINUATION.md`](./067-HOMEWORK-XP-CONTINUATION.md) |

## Confirmed PROD records (summary)

| Kind | Record ID | Notes |
|------|-----------|-------|
| Quiz attempt 1 | `recxtTv0AD7G3XpGv` | 2026-08-04 3:23 PM · score 6/18 · Processed |
| Quiz attempt 2 | `recFsN2KruSnerfns` | 2026-08-04 3:31 PM · score 4/18 · Processed |
| Homework Completion | `recrBnHbLvDpFyIeO` | Enrollment Testing Schmidt · Week 10 · HW1 · Fillout · Reviewed / Satisfactory · 0 assets |
| XP Event | `rec6xE4V1t0atiTIP` | `HOMEWORK_XP\|recrBnHbLvDpFyIeO` · 35 pts · exactly one |

## Product rules proven

1. **Multiple quiz attempts are intentionally preserved** as separate Final Reflection Quiz Submissions rows.
2. **Homework Completion identity** = Enrollment + Week + Homework (not one HC per quiz attempt).
3. **Repeated attempts reuse the same Homework Completion** (`recrBnHbLvDpFyIeO`).
4. **Automation 067 creates no XP.**
5. **Automations 064 and 065** created exactly one 35-point XP Event after coach review.

## SC status

| SC | Change this package |
|----|---------------------|
| SC-013 | **Built in Repository → Live Tested in PROD** |
| SC-014 | **Built in Repository → Live Tested in PROD** (Option B attachment-less proven) |

## Next action (Package 2 continuation)

Paste **Automation 057 v1.4** from `docs/deploy-checklists/057-perfect-week-denver-v1.4.md` (open PROD Automations → existing **057** → replace script body only).
