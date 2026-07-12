# Cursor Desktop prompt — DEV 070a Airtable→Make→Lambda E2E

**Paste this entire prompt into Cursor Desktop** (Agent mode) while the repo is on `overnight/lead-integration` and `tools/airtable/.env` has DEV secrets.

---

## Task Classification

```
Type: Live DEV E2E — Airtable 070a → Make → Lambda writeback
Priority: High
Difficulty: Ops + local terminal
Owner: Mike + Cursor Desktop
Dependencies: DEV Make scenario, 070a v4.4 pasted DEV, local .env
Backlog ID: #11 optional E2E
Estimated Scope: prepare one Pending Link asset + one 070a trigger + probe
Phase: 3 verification
Correct tool: Cursor Desktop terminal (local .env + Make UI + Airtable DEV)
Repo: 127-si-shooting-challenge
Mike's role: Make ON/OFF, 070a ON/OFF, confirm Airtable UI; Desktop runs scripts
```

## Hard stops

- DEV base only: `appTetnuCZlCZdTCT`
- Do **not** touch PROD / `recGQ8EjAMz3bEBiW`
- Do **not** edit Make PROD GAME / `C-013 PROD S3 Upload Webhook`
- Never commit `.env` or webhook secrets
- Leave **070a OFF** and Make **OFF** when finished

## What already passed (do not redo as proof)

- Make webhook → Lambda `uploaded` on `recVUoPApngfRYOys` and `rec3jjoZzDTGiuKXA`
- Skip retest PASS on uploaded assets
- Direct Lambda PASS earlier
- One 070a run returned `Accepted` while Make was **OFF** → no writeback (invalid E2E)

**This prompt is the first real Airtable-triggered E2E with Make ON.**

## Desktop agent instructions

### A. Terminal setup

Open a terminal at the repo root:

```powershell
cd C:\Users\mschmidt_fairfield\Documents\GitHub\127-si-shooting-challenge
git fetch origin overnight/lead-integration
git checkout overnight/lead-integration
git pull origin overnight/lead-integration
git log -1 --oneline
```

Confirm `tools/airtable/.env` has (do not print values):

- `AIRTABLE_TOKEN`
- `MAKE_DEV_UPLOAD_WEBHOOK_URL` (DEV webhook only)
- `LAMBDA_FUNCTION_URL`
- `UPLOAD_WEBHOOK_SECRET`

### B. Mike UI prep (ask Mike to confirm before scripts)

1. DEV Make scenario **ON** (Immediately as data arrives)
2. Module 16 body = `{{14.data}}` preferred (full Lambda JSON); Accepted async is OK only if writeback completes
3. Airtable DEV automation **070a** is pasted v4.4, inputs:
   - `makeWebhookUrl` = DEV webhook
   - `automationNumber` = `070a`
4. Keep **070a OFF** until step E

### C. Create a fresh Pending Link homework asset

```powershell
python -u .\tools\airtable\c013_dev_h1_homework_smoke.py prepare --confirm-write
```

Wait until output includes `assetId` / `found homework asset=rec…`.

If poll shows `linkedSubmission=…` but `assets=0` for >2 minutes:

- Tell Mike to verify DEV automations **005** and **009** are **ON**
- Open the printed Testing Scenario and Linked Submission in DEV
- Do not invent record ids

Print the final prepare JSON and stop for Mike confirmation of:

- `scenarioId`
- `assetId`
- `targetRecordId`
- `uploadStatus` should be `Pending Link`

### D. Preflight the asset (read-only)

```powershell
python .\tools\airtable\_probe_c013_asset_storage_fields.py --record-id <assetId>
```

Expect still **not** allPass (Pending Link). Confirm attachment retained.

Optional Make sanity (does **not** replace Airtable E2E — skip if Mike wants pure 070a path only):

```powershell
# ONLY if Mike asks to prove Make first; otherwise skip to E
python .\tools\airtable\c013_dev_make_homework_webhook_post.py <assetId>
```

If you run that, the asset becomes Uploaded and you must **prepare again** for a true 070a E2E.

### E. Airtable-triggered E2E (the real test)

1. Ask Mike: turn **070a ON** (DEV only)
2. Ask Mike: on `<assetId>`, check **Send to Make Trigger** (if already checked, uncheck → save → check again)
3. Watch Airtable 070a run history — expect either:
   - Full Lambda JSON success (`uploaded`), or
   - `Accepted` / `lambda_upload_accepted_async` (then 070c may clear trigger)
4. Wait 30–90s
5. Probe:

```powershell
python .\tools\airtable\_probe_c013_asset_storage_fields.py --record-id <assetId>
```

**PASS criteria:** `allPass=true` (Upload Status Uploaded + URL + hash + Writeback Complete?)

### F. Shutdown

Ask Mike:

1. **070a OFF**
2. DEV Make **OFF**
3. Comment on GitHub #11: `RESOLVED — 070a Airtable→Make→Lambda E2E PASS on <assetId>` (if pass)

### G. Report back

Return a short block:

```text
E2E result: PASS|FAIL
assetId:
scenarioId:
070a run mode: uploaded_json | accepted_async | did_not_run | error
probe allPass:
Make was ON: yes/no
070a left OFF after test: yes/no
Make left OFF after test: yes/no
notes:
```

## If prepare keeps failing

Fall back (Mike picks manually in DEV Submission Assets):

- Upload Destination = Homework Completions
- Upload Status = Pending Link
- Attachment + Homework Completions link

Then continue from step E with that `rec…`.
