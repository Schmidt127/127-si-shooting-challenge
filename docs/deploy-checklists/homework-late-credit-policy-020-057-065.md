# Homework late-credit policy — Production paste (Mike-only)

**GitHub branch:** `feature/homework-late-credit-policy` (merged PR **#372**)  
**Status (2026-09-03 Agent 4):** Production **Automations Code PASTE-ALIGNED** — **020 v3.9 / 065 v10.6 / 057 2.3** Live (MCP read of Name / Status / Automation Code). **Do not paste from agents.** Disposable late-HW / Perfect Week exclusion behavior proof still **REQUIRES LIVE CONFIRMATION**.

## Scripts (versions)

| Automation | GitHub version | Production Automations Code (2026-09-03) | Notes |
|---|---|---|---|
| **020** — Link or Create Homework Completion | **v3.9** | **v3.9 Live** | Late submissions remain `creditEligible`; Notes still record late timing |
| **065** — Create or Reconcile Homework XP Event | **v10.6** | **v10.6 Live** | Late + satisfactory → full HOMEWORK_XP; no longer blocks on due date |
| **057** — Calculate Perfect Week Eligibility | **2.3** | **2.3 Live** | Perfect Week homework count requires **on-time** Submission Date |

If Code column drifts behind GitHub, Mike pastes after DEV verification. Prefer DEV first when a DEV base is available; otherwise disposable Production VERIFY rows only.

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
