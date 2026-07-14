# C-027 — DEV OMNI / implementation runbook (Stage 13)

**Status:** Proposal only (no Airtable / provider execution in S13)  
**Package:** `C-027-major-event-notifications-design`  
**Prerequisite:** Owner answers OD-1…OD-5 in the Stage 13 design doc

---

## Hard stops

- No PROD.
- No new SMS/email provider credentials unattended.
- Do not edit **071** or video feedback automations.
- Do not add daily-submission notifications.

---

## Phase 0 — Read-only inventory (DEV)

1. Confirm parent email fields on Enrollments / Contacts.
2. Confirm Schmidt test enrollment id used by Stage 8 gates.
3. Confirm which Shot Milestone / streak XP steps exist for “major” tagging.
4. Check whether any Notification / Email Log table already exists.

---

## Phase 1 — Schema (after OD answers)

1. Create `Notification Sends` (or reuse existing log) with Send Key + Status.
2. Add config flags for major milestones / streak lengths if OD-3/OD-4 need them.
3. Add Testing views: Pending, Failed retry, Sent last 7 days, Skipped.

---

## Phase 2 — Automations (GitHub → DEV)

1. Implement MEN dispatcher script (new number — assign at implementation).
2. Add thin enqueue hooks from **042** / **058** / **054** / **059** paths **or** watchers on unlock/level fields — prefer minimal edits.
3. Wire Make/email scenario only after channel OD-1.
4. Offline contract tests must stay green.

---

## Phase 3 — DEV acceptance

| # | Scenario | Expect |
|---|----------|--------|
| 1 | Level up Active athlete | One parent email; Send Key stored Sent |
| 2 | Rerun same level up | Skip duplicate |
| 3 | Perfect Week unlock | One notify |
| 4 | Hidden athlete | Skip |
| 5 | Schmidt | Skip |
| 6 | Daily submission XP | No MEN row |
| 7 | Homework **071** send | Unchanged behavior |
| 8 | Provider fail then retry | Failed → Sent; one success |

---

## Rollback

Disable dispatcher automation; leave historical `Notification Sends` intact.
