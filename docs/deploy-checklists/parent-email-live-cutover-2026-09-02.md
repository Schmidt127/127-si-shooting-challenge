# Parent-email Live cutover — Production operator packet

**Status:** Authorized (2026-09-02) — no real enrolled families; disposable proof only  
**Base:** `appn84sqPw03zEbTT` (Production only)  
**Disposable recipient:** `schmidt@fairfieldbasketballclub.com` only  
**Hub:** `https://communications-two-blue.vercel.app` (Resend provider)

## Scope

Activate Live parent-email paths for future registrations:

| Path | Event / template | Queue producer | Dispatcher |
|------|------------------|----------------|------------|
| WELCOME | `WELCOME` | **078A** | **079** |
| DAILY | `DAILY_SUBMISSION` | **076** | **079** |
| WEEKLY | `WEEKLY_ATHLETE_SUMMARY` | **074** (after **072** / **118** / **119**) | **079** |
| HOMEWORK | `HOMEWORK_FEEDBACK` | **071** | **079** |
| VIDEO | `VIDEO_FEEDBACK` | **073** | **079** |
| ZOOM_RECORDING_APPROVAL | `ZOOM_RECORDING_APPROVAL` | **117** | **079** |

**Do not:** create Automation **121**; modify **101** / SC-147; re-enable Make/Gmail email scenarios; run season simulation.

## Preflight (stop if any fail)

1. **No real families** — active enrollments must be VERIFY / Schmidt test rows only.
2. **Disposable recipient** — parent-facing sends during proof use `schmidt@fairfieldbasketballclub.com` only.
3. **Hub ready** — `GET /api/health` → `{ "status": "ready", "provider": "RESEND" }`.
4. **Make/Gmail email OFF** — no Make parent-email scenarios ON.
5. **GitHub versions match Production** for **071**, **072**, **073**, **074**, **076**, **079**, **117**, **118**, **119**; paste **078A v1.5** (was v1.3 in Production at cutover start).

## Production automation inputs (Live)

Set in Airtable Automations UI — preserve dynamic `recordId` mappings and triggers.

| Automation | Inputs |
|------------|--------|
| **071** | `testMode` = **false** |
| **073** | `testMode` = **false** |
| **074** | `testMode` = **false** |
| **076** | `testMode` = **false** |
| **117** | `testMode` = **false** |
| **118** | `dryRun` = **false**, `sendMode` = **Live**, `includeSchmidt` = **false** |
| **119** | `dryRun` = **false**, `includeSchmidt` = **false** |
| **078A** | `testMode` = **false** (after v1.5 paste; default in script remains true until input set) |

**079** remains the Hub dispatcher — no send-mode input change.

## 078A v1.5 paste

1. Open **078A - Enrollment → Create WELCOME Email Handoff**.
2. Paste GitHub production body from `078A-email-notifications-and-external-handoffs-enrollment-create-welcome-email-handoff.js` (docblock through end; skip GitHub-only header if present).
3. Preserve trigger + `recordId` = triggering Enrollment record ID.
4. Add optional automation input **`testMode`** (boolean); set **false** for Live cutover.
5. Confirm **Parent Email - Cleaned** is the recipient source (not raw Parent Email fallback).

## Controlled disposable verification

Run:

```bash
node tools/testing/parent-email-live-cutover.mjs preflight
node tools/testing/parent-email-live-cutover.mjs verify-all --apply
```

Per path, confirm:

- Correct source record triggers the producer.
- Exactly one new **Email Handoff Queue** row (Accepted → Hub sent).
- Recipients resolve to **schmidt@fairfieldbasketballclub.com** only.
- Replay does not create a duplicate handoff.
- Hub Delivery audit shows Resend provider id.

Evidence: `docs/testing/evidence/parent-email-live-cutover/`

## Rollback

| Setting | Rollback value |
|---------|----------------|
| **071 / 073 / 074 / 076 / 117** `testMode` | **true** |
| **078A** `testMode` | **true** (or disable 078A trigger) |
| **118** `dryRun` | **true** |
| **118** `sendMode` | **Test** |
| **119** `dryRun` | **true** |
| **079** | Leave ON (dispatcher); stop arming queue rows if emergency |
| Make/Gmail email | Remain **OFF** |

Do not bulk-delete Delivery audit rows.

## Post-cutover

- Update `CHANGELOG.md` (### Airtable)
- Update `docs/CURRENT-TRUTH.md` § Email path
- Update `docs/integrations/email-send-plane.md`
- Mark paths ready for future real registrations (participant-wide welcome still requires WELCOME activation checklist if Test Mode restrictions apply)
