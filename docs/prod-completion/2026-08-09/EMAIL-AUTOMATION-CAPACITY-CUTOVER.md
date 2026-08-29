# Email Automation Capacity Cutover — 2026-08-09

Status: **Implementation started**

## Immediate decisions

### 068 — RETIRED / NO AIRTABLE SLOT
Automation 033 v4.2 absorbs deferred Homework Completion -> Weekly Athlete Summary reconciliation. Do not create 068 in PROD.

### 075 — RETIRED FROM PROD (confirmed 2026-08-29)
Automation 075 is **absent from the live Automations table**. Do not restore it.

Current welcome send path:

`078A -> Email Handoff Queue -> 079 -> Communications Hub -> WELCOME template -> Resend -> Delivery audit`

The Communications Hub owns subject, HTML, and plain-text rendering. 079 forwards template data only. Remaining cleanup is **Enrollment field deletion** (not re-creating 075) — see [`../deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md`](../deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md).

## Do not retire yet

The Communications Hub completion master shows these migrations are still planned, not live:

- COM-CC-003 — Shooting Challenge Daily Submissions
- COM-CC-005 — Shooting Challenge Weekly Athlete Summary

Therefore do **not** retire the current Daily Submission or Weekly Athlete Summary Airtable/Make paths until their Hub equivalents have controlled live proof and writeback/dedupe evidence.

Keep for now:

- 072 — Build Weekly Summary Email Package
- 074 — Send Weekly Summary package to Make
- 076 — Build Daily Submission Email Package
- 077 — Send Daily Submission package to Make
- 118 — Schedule Weekly Summary build
- 119 — Schedule Weekly Summary send

Also keep 071 / 073 until their replacement Hub delivery types are implemented and proven.

## Migration order to recover multiple slots

1. **Retire 075 now** — Welcome content rendering is Hub-owned.
2. Complete **COM-CC-003** — Shooting Challenge Daily Submission through Communications Hub/Resend.
   - Then retire/replace 076 + 077 as a pair if the Hub owns build + send.
3. Complete **COM-CC-005** — Shooting Challenge Weekly Athlete Summary through Communications Hub/Resend.
   - Then retire/replace 072 + 074; evaluate whether 118/119 are still needed or whether scheduling belongs in Vercel/Hub.
4. Migrate feedback emails (071 / 073) to Hub and retire the legacy Make webhook paths.

Potential capacity recovery after proof: multiple Airtable slots, without weakening email reliability.

## PROD operator action now

- Keep 005 v5.1, 033 v4.1 until v4.2 is pasted, and 067 v3.1.
- Do not create 068.
- Delete Automation 075 from Airtable PROD if no one needs the legacy Enrollment-rendered preview package.
- Paste 033 v4.2 from GitHub master over 033 v4.1; trigger and recordId input remain unchanged.

## Completion rule

Do not mark email migration complete in `SHOOTING_CHALLENGE_COMPLETION_MASTER.md` until the corresponding Communications Hub package has live controlled proof, dedupe/replay behavior, delivery evidence, and source writeback evidence.
