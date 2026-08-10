# Mike Action List — Automation Launch Closeout

**Date:** 2026-08-10  
**Scope:** Production Airtable UI actions only. Repository work is complete on branch `cursor/automation-launch-closeout-bffb`.

---

## Required before 2026–27 intake reopens

### 1. Paste and verify Automation **053 v5.3** (highest priority gap)

- Open **053 - Achievements and Milestones - Streak Occurrences - Rebuild and Upsert From Submissions**
- Replace entire script from `airtable/automations/shooting-challenge/053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js` (docblock through end; skip GitHub header)
- Confirm input `recordId` mapped
- Run Test on Submission `recElDBcFvuE6jWwc`
- Capture: editor version **5.3**, console JSON, streak occurrence count before/after
- Replay same submission — no duplicate occurrences
- Leave automation **ON**

### 2. Paste Automation **020 v3.4.0** (homework intake)

- PROD editor currently shows **v3.0.0** — upgrade to repo **v3.4.0**
- File: `airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js`
- Verify active PHA row exists for test Enrollment + Week + slot before testing
- Re-submit homework asset twice in same week — must merge to **one** Homework Completion
- Capture console version + HC record ID

---

## Verify only (already installed — do not re-paste unless version drift)

| Automation | Expected PROD version | Quick check |
|------------|----------------------|-------------|
| 023 | v3.1 | Editor version string |
| 010 | 10.6 | Editor version string |
| 031 | v3.5 | Editor version string |
| 066 | v3.5 | Editor version string |
| 118 | v1.7 | Schedule ON; inputs `dryRun=false`, `sendMode=Live`, `includeSchmidt=false` |
| 119 | v1.7 | Schedule ON; inputs `dryRun=false`, `includeSchmidt=false` |

---

## Do not do

- **Do not create or enable Automation 043** — no native slot exists; 042 v3.3 owns progression
- **Do not use Enrollment `recgP9qZYjAhE7NXm`** for current-season tests
- **Do not combine `includeSchmidt=true` with `sendMode=Live`** on 118
- **Do not re-paste 066** unless source changes — live replay PASS already recorded 2026-08-08

---

## Await first real completed week (non-blocking for intake)

When the first parent-facing week ends:

1. Confirm 118 arms `Build Weekly Email Now?` on eligible WAS rows (PI-scoped)
2. Confirm 119 arms `Send to Make?` only (no webhook from 119)
3. Confirm 072 builds package; 074 posts Make webhook
4. Capture one Test-mode email before Live season send if not already done

---

## Program decisions (if blocked)

| Decision | Context |
|----------|---------|
| PHA row missing for homework test | 020 v3.4.0 fails closed without exact active PHA — confirm PHA matrix before homework paste |
| 053 inventory vs editor version | Governance table may show v5.0 — trust **editor** version after paste |
| 118/119 positive path timing | Fail-safe path proven; positive arming needs real Week End Date match |

---

## Reply to Cursor after actions

1. 053 paste done + Test console JSON + replay result  
2. 020 paste done + re-submit merge proof (or PHA blocker note)  
3. Optional: editor version screenshots for 023/010/031/066/118/119 confirming no drift
