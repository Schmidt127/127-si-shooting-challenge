# Annual Rollover Architecture

**Goal:** Prepare a new challenge year without processing last year’s records, wrong Config/Week links, mixed XP years, duplicate WAS rows, or stale schedules/goals.

## Engine surfaces

| Mode | Command | Result |
|------|---------|--------|
| Week generation | `generate-weeks` | JSON / CSV / Markdown / validation |
| Week validation | `validate-weeks` | PASS / PASS WITH WARNINGS / FAIL |
| Config resolve | `resolve-config` | resolved / unresolved / ambiguous / … |
| Enrollment validation | `validate-enrollments` | findings |
| WAS validation | `validate-was` | duplicates + dry-run repair recs |
| Preflight | `preflight --mode preflight` | PASS / PASS WITH WARNINGS / FAIL |
| Manifest | `manifest` | JSON + Markdown checklist + Weeks CSV |

## Preflight checks (summary)

- exactly one intended new Config  
- valid date range  
- complete Week plan + no duplicate keys  
- no overlap with prior Config; old year preserved  
- forms / automations / weekly schedules documented  
- reward rules, grade bands, levels, achievements, XP sources, email templates ready  
- Test values + Schmidt handling documented  
- current-year views documented  
- Make / `/shoot` queries not hard-coded to old year (Softr Obsolete / Not Used)  
- refuse multiple current Configs  

## Manifest contents

Old/new Config, Weeks to create, expected keys, fields/automations/Make/Fillout/`/shoot`/views to inspect, test retain/exclude lists, validation steps, rollback steps, proof required before activation. Softr is Obsolete.

## Safety

- Default dry-run everywhere  
- No automatic WAS merge/delete  
- No historical link rewrite  
- No schedule activation from this package  
- No live webhook / email send  
- Admin preview scripts require explicit Config ID + challenge-year label  

## Relationship to superseded plans

Archive+clone season rollover (SC-125 / V2-001) is superseded by one-base + Program Instance (SC-067 / V2-013). This engine is the repository-side operational toolset for that direction — it does **not** create a second competing framework and does **not** implement full Program Instance schema linking without Mike authorization.
