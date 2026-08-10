# Shooting Challenge PROD Operating Mode

> **Historical reference only — not an active source of truth.**
> The historical PROD-first experiment is preserved here for context. The
> current release-status authority is the
> [`Completion Master`](./SHOOTING_CHALLENGE_COMPLETION_MASTER.md), and
> ownership/evidence boundaries are defined in the
> [`Authority Map`](./AUTHORITY-MAP.md).

This document records the temporary operating posture used during the 2026
empty-base rebuild. It does not override the repository's DEV-first,
Mike-approval, no-production-mutation, or historical-preservation guardrails.
Do not use its old PROD-first instructions for new work.

All sections below are retained as historical evidence of that temporary
posture. They are not current operating instructions.

| Field | Value |
|-------|--------|
| Created | 2026-08-04 |
| Last updated | 2026-08-04 |
| Environment | PROD-first |
| PROD Airtable base | `appn84sqPw03zEbTT` |
| Scope | Shooting Challenge application and Airtable ecosystem |

---

## Controlling working rules

1. **Airtable PROD `appn84sqPw03zEbTT` is the active construction, configuration, and testing environment.**

2. **Do not require DEV-first work unless Mike explicitly requests it.**

3. **Historical participant data does not need to be preserved.**

4. **Controlled Schmidt testing records may be created, changed, deleted, rebuilt, or backfilled freely.**

5. **Nothing is currently serving active users:**
   - the Airtable application is not currently in live participant use
   - public website traffic is not an operational constraint
   - Fillout intake is not open for real participants
   - no current season depends on uninterrupted behavior

6. **A failed test or temporary PROD break is acceptable if it is immediately diagnosed and repaired.**

7. **Speed is important, but dependency safety remains mandatory.**

8. **Before changing a field, formula, option, table, automation, script, view, Make scenario, Fillout mapping, Lambda workflow, website query, XP rule, or dedupe key:**
   - identify upstream and downstream dependencies
   - identify every writer to the affected field
   - preserve dedupe and source-key behavior
   - record the rollback or repair path

9. **Complete one logical work package at a time.**

10. **Install and test each package directly in PROD.**

11. **After each successful package:**
    - file evidence
    - update `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`
    - commit
    - push
    - open or update the PR
    - merge promptly after checks pass

12. **Repository code is not considered installed or live-tested until PROD proof exists.**

13. **Use the best available tool for each action:**
    - **Cursor** for repository inspection, scripts, testing, evidence, commits, PRs, and deployment work
    - **Omni** for Airtable UI inspection, views, fields, formulas, automation configuration, and dependency-aware PROD actions
    - **ChatGPT** for package sequencing, decision review, debugging, prompts, and cross-system coordination

14. **Do not delay because the system is not currently live.** Prefer repairable forward progress over excessive caution.

15. **Do not make unrelated cleanup changes inside a functional work package.**

16. **The controlling source of truth remains:**  
    `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`
