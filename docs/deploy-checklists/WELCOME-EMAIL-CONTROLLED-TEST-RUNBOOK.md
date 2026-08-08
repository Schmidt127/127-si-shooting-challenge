# WELCOME email — controlled test runbook

**Purpose:** Repeatable procedure for a **single** controlled WELCOME send through Automation **079** → Communications Hub.  
**Not for:** participant-wide activation (see [WELCOME-EMAIL-ACTIVATION-CHECKLIST.md](./WELCOME-EMAIL-ACTIVATION-CHECKLIST.md)).  
**Last updated:** 2026-08-08

---

## Preconditions

- [ ] **Make.com welcome send OFF** (unchanged).
- [ ] **Automation 079 ON** in PROD; **Test Mode?** enabled on the queue row; Hub allowlist active.
- [ ] Tester has access to Shooting Challenge PROD base (`appn84sqPw03zEbTT`) and Communications Hub.
- [ ] Use **Schmidt test enrollment** or Mike-approved test row only — do not use real parent emails outside allowlist.
- [ ] Generate a **new unique Handoff Key** for this run (see §2).

---

## 1. Required Email Handoff Queue fields

Create or arm one row on **Email Handoff Queue**. These are the **operator-supplied** fields for the proven live **079** contract.

**Do not supply on the queue row:** Subject, HTML body, plain-text body, or `sendMode`. Automation **079** does not accept or forward those — the Communications Hub renders subject and HTML/plain-text from **`templateKey: WELCOME`**.

| Field | Required value |
|-------|----------------|
| **Event Type** | `WELCOME` |
| **Template Key** | `WELCOME` |
| **Handoff Key** | Unique for this run — see §2 |
| **Source Table** | Shooting Challenge source table name (e.g. `Enrollments`) |
| **Source Record ID** | `rec…` of test enrollment or source row |
| **Recipients JSON** | Valid JSON; use allowlisted address(es) while **Test Mode?** is checked |
| **Payload JSON** | See §1A |
| **Test Mode?** | **Checked** (required for controlled tests) |
| **Arm / status** | Set fields that trigger **079** per live automation conditions |

**Leave blank before run (if applicable):** Hub writeback status, Accepted timestamp, Error message, prior Delivery link.

### 1A. Payload JSON shape

`Payload JSON` is **template data only** — not the email body. Minimum proven keys:

```json
{
  "athleteName": "Testing Schmidt",
  "programName": "127 SI Shooting Challenge 2026-2027",
  "message": "Controlled test — WELCOME handoff 2026-08-08-T1"
}
```

The Hub uses **`templateKey: WELCOME`** to render Hub-owned **subject**, **HTML**, and **plain-text** content from this payload. **079** does not provide email body or sending mode.

### 1B. What 079 forwards (not operator queue columns)

079 posts the queue contract to the Communications Hub, including `templateKey`, `handoffKey`, source mapping, **Recipients JSON**, and **Payload JSON**. It does **not** supply subject, HTML, plain-text, or `sendMode`.

---

## 2. Make the Handoff Key unique

Pattern (adapt to live field format):

```text
WELCOME|{sourceRecordId}|{programCodeOrYear}|TEST-{YYYYMMDD}-{seq}
```

Example:

```text
WELCOME|recCyFEPeATOVNlr9|2026-2027|TEST-20260808-01
```

**Rules:**

- Never reuse a key that already produced a Hub Delivery in terminal **Sent** state for the same event.
- For replay-protection check (§8), reuse the **same** key only **after** the initial success proof — it must not create or send another Delivery.

---

## 3. Execute the test

1. Save the Email Handoff Queue row with a **unique** Handoff Key and **Test Mode?** checked.
2. Confirm **079** fires (automation run history).
3. Wait for Hub processing (typically seconds; allow up to 2 minutes).

---

## 4. Expected source-side result (Shooting Challenge)

| Check | Pass |
|-------|------|
| Automation **079** run status | `statusOut = success` (or equivalent) |
| Queue **Handoff status** | **Accepted** |
| Queue **Error** field | Blank |
| Queue **Accepted at** (if present) | Populated |
| Arm / trigger field | Cleared or unchecked per 079 contract |

**Fail:** Status **Error** with message — capture 079 `errorOut` / `debugStep`; do not retry with the same key until root cause fixed.

**Important:** Queue **Accepted** proves **intake only** — not delivery. Do not close the test here.

---

## 5. Expected Hub Event result

In Communications Hub:

| Check | Pass |
|-------|------|
| Hub Event created | One row linked to Handoff Key |
| Event status | **Accepted** (intake only — not delivery proof) |
| **Template Key** | `WELCOME` |
| **Source Table** | Populated (Shooting Challenge table name) — regression for earlier mapping gap |
| **Source Record ID** | Matches queue row |
| Recipient dedupe | If parent and athlete share one email → one recipient set |

---

## 6. Expected Delivery result

Delivery proof requires a Hub **Delivery** record — not queue or Hub Event **Accepted** alone.

| Check | Pass |
|-------|------|
| Delivery count | Exactly **one** for this Handoff Key |
| Delivery status | Terminal **`Sent`** |
| Provider | Resend (or configured provider) |
| Provider / Resend ID | Present for audit |
| Send attempts | **One** — no duplicate attempt rows for this key |
| Delivery error / retry fields | Blank — no stale error or retry flags |
| Recipient | Allowlisted test inbox only (**Test Mode?** + allowlist) |

Capture: Delivery record id, Resend/provider id, timestamp, to-address.

---

## 7. Evidence required (one send only)

Save under `docs/testing/evidence/YYYY-MM-DD-welcome-hub/`:

1. Queue record id + Handoff Key + **Payload JSON** (screenshot or JSON export).
2. 079 automation run output log.
3. Hub Event id + **Accepted** status + `templateKey: WELCOME`.
4. Delivery id + terminal **Sent** + Resend/provider reference.
5. Inbox proof (screenshot) **or** provider log showing **single** message.
6. Count of Delivery rows for this Handoff Key in **Sent** = **1**.

---

## 8. Replay-protection check

Run only **after** §4–§7 pass (initial Delivery in **Sent**):

1. Re-arm the queue row with the **identical Handoff Key** (still **Test Mode?** checked).
2. Let **079** run again (or confirm Hub rejects duplicate).

| Check | Pass |
|-------|------|
| New Hub Delivery created | **No** |
| New Resend send | **No** |
| Delivery count for key | Still **1** |
| Queue / Hub status | Duplicate skipped or idempotent accept without second send |

Document outcome: `replay_blocked` or `already_sent` equivalent.

---

## 9. Fields that must remain blank after successful delivery

On **Shooting Challenge** Email Handoff Queue (079 does not own Delivery writeback):

| Field | After success |
|-------|---------------|
| **Error message** | Blank |
| **Retry arm** (if used) | Unchecked / blank unless intentional retry with **new** key |

On **Hub Delivery** (success state):

| Field | After success |
|-------|---------------|
| Error / retry fields | Blank — no stale delivery error or retry flags |

On **Enrollments** (legacy 075 fields — optional if 075 not in path):

| Field | Note |
|-------|------|
| `Welcome Email Sent At` | Blank unless separate sent-writeback automation exists |
| `Welcome Email Status` | Not `Sent` unless a dedicated writeback owner sets it |

Delivery proof lives in the **Hub Delivery** table (terminal **Sent** + provider id), not on the queue row.

---

## 10. Abort / do not proceed if

- **Test Mode?** unchecked while using non-allowlisted recipient addresses.
- Make.com welcome scenario enabled.
- Handoff Key reused before first **Sent** Delivery proof.
- Hub Event **Accepted** but no Delivery in **Sent** within 5 minutes — investigate before retry with new key.
- More than one Delivery or more than one send attempt for the same Handoff Key on initial run.

---

## Related docs

- [WELCOME-EMAIL-INTEGRATION.md](../communications-hub/WELCOME-EMAIL-INTEGRATION.md)
- [WELCOME-EMAIL-ACTIVATION-CHECKLIST.md](./WELCOME-EMAIL-ACTIVATION-CHECKLIST.md)
- [SHOOTING_CHALLENGE_COMPLETION_MASTER.md](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md) §9M
