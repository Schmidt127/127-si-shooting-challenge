# Phase D — Authorization package (final readiness)

**Status:** `AUTHORIZED` — Mike authorized Phase D UI 2026-07-15 (S28)  
**Scope:** DEV only · blank webhook · 072 OFF / 074 OFF for first smoke · retire 074 only after critical PASS · no 117 / other Folder 07 / PROD / real email.

---

## Surviving automation

| Item | Value |
|------|--------|
| **Exact name** | `072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package` (optional rename to “… Build and Send …”) |
| **Absorb** | **074** → GitHub library stub; delete only after post-paste live PASS |
| **Full Windows source path** | `C:\Users\mschmidt_fairfield\Documents\GitHub\127-si-shooting-challenge\airtable\automations\shooting-challenge\072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js` |
| **Version** | **v4.0.0** |
| **Rollback folder** | `C:\Users\mschmidt_fairfield\Documents\GitHub\127-si-shooting-challenge\airtable\automations\shooting-challenge\_rollback\phase-d-072-074-2026-07-14\` |

---

## Verified behaviors (offline **20/20 PASS**)

| Behavior | Result |
|----------|--------|
| BUILD before SEND ordering | Pass |
| Package already exists / send-ready | Pass |
| Duplicate trigger / already-sent | Pass |
| Send key shape / idempotency | Pass |
| Retry after failed webhook (Send stays armed) | Pass |
| Blank webhook → safe no-send (no throw) | Pass |
| sendEnabled / disabled gate | Pass |
| Missing recipient / missing package fields | Pass |
| Weekly timing boundary contracts | Pass |
| Folder 07 Airtable states | **Unchanged by Cursor** (docs-only confirmation) |

Command: `python -m unittest tools.airtable.tests.test_phase_d_072_074_combined -v`

---

## Trigger recommendation (WAS)

**Table:** Weekly Athlete Summary  
**Type:** When record matches conditions  
**Conditions (AND):**

1. `Weekly Email Sent?` unchecked  
2. Enrollment not empty  
3. Week not empty  
4. **OR:** `Build Weekly Email Now?` checked **OR** (`Send to Make?` checked **AND** `Weekly Email Ready?` checked)

**Initial state after paste:** keep **072 OFF** until smoke starts; keep legacy **074 OFF**.

---

## Input variables

| Input | Purpose | First smoke |
|-------|---------|-------------|
| `recordId` | Triggering WAS id | Required |
| `makeWebhookUrl` / `webhookUrl` | Make URL | **Blank** |
| `sendMode` | `test` / live | `test` |
| `testRecipientEmail` | Test inbox only | Only with test Make |
| `autoSendAfterBuild` | Same-run send after build | `false` |
| `sendEnabled` | Hard gate | omit or true |

---

## Mike’s first UI action (when authorized)

1. Open DEV automation **072** (Folder 07).  
2. Paste GitHub **v4.0.0** (skip GitHub header).  
3. Wire inputs; leave webhook **blank**.  
4. Leave **072 OFF** and **074 ON/OFF as today — both OFF preferred** until build-only smoke.  
5. Do **not** delete 074 until smoke PASS.

Full sheet: [PHASE-D-072-074-mike-ui-actions.md](./PHASE-D-072-074-mike-ui-actions.md)

---

## Capacity

| Milestone | Free (est.) |
|-----------|------------:|
| Now (post C2) | **4** |
| After Phase D (074 retired) | **5** (+1) |

---

## Rollback

Restore both scripts from `_rollback/phase-d-072-074-2026-07-14/` into Airtable 072 + 074; stop Phase D.
