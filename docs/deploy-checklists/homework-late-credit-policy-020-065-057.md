# Homework late-credit policy — Production paste notes (020 v3.9 / 065 v10.6 / 057 v2.3)

**Status:** Repository complete — **DEV / disposable proof required before Production paste**  
**Backlog:** SC-112 / SC-023 audit § D (homework timing policy)  
**Branch:** `feat/homework-late-credit-policy`  
**Mike approval required?** **YES** before any Production paste  
**Banned this wave:** Automations **003 / 067 / 101 / 117 / SC-147**; do **not** create **121**; no live Airtable writes from agents; no email send; no season sim; no merge; no Vercel env changes.

---

## Policy (canonical)

| Rule | Behavior |
|------|----------|
| Completable when | Before / during / after official week |
| Late homework | **Full credit + normal XP** once **Satisfactory?** |
| Grading delay | Must **not** penalize — **Submission Date** = student submit/activity date |
| Needs Revision | **No XP** until Satisfactory |
| Revisions | Update existing HC (Enrollment+PHA identity) — **no duplicate HC/XP** |
| Late counts toward | History, XP, level gates, private dashboard |
| Late does **not** count toward | **Perfect Week** for the original week |
| Reporting | PHA week for week reporting; Submission Date for activity / late status |

---

## Scripts to paste (after merge + disposable proof)

Paste from production docblock (`/************************************************************` or `/***` block) through EOF. **Skip** the GitHub-only header above the production docblock.

| Automation | Repo version | Script path |
|------------|--------------|-------------|
| **020** | **v3.9** | `airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js` |
| **065** | **v10.6** | `airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js` |
| **057** | **2.3** | `airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js` |

Suggested paste order: **020 → 065 → 057** (credit/XP first, then Perfect Week exclusion).

### Automation 020 — Link or Create Homework Completion

1. Open Production automation **020**.
2. Replace Run a script body with repo **v3.9**.
3. Confirm `SCRIPT.version = "v3.9"`.
4. Confirm `recordId` = triggering **Submission Assets** Record ID (dynamic).
5. Optional outputs: `creditEligible`, `timingStatus` (`late` when after due), `dueDateKey`.
6. Save / keep Live after disposable proof.

### Automation 065 — Create or Reconcile Homework XP Event

1. Open Production automation **065**.
2. Replace Run a script body with repo **v10.6**.
3. Confirm `SCRIPT.version = "v10.6"`.
4. Confirm `recordId` = triggering **Homework Completion** Record ID (dynamic).
5. Confirm late submissions are **not** blocked — Satisfactory? remains the XP gate.
6. Source Key unchanged: `HOMEWORK_XP|{homeworkCompletionId}`.

### Automation 057 — Calculate Perfect Week Eligibility

1. Open Production automation **057**.
2. Replace Run a script body with repo **2.3**.
3. Confirm Version **2.3** and late homework exclusion helpers (`isHomeworkSatisfactoryForPerfectWeek`).
4. Confirm `recordId` = triggering **Weekly Athlete Summary** Record ID (dynamic).
5. Confirm Config field name remains `Perfect Week Video Minimum` (no typo).

---

## Disposable verification (Schmidt / test enrollments only)

1. **On-time** — submit on/before PHA Due Date → Satisfactory → one `HOMEWORK_XP|{hcId}`; Perfect Week homework gate can count it.
2. **Late** — submit after due → HC created with late Notes → Satisfactory → **XP awarded** (full); Notes say full credit; Perfect Week homework gate for that week does **not** count it.
3. **Delayed grading** — on-time Submission Date, coach grades later → still on_time / XP when Satisfactory.
4. **Needs Revision** — not Satisfactory → **no** positive XP (065).
5. **Revision** — second upload same Enrollment+PHA → same HC; still one XP Event.
6. **No double-count** — late XP counts once toward history/gates; not toward Perfect Week for original week.

---

## Web (no Airtable paste)

`web/lib/data/public-athlete-homework.ts` `resolveHomeworkCreditEligibility` + homework credit labels:

- Late + Satisfactory / XP → credit earned (late)
- Late + awaiting review → pending (not “no credit”)
- Past-due not started / not accepted → no credit

Deploy with normal Vercel `web` path after Mike merges — **no env var changes**.

---

## Offline verification

```bash
node --test tests/homework/homework-late-credit-policy.test.js
node --test tests/homework-contracts/assignment-identity.test.js
node --test tests/homework/automation-005-020-pha-direct.test.js
node tests/homework/automation-020-sc016-identity.test.js
node airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js
node --test tests/automation-contracts/057-perfect-week-video-minimum.test.js
cd web && npx vitest run lib/data/public-athlete-homework.test.ts components/athlete/homework-assignments.test.ts
```

---

## After Production paste

1. Update `CHANGELOG.md` under `### Airtable` with Live versions.
2. Update `docs/AUTOMATION_VERSION_INVENTORY.md` rows for 020 / 065 / 057.
3. Update `docs/CURRENT-TRUTH.md` homework rows if they cite prior versions.
