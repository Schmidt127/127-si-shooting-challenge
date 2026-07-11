# C-013 — PROD closeout

**Date:** 2026-07-11
**Repository status:** **COMPLETE**
**Operational status:** **ACTIVATION PENDING**
**Automation 070b:** **OFF**
**Automation 070a:** **OFF**

---

## A. Completed and committed

- PROD Lambda direct smoke PASS
- PROD Make manual route PASS on Schmidt Submission Asset `recGQ8EjAMz3bEBiW`
- Primary upload: HTTP 200 · `statusOut=success` · `actionOut=uploaded` · Lambda `allPass=true`
- Independent Airtable writeback probe: `allPass=true`
- Canonical URL, storage key, SHA-256 metadata, Uploaded At, and Writeback Complete verified
- Idempotency: `skipped_already_uploaded`; storage key/hash unchanged
- Invalid route: `error_invalid_route`; expected Upload Status=`Error`; canonical/hash preserved
- Smoke runner parsing fixed and covered by unit tests
- Sanitized Make blueprint committed with placeholders only
- Make blueprint documents structured Lambda error forwarding (`handleErrors=false`)
- PROJECT_STATE, CHANGELOG, backlog, close-out considerations, audit, and runbooks updated
- `.gitignore` protects local env, generated `_preview`, and unsanitized Make exports
- Tracked-file scan found no exact local operational URL/secret values

---

## B. Manual actions Mike must perform

### 1. Rotate the exposed PROD upload secret

The secret was displayed during local/chat preparation and must be treated as exposed.

Generate one new secret and update these three locations in one maintenance window:

1. **AWS Lambda** `127si-upload-asset` → environment variable `UPLOAD_WEBHOOK_SECRET`
2. **Make** `Shooting Challenge - GAME - Upload Engine - Lambda - v1` → HTTP header `X-Upload-Secret`
3. **Local tooling** → `tools/airtable/.env` / gitignored session value

Do not print or commit the value.

After rotation:

```powershell
cd tools/airtable
python c013_prod_make_smoke_run.py preflight
python c013_prod_make_smoke_run.py all --asset-id recGQ8EjAMz3bEBiW --reset
```

Require `overallPass=true`.

### 2. Verify Airtable 070b and isolation view

Follow [C-013-prod-070b-ui-verification-2026-07-11.md](./C-013-prod-070b-ui-verification-2026-07-11.md):

- Exact v4.2 script pasted
- Trigger: Submission Assets → record matches conditions
- Send to Make Trigger checked
- Upload Status = Pending Link
- Upload Destination = Video Feedback
- Inputs: triggering `recordId`, PROD `makeWebhookUrl`, literal `automationNumber=070b`
- Automation remains OFF
- `C-013 PROD Smoke — Schmidt Testing Only` view contains no live athlete records

### 3. One Airtable-triggered Schmidt test

Mike must explicitly approve the test. Use only `recGQ8EjAMz3bEBiW` (or a fresh fixture linked only to `recgP9qZYjAhE7NXm`).

- Make scenario ON for controlled window
- 070a OFF
- Enable 070b only for the controlled trigger
- Verify exactly one Make/Lambda run and full canonical/hash writeback
- Probe `allPass=true`
- Repeat/idempotency behavior approved
- Return 070b and Make to the approved final states

---

## C. Deferred C-023 work

The following are **not C-013 closeout blockers**:

- Clearing Airtable attachments after verified upload
- Retiring legacy Google Drive fields/consumers
- Broader content-hash duplicate policy and review workflow
- Historical attachment migration/backfill
- 070a homework activation
- Formula/view/web cutover to canonical URLs

Track these under **C-023** (and dependent C-012/C-024 work) with separate approval and test plans.

---

## D. Exact definition of done for C-013

C-013 is fully done only when all are true:

- [x] Code and smoke-runner tests committed
- [x] Sanitized Make blueprint committed
- [x] PROD Lambda direct smoke PASS
- [x] PROD Make manual upload/writeback/idempotency/invalid-route smoke PASS
- [x] PROJECT_STATE, CHANGELOG, backlog, close-out notes, and runbooks updated
- [x] Secret exposure reviewed
- [ ] Exposed PROD upload secret rotated in AWS Lambda, Make, and local env
- [ ] Post-rotation auth checks + manual Make smoke PASS
- [ ] Live Airtable 070b v4.2 builder + isolation view verified
- [ ] One real Airtable 070b-triggered Schmidt test PASS
- [ ] Make scenario and 070b left in Mike-approved production states

**Current conclusion:** repository closeout is complete; operational definition of done is pending the five unchecked gates.
