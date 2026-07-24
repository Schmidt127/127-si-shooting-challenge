# Challenge-Year Config Contract

**Evidence base:** PROD schema snapshot `airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts/`  
**Resolver foundation:** [`docs/next-wave/config-selection/CONFIG-SELECTION-CONTRACT.md`](../next-wave/config-selection/CONFIG-SELECTION-CONTRACT.md)  
**Implementation:** `lib/challenge-year/contract.js`, `lib/challenge-year/resolve-config.js`

## Intent

One intentional Config row per school / challenge year. Multiple year rows are correct. Ambiguous selection is the defect.

## Field layers (do not collapse)

### 1) Existing verified fields

#### Config (`tblRB6sh77NxjS568`)

| Property | Airtable field | Notes |
|----------|----------------|-------|
| challenge-year label | `Active School Year` (primary) | Normalize to `YYYY-YYYY` |
| regular challenge week count | `Challenge Week Count` | Generator input |
| XP enablement (partial) | `Submission XP Active?`, `Active XP Rule Set` | Broader XP toggle proposed |
| recording / feature flags | C-025 recording checkboxes | Year-specific values differ today |

#### Program Instance - Synced (season calendar source)

| Property | Airtable field |
|----------|----------------|
| school year | `School Year - Linked` |
| start / end | `Start Date`, `End Date` |
| enrollment open / close | `Registration Open`, `Registration Closes` |
| status | `Status` (`Planning`, `Registering`, `In Progress`, `Completed`, …) |

#### Weeks

| Property | Airtable field | Notes |
|----------|----------------|-------|
| display label | `Week Name` (primary) | e.g. `Week 0`, `Week 1`, `Post-Challenge` |
| start / end | `Start Date`, `End Date` | dateTime, America/Denver |
| Airtable Week Key | `Week Key` | **formula `RECORD_ID()` today** |
| program link | `Program Instance` | preferred single link |

#### Enrollments

| Property | Airtable field |
|----------|----------------|
| school year | `School Year` |
| active | `Active?` |
| program link | `Program Instance` |
| grade band | `Grade Band` |
| current level | `Current Level` (owned by 042) |

### 2) Repository-only normalized properties

Returned by `normalizeChallengeYearConfig()` — not necessarily Airtable columns:

- `configRecordId`
- `challengeYearLabel` (`YYYY-YYYY`)
- `canonicalKeyFormat` = `{challengeYear}|{Week Name}`
- `timezone` (default `America/Denver`)
- `regularWeekCount`
- `weekZeroStart` / `weekZeroEnd`
- `postChallengeStart` / `postChallengeEnd`
- `isCurrent`, `testMode`, `emailScheduleEnabled`
- `xpEnabled`, `achievementsEnabled`
- `rolloverState`
- `priorConfigId`, `nextConfigId`

### 3) Proposed production fields (not created by this package)

Do **not** create without Mike authorization:

| Proposed field | Purpose |
|----------------|---------|
| `Challenge Year Status` | Planning / Active / Archived |
| `Challenge Start Date` / `Challenge End Date` | On Config if PI sync is insufficient |
| `Enrollment Open Date` / `Enrollment Close Date` | On Config |
| `Week 0 Start/End`, `Post-Challenge Start/End` | Generator inputs on Config |
| `Challenge Timezone` | Confirm America/Denver contract |
| `Current Challenge Year?` | Fail-closed current flag |
| `Test Mode?` | Separate test Config |
| `Email Schedule Enabled?` | Gate 118/119 |
| `XP Enabled?` / `Achievements Enabled?` | Season feature switches |
| `Rollover State` | not_started → activated → archived |
| `Prior Config` / `Next Config` | Linked lineage |
| Weeks.`Challenge Week Key` | text/formula `{School Year}|{Week Name}` — keep current `Week Key=RECORD_ID()` until cutover |
| Weeks.`Week End Key` | formula Denver `YYYY-MM-DD` from End Date (118/119 currently derive from End Date) |

## Resolver statuses

| Status | Meaning |
|--------|---------|
| `resolved` | Exactly one Config |
| `unresolved` | Zero matches / missing inputs |
| `ambiguous` | Multiple qualify (never first-record pick) |
| `historical` | Matched Config ended before today |
| `test_only` | Test Mode Config |
| `invalid_configuration` | Malformed / overlapping catalog |

## Resolution hierarchy

1. Explicit Config record ID  
2. Enrollment-linked Config / Enrollment School Year  
3. Week-linked Config / Week challenge year  
4. Program Instance school year / explicit test override (via config-selection)  
5. `asOfDate` range match (fails on overlaps)  
6. `testModeOnly`  
7. Current/active flag (`requireCurrent` or unique current heuristic)

## Level reset vs carry-over

**Do not assume.** Live behavior: Lifetime XP → Current Level via automation **042** on the Enrollment. New-year enrollments often start fresh, but copying a prior Current Level may be intentional. The enrollment validator flags prior-year Current Level as ambiguity unless `levelPolicy` is explicitly `reset` or `carry`.
