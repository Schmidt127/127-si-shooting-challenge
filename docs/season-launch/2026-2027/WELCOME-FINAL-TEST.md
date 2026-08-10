# WELCOME email — final controlled test procedure

**Path:** Email Handoff Queue → **079** → Communications Hub → Resend  
**Not in path:** Make welcome, Automation 075 (retire per START-HERE-PROD-PASTE)

## Proven today

| Layer | Status |
|-------|--------|
| 079 handoff | Live Tested (controlled) |
| Hub + Resend + Delivery audit | Live Tested |
| Participant-wide send | **Not authorized** |
| 079 in GitHub | **Gap** — export still needed |
| Hub template 2026–27 copy | **Pending** (D9) |

## Preconditions

1. Hub **WELCOME** template updated with 2026–2027 branding/copy.
2. Automation **079** ON in PROD.
3. **Test Mode?** checked on queue row; allowlist = Schmidt/ops emails only.
4. Enrollment `recCyFEPeATOVNlr9` (or fresh Schmidt test enrollment).
5. Make welcome scenarios remain **OFF**.

## Procedure

### 1 — Arm queue row

Create **Email Handoff Queue** row:

| Field | Value |
|-------|-------|
| Event Type | `WELCOME` |
| Template Key | `WELCOME` |
| Handoff Key | `WELCOME\|2026-2027\|recCyFEPeATOVNlr9\|{timestamp}` (unique) |
| Source Table | `Enrollments` |
| Source Record ID | `recCyFEPeATOVNlr9` |
| Recipients JSON | Schmidt parent + athlete (dedupe expected) |
| Payload JSON | `{ "athleteName": "Testing Schmidt", "programName": "Shooting Challenge 2026-2027", "message": "…" }` |
| Test Mode? | **checked** |

### 2 — Trigger 079

Run automation Test or satisfy trigger conditions.

**Expect:** `statusOut=success`, queue row Accepted.

### 3 — Verify Hub

- Exactly **one** Hub Delivery in **Sent** state
- Resend/provider ID present
- Subject/body show **2026–2027** (not 2025–2026)

### 4 — Replay protection

Re-trigger same **Handoff Key**.

**Expect:** No second Delivery; no duplicate send.

### 5 — Delivery audit

| Check | Pass? |
|-------|-------|
| 1 Delivery Sent | ☐ |
| 0 duplicate Deliveries | ☐ |
| Opt-out/suppression honored | ☐ |
| Test Mode restricted recipients | ☐ |

## Failure paths

| Symptom | Action |
|---------|--------|
| Queue Error | Read error message; do not clear Handoff Key until diagnosed |
| Hub Accepted but no Delivery | Hub logs — template render failure |
| Wrong year in subject | Fix Hub template (D9); rerun card WELCOME |

## Before participant-wide welcome

See [`WELCOME-EMAIL-ACTIVATION-CHECKLIST.md`](../../deploy-checklists/WELCOME-EMAIL-ACTIVATION-CHECKLIST.md):

1. Final copy/branding approved
2. Consent review
3. This controlled test PASS after template change
4. **Explicit Mike approval** to disable test-only restrictions

## Evidence to capture

- Queue row id + Handoff Key
- Hub Event id + Delivery id
- Gmail screenshot (redact if needed)
- JSON: `{ "enrollmentId", "handoffKey", "deliveryState", "subjectYear": "2026-2027" }`

Save under: `docs/testing/evidence/YYYY-MM-DD-welcome-2026-2027/`
