# FUT-041 — Daily Submission XP Earned | Extra Credit columns

**Backlog:** FUT-041  
**Branch (Shooting Challenge):** `cursor/fut-041-daily-xp-columns-e772`  
**Branch (Communications Hub):** `cursor/fut-041-daily-xp-columns-e772`  
**Status:** **COMPLETE** (2026-09-01) — **076 v8.12** Production + Hub **FUT-041** deployed

## Decision: display-time split (no XP award logic change)

Investigation (2026-09-01):

| Question | Answer |
|----------|--------|
| Does daily submission store base XP and extra credit separately? | **No.** Automation **010** creates one active `SUBMISSION_XP\|{Submission}` XP Event with shooting-base points only. Submissions have no `Extra Credit XP Awarded` field. |
| Does homework extra credit apply to the daily submission email? | **Not in this slice.** Homework extra credit lives on **Homework Completions** (`Extra Credit XP Awarded`) and **HOMEWORK_XP** events (FUT-031 display-only tagline on Game Log). Daily acknowledgement email shows submission shooting XP only. |
| Is a schema / award-logic change required? | **No.** Display-time split from existing stored values is sufficient. |

**Field mapping (076 → Hub → template):**

| Column | Payload field | Source | Pending behavior |
|--------|---------------|--------|------------------|
| **XP Earned** | `xpEarned` (fallback: `submissionXp`) | Sum of active XP Events linked to the Submission whose `Source Key` starts with `SUBMISSION_XP\|` | `null` + `submissionXpStatus: "Pending / not yet awarded"` |
| **Extra Credit** | `xpExtraCredit` | Always `0` from **076** until a future approved daily extra-credit source exists | Always renders **`0`** |

Backward compatibility: **076** still sends `submissionXp` equal to `xpEarned`.

## Files changed

**127-si-shooting-challenge**

- `airtable/automations/shooting-challenge/076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js` (v8.12)

**Schmidt127/communications**

- `emails/daily-submission-email.js` — horizontal `XP Earned` \| `Extra Credit` columns (email-safe table row)
- `emails/lib/formatters.js` — `formatXpEarned`, `formatXpExtraCredit`
- `lib/welcome-processor.js` — optional numeric validation for new fields
- `docs/contracts/DAILY_SUBMISSION_v1.md`
- `tests/daily-submission-email.test.mjs`
- `tests/welcome-source-contract.test.mjs`

## Example payload → rendered snippet

**Payload (excerpt):**

```json
{
  "athleteName": "Curtis Schmidt",
  "activityDate": "Aug. 21, 2026",
  "weekName": "Week 1",
  "shots": 120,
  "makes": 84,
  "xpEarned": 10,
  "xpExtraCredit": 0,
  "submissionXp": 10,
  "currentStreak": 3
}
```

**Rendered HTML (metric labels + values):**

```html
<!-- Row: Current Day Streak | XP Earned | Extra Credit -->
... CURRENT DAY STREAK ... 3 days ...
... XP EARNED ... 10 ...
... EXTRA CREDIT ... 0 ...
```

Pending example: `xpEarned: null`, `submissionXpStatus: "Pending / not yet awarded"`, `xpExtraCredit: 0` → **XP Earned** shows pending text; **Extra Credit** shows **0**.

## DEV validation (run before Production)

```bash
# Shooting Challenge repo
node tools/testing/tests/test_076_email_handoff_runtime.mjs
node tests/email/automation-072-076-canonical-reporting.test.js

# Communications Hub repo (/workspace/communications)
npm test
```

## Production promotion (complete — 2026-09-01)

1. [x] **076 v8.12** pasted into Production Airtable automation **076** (Mike, 2026-09-01).
2. [x] Communications Hub **FUT-041** template deployed.
3. [x] Daily submission parent email shows **XP Earned** and **Extra Credit** columns; Extra Credit **0** when none awarded.
4. [x] `CHANGELOG.md` ### Airtable updated.

**Do not re-paste 076** unless a regression is proven. Do not change automation **010**, homework/video XP writers, or Hub homework/video templates.
