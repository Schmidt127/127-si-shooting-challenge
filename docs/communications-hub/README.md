# Communications Hub — Shooting Challenge integration docs

**Scope:** Shooting Challenge (`127-si-shooting-challenge`) handoffs into the **Communications Hub** (separate Airtable base / system). This folder documents the Shooting Challenge side only.

| Doc | Purpose |
|-----|---------|
| [WELCOME-EMAIL-INTEGRATION.md](./WELCOME-EMAIL-INTEGRATION.md) | Welcome contract, proven vs pending |
| [FUT-047-homework-feedback-contact-copy.md](./FUT-047-homework-feedback-contact-copy.md) | Homework feedback monitored contact copy (FUT-047) |
| [../integrations/email-send-plane.md](../integrations/email-send-plane.md) | **Current** email delivery plane (Resend; Make is not the email sender) |
| [TEMPLATES-REGISTRY-AUDIT-2026-08-17.md](./TEMPLATES-REGISTRY-AUDIT-2026-08-17.md) | Hub `Templates` catalog vs SC communication types (metadata only) |
| [seeds/sc-missing-templates-seed.json](./seeds/sc-missing-templates-seed.json) | Safe seed for Homework / Video / Zoom catalog rows |
| [../deploy-checklists/WELCOME-EMAIL-ACTIVATION-CHECKLIST.md](../deploy-checklists/WELCOME-EMAIL-ACTIVATION-CHECKLIST.md) | Pre-participant-send gates |
| [../deploy-checklists/WELCOME-EMAIL-CONTROLLED-TEST-RUNBOOK.md](../deploy-checklists/WELCOME-EMAIL-CONTROLLED-TEST-RUNBOOK.md) | Controlled test procedure |

**Naming note:** Completion item **SC-079** (*gate blocking*) uses Automation **042** — it is unrelated to **Automation slot 079** (*shared Email Handoff Queue → Communications Hub dispatcher*).

## Parent-email send plane (current)

**Mike 2026-08-19:** Make.com does **not** handle any Shooting Challenge emails. All of those emails go through **Resend** (Communications Hub). See [`../integrations/email-send-plane.md`](../integrations/email-send-plane.md).

Exact Airtable script versions are still unconfirmed. This table is the Hub event map in GitHub, not a live version poll.

| Source automation | Event / template | Dedupe key | GitHub contract | Live delivery |
|-------------------|------------------|------------|-----------------|---------------|
| **078A** (not 075) | `WELCOME` | `WELCOME\|ENROLLMENTS\|{Enrollment Id}` | Email Handoff Queue → **079** → Hub | Resend (Hub). Legacy 075 Enrollment builders are retired. |
| **076** | `DAILY_SUBMISSION` | `DAILY_SUBMISSION\|SUBMISSIONS\|{Submission}` | Hub queue create | Resend (Hub) |
| **073** | `VIDEO_FEEDBACK` | `VIDEO_FEEDBACK\|VIDEO_FEEDBACK\|{VF}` | Hub queue create in GitHub | Resend (Hub) + **Hub→VF source writeback** |
| **071** | `HOMEWORK_FEEDBACK` | `HOMEWORK_FEEDBACK\|HOMEWORK_COMPLETIONS\|{HC}` | Hub queue create in GitHub | Resend (Hub) + **Hub→HC source writeback** (FUT-032) |
| **074** | `WEEKLY_ATHLETE_SUMMARY` | `WEEKLY_ATHLETE_SUMMARY\|WEEKLY_ATHLETE_SUMMARY\|{WAS}` | Hub queue create in GitHub | Resend (Hub) |
| **117** | Event Type `ZOOM_RECORDING_APPROVAL` / Template `ZOOM_RECORDING_APPROVED` | `ZOOM_RECORDING_APPROVAL\|ZOOM_ATTENDANCE\|{ZA}` | Hub queue create in GitHub | Resend (Hub) |
| **079** | Shared dispatcher | Validates keys above | Only SC script that POSTs to Hub ingress | Resend (Hub) |

**Shared rule:** Source scripts create **Email Handoff Queue** rows only. **Automation 079** is the only SC script that POSTs to Communications Hub ingress.

**Make.com:** Not the email sender. Historical Make/Gmail weekly and Zoom 117f packets remain evidence only. Do not re-enable Make Gmail for these paths.
