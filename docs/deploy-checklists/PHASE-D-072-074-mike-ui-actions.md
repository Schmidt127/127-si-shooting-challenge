# Mike UI actions — Phase D (072 ∪ 074)

**Repo prep is done.** Status: **AUTHORIZED** (Mike · 2026-07-15 · S28).

**Do not send real family email. Do not configure a live Make webhook until test inbox path is confirmed. Do not touch 117. Do not touch other Folder 07 OFF automations. Do not touch PROD.**

Complete no-send smoke: [PHASE-D-072-074-dev-no-send-smoke.md](./PHASE-D-072-074-dev-no-send-smoke.md)

---

## Evidence already green (Cursor — repo only)

| Gate | Result |
|------|--------|
| Offline contracts | **20/20 PASS** (`tools/airtable/tests/test_phase_d_072_074_combined.py`) |
| Rollback | `_rollback/phase-d-072-074-2026-07-14/` (072 + 074 + README) |
| Combined SoT | `072-…build-weekly-summary-email-package.js` **v4.0.0** |
| 074 path | Library stub in GitHub |
| Decision | `docs/overnight-runs/results/S26-phase-d-decision.md` |
| Auth | `docs/overnight-runs/stages/S28-AUTHORIZED.md` |

---

## Step 0 — Authorize

**DONE** — Mike: Authorize Phase D UI (2026-07-15).

---

## Step 1 — Update surviving automation **072** (leave OFF)

1. DEV → Automations → Folder 07 → open **072**.
2. Rename (optional):  
   `072 - Email, Notifications, and External Handoffs - Build and Send Weekly Summary Email Package`
3. Paste script from (skip GitHub header):  
   `airtable/automations/shooting-challenge/072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js`
4. Inputs:
   | Input | Value |
   |-------|-------|
   | `recordId` | Triggering WAS record |
   | `makeWebhookUrl` | **Leave blank** for first DEV smokes |
   | `sendMode` / `sendModeInput` | `test` |
   | `testRecipientEmail` | Only when using a test Make scenario |
   | `autoSendAfterBuild` | `false` (default) |
   | `sendEnabled` | omit or `true` |
5. Trigger — When record matches conditions on **Weekly Athlete Summary**:
   - `Weekly Email Sent?` is unchecked
   - Enrollment is not empty
   - Week is not empty
   - **AND** (`Build Weekly Email Now?` is checked **OR** (`Send to Make?` is checked **AND** `Weekly Email Ready?` is checked))
6. Keep **072 OFF** until smoke plan starts.
7. Keep legacy **074 OFF**.

### Smoke checklist (blank webhook — safe)

| Test | Expect |
|------|--------|
| Build only (Build Now) | HTML/subject/recipients written; Ready on; Send unchecked; `sendActionOut=skipped` / `skipped_no_webhook` if armed |
| Package exists + Send armed | `skipped_no_webhook` (no throw) |
| Already Sent? | Skip send |
| Missing recipients on send-only | `skipped_missing_recipient` |

### Optional later smoke (test webhook only)

| Test | Expect |
|------|--------|
| Test webhook + testRecipientEmail | Make receives payload; Send clears; Sent? still false until Make/Gmail |
| Webhook fail | Error set; Send stays checked |
| Retry | Second run succeeds; no duplicate if Make dedupes sendKey |

If **critical** fail → restore `_rollback/phase-d-072-074-2026-07-14/` and **stop**.

---

## Step 2 — After smoke PASS, retire **074**

1. Delete automation **074** from DEV UI (consolidation, not “because OFF”).
2. Confirm inventory math: **45 estimated / 5 free** (after C2’s 46/4; no visible Airtable counter).
3. Reply: **“Phase D UI complete”**

---

## Occupancy note

Airtable exposes **no visible** automations counter. Counts are **estimated** from the authoritative inventory + deletion history.
