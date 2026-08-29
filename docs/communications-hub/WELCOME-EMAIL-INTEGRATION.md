# WELCOME email — Communications Hub integration (Shooting Challenge)

**Last updated:** 2026-08-29  
**PROD base:** `appn84sqPw03zEbTT`  
**Controlling doc:** [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md) §9M  
**Field retirement:** [`../deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md`](../deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md)

---

## Executive summary

| Layer | Status |
|-------|--------|
| **Automation 078A → Email Handoff Queue** | **Live** — creates `WELCOME` queue rows (does not write Enrollment subject/HTML) |
| **Automation 079 → Communications Hub handoff** | **Live Tested in PROD** (controlled test only) |
| **Hub → Resend → Delivery audit** | **Live Tested in PROD** (controlled test only) |
| **Participant-wide welcome sends** | **Not authorized** — **Test Mode?** + allowlist only |
| **Approved Shooting Challenge welcome design in Hub** | **Pending** — Hub **WELCOME** template renders subject/HTML; payload supplies template data only |
| **Make.com welcome send** | **OFF / not current path** — legacy assumption only |
| **Automation 075** | **LEGACY RETIRED** — absent from live Automations; do not restore |

**Critical distinction:** Queue or Hub Event **Accepted** proves **intake only** — not delivery. Success requires exactly **one** Hub **Delivery** in terminal **`Sent`** state, a Resend/provider ID, **one** send attempt, and no stale delivery error/retry fields.

---

## Architecture

```text
[Current welcome path]
  Enrollments ──► Automation 078A (create Email Handoff Queue WELCOME row)
    ──► Email Handoff Queue (Status Ready; Test Mode? for controlled sends)
          ──► Automation 079 (POST handoff to Communications Hub)
                ──► Communications Hub (Hub Event; templateKey WELCOME)
                      ──► Hub renders subject + HTML/plain-text
                            ──► Resend
                                  ──► Delivery audit record (Sent)
          ◄── writeback: Accepted | Error (+ message) on queue row

[LEGACY RETIRED — do not restore]
  Automation 075 Enrollment Parent Email Subject / Parent Email HTML builders
```

**Make.com is not in this path** and must remain off for welcome delivery.

**079 does not provide:** email subject, HTML body, plain-text body, or `sendMode`. The Hub owns rendering from **`templateKey: WELCOME`**.

---

## What is proven live (controlled test)

Verified end-to-end on the controlled-test path:

1. A row on **Email Handoff Queue** triggers **Automation 079**.
2. **079** posts a WELCOME handoff (`templateKey: WELCOME`) to the **Communications Hub**.
3. The Hub creates a **Hub Event**, renders email content from the WELCOME template + **Payload JSON**, deduplicates recipient addresses (parent + athlete same address → **one Delivery**), sends via **Resend**, and writes a **Delivery** audit record in **`Sent`** state.
4. **Replay protection:** reusing the same **Handoff Key** after initial success does not create or send a duplicate Delivery.
5. **Test Mode?** and **allowlist** remained in effect during the proof (no participant-wide send).

---

## What remains controlled-test-only

- Any send with **Test Mode?** checked and Hub allowlist restricting recipients to Mike / Schmidt test addresses.
- Hub **WELCOME** template content may still need final approved Shooting Challenge copy/branding — payload supplies `athleteName`, `programName`, `message` only.
- Enrollment-triggered automatic welcome on new participant intake is **not** enabled for participant-wide traffic until activation checklist gates pass.

---

## Before participant welcome emails may be enabled

See [WELCOME-EMAIL-ACTIVATION-CHECKLIST.md](../deploy-checklists/WELCOME-EMAIL-ACTIVATION-CHECKLIST.md). Minimum gates:

1. Final approved welcome **copy and branding** in the Hub **WELCOME** template (not just payload `message` text).
2. Hub template review after any template change.
3. Recipient, consent, and authorization review for real parent addresses.
4. New **controlled test** after template change.
5. **Explicit Mike approval** before disabling test-only restrictions for participant traffic.
6. Post-send **Delivery** audit (`Sent`, one per Handoff Key) and opt-out / suppression verification.

---

## Automation 079 — contract audit (Shooting Challenge side)

**Audit date:** 2026-08-08 (path still current 2026-08-29)  
**Method:** Operator-verified live behavior. Field names below match live PROD unless marked *confirm in Airtable UI*.

### Trigger

| Item | Expected contract |
|------|-------------------|
| **Trigger table** | `Email Handoff Queue` |
| **Trigger type** | When record matches conditions (or record created — *confirm in Airtable UI*) |
| **Arm condition** | Row ready to hand off — *confirm exact fields in UI* |
| **Skip when** | Handoff already **Accepted**; Handoff Key already processed to **Sent** Delivery; row in **Error** until cleared |

### Required queue fields (operator-supplied)

These are what the operator sets on the **Email Handoff Queue** row. **079** reads and forwards them; it does **not** add subject, HTML, plain-text, or `sendMode`.

| Field | Required value |
|-------|----------------|
| **Event Type** | `WELCOME` |
| **Template Key** | `WELCOME` (Hub template) |
| **Handoff Key** | Stable dedupe key (`WELCOME\|ENROLLMENTS\|{Enrollment Id}` from **078A**) |
| **Source Table / Source Record ID** | Enrollment identity |
| **Recipients JSON** | Parent (and athlete when distinct) |
| **Payload JSON** | Template data only (`athleteName`, `programName`, `message`, …) |
| **Test Mode?** | Checked for controlled tests |

### Does not require (retired Enrollment fields)

`Parent Email Subject`, `Parent Email HTML`, `Welcome Email Status`, `Welcome Email Sent At`, `Welcome Email Error`, `Welcome Email Ready?`

---

## Legacy path (do not use)

| Component | Status |
|-----------|--------|
| **075** — Build Challenge Welcome Email | **LEGACY RETIRED** — absent from live Automations; GitHub archive only. Formerly wrote Enrollment subject/HTML. |
| **Make.com welcome scenario** | **Not active** for welcome delivery |
| Enrollment welcome builder fields | Retiring — see field cleanup packet |

Do **not** re-arm Automation **075**. Do **not** confuse **075** with Zoom/Attendance XP (**101**).

---

## Related completion items

| SC item | Relationship |
|---------|--------------|
| **SC-045** | Parent email bundle — welcome leg Hub-handoff proven (controlled); participant activation pending |
| **SC-042** | Email Message Center / EMC — long-term; Hub is the active external send plane for welcome |
| **SC-079** | *Unrelated* — gate blocking via Automation **042** |

---

## Evidence to capture (future tests)

Store under `docs/testing/evidence/YYYY-MM-DD-welcome-hub/`:

- Email Handoff Queue record ID + Handoff Key + Payload JSON
- 079 automation run log (`statusOut`, `actionOut`, `debugStep`)
- Hub Event record ID + **Accepted** + `templateKey: WELCOME`
- Delivery record ID + **`Sent`** + Resend/provider id
- Screenshot or export showing **one** Delivery for deduped parent/athlete email
- Replay attempt showing **no** second Delivery

---

## Mike decisions still open

| # | Decision |
|---|----------|
| 1 | Approve final welcome email copy/design in Hub **WELCOME** template |
| 2 | Complete Airtable deletion of six legacy Enrollment welcome fields (manual packet) |
| 3 | Explicit authorization date for non-test participant welcome sends |
|
