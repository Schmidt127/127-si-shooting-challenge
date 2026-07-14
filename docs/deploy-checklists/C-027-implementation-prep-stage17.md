# C-027 — Major-event notifications implementation prep (Stage 17)

**Status:** DEV implementation prep COMPLETE (repo) — **no Airtable schema writes / no deploy tonight**  
**Date:** 2026-07-13  
**Authority:** Stage 16 catalog + owner decisions  
**PROD:** untouched

---

## 1. Locked product rules

| Rule | Value |
|------|-------|
| Audience | Parents |
| Channel default | **Email** |
| Timing default | **Immediate** |
| Daily submission notify | **No** (do not change 077/071 patterns for MEN) |
| Missing master / email config | **Do not send** |
| Streak majors | Data-driven via Achievements.`Parent Notification Enabled?` |
| Seed streaks | 10, 20, 30, 40, 50, 60 |
| Shot majors | Shot Milestones.`Parent Notification Enabled?` |
| Events | Level up · Major shot · Perfect Week · Major streak |

---

## 2. Live inventory gap (verified DEV Meta 2026-07-13)

| Table | Finding |
|-------|---------|
| Config | **No** Major Event Notify* fields yet (16 unrelated fields) |
| Achievements | **No** `Parent Notification Enabled?` |
| Shot Milestones | **No** `Parent Notification Enabled?` |

---

## 3. Exact Config fields to create (DEV)

| Field | Type | Default | Fallback if missing |
|-------|------|---------|---------------------|
| `Major Event Notify Enabled?` | Checkbox | Checked | **false (no send)** |
| `Major Event Notify Channel` | Single select: Email · SMS · Email+SMS | Email | Email |
| `Major Event Notify Timing` | Single select: Immediate · Scheduled Batch · Weekly Digest | Immediate | Immediate |
| `Major Event Level Up Enabled?` | Checkbox | Checked | true when master on* |
| `Major Event Shot Milestone Enabled?` | Checkbox | Checked | true when master on* |
| `Major Event Perfect Week Enabled?` | Checkbox | Checked | true when master on* |
| `Major Event Streak Milestone Enabled?` | Checkbox | Checked | true when master on* |

\*Event allowlist fallbacks apply only if master enabled is resolvable true; if master missing → no send.

Placement: **Config** table, active season row (`Active School Year`).

---

## 4. Achievements / Shot Milestones fields

| Table | Field | Type | Seed |
|-------|-------|------|------|
| Achievements | `Parent Notification Enabled?` | Checkbox | Check rows with Trigger Type streak length ∈ {10,20,30,40,50,60} |
| Shot Milestones | `Parent Notification Enabled?` | Checkbox | Enable milestones intended as “major” (owner may tune) |

---

## 5. Send-key / idempotency

| Event | Send key |
|-------|----------|
| Level up | `MEN\|LEVEL\|{enrollmentId}\|{levelIdOrName}\|{occurredDate}` |
| Shot milestone | `MEN\|SHOT\|{enrollmentId}\|{milestoneKey}` |
| Perfect Week | `MEN\|PW\|{enrollmentId}\|{weekId}` |
| Streak | `MEN\|STREAK\|{enrollmentId}\|{achievementKey}\|{threshold}` |

Store on notification log table **or** search existing outbound email packages / MEN log for key before send (mirror 074 idempotency). Never send twice for same key.

---

## 6. Future automation triggers (not built tonight)

| Event | Suggested trigger source | Notes |
|-------|--------------------------|-------|
| Level up | After 042 level assign when level changes | Parents only; Active? enrollment |
| Shot milestone | After 066 unlock create | Gate on Shot Milestones flag |
| Perfect Week | After 058 unlock | Gate on Config Perfect Week enabled |
| Streak | After streak unlock / 054–059 path | Gate on Achievements flag |

v1 channel = Email via Make webhook (074-style). SMS later.

Eligibility: Enrollment `Active?` + existing comms exclusions (do not invent parallel flags).

---

## 7. Test contracts (offline)

See `tools/airtable/tests/test_c027_men_contracts.py`:

- master missing → no send  
- event disabled → no send  
- streak flag false → no send  
- seed 10–60 eligible when flagged  
- send key stable / idempotent  

---

## 8. DEV implementation checklist (later)

- [ ] Create Config MEN fields + set defaults  
- [ ] Add Parent Notification Enabled? to Achievements + Shot Milestones  
- [ ] Seed streak 10–60 checked  
- [ ] Choose/create MEN send log field or table  
- [ ] Draft automations (new numbers after Zoom 117*)  
- [ ] DEV send to Mike/Schmidt only  
- [ ] Promotion checklist for PROD (separate)

## 9. Explicit non-goals tonight

No PROD, no real emails, no Make scenario edits, no Vercel.
