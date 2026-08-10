# Zoom subsystem — final test procedure (2026–2027)

**Config:** `rechc1f9f4kVM1tHP` (populate per D7 before season)  
**PROD posture:** 101 ON · 117 email-only ON · 057/042 ON · never Stage 17 orchestrator in slot 117

## Configuration audit

| Check | Expected | Live verify |
|-------|----------|-------------|
| Zoom Meetings linked to 2026–27 Config | Season schedule rows | OMNI |
| Recording Path Enabled | Match 2025–26 policy | OMNI |
| Recording XP % of live | 50 (if copying prior year) | OMNI |
| Approval email enabled | Yes for recording season | OMNI |
| Template key | `ZOOM_RECORDING_APPROVED` | OMNI |
| Cross-PI isolation | Attendance XP on Schmidt enrollment only | Test |

## Test sequence (Schmidt only)

Run cards in order from [`SCHMIDT-TEST-CARDS.md`](./SCHMIDT-TEST-CARDS.md):

1. **CARD-ZOOM-LIVE** — live attendance XP via 101
2. **CARD-ZOOM-REC** — recording credit without live double-count
3. **CARD-ZOOM-EMAIL** — 117 → Make 117f live send
4. **CARD-PW-ZOOM** — Perfect Week interaction with Zoom optional

## Live vs recording exclusivity

**Hard rules (Stage 17):**

- Never write `Zoom Meetings.Attendees` from recording path
- Conflict rollup `ARRAYJOIN(ARRAYUNIQUE(values), "\n")` must show LIVE+REC tags when both exist
- Recording XP inactive when Conflict=1 / Approved=0

**Reference:** [`C-025-stage17-prod-live-2026-07-20.md`](../../deploy-checklists/C-025-stage17-prod-live-2026-07-20.md)

## Recording approval email (117f)

Follow [`117-ZOOM-APPROVAL-GO-LIVE.md`](../../deploy-checklists/117-ZOOM-APPROVAL-GO-LIVE.md) exactly.

Offline proof already PASS: `node tools/testing/tests/test_117_email_handoff_offline.mjs` → 7/7

**Remaining:** Mike 10-minute live proof to Schmidt inbox.

## Perfect Week interaction

- Recording makeup counts for PW only if Config `Recording Makeup Counts for Perfect Week` = Yes (D7)
- Run **CARD-PW-ZOOM** after week activity complete

## Failure / retry paths

| Failure | Expected behavior |
|---------|-------------------|
| Webhook blank / fail | Do not clear send trigger; retry after fix |
| Duplicate sendKey | `already_sent` — no second email |
| Live + recording same meeting | Conflict state; no duplicate XP |

## Evidence package

| File | Content |
|------|---------|
| ZA record ids | Live + recording paths |
| XP Source Keys | ZOOM_ATTEND_* / ZOOM_RECORDING_* |
| 117 output JSON | statusOut, actionOut, makeStatus |
| Gmail | Schmidt only |

## Production-only actions

1. Copy Zoom config fields from 2025–26 Config (D7)
2. Create/link season Zoom Meeting rows
3. Execute Schmidt test cards
4. Do **not** enable 117a–e orchestrator alternatives in PROD slot 117
