# Program Instance isolation audit

Static scanner for likely cross-Program-Instance identity bugs in Shooting Challenge automations and website queries.

## Run locally

From the repository root:

```bash
node tools/program-instance-isolation/audit-program-instance-isolation.mjs
```

JSON output:

```bash
node tools/program-instance-isolation/audit-program-instance-isolation.mjs --json
```

Fail CI-style when any warning exists:

```bash
node tools/program-instance-isolation/audit-program-instance-isolation.mjs --strict
```

## What it looks for

| Category | Risk | Recommended scope |
|----------|------|-------------------|
| `athlete-without-enrollment-filter` | Athlete-only Enrollment pick | Enrollment RID or Athlete + Program Instance |
| `week-date-without-program-instance` | Week date range across years | `Weeks.Program Instance` |
| `week-name-as-identity` | Week Name treated as unique | Week RID / Week Key |
| `summary-athlete-week-name` | WAS identity by Athlete + name | Enrollment RID + Week RID |
| `xp-rule-type-only` | XP rule by generic type | Global unique Rule Key **or** Rule Key + PI |
| `zoom-meeting-date-only` | Meeting match by date alone | Week RID / PI via Week |
| `select-all-records-broad-scan` | Unfiltered table scans | Filter by Enrollment / PI / links |
| `dedupe-key-uses-display-name` | Name-based dedupe keys | Record IDs |

Warnings are advisory. Review each hit before changing production scripts — many matches are field-name constants or already-fixed helpers.

## Architecture rule

```text
Athlete = person
Enrollment = Athlete in one Program Instance
All challenge progress = scoped through Enrollment → Program Instance
```

See `docs/prod-completion/2026-08-06/PROGRAM-INSTANCE-ISOLATION-PACKAGE.md`.
