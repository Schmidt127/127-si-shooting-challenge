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
| **Participant-wide welcome sends** | **Not authorized** — controlled test + allowlist only |
| **Approved Shooting Challenge welcome design in Hub** | **Pending** — Hub currently renders a simple WELCOME from the 079 payload |
| **Make.com welcome send** | **OFF / not current path** — legacy assumption only |
| **Automation 079 script in GitHub** | **Gap** — live PROD script not yet exported to `airtable/automations/shooting-challenge/` |

**Critical distinction:** An **Accepted** handoff on the Email Handoff Queue (or Hub Event `Accepted`) proves the Hub received the payload — **not** that Resend delivered mail or that a parent received it. Delivery proof requires a Hub **Delivery** audit record in terminal success state.

---

## Architecture

```text
[Optional legacy build]
  Enrollments ──► Automation 075 (build subject/HTML on Enrollment; does not send)

[Current send path — controlled test only]
  Email Handoff Queue row (armed)
    ──► Automation 079 (POST handoff to Communications Hub)
          ──► Communications Hub (Hub Event)
                ──► Resend
                      ──► Delivery audit record
    ◄── writeback: Accepted | Error (+ message) on queue row
```

**Make.com is not in this path** and must remain off for welcome delivery.

---

## What is proven live (controlled test)

Verified end-to-end on the controlled-test path:

1. A row on **Email Handoff Queue** triggers **Automation 079**.
2. **079** posts a WELCOME handoff to the **Communications Hub**.
3. The Hub creates a **Hub Event**, deduplicates recipient addresses (parent + athlete same address → **one Delivery**), sends via **Resend**, and writes a **Delivery** audit record.
4. **Replay protection:** reusing the same **Handoff Key** does not create or send a duplicate.
5. **Test-mode / allowlist** protections remained in effect during the proof (no participant-wide send).

---

## What remains controlled-test-only

- Any send where `sendMode` / test flags restrict recipients to the allowlist (Mike / Schmidt test addresses).
- Hub-rendered WELCOME content is a **placeholder** — not the final approved Shooting Challenge welcome email design.
- **Automation 075** may still build legacy packages on Enrollments; that path does **not** authorize live parent welcome sends via Make.
- Enrollment-triggered automatic welcome on new participant intake is **not** enabled.

---

## Before participant welcome emails may be enabled

See [WELCOME-EMAIL-ACTIVATION-CHECKLIST.md](../deploy-checklists/WELCOME-EMAIL-ACTIVATION-CHECKLIST.md). Minimum gates:

1. Final approved welcome **copy and branding** (Shooting Challenge / 127 SI standards).
2. Hub **template implementation** using that approved content (not payload-only stub).
3. Recipient, consent, and authorization review for real parent addresses.
4. New **controlled test** after template change.
5. **Explicit Mike approval** before non-test participant sends.
6. Post-send **Delivery audit** and opt-out / suppression verification.

---

## Automation 079 — contract audit (Shooting Challenge side)

**Audit date:** 2026-08-08  
**Method:** Operator-verified live behavior + cross-check against 074/117 handoff patterns. **No 079 script in repository** — field names below match live PROD unless marked *confirm in Airtable UI*.

### Trigger

| Item | Expected contract |
|------|-------------------|
| **Trigger table** | `Email Handoff Queue` |
| **Trigger type** | When record matches conditions (or record created — *confirm in Airtable UI*) |
| **Arm condition** | Row is ready to hand off (status / checkbox / event type = WELCOME — *confirm exact field names in UI*) |
| **Skip when** | Handoff already **Accepted**; Handoff Key already processed; row in **Error** until cleared |

### Required queue fields (minimum)

| Field / concept | Role |
|-----------------|------|
| **Handoff Key** | Idempotency key — must be unique per intended send; replay with same key must not double-send |
| **Event type / template** | `WELCOME` (or equivalent single-select) |
| **Recipient JSON** | Structured recipients for Hub (parent/athlete emails); Hub dedupes to one Delivery when addresses match |
| **WELCOME payload** | Subject, HTML/text, and context fields Hub uses to render/send (current proof used Hub-simple render from payload) |
| **Source record mapping** | Links back to Shooting Challenge source (`sourceTable`, `sourceRecordId`, `enrollmentId` — *confirm exact names*) |
| **sendMode / test flags** | Controlled test vs live — test must honor allowlist |

### Handoff key shape

- Must be **deterministic** for a given business event (e.g. enrollment welcome) so accidental replays are safe.
- For **manual controlled tests**, append a unique suffix (timestamp or `|TEST-n`) so the key does not collide with prior proofs.
- **Proven:** same key → no second Hub send / Delivery.

### Payload (WELCOME)

079 should post JSON including at minimum:

| Payload area | Purpose |
|--------------|---------|
| `eventType` / `templateKey` | `WELCOME` |
| `handoffKey` | Same as queue Handoff Key |
| `sourceTable` | Shooting Challenge source table name (e.g. `Enrollments` or `Email Handoff Queue`) |
| `sourceRecordId` | Source row `rec…` |
| `recipients` | Recipient JSON array/object for Hub |
| `subject`, `html` / `text` | Email content (current Hub may render simply from these) |
| `sendMode` | `test` \| `live` |
| Program / athlete context | Names, program instance, school year — as required by Hub template |

### Writeback on Email Handoff Queue

| Outcome | Expected Shooting Challenge writeback |
|---------|--------------------------------------|
| Hub accepts handoff | Status → **Accepted**; clear or set handoff timestamp; clear arm/trigger if applicable |
| Hub rejects / HTTP error | Status → **Error**; **Error message** populated; arm may remain for retry only with **new** Handoff Key |
| Successful Resend delivery | **Not** written by 079 — Hub **Delivery** record is proof |

### Test-mode behavior

- **Test mode** must send only to allowlisted addresses (Mike / Schmidt test inbox), regardless of recipient JSON content on the enrollment.
- **Allowlist** must remain enabled until Mike explicitly authorizes participant sends.
- Do not infer delivery from **Accepted** alone.

### Source-table issue (earlier Hub Event)

An earlier Hub Event showed a missing or blank **source table** on the Hub side. **Conclusion:** Hub-side **mapping omission** when creating/linking the Hub Event — **not** a Shooting Challenge 079 defect. 079 payload included source mapping; Hub ingestion needed the mapping wired. **No 079 script change required** for that issue.

### Automation 079 change recommendation

| Question | Answer |
|----------|--------|
| Does 079 need a change for the source-table issue? | **No** — Hub-side fix |
| Does 079 need a change for proven controlled test? | **No** — contract performed as designed |
| Repo follow-up | **Export live 079 script to GitHub** when Mike approves paste-back (documentation only in this pass) |

---

## Legacy path (do not use for welcome send)

| Component | Role today |
|-----------|------------|
| **075** — Build Challenge Welcome Email | Builds `Parent Email Subject` / `Parent Email HTML` on **Enrollments**; sets `Welcome Email Status = Ready`; optional legacy Make webhook input — **does not mark Sent** |
| **Make.com welcome scenario** | **Not active** for welcome delivery; historical docs may still mention Make/Gmail — superseded by Communications Hub path for welcome **send** |

**075** may remain useful to **build** approved HTML into the queue payload until Hub owns all rendering. It is **not** the send owner.

---

## Related completion items

| SC item | Relationship |
|---------|--------------|
| **SC-045** | Parent email bundle — welcome leg now Hub-handoff proven (controlled); participant activation pending |
| **SC-042** | Email Message Center / EMC — long-term; Hub is the active external send plane for welcome |
| **SC-079** | *Unrelated* — gate blocking via Automation **042** |

---

## Evidence to capture (future tests)

Store under `docs/testing/evidence/YYYY-MM-DD-welcome-hub/`:

- Email Handoff Queue record ID + Handoff Key
- 079 automation run log (`statusOut`, `actionOut`, `debugStep`)
- Hub Event record ID + status
- Delivery record ID + Resend message id / status
- Screenshot or export showing **one** Delivery for deduped parent/athlete email
- Replay attempt showing **no** second Delivery

---

## Mike decisions still open

| # | Decision |
|---|----------|
| 1 | Approve final welcome email copy/design for Hub template |
| 2 | Whether **075** remains in the build chain or queue rows are populated another way |
| 3 | Export **079** from PROD to GitHub (recommended before next code change) |
| 4 | Explicit authorization date for non-test participant welcome sends |
| 5 | Opt-out / suppression source of truth (Hub vs Shooting Challenge base) |
