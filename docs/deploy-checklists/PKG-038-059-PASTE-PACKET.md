# PKG-038 Paste Packet — Automation 059 v3.6

**Automation name:** `059 - Achievements and Milestones - Create XP Event from Achievement Unlock`  
**Automation record ID (2026-08-04 export):** `recxDRvpiuvCeeAhC` — **re-verify in UI**  
**Repository script:** `airtable/automations/shooting-challenge/059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js`  
**Copy-ready body:** [PKG-038-059-v3.6-PASTE.txt](./PKG-038-059-v3.6-PASTE.txt)

---

## Paste instructions

1. Turn **059 OFF**.
2. Screenshot current trigger — **if `Ready for 059 XP?` appears in conditions, remove it before paste** (known blocker).
3. Paste **PKG-038-059-v3.6-PASTE.txt**.
4. Configure lifecycle trigger below; save **OFF**.
5. Input `recordId` = dynamic **Athlete Achievement Unlock** ID — **never** WAS ID.

---

## Required trigger

| Setting | Value |
|---|---|
| Table | **Athlete Achievement Unlocks** |
| Type | **When a record is updated** or **created** (lifecycle-reachable) |
| Watched fields | `Active?`, `XP Award Status`, `XP Events`, `Enrollment`, `Shot Milestone`, `Week`, `Milestone Source Key` |
| Forbidden filters | `Ready for 059 XP?`; `Shot Milestone` is not empty; `XP Events` is empty |
| Input `recordId` | Triggering unlock record ID (dynamic) |

**Perfect Week** unlocks must continue to fire (058 → 059). Script routes by `Reward Rule Key` (`PERFECT_WEEK` vs `SHOT_MILESTONE`).

---

## Expected inputs

| Input | Source |
|---|---|
| `recordId` | Triggering Athlete Achievement Unlock |

---

## Expected outputs

| Output | Values |
|---|---|
| `statusOut` | `created` \| `updated` \| `skipped` \| `error` |
| `actionOut` | Action token |
| `errorOut` | Message or empty |
| `debugStep` | Last step |

---

## Fields written (summary)

**XP Events:** `SHOT_MILESTONE|…` or `PERFECT_WEEK|…` Source Keys; full XP payload per [field sheet](./PKG-038-FIELD-DEPENDENCY-SHEET.md).

**Athlete Achievement Unlocks:** `XP Events` link, `XP Award Status`, optional `XP Awarded`, `Notes`.

**Shot milestone lifecycle (v3.6):** inactive exact unlock → deactivate same XP Event; restored `Pending` → reactivate same event ID.

---

## Rollback

1. Turn **059 OFF**.
2. Restore saved script + trigger (including prior trigger if rollback intentionally reverts 059-only).
3. No deletion of XP Events or unlocks.
4. Re-run audit v2.1.

**Related:** [059-perfect-week-trigger-coverage.md](./059-perfect-week-trigger-coverage.md) (historical; superseded by lifecycle contract above for PKG-038).

---

## Dependency sheet

[PKG-038-FIELD-DEPENDENCY-SHEET.md](./PKG-038-FIELD-DEPENDENCY-SHEET.md) § 059.
