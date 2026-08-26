# FUT-003 — Fillout Stripe payment writeback (Make.com)

**Backlog:** FUT-003  
**Status:** **Paid route validated — ready for activation** (2026-08-26, Maia final report)  
**Production base:** `appn84sqPw03zEbTT`  
**Make scenario:** `FUT-003 - Fillout Stripe Payment to Airtable Payment Transactions` — **inactive** at validation time (not activated in Production)

**Rule:** This document records verified Make test evidence and deferred free-payment architecture. It does **not** modify Airtable, Fillout, Stripe, Make.com, production data, or secrets.

**Related backlog:** [FUT-003 in Master Future Work List](../127-SI-MASTER-FUTURE-WORK-LIST.md)

---

## Status summary

| Area | Status |
|------|--------|
| **Paid workflow (PaymentIntent `pi_…`)** | **Validated** — controlled Production Make test 2026-08-26 (Maia final report) |
| **Make scenario activation** | **Inactive** at validation time — ready for Mike activation when approved |
| **Free / 100%-coupon workflow** | **Deferred until November/December 2026** |
| **Coupon Code capture** | **Deferred** — Fillout webhook does not supply coupon code |

---

## Verified paid-only workflow (2026-08-26 — Maia final report)

Controlled Production test in Make with scenario **inactive** (manual run / test execution only).

### End-to-end steps validated

1. **Fillout webhook** receives the submission.
2. Payload is **normalized** (Module 4).
3. One **10-second delay** remains before Enrollment lookup.
4. **Enrollment** is found using `{Fillout Submission Id} = "{{4.filloutSubmissionId}}"` (Module 16).
5. Stripe **PaymentIntent** is retrieved (Module 6).
6. Payment amount is calculated correctly (cents → dollars).
7. **Payment Transactions** duplicate search runs **once** (Module 7).
8. **One Payment Transactions** record is created (Module 8).
9. **Enrollment** is linked **once** (Module 12).
10. **Duplicate protection** passed — no duplicate transaction on replay.

### Fields written (paid test)

| Airtable field | Result |
|----------------|--------|
| **Payment Status** | `Paid` |
| **Stripe Payment ID** | Stored (`pi_…`) |
| **Actual Amount Paid** | `$2.00` |
| **Fillout Submission ID** | Stored |
| **Payment Date** | Stored |
| **Make Processed At** | Stored |
| **Enrollment** link | One update |

### Final tested transaction

| Check | Result |
|-------|--------|
| Actual Amount Paid | `$2.00` |
| Payment Status | `Paid` |
| Payment Transactions rows created | **1** |
| Enrollment link updates | **1** |
| Duplicate row on replay | **None** |

### Scenario state

- Make scenario exists and was validated.
- Scenario remained **inactive** at report time.
- **No production activation** is documented in this repository unless Mike records separate confirmation elsewhere.

**Scope note:** Validation covers **paid PaymentIntent writeback only**. It does **not** change Airtable XP calculations, XP award amounts, or XP Event logic.

---

## Deferred until November/December 2026

Do **not** mark these complete. Do **not** add a blank **Stripe Payment ID** route to the current paid-only workflow.

| Item | Status |
|------|--------|
| 100% coupon / $0 payment route | **Deferred** |
| `No Payment Required` payment status | **Deferred** |
| Stripe Checkout Session webhook route | **Deferred** |
| Stripe metadata correlation | **Deferred** |
| Custom Checkout Session creation | **Deferred** |
| Coupon / promotion-code capture | **Deferred** |
| Enterprise webhook architecture | **Deferred** |
| Advanced Stripe reconciliation | **Deferred** |

---

## Confirmed Fillout webhook fields (paid test)

| Field | Present in current webhook? |
|-------|----------------------------|
| Submission ID | **Yes** |
| Stripe Payment Id (`pi_…`) | **Yes** |
| Parent email | **Yes** |
| Athlete first name | **Yes** |
| Athlete last name | **Yes** |
| Coupon code | **No** |
| Final amount | **No** (Stripe retrieve is authoritative) |
| Payment status | **No** (derived from Stripe retrieve) |
| Checkout Session ID | **No** |

---

## Make scenario reference

```text
FUT-003 - Fillout Stripe Payment to Airtable Payment Transactions
```

**Suggested Make folder:** `Shooting Challenge / FUT-003`

**GitHub blueprint file:** [`make/blueprints/fut-003-fillout-stripe-payment-writeback.json`](../../make/blueprints/fut-003-fillout-stripe-payment-writeback.json)

**Scenario state:** **Inactive** at validation — activate only after Mike approval.

---

## Module map (verified Production build)

| Module | Role | Verified? |
|--------|------|-----------|
| **4** | Normalize webhook values | **Yes** |
| **16** | Find Enrollment by Fillout Submission ID | **Yes** |
| **6** | Stripe — retrieve PaymentIntent | **Yes** |
| **7** | Payment Transactions search | **Yes** |
| **8** | Payment Transactions create/update | **Yes** |
| **12** | Enrollment link update | **Yes** |

---

## Duplicate protection (verified)

| Rule | Verified? |
|------|-----------|
| Primary dedupe key = `Payment Transactions.Stripe Payment ID` | **Yes** — replay did not create second row |
| Fillout Submission ID | Traceability only — not dedupe key | |

Do **not** overwrite `Enrollments.Price Paid to Stripe`.

---

## Test plan status

| # | Case | Status |
|---|------|--------|
| T-paid | Controlled Production — paid PaymentIntent (`pi_…`) | **Pass** — $2.00, Paid, linked Enrollment (2026-08-26) |
| T-dedupe | Replay same Stripe Payment ID | **Pass** — no duplicate row |
| T-free | 100%-coupon / zero-dollar Checkout Session | **Deferred** — route not implemented |
| T-coupon | Coupon Code populated | **Deferred** — webhook does not send coupon code |

---

## Mike actions before free-payment architecture (November/December)

1. **Free route design** — Stripe Checkout Session webhook, dedupe key, Enrollment correlation.
2. **Free route implementation** — zero-dollar path with controlled Production registration.
3. **Coupon code decision** — Fillout webhook extension, Stripe metadata copy, or accept blank for v1.
4. **Negative cases** — Missing Stripe Payment ID, unknown Submission ID (fail closed).
5. **Commit Make blueprint** — Export scenario JSON (redact secrets).
6. **Activate scenario** — Turn on Make scenario in Production only after Mike approval for paid route.

---

## Appendix — End-to-end flow

```text
User → fairfieldbasketballclub.com/shoot
         └─ forms.fairfieldbasketballclub.com/shoot-playerregistration
              └─ Fillout Stripe payment
                   ├─ Fillout → Airtable: Enrollments (list price on Price Paid to Stripe)
                   └─ Fillout → Make webhook (FUT-003)
                        ├─ [PAID — validated] Make → Stripe PaymentIntent retrieve → Payment Transactions
                        └─ [FREE — deferred Nov/Dec 2026] Stripe Checkout Session webhook → Payment Transactions (TBD)
```
