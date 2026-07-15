# Automation 022 — Identity resolve + Mike rename sheet

**Stage:** S29 · Agent B (Lead-integrated)  
**Date:** 2026-07-15  
**Scope:** Analysis + docs only — **no Airtable UI changes**, no PROD, no deletes.

---

## Verdict (S29)

| Field | Resolved value |
|-------|----------------|
| **Identity** | **Confirmed** — GitHub file is the intended 022 |
| **Script** | `airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js` |
| **Full Windows path** | `C:\Users\mschmidt_fairfield\Documents\GitHub\127-si-shooting-challenge\airtable\automations\shooting-challenge\022-submission-intake-sync-child-upload-writeback-from-submission-asset.js` |
| **Intended Airtable name** | `022 - Submission Intake - Sync Child Upload Writeback from Submission Asset` |
| **Version** | **v1.1** |
| **Folder** | `02 - Submission Intake and Asset Creation` |
| **Trigger table** | **Submission Assets** |
| **Input** | `recordId` (Submission Assets id) |
| **Config drift beyond name?** | **No** — GitHub trigger/inputs/writes coherent; only known issue is blank/truncated UI display name (`022 -`) |
| **Required?** | **Yes** — homework + video upload writeback after Make/Lambda |
| **Rank** | **Keep separate** |

---

## Dependencies

009 → 020/013 → 070a/070b → **022** child writeback sync.

---

## Intended trigger (confirm live UI — do not change in S29)

**Table:** Submission Assets · When record matches conditions:

| Include | Exclude |
|---------|---------|
| Upload Status is **Uploaded** OR **Processing** OR **Error** | Upload Status is **Pending Link** |
| Upload Destination is **Homework Completions** OR **Video Feedback** | — |
| Homework Completions **or** Video Feedback link not empty | — |

---

## Mike rename (UI only — when chosen)

| Check | Expected |
|-------|----------|
| Exact rename to | `022 - Submission Intake - Sync Child Upload Writeback from Submission Asset` |
| Folder | `02 - Submission Intake and Asset Creation` |
| ON/OFF | Unchanged |
| Do **not** | Delete; merge into 070a/b; renumber |

**S29:** docs only — **no Airtable changes this cycle**.
