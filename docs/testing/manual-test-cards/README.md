# Manual test cards — Shooting Challenge

Plain-English operator cards for controlled Production Airtable testing. These documents describe **what to run**, **what to enter**, **what to expect**, and **how to verify duplicate safety**.

**Rules**

- Use the Automations UI **Run a script** action with a dynamic `recordId` unless the card says otherwise. Testing the trigger alone may not execute the script.
- Do **not** manually create XP Events. All XP families are owned by their canonical automations (010, 065, 059, 101, 114, 054, 035, etc.).
- Production `Automations` table authority is limited to **Name**, **Status**, and **Automation Code**. Do not trust stale trigger/condition columns on that table.
- **063 is retired.** Tremendous and Team Shot Tracker are out of scope for these cards.

| Card | Automation(s) | Primary record(s) |
|------|---------------|-------------------|
| [010 Submission XP](./010-submission-xp-manual-test-card.md) | 010 | Three Submissions (sequential) |
| [064/065 Homework review](./064-065-homework-review-test-card.md) | 064, 065 | HW1 + HW2 Homework Completions |
| [XP duplicate-safe checklist](./xp-duplicate-safe-verification-checklist.md) | All XP writers | Cross-family |
| [041/042 Level recalculation](./041-042-level-recalculation-verification-card.md) | 041, 042 | Enrollment `rec93mAfo5jKqP3g5` |
| [Saturday Perfect Week runbook](./saturday-perfect-week-runbook.md) | 057 → 058 → 059 | Week + WAS |
| [010 v10.10 vs v10.11](./010-v10.10-vs-v10.11-comparison.md) | 010 | Compare only — no paste |
