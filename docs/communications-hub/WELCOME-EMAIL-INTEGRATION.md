# WELCOME email — Communications Hub integration (Shooting Challenge)

**Last updated:** 2026-09-08  
**PROD base:** `appn84sqPw03zEbTT`  
**Controlling doc:** [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md)  
**Current send-plane authority:** [`../integrations/email-send-plane.md`](../integrations/email-send-plane.md)  
**Field retirement:** [`../deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md`](../deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md)

---

## Executive summary

| Layer | Current state |
|-------|---------------|
| **Source producer** | Automation **078A** creates one `WELCOME` Email Handoff Queue row from an Enrollment |
| **Dispatcher** | Automation **079** sends Ready queue rows to Communications Hub |
| **Sender** | **Communications Hub → Resend** only |
| **Make/Gmail Welcome** | **OFF / retired** — do not restore |
| **Automation 075** | **LEGACY RETIRED** — do not restore |
| **Participant-wide sends** | **Not authorized** — controlled/allowlisted proof remains required |
| **Hub request/delivery semantics** | Communications repository is authoritative |
| **Enrollment/Program Instance source data** | Shooting Challenge is authoritative |

**Critical distinction:** queue or Hub Event **Accepted** proves intake only. Successful delivery requires Hub/Resend delivery evidence in terminal **Sent** state. Replaying the same Enrollment must reuse the same deterministic business key and must not create a second Delivery.

---

## Canonical source contract

Communications is authoritative for request/delivery semantics. Shooting Challenge is authoritative for Enrollment and Program Instance source data.

### Event identity

| Field | Contract |
|-------|----------|
| Event type / template key | `WELCOME` |
| Source system | `SHOOTING_CHALLENGE` |
| Source record | Enrollment Record ID |
| Production business key | `WELCOME\|SHOOTING_CHALLENGE\|<Enrollment Record ID>` |
| Retry/replay | Reuse the same deterministic key; **never mint a new key merely to bypass dedupe** |

### Recipients

- Parent: `Parent Email - Cleaned` — required.
- Athlete: cleaned athlete email when present — optional.
- If parent and athlete resolve to the same address, Communications Hub collapses them to one Delivery.
- Broad participant traffic remains disabled until explicit cutover approval.

### Template data

Source data may include:

- `athleteName`
- `athleteFirstName`
- `programInstanceName`
- `programInstanceUrl`
- grade / grade band
- school / school year
- daily-submission or other approved program URLs
- optional welcome-intro / descriptive copy fields
- optional `message`

**`message` is optional.** It is not a prerequisite for creating a valid Welcome request. The Hub template owns final subject, HTML, and plain-text rendering.

Program CTA behavior is driven by Program Instance identity and `Welcome - Website URL`; a blank Program Instance URL means the CTA may be omitted rather than invented by the source adapter.

### Source status semantics

The source-side lifecycle is:

`Pending Build → Ready → Sent`

A non-terminal row may move to `Error` when source validation, handoff, or provider completion fails. Hub acceptance alone must not be written back as final `Sent` evidence.

---

## Current path

```text
Enrollment
  → Automation 078A
  → Email Handoff Queue (WELCOME, deterministic key, Test Mode? as applicable)
  → Automation 079
  → Communications Hub
  → WELCOME template render
  → Resend
  → Delivery audit
  → authoritative successful completion/writeback
```

**Make.com is not in this path.**

Automation **079** does not render subject/HTML/plain text and must not become a second email-content owner.

---

## Repository mismatch discovered 2026-09-08

Current GitHub Automation **078A v1.6** still documents and emits the older queue key:

`WELCOME|ENROLLMENTS|<Enrollment Record ID>`

The current Communications source contract requires:

`WELCOME|SHOOTING_CHALLENGE|<Enrollment Record ID>`

Therefore **#126 remains open**. Do not claim source-cutover completion until 078A is reconciled, installed in Airtable, and controlled replay proof confirms the deterministic key produces only one Delivery.

This document intentionally records the authoritative target contract rather than preserving the older key as current guidance.

---

## What has already been proven

Controlled Welcome-path evidence has established that:

1. Email Handoff Queue can trigger 079.
2. 079 can submit `WELCOME` to Communications Hub.
3. Hub can render the WELCOME template and send through Resend.
4. Delivery audit can reach terminal `Sent` state.
5. same-address parent/athlete recipients can deduplicate to one Delivery.
6. controlled Test Mode / allowlist behavior can prevent participant-wide delivery.
7. legacy Automation 075 / Make Welcome sending is not required.

That historical controlled proof does **not** prove the current `WELCOME|SHOOTING_CHALLENGE|...` source-key cutover because 078A still uses the older key in current GitHub source.

---

## Automation 078A target contract

### Trigger

Enrollment after Automation 001 has resolved the source context. Require the current source fields needed by 078A, including:

- exactly one Enrollment Record ID;
- Athlete identity/name;
- `Parent Email - Cleaned`;
- exactly one Program Instance;
- any optional athlete email / template-data fields used by the current payload.

### Queue row

078A should create/reuse exactly one queue row for the deterministic business key:

`WELCOME|SHOOTING_CHALLENGE|<Enrollment Record ID>`

Expected queue data:

| Field | Expected value |
|-------|----------------|
| Event Type | `WELCOME` |
| Template Key | `WELCOME` |
| Handoff Key | deterministic business key above |
| Source Table | Enrollment source identity |
| Source Record ID | Enrollment RID |
| Enrollment Record ID | Enrollment RID |
| Program Instance Record ID | exactly one linked Program Instance RID |
| Recipients JSON | role-qualified cleaned recipient objects |
| Payload JSON | mapped template data; `message` optional |
| Test Mode? | true during controlled proof |
| Attempt Count | initialized/reused according to queue contract |

078A creates the queue request only. It does **not** call Resend, render email content, or write final successful delivery state.

---

## Retry and failure rules

1. Never generate a new business key solely because the first attempt failed.
2. Retry/replay the same Enrollment using the same deterministic key.
3. Distinguish queue/Hub acceptance from provider delivery success.
4. A failed/non-terminal request may move to `Error`; it must not be marked `Sent` without authoritative Hub/provider completion.
5. Preserve one sender: Hub → Resend.
6. Do not restore Automation 075 or a Make/Gmail Welcome path.
7. Keep participant-wide cutover disabled until controlled source proof passes.

---

## Controlled source-cutover proof required before #126 closes

Use one controlled current Shooting Challenge Enrollment and an approved disposable/allowlisted recipient.

1. Install the reconciled 078A source in the actual Airtable automation.
2. Verify the input mapping uses the triggering Enrollment RID; no hardcoded Enrollment/recipient.
3. Trigger one source request.
4. Confirm exactly one queue row with:
   - `Event Type = WELCOME`
   - `Handoff Key = WELCOME|SHOOTING_CHALLENGE|<Enrollment RID>`
   - correct Enrollment + Program Instance ownership
   - Test Mode enabled.
5. Confirm 079 → Hub acceptance.
6. Confirm exactly one Hub Integration Event/Message for that business key.
7. Confirm exactly one Delivery per unique recipient address.
8. Confirm Resend/provider acceptance and terminal Hub `Sent` evidence.
9. Confirm authoritative Enrollment/source `Sent` / sent-time writeback only after delivery evidence.
10. Replay the same Enrollment/key and prove there is **no second Delivery**.
11. Exercise missing/invalid parent-email failure without family delivery.
12. Confirm no legacy/Make Welcome sender fires in parallel.

Store evidence under a dated `docs/testing/evidence/` folder when the live proof is performed.

---

## Before participant-wide Welcome may be enabled

- current 078A business-key contract installed and live-proven;
- Hub WELCOME template/content approved;
- branded sending domain / From identity verified for production use;
- recipient/consent review complete;
- controlled post-change test passes;
- replay produces no duplicate Delivery;
- explicit Mike approval for participant traffic;
- Make/Gmail Welcome remains OFF.

---

## Legacy path — do not use

| Component | Status |
|-----------|--------|
| **075 — Build Challenge Welcome Email** | **LEGACY RETIRED** — do not restore |
| Make.com Welcome scenario | Not current send plane; remain OFF |
| Enrollment subject/HTML builder fields | Retired/retiring; not the current Welcome content source |

Do not confuse retired 075 with live Zoom XP ownership; Zoom live XP is owned elsewhere by the current Zoom lifecycle.

---

## Related issues / authority

- **#126** — this source-contract reconciliation and final controlled source-cutover proof.
- Communications Hub contract/mapping — authoritative for Hub request, Message, Delivery, dedupe, and provider semantics.
- Shooting Challenge Enrollment / Program Instance — authoritative source data for the Welcome producer.
- [`../integrations/email-send-plane.md`](../integrations/email-send-plane.md) — current send-plane authority.
