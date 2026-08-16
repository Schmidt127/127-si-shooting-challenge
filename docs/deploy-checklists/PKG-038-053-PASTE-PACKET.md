# PKG-038 Paste Packet — Automation 053 v5.5

**Automation name:** `053 - Achievements and Milestones - Streak Occurrences - Rebuild and Upsert From Submissions`  
**Automation record ID (2026-08-04 export):** `recgH5hQgJA9IfLQE` — **re-verify in UI**  
**Repository script:** `airtable/automations/shooting-challenge/053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js`  
**Copy-ready body:** [PKG-038-053-v5.5-PASTE.txt](./PKG-038-053-v5.5-PASTE.txt) (docblock through end; GitHub header omitted)

---

## Paste instructions

1. Turn automation **OFF**.
2. Screenshot current version, trigger, and ON/OFF state → evidence folder.
3. Replace script action body with contents of **PKG-038-053-v5.5-PASTE.txt** only.
4. Configure trigger per **Required trigger** below; save while still **OFF**.
5. Map script input `recordId` = dynamic triggering **Submission** record ID.
6. Enable only after preflight audit PASS and per [production packet](./PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md) order.

---

## Required trigger

| Setting | Value |
|---|---|
| Table | **Submissions** |
| Type | **When a record is updated** (or equivalent that fires on correction fields) |
| Watched fields | `Enrollment`, `Activity Date`, `Count This Submission?`, `Total Shots Counted` |
| Conditions | Must fire on positive, exclusion, date, and owner changes — **no** narrow filter that skips corrections |
| Input `recordId` | Triggering Submission ID (dynamic) |

**Do not** use a fixed `rec…` test ID in production mapping.

---

## Expected inputs

| Input | Source | Validation |
|---|---|---|
| `recordId` | Triggering Submission | Non-empty, starts with `rec` |

---

## Expected outputs

| Output | Values |
|---|---|
| `statusOut` | `success` \| `skipped` \| `error` |
| `actionOut` | e.g. `rebuilt_and_upserted_streak_occurrences`, `skipped_missing_trigger_submission`, … |
| `errorOut` | Message or empty |
| `debugStep` | Last step reached |

Console JSON includes `automation`, `version` **5.5**.

---

## Fields written (summary)

**Streak Occurrences:** `Active?`, `Enrollment`, `Achievement`, `Streak Days`, `Streak Start Date`, `Streak End Date`, `Week`, `Source Status`, `Source Submission Date`, `Trigger Submission Date`, `Last Evaluated At`, `Notes`.

**Never writes:** XP Events, `Streak Occurrence Key`, Submission fields.

---

## Rollback (this automation only)

1. Turn **053 OFF** immediately on failure.
2. Paste back **saved pre-paste script body** (not an older repo copy unless Mike approves that version string).
3. Restore **saved trigger** screenshots/configuration.
4. Leave all Streak Occurrence and XP Event records **unchanged** (no deletes).
5. Re-run read-only achievement XP audit; attach JSON to evidence folder.
6. Record final ON/OFF state.

**Do not** delete occurrences or XP Events to “fix” a bad run.

---

## Dependency sheet

Full field types and links: [PKG-038-FIELD-DEPENDENCY-SHEET.md](./PKG-038-FIELD-DEPENDENCY-SHEET.md) § 053.
