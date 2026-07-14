# C-025 — DEV-only testable intake path

**Date:** 2026-07-14  
**Feature:** C-025 Zoom recording attendance (DEV DoD)  
**Public Fillout / website submission:** **not required** for DEV E2E

---

## DEV intake (approved temporary path)

| Step | How |
|------|-----|
| 1 | Create or open a **Zoom Attendance** row linked to Enrollment + Zoom Meeting |
| 2 | Set `Attendance Method` = **Recording Quiz** |
| 3 | Leave answer text / coach notes in existing coach fields (optional for credit formulas) |
| 4 | Set `Recording Quiz Review Status` = **Needs Review** (or run **117a** after paste) |
| 5 | Coach sets Review Status = **Satisfactory** (or run **117b**) |
| 6 | Formulas compute `Zoom Credit Approved?`, `Zoom XP %/Amount`, `Zoom Gate Credit Earned?`, `Zoom Credit Key` |
| 7 | Run **117c–e** (after Airtable paste) for XP + Attendees roster; **117f** stays skipped without webhook / when email disabled |

**Automation harness:**

```bash
python tools/airtable/_c025_dev_e2e_recording_credit_harness.py plan
python tools/airtable/_c025_dev_e2e_recording_credit_harness.py offline
python tools/airtable/_c025_dev_e2e_recording_credit_harness.py live --confirm-write
```

This mutates the Schmidt recording fixture `recHkB9aER3vCvBsL` and restores Review/Satisfactory/Method afterward.

---

## Remaining before real user intake

| # | Item | Owner |
|---|------|-------|
| 1 | Public **Fillout** (or Interface form) that creates/updates Zoom Attendance Recording Quiz rows with Enrollment + Meeting identity | Product + Mike |
| 2 | Or Next.js `/shoot` submission route (currently out of scope for web write path) | Future wave |
| 3 | Paste/activate **117a–f** in DEV Airtable UI with triggers from stage17 design | Mike / Cursor paste checklist |
| 4 | DEV Make webhook for **117f** only if email testing is desired (default: leave webhook blank → `skipped_no_webhook`) | Mike |
| 5 | PROD promotion package apply after Mike approval | Lead |

Until items 1–3 are done, coaches/testers use the DEV Airtable path above.
