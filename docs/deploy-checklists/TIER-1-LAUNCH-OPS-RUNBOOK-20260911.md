# Tier 1 launch ops — consolidated operator runbook

**Date:** 2026-09-11  
**Production base:** `appn84sqPw03zEbTT` (Production only — no DEV base)  
**Git tip when written:** `3703ffdc` (includes FUT-043 #516)  
**Disposable proof email:** `schmidt@fairfieldbasketballclub.com` only

This packet combines the highest-impact launch ops from CURRENT-TRUTH into **one ordered checklist**. Cursor cannot paste Airtable automations or set Vercel env vars — Mike UI only for execution steps.

---

## Before you start

| Check | Command / action |
|---|---|
| Hub health | `curl -sS https://communications-two-blue.vercel.app/api/health` → expect OK JSON |
| SC health | `curl -sS https://www.fairfieldbasketballclub.com/shoot/api/health` → **200** + `{"status":"ok"}` |
| Active real-family enrollments | Production Enrollments — **stop** if any non-disposable parent email would receive Live sends |
| Version preflight | `node tools/testing/parent-email-live-cutover.mjs preflight` (requires `AIRTABLE_API_TOKEN`) |

**Safety:** Keep automation `testMode=true` / `dryRun=true` until paste verification completes. Flip Live only per [`parent-email-and-auth-live-cutover-2026-09-03.md`](./parent-email-and-auth-live-cutover-2026-09-03.md).

---

## Phase A — Email producer pastes (GitHub → Production)

Paste rule: open the matching `*-PASTE.txt` below → select all → paste into the automation script editor → save. **Do not** paste the GitHub-only header lines.

Regenerate paste files after GitHub edits:

```bash
python3 tools/airtable/extract_email_paste_bundles.py
node tools/testing/tests/test_paste_bundle_integrity.mjs
```

### Paste order (recommended)

| Order | Slot | GitHub version | Live (expected behind) | Paste file | What changes |
|---|---|---|---|---|---|
| 1 | **076** | **v8.14** | v8.12 | [`076-v8.14-PASTE.txt`](./076-v8.14-PASTE.txt) | SC-171 streak from counted days; `athleteFirstName`; no Extra Credit / Shooting % in payload |
| 2 | **071** | **v4.5** | v4.3 | [`071-v4.5-PASTE.txt`](./071-v4.5-PASTE.txt) | SC-171 dates + athlete profile URL; v4.5 Structured Curriculum HC-only asset path |
| 3 | **072** | **v4.9.2** | v4.9.1 | [`072-v4.9.2-PASTE.txt`](./072-v4.9.2-PASTE.txt) | Weekly package + `athleteFirstName` |
| 4 | **074** | **v3.6** | v3.3 | [`074-v3.6-PASTE.txt`](./074-v3.6-PASTE.txt) | Weekly Hub handoff + `athleteFirstName` |
| 5 | **073** | **v4.7** | v4.6 | [`073-v4.7-PASTE.txt`](./073-v4.7-PASTE.txt) | Video Hub handoff + `athleteFirstName` |
| 6 | **117** | **v2.2** | v2.1 | [`117-v2.2-PASTE.txt`](./117-v2.2-PASTE.txt) | Zoom recording approval Hub handoff; meeting display + timestamps |

### After each paste

- [ ] Run automation once on a disposable record (or confirm trigger unchanged)
- [ ] Confirm run-history JSON shows the new `version`
- [ ] Production `Automations` table **Automation Code** column matches GitHub (Name / Status / Code only — ignore stale condition columns)

### Related producers (confirm, paste only if behind)

| Slot | GitHub | Notes |
|---|---|---|
| **078A** | v1.6 | Welcome handoff — paste if Live < GitHub |
| **079** | v2.5 | Dispatcher — confirm `ingressSecret` input configured |
| **118** | v2.0 | Weekly arm — confirm `dryRun` / `sendMode` before Live |
| **119** | v1.7 | Weekly send — confirm `dryRun` before Live |

Detail: [`parent-email-live-cutover-2026-09-02.md`](./parent-email-live-cutover-2026-09-02.md) · SC-171: [`SC-171-email-homework-presentation.md`](./SC-171-email-homework-presentation.md)

### Live verification (disposable only)

```bash
node tools/testing/parent-email-live-cutover.mjs verify-all --skip-welcome
```

Or path-by-path checks in SC-171 matrix (Daily streak 11→12→13, homework CTA `/shoot/athletes/{slug}`, no `rec…` in URLs).

---

## Phase B — SC-172 admin diagnostics token

**Goal:** Staff diagnostics route returns 200 with token (health already **200** on Production).

| Step | Action |
|---|---|
| 1 | Vercel → **127-si-shooting-challenge** → Production env |
| 2 | Set `ADMIN_DIAGNOSTICS_TOKEN` (≥32 random chars; do not commit) |
| 3 | Redeploy if Vercel does not auto-redeploy on env change |
| 4 | Smoke: unauthenticated → **401/403**; with Bearer token → **200** (no secrets in body) |

Full checklist: [`SC-172-health-admin-diagnostics.md`](./SC-172-health-admin-diagnostics.md)

---

## Phase C — Structured Curriculum Hub cutover

**Goal:** Hub can redeem + submit against SC Production endpoints; Outbox supports retries.

| Step | Owner | Action |
|---|---|---|
| 1 | Mike | Confirm SC routes: redeem/submit → **401** not **404** (see curl block in cutover doc) |
| 2 | Mike | Hub Vercel Production: set redeem + submit URLs to Fairfield `/shoot/api/curriculum/...` |
| 3 | Mike | Hub Vercel: `CURRICULUM_HANDOFF_SECRET` + `CURRICULUM_INGRESS_SECRET` match SC Production |
| 4 | Mike / OMNI | Hub Airtable Submission Outbox: add five retry fields (Retry Payload, Attempt Count, etc.) |
| 5 | Mike | Hub deploy + one disposable curriculum E2E |

Full checklist: [`structured-curriculum-hub-production-cutover.md`](./structured-curriculum-hub-production-cutover.md)

---

## Phase D — Zoom Attendance primary field

**Goal:** Human-readable primary display (formula) instead of autoNumber `Id`.

| Step | Action |
|---|---|
| 1 | Open Zoom Attendance → primary field **Id** (`fldXHFpB3MrOVevYL`) |
| 2 | Convert **Autonumber → Formula** (Mike UI only — MCP cannot do this) |
| 3 | Paste formula from live **Attendance Label** (`fldVILeOyW1jepScv`) |
| 4 | Spot-check Automation **117** still receives ZA `rec…` IDs |

Full checklist: [`ZOOM-ATTENDANCE-PRIMARY-FIELD-FORMULA.md`](./ZOOM-ATTENDANCE-PRIMARY-FIELD-FORMULA.md)

---

## Phase E — Flip Live (after A–D verified)

Only when disposable proofs pass:

1. Set producer `testMode=false` on **071 / 073 / 074 / 076 / 117** (and **078A** if welcome Live)
2. Set **118** `dryRun=false`, **sendMode=Live**; **119** `dryRun=false`
3. Vercel: `ATHLETE_AUTH_TEST_MODE=false` (magic links to real enrollment email)
4. One Athlete1 disposable proof per path — then stop

Rollback: restore `testMode=true` / `dryRun=true` on the same automations.

Detail: [`parent-email-and-auth-live-cutover-2026-09-03.md`](./parent-email-and-auth-live-cutover-2026-09-03.md)

---

## Done checklist (master)

| Phase | Done |
|---|---|
| A — Six email pastes + version preflight | [ ] |
| A — Disposable email verify | [ ] |
| B — `ADMIN_DIAGNOSTICS_TOKEN` + smoke | [ ] |
| C — Hub URLs + secrets + Outbox fields + E2E | [ ] |
| D — ZA primary formula | [ ] |
| E — Live testMode / dryRun flip (optional) | [ ] |

---

## Related (not in this packet)

| Item | When |
|---|---|
| **FUT-003** Stripe/Make activation | When registration opens |
| **SC-SEASON-SIM-001** | When Mike says `RUN 3-ATHLETE SEASON SIMULATION` |
| **SC-166** coach Interface filters | Optional UI polish |
| **FUT-043 Hub card tokens** | Paste [`card-tokens-mirror-reference.js`](../communications-hub/card-tokens-mirror-reference.js) into communications repo |
