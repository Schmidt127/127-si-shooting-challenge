# PKG-038 Paste Packet — Automation 054 v5.8

**Automation name:** `054 - Achievements and Milestones - Streak Occurrences - Create or Repair Streak XP Event`  
**Automation record ID (2026-08-04 export):** `recb8cKBqAPjh1A2J` — **re-verify in UI**  
**Repository script:** `airtable/automations/shooting-challenge/054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js`  
**Copy-ready body:** [PKG-038-054-v5.8-PASTE.txt](./PKG-038-054-v5.8-PASTE.txt)

---

## Paste instructions

1. Turn **054 OFF** (053 may be pasted first; both remain OFF until proof order).
2. Screenshot version, trigger, mapping, ON/OFF.
3. Paste **PKG-038-054-v5.8-PASTE.txt** into script action.
4. Configure lifecycle trigger below; save **OFF**.
5. Input `recordId` = dynamic triggering **Streak Occurrences** record ID.

---

## Required trigger

| Setting | Value |
|---|---|
| Table | **Streak Occurrences** |
| Type | **When a record is updated** |
| Watched fields | `Active?`, `Source Status`, `Enrollment`, `Achievement`, `Week`, `Streak End Date`, `XP Events` |
| Conditions | **Do not** require only `Source Status = Ready for XP` as a positive-only gate — inactive withdrawal must reach 054 |
| Input `recordId` | Triggering Streak Occurrence ID (dynamic) |

---

## Expected inputs

| Input | Source |
|---|---|
| `recordId` | Triggering Streak Occurrence |

---

## Expected outputs

| Output | Values |
|---|---|
| `statusOut` | `created` \| `updated` \| `skipped` \| `error` |
| `actionOut` | Documented action token |
| `errorOut` | Message or empty |
| `debugStep` | Last step |

---

## Fields written (summary)

**XP Events:** canonical `STREAK_XP|{enrollment}|{achievement}|{endDate}` — `Enrollment`, `Week`, `Weekly Athlete Summary`, `Streak Occurrence`, `XP Points`, `XP Source`, `XP Bucket`, `Source Key`, `XP Activity Date`, `XP Activity Date Source`, `Active?`, `XP Award Status`, reasons, `Award Mode`, `Processed`.

**Streak Occurrences:** `Source Status` → `Awarded` (or `Error`), `XP Events` link append, `Last Evaluated At`, `Notes`.

---

## Rollback

1. Turn **054 OFF**.
2. Restore saved pre-paste script + trigger.
3. **Never delete** XP Events or occurrences; deactivate only exact-owned event if Mike approves containment.
4. Preserve run history and audit JSON.
5. Re-run read-only audit.

---

## Dependency sheet

[PKG-038-FIELD-DEPENDENCY-SHEET.md](./PKG-038-FIELD-DEPENDENCY-SHEET.md) § 054.
