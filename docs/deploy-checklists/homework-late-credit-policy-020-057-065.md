# Homework late-credit policy — Production paste (Mike-only)

**GitHub branch:** `feature/homework-late-credit-policy`  
**Status:** Repository complete — **do not paste from agents**. Mike pastes after DEV verification.

## Scripts to paste (Mike-only, after DEV)

| Automation | GitHub version | Notes |
|---|---|---|
| **020** — Link or Create Homework Completion | **v3.9** | Late submissions remain `creditEligible`; Notes still record late timing |
| **065** — Create or Reconcile Homework XP Event | **v10.6** | Late + satisfactory → full HOMEWORK_XP; no longer blocks on due date |
| **057** — Calculate Perfect Week Eligibility | **2.3** | Perfect Week homework count requires **on-time** Submission Date |

Paste path: GitHub → Airtable Scripting action (skip GitHub header). Prefer DEV first when a DEV base is available; otherwise disposable Production VERIFY rows only.

## Policy summary

- Late homework receives **full XP / credit** once marked satisfactory.
- **Submission Date** = student submit day (grading delay does not penalize).
- Needs Revision / unsatisfactory → no homework XP.
- Revisions update existing completion + `HOMEWORK_XP\|{hcId}` — no duplicates.
- Late homework does **not** count toward Perfect Week for the original week (enforced in **057**, not by withholding XP).

## Perfect Week field path (verify in Airtable — no schema invent)

057 writes:

- `Perfect Week Homework Assigned Count`
- `Perfect Week Homework Satisfactory Count` (**on-time satisfactory only** after v2.3)
- `Perfect Week Homework Requirement Met?`

Formula (unchanged; consumes 057 counts):

- `Perfect Week Eligible?` requires `Perfect Week Homework Requirement Met? = 1` among other gates.

Due date for on-time compare: `PHA.Due Date` when present, else `Weeks.End Date`. Compare against `Homework Completions.Submission Date`.

## Web

Private dashboard + public homework credit labels updated to show late timing without “no credit” for late-only.

## Do not

- Paste from Cursor/agents into Production without Mike approval
- Change Hub / Resend / Make / season-sim formulas in this package
- Touch automations 003 / 067 / 101 / 117 / SC-147 / 121
