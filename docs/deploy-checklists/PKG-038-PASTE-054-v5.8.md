# PKG-038 paste packet — Automation 054 v5.8

**Automation:** 054 — Achievements and Milestones — Streak Occurrences — Create or Repair Streak XP Event  
**Target version:** **v5.8**  
**Repository file:** `airtable/automations/shooting-challenge/054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js`  
**Paste order:** **2 of 4** (after 053, before 066)

---

## Before paste — capture rollback baseline

Same baseline capture as [PKG-038-PASTE-053-v5.5.md](./PKG-038-PASTE-053-v5.5.md) for automation **054**.

Known last attested PROD: **v5.6** (2026-08-05). Assume drift until editor re-checked.

---

## Paste instructions

1. Turn **054 OFF**.
2. Open GitHub file at `git rev-parse HEAD`.
3. Copy from docblock (`* Version: v5.8`) through end; skip GitHub-only header if present.
4. Paste into **054** script action; save.
5. Confirm `CONFIG.version` / docblock shows **v5.8**.
6. Leave OFF until full packet preflight complete.

---

## Trigger requirements (Airtable UI)

| Setting | Required value |
|---------|----------------|
| Table | **Streak Occurrences** |
| Trigger type | **When record updated** |
| Watched fields (minimum) | **Active?**, **Source Status**, **Enrollment**, **Achievement**, **Week**, **Streak End Date**, **XP Events** |
| Positive-only trap | **Do not** require `Source Status = Ready for XP` as the only condition — blocks inactive withdrawal reconciliation |
| Active? trap | **Do not** require `Active?` checked — blocks deactivation path |
| Input `recordId` | Dynamic Streak Occurrence ID |

---

## Expected input fields

From triggering Streak Occurrence:

- Active?, Enrollment, Achievement, Streak Days, Streak End Date, Week, Source Status, XP Events

From Achievement:

- Achievement Name, Trigger Threshold, Reward Rule Key

From XP Reward Rules:

- Active?, Rule Key, XP Amount (exactly one active row per Rule Key)

From XP Events (lookup / query):

- Source Key, Active?, links

From Weekly Athlete Summary (optional resolve):

- Enrollment + Week match

---

## Output fields

| Output | Values |
|--------|--------|
| `statusOut` | `created` \| `updated` \| `skipped` \| `error` |
| `actionOut` | documented action token |
| `errorOut` | message or empty |
| `debugStep` | last step |

---

## Fields written by 054

**XP Events (create/update):** Active?, Source Key (`STREAK_XP|…`), Enrollment, Week, Weekly Athlete Summary, Streak Occurrence, XP Points, XP Source, XP Bucket (`Streak`), XP Activity Date, XP Activity Date Source (`Streak End Date`), Award Mode, Processed, XP Award Status.

**Streak Occurrences (update):** Source Status → Awarded (on success path), Last Evaluated At, Notes.

**Never:** deletes XP Events; never writes Submission Base XP; never replaces unrelated XP family links.

---

## Canonical Source Key

```
STREAK_XP|<Enrollment ID>|<Achievement ID>|<Streak End Date YYYY-MM-DD>
```

Date segment uses **America/Denver** (not UTC ISO slice).

---

## Enablement

Enable after 053, before 066/059, per master packet.

---

## Post-paste smoke

1. Pick existing active Streak Occurrence for `recCyFEPeATOVNlr9` with Source Status Awarded.
2. Rerun 054 via record touch — expect `skipped` or `updated` with **same** XP Event ID.
3. Withdraw streak via 053 (middle submission exclusion) — 054 must set linked `STREAK_XP` **Active?** false without deleting row.
4. Restore submission — same XP Event ID reactivates.

---

## Rollback

Turn OFF → paste captured **v5.6** (or last known good) script → restore trigger → audit. Preserve all XP Event record IDs.
