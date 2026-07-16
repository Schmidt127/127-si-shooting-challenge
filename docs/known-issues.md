# Known issues — Shooting Challenge

**Release companions:** [V2_RELEASE_CHECKLIST.md](./V2_RELEASE_CHECKLIST.md) · [AUTOMATION_VERSION_INVENTORY.md](./AUTOMATION_VERSION_INVENTORY.md) · [V2_END_TO_END_TEST_MATRIX.md](./V2_END_TO_END_TEST_MATRIX.md)

## Launch blockers (V2 promote / public launch)

Track these before treating V2 as fully launch-ready. Status is repository evidence only — confirm live Airtable/Make as needed.

| ID | Blocker | Severity | Notes / owner next step |
|----|---------|----------|-------------------------|
| L1 | Most automation DEV/PROD live versions still **UNKNOWN** in inventory | High | Fill [AUTOMATION_VERSION_INVENTORY.md](./AUTOMATION_VERSION_INVENTORY.md) from Airtable UI during checklist |
| L2 | Full athlete E2E matrix largely **Untested** in docs | High | Execute [V2_END_TO_END_TEST_MATRIX.md](./V2_END_TO_END_TEST_MATRIX.md) on DEV |
| L3 | **066** DEV sandbox still pending OMNI confirm (PROJECT_STATE) | High | Offline harness PASS 2026-07-16 — use [066-dev-omni-confirmation-packet.md](./deploy-checklists/066-dev-omni-confirmation-packet.md) + [DEV-release-readiness-verification-2026-07-16.md](./deploy-checklists/DEV-release-readiness-verification-2026-07-16.md); do **not** mark complete without live evidence |
| L4 | C-020 / **115** homework+video XP after coach review not fully covered | Medium | Extend DEV scenarios beyond intake (064/065, 114) |
| L5 | Zoom **recording credit (C-025)** not installed in live DEV/PROD; Perfect Week / Total Zoom / post-award conflict gaps under S16 | Medium | **Repo 117a/b ready** (offline tests PASS 2026-07-16) — executable DEV sequence in [DEV-release-readiness-verification-2026-07-16.md](./deploy-checklists/DEV-release-readiness-verification-2026-07-16.md) · [ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](./v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md) |
| L6 | **070a** homework S3 PROD intentionally OFF | Medium | Keep OFF — [v2/AUTOMATION_070A_LAUNCH_DECISION.md](./v2/AUTOMATION_070A_LAUNCH_DECISION.md) (affirmed 2026-07-16) |
| ~~L10~~ | ~~Expected merges of PRs **#25 / #26 / #27** not on `master`~~ | ~~Closed~~ | **Merged 2026-07-16** by Cloud Lead (#25 `c1f135f`, #26 `6ef60fd`, #27 `efa3322`); continue with DEV live verification |
| L7 | Web achievements / athlete profile incomplete | Medium | Public launch UX gap — not automation-blocking |
| L8 | Root marketing URL 404 / landing hub dependency | Low–Medium | `/shoot` works; root depends on landing |
| L9 | Automation GitHub trigger headers often *confirm in Airtable* | Low | Verify triggers in UI before PROD debug/promote |
| ~~L0~~ | ~~009 missing SCRIPT version header~~ | ~~Closed in repo~~ | **009 v1.0 SCRIPT metadata established** (runtime unchanged) |

## Active

### Web app

- **Root URL 404** — `www.hoopchallenges.com/` 404 until landing hub exists or `vercel.json` redirect `/` → `/shoot` is deployed. `/shoot` works.
- **Achievements page** — Shell only; Airtable reads not wired yet.
- **Athlete profiles** — Route exists; slug resolution and data not complete.
- **Pre-launch SEO** — `noindex` on sensitive routes until Softr cutover.

### Airtable / ops

- **Automation header placeholders** — Many scripts still say *confirm in Airtable* for trigger text in GitHub headers. Verify live trigger in Airtable UI when debugging.
- **Stage I/J** — Achievement XP and legacy field cleanup in progress. Post-close unlock dedupe + automation 066 Week write: [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md). See [airtable/stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md).
- **`OK to Publish on Softr`** — Still used as public publish gate in web queries despite Softr replacement in progress.

### Documentation

- **JR Ref docs in repo** — Some `docs/jr-ref/` and `web/docs/jr-ref/` paths may remain from earlier monorepo work; JR Ref production app is `127-si-jr-ref`.

## Resolved

- Hub and multi-program routes removed (2026 rebuild → `/shoot` only; routes under `web/app/(program)/`).
- Stale `/shooting-challenge` back-links in components updated to `/`.
- Stages F–H pipeline audits clean after backfill pass (re-run after bulk imports).
- Broken `STRUCTURE.md` link removed from docs index (replaced by `PROJECT_STATE.md`).

## Accepted data exceptions

- Video / homework `not_ready_for_xp` rows — retakes, pending review, do-not-award, testing (not bugs).
- Riley W8 video XP at 25 points — correct per program rules.
