# WELCOME email — controlled test runbook

**Purpose:** Repeatable procedure for a **single** controlled WELCOME send through Automation **079** → Communications Hub.  
**Not for:** participant-wide activation (see [WELCOME-EMAIL-ACTIVATION-CHECKLIST.md](./WELCOME-EMAIL-ACTIVATION-CHECKLIST.md)).  
**Last updated:** 2026-08-08

---

## Preconditions

- [ ] **Make.com welcome send OFF** (unchanged).
- [ ] **Automation 079 ON** in PROD; test mode / allowlist active.
- [ ] Tester has access to Shooting Challenge PROD base (`appn84sqPw03zEbTT`) and Communications Hub.
- [ ] Use **Schmidt test enrollment** or Mike-approved test row only — do not use real parent emails outside allowlist.
- [ ] Generate a **new unique Handoff Key** for this run (see below).

---

## 1. Required Email Handoff Queue fields

Create or arm one row on **Email Handoff Queue** (*confirm exact field names in Airtable UI*):

| Field / concept | Required value |
|-----------------|----------------|
| **Event type** | `WELCOME` |
| **Handoff Key** | Unique for this run — see §2 |
| **Recipient JSON** | Valid JSON for Hub; use allowlisted address(es) in test mode |
| **Subject** | Test subject including run id (e.g. `WELCOME controlled test 2026-08-08-T1`) |
| **HTML / body** | Minimal valid HTML (or approved template preview payload) |
| **Source table** | Shooting Challenge source table name (e.g. `Enrollments`) |
| **Source record id** | `rec…` of test enrollment or queue source row |
| **Enrollment id** | `rec…` when applicable |
| **sendMode** | `test` (unless Mike explicitly authorizes live for this run) |
| **Arm / status** | Set fields that trigger **079** per live automation conditions |

**Leave blank before run (if applicable):** Hub writeback status, Accepted timestamp, Error message, prior Delivery link.

---

## 2. Make the Handoff Key unique

Pattern (adapt to live field format):

```text
WELCOME|{enrollmentId}|{schoolYearOrProgramCode}|TEST-{YYYYMMDD}-{seq}
```

Example:

```text
WELCOME|recCyFEPeATOVNlr9|2026-2027|TEST-20260808-01
```

**Rules:**

- Never reuse a key that already produced a Hub Delivery for the same event.
- For replay-protection check (step 8), you will intentionally reuse the **same** key — do that only after the first send succeeds.

---

## 3. Execute the test

1. Save the Email Handoff Queue row with a **unique** Handoff Key.
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

**Important:** **Accepted** alone is **not** sufficient to close the test.

---

## 5. Expected Hub Event result

In Communications Hub:

| Check | Pass |
|-------|------|
| Hub Event created | One row linked to Handoff Key |
| Event status | Accepted / processed (Hub terminology) |
| **Source table** | Populated (Shooting Challenge table name) — regression for earlier mapping gap |
| Recipient dedupe | If parent and athlete share one email → one recipient set |

---

## 6. Expected Delivery result

| Check | Pass |
|-------|------|
| Delivery record | Exactly **one** for this Handoff Key |
| Provider | Resend |
| Status | Terminal success (delivered / sent per Hub schema) |
| Recipient | Allowlisted test inbox only (test mode) |
| Message id | Present for audit |

Capture: Delivery record id, Resend id, timestamp, to-address.

---

## 7. Evidence required (one send only)

Save under `docs/testing/evidence/YYYY-MM-DD-welcome-hub/`:

1. Queue record id + Handoff Key (screenshot or JSON export).
2. 079 automation run output log.
3. Hub Event id + status.
4. Delivery id + Resend reference.
5. Inbox proof (screenshot) **or** provider log showing single message.
6. Count of Delivery rows for this Handoff Key = **1**.

---

## 8. Replay-protection check

After steps 4–7 pass:

1. Re-arm the **same** queue row (or create duplicate arm) with the **identical Handoff Key**.
2. Let **079** run again (or confirm Hub rejects duplicate).

| Check | Pass |
|-------|------|
| New Hub Delivery created | **No** |
| New Resend send | **No** |
| Queue / Hub status | Duplicate skipped or idempotent accept without second send |

Document outcome: `replay_blocked` or `already_sent` equivalent.

---

## 9. Fields that must remain blank after successful delivery

On **Shooting Challenge** Email Handoff Queue (079 does not own Delivery writeback):

| Field | After success |
|-------|---------------|
| **Error message** | Blank |
| **Retry arm** (if used) | Unchecked / blank unless intentional retry with **new** key |

On **Enrollments** (legacy 075 fields — optional if 075 not in path):

| Field | Note |
|-------|------|
| `Welcome Email Sent At` | Blank unless separate sent-writeback automation exists |
| `Welcome Email Status` | Not `Sent` unless a dedicated writeback owner sets it |

Delivery proof lives in the **Hub Delivery** table, not on the queue row.

---

## 10. Abort / do not proceed if

- Test mode off but recipients include non-allowlisted addresses.
- Make.com welcome scenario enabled.
- Handoff Key reused before first successful Delivery proof.
- Hub shows **Accepted** but no Delivery within 5 minutes — investigate before retry with new key.

---

## Related docs

- [WELCOME-EMAIL-INTEGRATION.md](../communications-hub/WELCOME-EMAIL-INTEGRATION.md)
- [WELCOME-EMAIL-ACTIVATION-CHECKLIST.md](./WELCOME-EMAIL-ACTIVATION-CHECKLIST.md)
- [SHOOTING_CHALLENGE_COMPLETION_MASTER.md](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md) §9M
