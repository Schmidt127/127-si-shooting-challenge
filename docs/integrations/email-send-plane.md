# Email send plane — current state

**Status:** Current (Mike evidence 2026-08-19)  
**Scope:** Shooting Challenge parent / athlete notification emails

This file owns the live **email delivery** question. Automation **117 v2.1** is confirmed as the Zoom recording approval **queue producer** (Mike paste 2026-08-19). Other Airtable email-automation versions remain unconfirmed until Mike reads them in the UI.

---

## Current truth (2026-08-19)

| Item | State |
|------|--------|
| Who sends Shooting Challenge emails | **Resend**, through the Communications Hub |
| Make.com email | **None.** Make.com does not handle any Shooting Challenge emails. |
| Gmail Make scenarios | **Not** the current email sender. Historical only. |
| Daily submission | **076** creates Hub queue → **079** → Hub → Resend. Automation **077** (Make daily send) is **deleted from Production** (2026-08-13 docs). |
| Covered mail | Weekly summary, homework feedback, video feedback, welcome, daily submission, Zoom recording approval, and any other SC parent/athlete notification email |
| Not this file | File upload (070a/070b → Make/Lambda). Tremendous gift-card delivery (Tremendous sends that email after a Make HTTP API call). |
| Production `Automations` table | **Authority for Name / Status / Automation Code only** (Mike refresh 2026-08-20). Ignore other columns. See [`CURRENT-TRUTH.md`](../CURRENT-TRUTH.md) and [`audits/2026-08-20-automation-49-code-audit.md`](../audits/2026-08-20-automation-49-code-audit.md). |

Make may still run **non-email** work (upload engine, Tremendous HTTP). That is not email handling.

---

## How to read older documents

| Document class | How to treat Make/Gmail email claims |
|----------------|----------------------------------------|
| This file, `PROJECT_STATE.md` overlay, `communications-hub/README.md` | Current send plane |
| 2026-07-24 weekly email E2E (`118→072→119→074→Make→Gmail`) | **Historical evidence** that Make/Gmail once sent weekly mail |
| Make 117f Zoom approval Gmail packets | **Historical** Make email path |
| GitHub Hub queue scripts (`071` / `073` / `074` / `076` / `079`) | Repository contract for Hub handoff. Exact pasted Airtable versions still largely unconfirmed. |
| Automation **117** | **Confirmed v2.1** (Mike paste 2026-08-19): creates Email Handoff Queue only; **079** sends → Hub → Resend |

---

## Related

| Doc | Role |
|-----|------|
| [`communications-hub/README.md`](../communications-hub/README.md) | Hub event types and queue producers |
| [`next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](../next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md) | Historical 2026-07-24 Make/Gmail weekly architecture |
| [`integrations/tremendous-award-fulfillment.md`](./tremendous-award-fulfillment.md) | Gift-card send (not Resend) |
