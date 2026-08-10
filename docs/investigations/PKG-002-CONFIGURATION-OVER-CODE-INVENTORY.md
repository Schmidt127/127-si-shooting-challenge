# PKG-002 — Configuration-over-code inventory

## Scope and evidence boundary

- **Package:** PKG-002
- **Baseline:** `080e78c0e3ecf2f790ee6e9a2b9f550a692c5e7b` (`origin/master` after fetch)
- **Branch:** `docs/pkg-002-hardcode-inventory`
- **Method:** Offline text/code inspection only; no Airtable, Make, Vercel, Fillout, Lambda, Gmail, deployment, or external write access.
- **Repository inventory:** 55 root production automation sources; 94 automation JavaScript files including `lib/`, `_superseded/`, and `_design-alternatives/`; 260 `tools/` scripts; 37 `tests/` sources; 735 docs/config files under `docs/`.
- Repository text identifies dependencies and intended values, but cannot prove current live-system configuration. `docs/PROJECT_STATE.md`, `CONTROL.json`, and dated evidence explicitly state that live UI/service authorities must be checked separately.

## Findings by classification

### Safe constants / domain rules

- `airtable/automations/shooting-challenge/lib/v2-engine-contracts.js`: `America/Denver`; source-key prefixes (`SUBMISSION_XP|`, `HOMEWORK_XP|`, `PERFECT_WEEK|`, `WEEKLY_THRESHOLD|`, `ZOOM_*`); grade-band codes; HW1/HW2/VIDEO asset-slot mapping; HTTPS/SHA-256 validation. These are protocol/domain constants, not season selection.
- `035...create-weekly-threshold-xp-events.js` and the same helper: weekly thresholds are `100`, `125`, `150`; reward amounts are intentionally read from active `XP Reward Rules`, not invented in code.
- `057...calculate-perfect-week-eligibility.js` and the helper: default five required daily dates; table/field labels and satisfactory/attendance gates are schema contracts. Threshold values should remain data-driven where the corresponding Airtable rule exists.
- `web/lib/app-config.ts`: Shooting Challenge identity, `/shoot` mount, and canonical Fairfield origin are product routing constants. Legacy Hoop hosts are explicitly compatibility/stale-host normalization, not active destinations.

### Test fixtures

- `web/lib/airtable/homework-queries.test.ts`, `tests/config-selection/resolve-config.test.js`, `tools/testing/tests/*`, and `airtable/.../lib/*test.js` contain synthetic or controlled fixture IDs such as `rec00000000000000`, `recWeek0000000001`, `recPI2026`, `recOtherEnrollment01`, and `appn84sqPw03zEbTT`. They are safe only within offline tests; they must not be interpreted as live selection.
- Date fixtures (`2026-07-15`, `2026-08-02` through `2026-08-09`, `2026-08-01` through `2026-08-31`) and season labels (`2025-2026`, `2026-2027`) are test/evidence snapshots. They become stale when reused as defaults outside their named test or evidence scenario.
- `tools/testing/tests/run_*`, `fixtures/live-115-bundle.json`, and `tools/testing/verify_*` intentionally use named controlled records to reproduce DEV/PROD evidence. The verifier comments and `CONTROL.json` prohibit treating this as full production proof.

### Should become configuration (season/program selection)

- `tests/config-selection/resolve-config.test.js` hardcodes four Config record IDs and year-specific `Max Videos Per Submission` values for `2025-2026` through `2028-2029`. The test demonstrates the desired config-selection behavior, but production callers should obtain the matching row by explicit Program Instance/enrollment school year, with no arbitrary-first-record fallback.
- `web/lib/airtable/queries.ts` hardcodes Airtable table names, views (`Web - Leaderboard`, `Web - Homework Catalog`, and related web views), field names, record caps (`200`), and revalidation windows (`120`/`300` seconds). Table/field names are schema contracts; season scope belongs in Airtable views or `AIRTABLE_ACTIVE_SCHOOL_YEAR`, not a source edit.
- `web/.env.local.example` defaults `AIRTABLE_BASE_ID` to production `appn84sqPw03zEbTT` while its comment says DEV should use `appTetnuCZlCZdTCT`. This is the clearest configuration-over-code hazard: a fresh local setup can target the live base unless the operator overrides it.
- `web/lib/airtable/queries.ts` has an optional `AIRTABLE_ACTIVE_SCHOOL_YEAR`; absence means the fallback formula has no year clause. This is an environment assumption that should be explicit in deployment/local run configuration.
- Season policy in `CONTROL.json` is `2027-05-01`–`2027-06-30`, early bird `2027-04-25`–`2027-05-01`, week 1 `2027-05-02`, but many fixtures and scripts still contain 2026 dates. Keep policy/config authoritative and label historical fixtures; do not copy dates into runtime logic.
- Email defaults in `074...` and `073...` (`mschmidt@fairfield.k12.mt.us`) and `071...` (`coach@127sportsintensity.com`) are operational configuration, not business logic. They are not secrets, but should be environment/Make configuration with an explicit DEV/PROD mode.

### Live-system dependencies

- Production base ID documented in `docs/PROJECT_STATE.md`, `web/docs/airtable-data-map.md`, and web defaults: `appn84sqPw03zEbTT`. DEV base: `appTetnuCZlCZdTCT`. Record IDs in `tools/testing/verify_schmidt_identity.mjs`, `verify_scenario.mjs`, `verify_perfect_week_chain.mjs`, and `verify_case01_was_link.mjs` are named live/controlled-system dependencies, not portable configuration.
- `web/lib/airtable/client.ts` depends on `AIRTABLE_API_TOKEN` and `AIRTABLE_BASE_ID`; `tools/testing/verify_*` depends on `AIRTABLE_API_TOKEN`. The token is correctly environment-only; no secret was inventoried or accessed.
- Airtable table/view names are live schema dependencies: `Enrollments`, `Program Instance - Synced`, `Weekly Athlete Summary`, `XP Events`, `XP Reward Rules`, `Weeks`, `Levels`, `Achievements`, `Athlete Achievement Unlocks`, `Submissions`, `Homework Completions`, `Homework Library`, `Tutorials`, `Zoom Meetings`, `Zoom Attendance`, and `Video Feedback`.
- `071`, `073`, `074`, `077`, `118`, and `119` depend on Make/webhooks/email handoffs; `070a`–`070c` depend on Make/Lambda asset upload flow; `117` depends on Zoom/Make. Their URLs, mode flags, response status handling, and send gates are external integration contracts.
- Web smoke tests use `https://www.fairfieldbasketballclub.com/shoot`, form URLs under `forms.fairfieldbasketballclub.com`, and local `http://127.0.0.1:3001/shoot`. These are environment-specific test targets, not runtime data.

### Stale/dead or historical references

- `airtable/automations/shooting-challenge/_superseded/` and `_design-alternatives/` are explicitly non-current source variants. Do not inventory their constants as active runtime configuration.
- `tools/testing/seed_pha_from_curriculum.mjs` is marked archived/deprecated and points to historical evidence; its 2026-2027 matching logic is stale-risk, not a season selector.
- `docs/PROJECT_STATE.md` marks `airtable/schema/current/` stale and identifies dated snapshots as historical evidence. Snapshot IDs and field names need live verification before use.
- Older `hoopchallenges.com`/`hooopchallenges.com` URLs in docs/evidence are historical compatibility references. The active public origin is `https://www.fairfieldbasketballclub.com/shoot`.
- Evidence directories dated `2026-08-04`/`2026-08-05` and media under `media/2025-2026/` are historical artifacts. Their dates, counts, record IDs, and claims are not current configuration.
- `docs/agent-runs/CONTROL.json` records canonical `master` SHA `3aea908...`, which differs from this requested package baseline because the package intentionally starts at the fetched `origin/master` tip `080e78c...`; CONTROL is workflow evidence, not a reason to rewrite the requested baseline.

## Ordered follow-up recommendation

1. **Lead/Mike:** Confirm the intended target environment for every local/verification command; change the example/default flow so DEV is the safe default and PROD requires an explicit opt-in.
2. **Implementation:** Add one season/program-instance configuration boundary for base ID, school year, Config row, operational email/mode, and external endpoints; preserve table/field names as schema contracts unless a schema migration is approved.
3. **Testing:** Add offline assertions that reject missing season, duplicate year/config rows, production base selection in DEV, stale dates, and arbitrary first-record fallback; keep synthetic IDs and historical dates clearly fixture-scoped.
4. **Research/Lead:** Audit active automation headers and current Airtable/Make/Vercel UI separately. Use the repository inventory only as a candidate list; do not infer live status from source text.
5. **Closeout:** Record approved DEV-to-PROD promotion steps in the appropriate deploy checklist and update the production changelog only after Mike-owned live verification.

## Open questions for Mike

- Should local web defaults be DEV-only, or should `AIRTABLE_BASE_ID` be mandatory with no production fallback?
- Which runtime should own season selection: Program Instance, enrollment school year, an explicit environment variable, or a combined fail-closed resolver?
- Which email addresses and webhook/mode values are approved for DEV versus PROD?
