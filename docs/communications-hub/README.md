# Communications Hub — Shooting Challenge integration docs

**Scope:** Shooting Challenge (`127-si-shooting-challenge`) handoffs into the **Communications Hub** (separate Airtable base / system). This folder documents the Shooting Challenge side only.

| Doc | Purpose |
|-----|---------|
| [WELCOME-EMAIL-INTEGRATION.md](./WELCOME-EMAIL-INTEGRATION.md) | Live contract, proven vs pending, audit notes |
| [../deploy-checklists/WELCOME-EMAIL-ACTIVATION-CHECKLIST.md](../deploy-checklists/WELCOME-EMAIL-ACTIVATION-CHECKLIST.md) | Pre-participant-send gates |
| [../deploy-checklists/WELCOME-EMAIL-CONTROLLED-TEST-RUNBOOK.md](../deploy-checklists/WELCOME-EMAIL-CONTROLLED-TEST-RUNBOOK.md) | Controlled test procedure |

**Naming note:** Completion item **SC-079** (*gate blocking*) uses Automation **042** — it is unrelated to **Automation slot 079** (*shared Email Handoff Queue → Communications Hub dispatcher*).

## Parent-email Hub migration status (GitHub only — not live until paste)

| Source automation | Event / template | Dedupe key | GitHub status | Live Airtable |
|-------------------|------------------|------------|---------------|---------------|
| **075 / queue** | `WELCOME` | `WELCOME\|…` | Live path (see welcome docs) | Per welcome checklist |
| **076** | `DAILY_SUBMISSION` | `DAILY_SUBMISSION\|SUBMISSIONS\|{Submission}` | Hub queue create | Paste when approved |
| **073** v4.0 | `VIDEO_FEEDBACK` | `VIDEO_FEEDBACK\|VIDEO_FEEDBACK\|{VF}` | Hub queue create in GitHub | Not live until paste |
| **071** v4.0 | `HOMEWORK_FEEDBACK` | `HOMEWORK_FEEDBACK\|HOMEWORK_COMPLETIONS\|{HC}` | Hub queue create in GitHub | Not live until paste |
| **074** v3.0 | `WEEKLY_ATHLETE_SUMMARY` | `WEEKLY_ATHLETE_SUMMARY\|WEEKLY_ATHLETE_SUMMARY\|{WAS}` | Hub queue create in GitHub | Not live until paste |
| **117** v2.0 | `ZOOM_RECORDING_APPROVED` | `ZOOM_RECORDING_APPROVED\|ZOOM_ATTENDANCE\|{ZA}` | Hub queue create in GitHub | Not live until paste |
| **079** v2.2 | Shared dispatcher | Validates keys above | Accepts WELCOME, DAILY, VIDEO, HOMEWORK, WEEKLY, ZOOM | Not live until paste |

**Shared rule:** Source scripts create **Email Handoff Queue** rows only. **Automation 079** is the only SC script that POSTs to Communications Hub ingress. `testMode` defaults **true** on new Hub creates. Do not enable live parent sends until Mike pastes + controlled test.

**Make.com:** Remains **OFF** for welcome and for GitHub Hub-migrated parent-email paths above. Production Make scenarios stay untouched until an explicit paste/cutover.
