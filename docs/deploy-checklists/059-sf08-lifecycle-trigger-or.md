# Deploy — Automation 059 SF-08 lifecycle OR trigger + v3.8 paste

| Field | Value |
|-------|--------|
| Item | **SF-08** / **SC-159** |
| Script | `059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js` **v3.8** |
| Base | `appn84sqPw03zEbTT` |
| Automation | **059** (`wfltDo4HZxpYlbqn8`) |
| MCP note | `customScript` nodes are **read-only via API** — Mike must paste + publish in Airtable UI |

## Why

Live trigger was **positive-only**:

- `XP Award Status` = Pending **AND** `Active?` = true

Clearing `Active?` on an Awarded Shot Milestone unlock **does not re-enter** that set, so 059 never runs withdrawal. Script already supports deactivate/restore; the trigger never reached it (SF-08 silent miss).

## Required UI change (≈2 minutes)

1. Open automation **059**.
2. Keep trigger type **When a record matches conditions** on **Athlete Achievement Unlocks**.
3. Replace conditions with **OR**:
   - **Branch A (award / restore):** `XP Award Status` is `Pending` **AND** `Active?` is checked
   - **Branch B (withdrawal):** `Active?` is **not** checked **AND** `Shot Milestone` is **not empty**
4. Do **not** filter on `Ready for 059 XP?` or `XP Events` empty.
5. Paste GitHub **v3.8** (skip GitHub-only header if present; paste from production docblock through `await main();`).
6. Confirm `recordId` → trigger record id; outputs include `statusOut`, `actionOut`, `errorOut`, `debugStep`, `lifecycleOut`.
7. **Update / publish** so draft = live.

## Soak (disposable only)

1. Awarded SM unlock + linked Active XP → clear `Active?` → expect XP `Active?` false, unlock `Skipped`, Trigger Context withdraw note, `lifecycleOut=withdraw`.
2. Restore `Active?` + `Pending` → expect XP reactivated, unlock `Awarded`, no second Source Key.
3. Fresh Pending+Active SM unlock → one XP Event; re-arm Pending → still one Source Key.

## Rollback

Restore Pending+Active-only filter (not recommended). Keep script ownership checks.

## Related

- Closeout: [`docs/audits/SF-08-059-LIFECYCLE-CLOSEOUT-20260904.md`](../audits/SF-08-059-LIFECYCLE-CLOSEOUT-20260904.md)
- Prior Perfect Week trigger note: [`059-perfect-week-trigger-coverage.md`](./059-perfect-week-trigger-coverage.md)
