# Deploy — SC-159 Automation 059 lifecycle trigger (formula-supported)

| Field | Value |
|-------|--------|
| Item | **SF-08** / **SC-159** — **COMPLETE / Live Tested** (2026-09-04) |
| Supersedes | [`059-sf08-lifecycle-trigger-or.md`](./059-sf08-lifecycle-trigger-or.md) (nested OR **not** representable in Automation UI) |
| Design authority | [`../audits/SC-159-LIFECYCLE-TRIGGER-REDESIGN-20260904.md`](../audits/SC-159-LIFECYCLE-TRIGGER-REDESIGN-20260904.md) |
| Live closeout | [`../audits/SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md`](../audits/SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md) |
| Base | `appn84sqPw03zEbTT` |
| Automation | **059** (`wfltDo4HZxpYlbqn8`) — **059 - Achievements and Milestones - Create XP Event from Achievement Unlock** |
| Script | `airtable/automations/shooting-challenge/059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js` **v3.8** |
| Live today | Script **v3.8**; trigger `059 Lifecycle Trigger?` = 1 only |

**Do not** configure nested OR branches in “When record matches conditions”.  
**Do not** flatten four conditions.  
**Do not** switch to “record enters view” without leave/re-enter proof.  
**Do not** trash FUT-002 Batch 2 quarantined fields until this checklist’s soak passes.

---

## Status

Mike UI steps below are **historical / completed**. Live attestation: formula field present and valid; 059 deployed on formula=1; v3.8 published; disposable withdraw/restore/idempotency/Perfect Week/Error soak **PASS**.

## Mike UI steps (Option 1 — completed 2026-09-04)

### A. Create formula field (Athlete Achievement Unlocks)

1. Open table **Athlete Achievement Unlocks**.
2. Create field:
   - **Name:** `059 Lifecycle Trigger?`
   - **Type:** Formula
   - **Formatting:** Number, precision **0**
3. Paste this formula **exactly**:

```text
IF(
  OR(
    AND(
      {XP Award Status} = "Pending",
      {Active?}
    ),
    AND(
      NOT({Active?}),
      {Shot Milestone},
      {XP Award Status} = "Awarded"
    )
  ),
  1,
  0
)
```

4. Save. Confirm sample rows:
   - Pending + Active? checked → **1** (Perfect Week or Shot Milestone)
   - Awarded + Active? unchecked + Shot Milestone linked → **1**
   - Skipped + Active? unchecked → **0**
   - Awarded + Active? checked → **0**

### B. Reconfigure automation 059

1. Open automation **059** (`wfltDo4HZxpYlbqn8`).
2. Keep type **When a record matches conditions** on **Athlete Achievement Unlocks**.
3. **Remove** conditions on `XP Award Status` and `Active?`.
4. Set the **only** condition to: `059 Lifecycle Trigger?` is **1** (equals 1).
5. Do **not** filter on `Ready for 059 XP?` or `XP Events` empty.
6. Paste GitHub **v3.8** (skip GitHub-only header; paste from production docblock through `await main();`).
7. Confirm input `recordId` → trigger record id.
8. Confirm outputs include `statusOut`, `actionOut`, `errorOut`, `debugStep`, `lifecycleOut`.
9. **Update / publish** so draft = live.

(Checklist does not require turning the automation off first.)

### C. Disposable soak (Schmidt / VERIFY only)

1. **Award:** Pending+Active Shot Milestone unlock → one XP Event; unlock Awarded; formula returns **0**; `lifecycleOut=award` (or restore semantics if XP already linked).
2. **Withdraw:** Clear `Active?` on that Awarded SM unlock → XP `Active?` false; unlock Skipped; Trigger Context withdraw note; `lifecycleOut=withdraw`; formula returns **0**.
3. **Restore:** Set `Active?` checked and `XP Award Status` = Pending → XP reactivated; unlock Awarded; **no second Source Key**; `lifecycleOut=restore`.
4. **Idempotency:** Re-arm Pending on awarded unlock with linked XP → still one Source Key.
5. **Perfect Week:** Pending+Active Perfect Week unlock (Shot Milestone empty) still awards once.

### D. Failure indicators

- Formula stays **1** after settle → re-check formula / status writes.
- Inactive Awarded SM unlock with Active XP and formula **0** → trigger miss.
- Second XP Event for same Source Key → stop; do not continue Batch 2 trash.
- `XP Award Status` = Error / Trigger Context error text → ownership or validation failure (visible).

### E. Rollback

1. Revert 059 trigger to Pending **AND** Active? (previous live shape) if needed.
2. Optionally disable or hide `059 Lifecycle Trigger?` (do not delete until SC-159 closed).
3. Keep script ownership / Source Key checks.

---

## Option 2 (only if formula field is refused)

Create **059B** with the same v3.8 script:

| Automation | Flat AND conditions |
|------------|---------------------|
| **059** | `XP Award Status` is Pending **AND** `Active?` is checked |
| **059B** (new) | `Active?` is not checked **AND** `Shot Milestone` is not empty **AND** `XP Award Status` is Awarded |

Then paste v3.8 into both. Soak matrix identical to §C.

---

## After successful verification

1. ~~Mark SC-159 COMPLETE / Live Tested~~ — **done** 2026-09-04.  
2. FUT-002 Batch 2 UI trash of quarantined stubs still requires the separate early/late asset-intake dependency review (do not trash on SC-159 alone).  
3. Leave `Ready for 059 XP?` in place (do not use as trigger; do not delete in Batch 2).
