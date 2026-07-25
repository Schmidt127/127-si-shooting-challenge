# Next Implementation Wave — Bounded Assignments

**Date:** 2026-07-24 · Agent 5  
Avoid broad “finish the app” tasks.

---

## Wave N1 — Automation attestation closer (Owner: Mike + OMNI)

| Field | Value |
|-------|-------|
| Scope | Fill `AUTOMATION-ATTESTATION-PACKET.md` for 112, 063/111, 117 XOR 117c, headers 020/054/066/072/074/118/119, 118/119 dryRun values |
| Inputs | Attestation packet; MIKE-ACTIONS.md; automation-index |
| Expected files | Updated attestation packet only (or chat answers for Agent to paste) |
| Tests | None |
| Production actions | Read-only UI attest (no schema deletes) |
| Completion proof | Packet rows filled |
| Must not edit | Script bodies; Make modules |

---

## Wave N2 — First-Sunday email watch + dryRun policy (Owner: Mike)

| Field | Value |
|-------|-------|
| Scope | Observe next Sunday 118/119/072/074/Make; decide dryRun false only if base still controlled-test population |
| Inputs | GO-LIVE-READINESS; WAS architecture; activation checklist (COMPLETE) |
| Expected files | Short note under `docs/next-wave/was-email/` or chat |
| Tests | None from agents |
| Production actions | Optional dryRun change **only** if Mike authorizes that exact change |
| Completion proof | Run counts + Sent? samples + no non-Schmidt leakage |
| Must not edit | Create new automations/scenarios |

---

## Wave N3 — Schmidt HW / video / Zoom live packs (Owner: Cursor Implementation)

| Field | Value |
|-------|-------|
| Scope | Controlled PROD Schmidt proofs for homework review→XP, video upload→XP, Zoom conflict exclusivity |
| Inputs | Completion Master SC-009–017, SC-072–087; testing-integrity baseline |
| Expected files | Evidence markdown under `docs/deploy-checklists/` or overnight results; no schema invent |
| Tests | Existing offline suites green; add regression only if a script defect is fixed |
| Production actions | Only Mike-authorized named checks |
| Completion proof | Record IDs + Source Keys per path |
| Must not edit | Agent 4 QC pack; go-live schedule docs; Team Shot Tracker |

---

## Wave N4 — Weekly Threshold XP decision + optional writer (Owner: Mike decide → Cursor)

| Field | Value |
|-------|-------|
| Scope | Product: implement sole writer **or** mark rules Not Needed / hide |
| Inputs | xp-source-key-registry; XP-IDEMPOTENCY-AUDIT; Agent 1/4 gaps |
| Expected files | If implement: one script + offline tests + index row; if not: master status → Not Needed |
| Tests | Offline idempotency for new writer |
| Production actions | Paste only after Mike auth |
| Completion proof | Decision recorded + either writer Live Tested or rules archived |
| Must not edit | Competing XP writers; 112; dual 117 |

---

## Wave N5 — Optional Agent 3 external-systems audit (Owner: Research agent)

| Field | Value |
|-------|-------|
| Scope | Make/Fillout/Softr/Gmail mappings inventory vs repo — **no live changes** |
| Inputs | make/blueprints; Fillout contracts; Softr readiness; WAS architecture |
| Expected files | `docs/next-wave/external-systems-audit-YYYYMMDD/` REPORT + RESULTS.json |
| Tests | Offline blueprint validators if present |
| Production actions | None |
| Completion proof | Discrepancy table + Mike UI list ≤10 items |
| Must not edit | Completion Master statuses without evidence; invent fields |

---

## Files agents must not edit without Lead

- `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` (Lead/Agent 5 only for status)  
- `docs/PROJECT_STATE.md` tip/C-011 block (Lead)  
- `docs/next-wave/go-live/*` (unless correcting proven stale fact)  
- Other agents’ exclusive packs mid-flight  
