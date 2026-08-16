# PKG-009 — Season-Scope Inventory

**Status:** Repository-ready — no live activation claim  
**Last updated:** 2026-08-16  
**Canonical packet:** [PKG-009 season-scope safety packet](../deploy-checklists/PKG-009-SEASON-SCOPE-SAFETY-PRODUCTION-PACKET.md)

## Required rules (non-negotiable)

1. A new season must never mix with a prior season.
2. Historical records and reports must remain accurate.
3. Public pages must use the intended **Registering** Shooting Challenge Program Instance.
4. Record IDs must be used for relational comparisons where Airtable REST returns record IDs.
5. No fallback to broad Config or ambiguous display-name selection.
6. Selection must fail safely and explain why when configuration is ambiguous.

## Season-scope surfaces

### Airtable — Program Instance and School Year

| Surface | Selection mechanism | Record-ID rule | Ambiguity handling |
|---|---|---|---|
| `Program Instance - Sync` | `Status=Registering` + `Program - Linked=Shooting Challenge` | Compare linked record IDs | Fail if 0 or >1 registering PI |
| Enrollments.`Program Instance` | Linked record on operational row | Use `rec…` id, not display name | Fail if 0 or >1 link |
| Enrollments.`School Year` | Select value on operational row | Must match registering PI year | Fail if blank or mismatched |
| Config.`Active School Year` | Active Config row | Must match registering PI year | Fail if multiple active Config |
| Weeks.`Program Instance` | Linked record on Week | Week calendar scoped per PI | Fail on overlap within PI |
| Target Goal Shots.`Program Instance` | Linked record on goal row | Goal identity includes PI record id | Fail on 0 or >1 active candidate |
| PHA / Homework scheduling | Program Instance + Week + Grade Band record ids | `Schedule Key` uses record ids | Fail closed on multi-match |

### Automations — season-sensitive writers

| Automation | Scope input | Must not |
|---|---|---|
| **001** | School Year + Program Instance on Enrollment | Create second canonical Enrollment |
| **005** | Enrollment Program Instance + Activity Date → Week | Assign Week from another PI calendar |
| **023** | Week Program Instance before Enrollment fallback | Broad Config fallback without PI context |
| **031** | Enrollment + Week + Program Instance on Submission/WAS | Create WAS across PI/year |
| **032** | Enrollment Program Instance + Grade Band | Match goal by display name only |
| **041/042** | Enrollment School Year + active Levels/Gates for that year | Write levels from another year's ladder |
| **076** | Program Instance record id for goal lookup | Use ambiguous Config row |
| **101** | Enrollment + Meeting Program Instance / Week | Award XP across seasons |
| **118/119** | Week End Key within registering season | Arm email for wrong PI/year |

### Web — public scope

| Route / adapter | File | Contract |
|---|---|---|
| Registering PI resolver | `web/lib/airtable/registering-program-instance.ts` | Exactly one Registering PI; name `Shooting Challenge \| {schoolYear}` |
| Leaderboard | `web/lib/data/leaderboard.ts` | Scope via registering PI; `Web - Leaderboard` view required |
| Homework page | `web/lib/airtable/homework-queries.ts` | PHA/homework scoped by PI record id |
| Registration gateway | `web/lib/registration.ts` | Uses registering PI for open enrollment copy |

### Email / Make paths

| Path | Scope guard |
|---|---|
| Daily 076 → 079 | Handoff key includes Submission record id; PI goal required |
| Weekly 118 → 072 → 119 → 074 | WAS must belong to registering season; Schmidt/test exclusions documented |
| Welcome 075 → 079 | Enrollment Program Instance on package |

### Views and interfaces (Mike attestation required)

| View / interface | Expected scope filter |
|---|---|
| `Web - Leaderboard` | Active Enrollments; one Athlete; one PI; one School Year |
| Coach / parent interfaces | Must not blend prior-season operational rows into current season dashboards |
| Testing views (DEV) | Filter by Enrollment link — not test flags on pipeline tables |

## Future schema recommendation (separate wave — not PKG-009)

**V2-013 Program Instance multi-year architecture** remains a deferred dedicated
wave. PKG-009 does not authorize incremental schema edits. If Mike approves
V2-013 later, treat it as a separate package with its own migration plan and
historical-data proof. See [`v2-change-backlog.md`](../v2-change-backlog.md) § Wave 1b.

## Repository tests and audits

```bash
node tests/challenge-year/pkg-009-season-scope-safety.test.js
node tests/challenge-year/season-launch-control.test.js
node airtable/extension-scripts/audits/audit-pkg-009-season-readiness.test.js
node tools/challenge-year/cli.js launch-preflight --help
```

## Related existing docs

- [`AUTHORITY-MAP.md`](../AUTHORITY-MAP.md) — 2027 season policy
- [`challenge-year/SEASON-LAUNCH-CONTROL.md`](../challenge-year/SEASON-LAUNCH-CONTROL.md)
- [`deploy-checklists/NEXT-SEASON-RESET-STARTUP.md`](./NEXT-SEASON-RESET-STARTUP.md)
- [`prod-completion/2026-08-06/PROGRAM-INSTANCE-ISOLATION-PACKAGE.md`](../prod-completion/2026-08-06/PROGRAM-INSTANCE-ISOLATION-PACKAGE.md)
