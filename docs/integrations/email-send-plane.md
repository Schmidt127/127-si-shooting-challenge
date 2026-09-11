# Email send plane — current state

**Status:** Current (Mike evidence 2026-08-19; GitHub paste wave 2026-09-11)  
**Scope:** Shooting Challenge parent / athlete notification emails

This file owns the live **email delivery** question. Automation **117 v2.1** is confirmed as the Zoom recording approval **queue producer** (Mike paste 2026-08-19). Automation **071 v4.3** (homework feedback Hub handoff, FUT-046) and **076 v8.12** (daily submission package, FUT-041 XP columns) are **confirmed Production-updated** (Mike paste 2026-09-01). GitHub has advanced for SC-171 presentation and the `athleteFirstName` producer wave — **paste pending Mike** via [`deploy-checklists/TIER-1-LAUNCH-OPS-RUNBOOK-20260911.md`](../deploy-checklists/TIER-1-LAUNCH-OPS-RUNBOOK-20260911.md).

---

## Current truth (2026-09-11)

| Item | State |
|------|--------|
| Who sends Shooting Challenge emails | **Resend**, through the Communications Hub |
| Make.com email | **None.** Make.com does not handle any Shooting Challenge emails. |
| Gmail Make scenarios | **Not** the current email sender. Historical only. |
| Daily submission (Live) | **076 v8.12** → **079** → Hub → Resend (FUT-041 XP Earned \| Extra Credit shipped 2026-09-01) |
| Daily submission (GitHub) | **076 v8.14** — SC-171 streak fix + `athleteFirstName`; **paste pending** |
| Homework feedback (Live) | **071 v4.3** → **079** → Hub → Resend (FUT-046 subject shipped 2026-09-01) |
| Homework feedback (GitHub) | **071 v4.5** — SC-171 dates + athlete profile URL + Structured Curriculum HC-only path; **paste pending** |
| Weekly summary producers | Live **072 v4.9.1** / **074 v3.3**; GitHub **072 v4.9.2** / **074 v3.6** — `athleteFirstName`; **paste pending** |
| Video feedback | Live **073 v4.6**; GitHub **073 v4.7** — `athleteFirstName`; **paste pending** |
| Zoom recording approval | Live **117 v2.1**; GitHub **117 v2.2** — meeting display + timestamps; **paste pending** |
| Hub templates | Communications Hub **PR #52** merged @ **`e79637f`** (athlete name helpers, welcome dual CTAs, Zoom MT session details) |
| Automation **077** | **Retired / deleted from Production** (Mike-dated docs: 2026-08-13). Do not restore Make daily email. |
| Tier 1 operator packet | [`deploy-checklists/TIER-1-LAUNCH-OPS-RUNBOOK-20260911.md`](../deploy-checklists/TIER-1-LAUNCH-OPS-RUNBOOK-20260911.md) — ordered paste order **076→071→072→074→073→117** |
| Covered mail | Weekly summary, homework feedback, video feedback, welcome (**078A → 079 → Hub**; Automation **075** retired), daily submission, Zoom recording approval, and any other SC parent/athlete notification email. Homework Ready? is **078** (native), not **065**. |
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
| GitHub Hub queue scripts (`071` / `073` / `074` / `076` / `079`) | Repository contract for Hub handoff. **073 Live v4.6** (GitHub **v4.7** pending paste). Video Ready? is **manual**. **VF + HC Sent?/Sent On owner:** Communications Hub source writeback after Resend success (not 071/073/079). Homework: FUT-032 / Hub `HOMEWORK_FEEDBACK_SOURCE_WRITEBACK_v1.md`. |
| Automation **117** | **Live v2.1** (Mike paste 2026-08-19): creates Email Handoff Queue only; **079** sends → Hub → Resend. GitHub **v2.2** paste pending. |
| FUT-041 / FUT-046 closeout (2026-09-01) | Shipped at **076 v8.12** / **071 v4.3** — still Live until Tier 1 paste wave |

---

## Related

| Doc | Role |
|-----|------|
| This file | Live email delivery authority |
| [`deploy-checklists/TIER-1-LAUNCH-OPS-RUNBOOK-20260911.md`](../deploy-checklists/TIER-1-LAUNCH-OPS-RUNBOOK-20260911.md) | Consolidated Mike operator checklist (paste bundles + SC-172 + Hub cutover) |
| [online-agents/homework-assets/HOMEWORK-ASSET-COMPLETION-RUNBOOK.md](../online-agents/homework-assets/HOMEWORK-ASSET-COMPLETION-RUNBOOK.md) | Homework/video Ready? + **071**/**073** ownership |
| [`communications-hub/README.md`](../communications-hub/README.md) | Hub event types and queue producers |
| [`next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](../next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md) | Historical 2026-07-24 Make/Gmail weekly architecture |
| [`integrations/tremendous-award-fulfillment.md`](./tremendous-award-fulfillment.md) | Gift-card send (not Resend) |
