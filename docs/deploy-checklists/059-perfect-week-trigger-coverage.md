# Deploy / Live Verification — Automation 059 Perfect Week trigger coverage

| Field | Value |
|-------|--------|
| SC items | SC-077, SC-028, SC-026 (adjacent), SC-107 (Visible?) |
| Script | `059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js` **v3.6** (GitHub + Automations Code 2026-08-21; cosmetic Reason Debug still said v3.5 in Prod Code until next paste) |
| PROD base | `appn84sqPw03zEbTT` |
| Status | Trigger guidance remains: Pending-only (no Shot Milestone filter). CASE-01 data path proven via 059-contract award. Run **only after** 057 eligibility + 058 unlock. |
| Evidence | `docs/testing/evidence/2026-08-05-agent3-perfect-week/` |

## Problem proven in PROD (2026-08-05)

| Step | Result | ID |
|------|--------|----|
| 057 eligibility | PASS (prior package) | WAS `recKebuZ79QFTwivA` |
| 058 unlock | PASS (auto) | Unlock `recALZFQNL3XicEOX` |
| 059 auto-fire | **FAIL** — unlock stayed Pending; Shot Milestone empty; status bounce did not fire | see `059-RETRIGGER-BOUNCE.json` |
| XP award (059 v3.5 contract) | PASS | XP Event `recMdcI5lN8gJ6830` |
| Idempotent re-award | PASS — still exactly one Source Key | `AWARD-LIVE.json` |

**Root cause:** Recommended / live trigger that requires **Shot Milestone is not empty** blocks Perfect Week unlocks from Automation **058**.

## Required PROD UI change (Mike / Omni — 2 minutes)

1. Open automation **059**.
2. Trigger: **When a record is created** on **Athlete Achievement Unlocks**.
3. Conditions:
   - `XP Award Status` is `Pending`
   - **Remove** `Shot Milestone is not empty` (if present)
4. Do **not** filter on `Ready for 059 XP?` or `XP Events` empty.
5. Confirm script input `recordId` mapped; outputs `statusOut` / `actionOut` / `errorOut` / `debugStep`.
6. Script body: keep **v3.6** (cosmetic debug-string paste optional). Do not run before 057→058 confirms one Pending Perfect Week unlock.

### Optional soak test after trigger fix

1. Create a fresh Perfect Week-eligible WAS (or clear unlock+XP on a throwaway fixture and re-run 058→059).
2. Expect: one unlock + one XP Event with Source Key `PERFECT_WEEK|{enrollmentId}|{weekId}`.
3. Re-run 059 Test on same unlock → skip/link existing; no second XP.

### Manual Test (without waiting for new fixture)

Automation **059** → Test → `recordId` = a **Pending** Perfect Week unlock (after resetting Awarded→Pending and unlinking XP on a throwaway only). Do not unlink CASE-01 production-proof XP `recMdcI5lN8gJ6830` unless intentionally retesting.

## CASE-01 proven IDs (do not recreate)

| Role | ID |
|------|----|
| WAS | `recKebuZ79QFTwivA` |
| Enrollment | `recCyFEPeATOVNlr9` |
| Week | `reci5GdxEC57vfoS3` |
| Unlock | `recALZFQNL3XicEOX` |
| XP Event | `recMdcI5lN8gJ6830` |
| Source Key | `PERFECT_WEEK\|recCyFEPeATOVNlr9\|reci5GdxEC57vfoS3` |
| Amount / Bucket / Source | 100 / Perfect Week / Perfect Week |
| Activity date source | Perfect Week End Date |

WAS `XP Earned This Week` moved **213 → 313** after award.

## MVP decision locked (Agent 3)

**P1:** Single 059 automation, **Pending-only** created trigger (covers Shot Milestone + Perfect Week). Do not add a second automation slot unless Airtable conditions cannot express this.

## Rollback

Re-add Shot Milestone filter only if Perfect Week must be isolated — not recommended.

## Related

- `docs/v2/AUTOMATION_059_TRIGGER_RESOLUTION.md` (Production-era; Perfect Week caveat §4.2 now resolved as P1)
- `tools/testing/award_perfect_week_059.mjs`
- `tools/testing/verify_perfect_week_chain.mjs`
