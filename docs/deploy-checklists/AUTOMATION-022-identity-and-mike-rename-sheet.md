# Automation 022 — Identity resolve + Mike rename sheet

**Stage:** S26 · Workstream 5  
**Date:** 2026-07-14  
**Scope:** Analysis + docs only — **no Airtable UI changes**, no PROD, no deletes.

---

## Verdict

| Field | Resolved value |
|-------|----------------|
| **Identity** | **Confirmed** — GitHub file is the intended 022 |
| **Script** | `airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js` |
| **Intended Airtable name** | `022 - Submission Intake - Sync Child Upload Writeback from Submission Asset` |
| **Folder** | `02 - Submission Intake and Asset Creation` |
| **Trigger table** | **Submission Assets** |
| **Required?** | **Yes** — homework + video upload writeback path (after Make/Lambda) |
| **Rank** | **Keep separate** — do not merge with 009 / 013 / 020 / 070a / 070b |

---

## Evidence chain

| Source | What it says | Match? |
|--------|--------------|--------|
| GitHub header / docblock | Sync child upload writeback from Submission Asset; v1.1; tables SA / HC / VF | Canonical |
| [`docs/automation-index.md`](../automation-index.md) | Same name + trigger (Uploaded/Processing/Error + child linked) | Yes |
| Adjacent 009 | Creates assets; sets Pending Link ladder — does **not** write post-Make child fields | Complementary |
| Adjacent 013 | Create/link Video Feedback + arm 070b — explicitly not Make/writeback | Complementary |
| Adjacent 020 | Link/create HC + arm 070a; notes 022 also runs post-Make for writeback sync | Complementary |
| 070a / 070b | Send payload to Make → Lambda → S3 → asset writeback; 022 syncs **child** | Downstream of 070a/b |
| DEV docs table (`DEV-automations-doc-table-slim-2026-07-14.json`) | **No row named 022** | Doc-table gap (UI may still have slot) |
| Inventory (pre-S26) | 022 = Y UI estimate · Docs? **N** · GH? Y · Keep separate | Aligns |

**Pipeline order (intended):**

```text
009 create asset
  → 020 (homework) or 013 (video) create/link child + Pending Link + Send to Make
  → 070a / 070b Make → Lambda → S3 write asset fields
  → 022 copy upload status / Drive URLs / errors / uploaded-at onto child HC or VF
```

---

## Intended trigger (from script — confirm live UI)

**Table:** Submission Assets · Prefer **When record matches conditions** or enters a dedicated view.

| Include | Exclude / do not use |
|---------|----------------------|
| Upload Status is **Uploaded** OR **Processing** OR **Error** | Upload Status is **Pending Link** |
| Upload Destination is **Homework Completions** OR **Video Feedback** | — |
| Homework Completions **or** Video Feedback link not empty | — |
| Optional: Google Drive File URL not empty (Uploaded path) | — |

**Input:** `recordId` = triggering Submission Assets id.

**Writes (child only):** HC or VF upload status, Drive fields, upload error, uploaded-at / video asset uploaded-at, Writeback Complete? (homework). Does **not** create children, does **not** send Make, does **not** change asset Upload Status.

---

## Mike rename sheet (UI only — when you choose)

Use this if DEV Automations UI shows a different display name, missing number, wrong folder, or orphan slot that should be 022.

| Check | Expected |
|-------|----------|
| Automation name | `022 - Submission Intake - Sync Child Upload Writeback from Submission Asset` |
| Folder | `02 - Submission Intake and Asset Creation` |
| Script pasted from | GitHub 022 file (skip GitHub header) |
| Trigger table | Submission Assets |
| Trigger conditions | Match recommended set above |
| Display name quirk | If UI shows blank/`022 -` only → paste full intended name above |
| ON/OFF | ON when testing upload E2E; may be left ON in DEV if it is idle-safe (idempotent) |
| Do **not** | Delete this automation; merge into 070a/b; rename to a different number |

**Docs-table follow-up (optional Mike):** add/reconcile Automations documentation row for 022 so inventory Docs? flips Y. Not required for identity.

**Stop tonight:** no UI rename required for this investigation to close. Identity is resolved in GitHub + automation-index.

---

## What this is not

| Not | Owner |
|-----|--------|
| Asset creation | 009 |
| HC create/link | 020 |
| VF create/link | 013 |
| Make send | 070a / 070b |
| Async Accepted verify | 070c (path-specific) |

---

## Related docs

- [AIRTABLE-AUTOMATION-INVENTORY.md](../architecture/AIRTABLE-AUTOMATION-INVENTORY.md)
- [AIRTABLE-AUTOMATION-DEPENDENCY-MAP.md](../architecture/AIRTABLE-AUTOMATION-DEPENDENCY-MAP.md)
- [automation-index.md](../automation-index.md) · audits E/G
