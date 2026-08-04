# Mike — Paste Automation 067 v2.0 NOW (UI only)

**Status (2026-08-04): COMPLETE.** Mike pasted v2.0; Schmidt T1/T2 + 064/065 XP proof **PASS**. See [`067-V2-PROD-INSTALL.md`](./067-V2-PROD-INSTALL.md).

~~Cursor **cannot** write Airtable automation script bodies via API. Live v2.0 proof is blocked until this paste is done.~~

## Exact steps (2–3 minutes)

1. Open PROD base `appn84sqPw03zEbTT` → **Automations**.
2. Open **`067 - Homework - Link or Create Completion from Reflection Quiz`** (do not create a second automation).
3. Confirm:
   - Toggle state (note ON/OFF — leave **ON** for Schmidt tests)
   - Trigger table = **Final Reflection Quiz Submissions**
   - Input variable **`recordId`** = triggering record ID
4. Open the **Run a script** action → select all → delete.
5. Paste **only** the contents of:

   `docs/testing/evidence/2026-08-04-package-02-critical-pastes/067-v2.0-PROD-PASTE.txt`

   (starts with `/************************************************************` and `Version: v2.0` — GitHub header already stripped)
6. Save. Confirm header shows **`Version: v2.0`**.
7. Screenshot or copy the first ~15 lines of the script (version proof).
8. Reply in Cursor: **`067 v2.0 pasted`** (and ON/OFF + screenshot if easy).

## Do not

- Do not modify **020**, **064**, or **065**
- Do not create field **Quiz Result PDF**
- Do not create XP Events manually
- Do not turn **070a** ON for this test

## Rollback

v1.0 baseline already saved:

`docs/testing/evidence/2026-08-04-package-02-critical-pastes/067-PROD-v1.0-baseline-from-git-1fa4e01.js`

After you confirm paste, Cursor will run Schmidt T1 / T2 / 064→065 XP and finish evidence + PR.
