# WELCOME email — Communications Hub integration (Shooting Challenge)

**Last updated:** 2026-08-08  
**PROD base:** `appn84sqPw03zEbTT`  
**Controlling doc:** [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md) §9M

---

## Executive summary

| Layer | Status |
|-------|--------|
| **Automation 079 → Communications Hub handoff** | **Live Tested in PROD** (controlled test only) |
| **Hub → Resend → Delivery audit** | **Live Tested in PROD** (controlled test only) |
| **Participant-wide welcome sends** | **Not authorized** — **Test Mode?** + allowlist only |
| **Approved Shooting Challenge welcome design in Hub** | **Pending** — Hub **WELCOME** template renders subject/HTML; payload supplies template data only |
| **Make.com welcome send** | **OFF / not current path** — legacy assumption only |
| **Automation 079 script in GitHub** | **Gap** — live PROD script not yet exported to `airtable/automations/shooting-challenge/` |

**Critical distinction:** Queue or Hub Event **Accepted** proves **intake only** — not delivery. Success requires exactly **one** Hub **Delivery** in terminal **`Sent`** state, a Resend/provider ID, **one** send attempt, and no stale delivery error/retry fields.

---

## Architecture

```text
[Optional legacy build]
  Enrollments ──► Automation 075 (build subject/HTML on Enrollment; does not send)

[Current send path — controlled test only]
  Email Handoff Queue row (armed; Test Mode? checked)
    ──► Automation 079 (POST handoff to Communications Hub)
          ──► Communications Hub (Hub Event; templateKey WELCOME)
                ──► Hub renders subject + HTML/plain-text
                      ──► Resend
                            ──► Delivery audit record (Sent)
    ◄── writeback: Accepted | Error (+ message) on queue row
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
- **Automation 075** may still build legacy packages on Enrollments; that path does **not** authorize live parent welcome sends via Make.
- Enrollment-triggered automatic welcome on new participant intake is **not** enabled.

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

**Audit date:** 2026-08-08  
**Method:** Operator-verified live behavior. **No 079 script in repository** — field names below match live PROD unless marked *confirm in Airtable UI*.

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
| **Template Key** | `WELCOME` |
| **Handoff Key** | Unique per intended send; idempotency key |
| **Source Table** | Shooting Challenge source table (e.g. `Enrollments`) |
| **Source Record ID** | Source row `rec…` |
| **Recipients JSON** | Structured recipients for Hub; Hub dedupes to one Delivery when addresses match |
| **Payload JSON** | Template data — see below |
| **Test Mode?** | **Checked** for controlled tests; Hub honors allowlist |

**Not operator-supplied (not part of 079 contract):**

| Excluded | Reason |
|----------|--------|
| Subject | Hub renders from `templateKey: WELCOME` |
| HTML / plain-text body | Hub renders from `templateKey: WELCOME` |
| `sendMode` | Not a Shooting Challenge handoff field; use **Test Mode?** on queue row |

### Payload JSON (template data only)

Minimum proven keys inside **Payload JSON**:

| Key | Purpose |
|-----|---------|
| `athleteName` | Athlete display name for template |
| `programName` | Program / season label for template |
| `message` | Short contextual message merged into Hub WELCOME template |

Example:

```json
{
  "athleteName": "Testing Schmidt",
  "programName": "127 SI Shooting Challenge 2026-2027",
  "message": "Controlled test handoff"
}
```

The Communications Hub uses **`templateKey: WELCOME`** to produce Hub-owned **subject**, **HTML**, and **plain-text** content. **079** forwards this payload; it does not build or send email bodies.

### Handoff key shape

- Must be **unique** per intended send for controlled tests (append `TEST-{date}-{seq}` suffix).
- For production enrollment welcome, use a deterministic business key (e.g. enrollment-scoped) so accidental replays are safe.
- **Proven:** same key replay after initial **Sent** Delivery → no second Delivery / Resend send.

### Writeback on Email Handoff Queue

| Outcome | Expected Shooting Challenge writeback |
|---------|--------------------------------------|
| Hub accepts handoff | Status → **Accepted**; clear or set handoff timestamp; clear arm/trigger if applicable |
| Hub rejects / HTTP error | Status → **Error**; **Error message** populated; retry only with **new** Handoff Key |
| Successful Resend delivery | **Not** written by 079 — Hub **Delivery** in **`Sent`** is proof |

### Test-mode behavior

- **Test Mode?** checked on the queue row → Hub sends only to **allowlisted** addresses.
- **Allowlist** must remain enabled until Mike explicitly authorizes participant sends.
- Do not infer delivery from queue or Hub Event **Accepted** alone.

### Delivery success criteria

| Check | Pass |
|-------|------|
| Delivery count per Handoff Key | Exactly **1** |
| Delivery status | Terminal **`Sent`** |
| Provider / Resend ID | Present |
| Send attempts | **One** |
| Error / retry fields on Delivery | Blank (no stale error or retry flags) |

### Source-table issue (earlier Hub Event)

An earlier Hub Event showed a missing or blank **source table** on the Hub side. **Conclusion:** Hub-side **mapping omission** — **not** a Shooting Challenge 079 defect. **No 079 change required.**

### Automation 079 change recommendation

| Question | Answer |
|----------|--------|
| Does 079 need a change for the source-table issue? | **No** — Hub-side fix |
| Does 079 need a change for proven controlled test? | **No** — contract performed as designed |
| Repo follow-up | **Export live 079 script to GitHub** when Mike approves paste-back |

---

## Legacy path (do not use for welcome send)

| Component | Role today |
|-----------|------------|
| **075** — Build Challenge Welcome Email | Builds `Parent Email Subject` / `Parent Email HTML` on **Enrollments**; sets `Welcome Email Status = Ready`; optional legacy Make webhook input — **does not mark Sent** |
| **Make.com welcome scenario** | **Not active** for welcome delivery; historical docs may still mention Make/Gmail — superseded by Communications Hub path for welcome **send** |

**075** is **not** the current send owner. Queue rows for **079** use **Payload JSON** template data, not 075 HTML fields.

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
| 2 | Whether **075** remains in use or queue rows are populated without it |
| 3 | Export **079** from PROD to GitHub (recommended before next code change) |
| 4 | Explicit authorization date for non-test participant welcome sends |
| 5 | Opt-out / suppression source of truth (Hub vs Shooting Challenge base) |
