# Weekly Summary Flow

How **Weekly Athlete Summary** rows are ensured, packaged, and emailed to parents.

**Authoritative architecture (verified PROD 2026-07-24):**  
[`docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](../next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md)

## Final flow

```text
118 → 072 → 119 → 074 → Make.com → Gmail → Make.com writeback
```

| Step | Automation / system | Role |
|------|---------------------|------|
| Ensure + arm build | **118** (Sun 5:00 AM Denver; currently OFF) | Create/find WAS; set `Build Weekly Email Now?` |
| Build package | **072 v4.0** | Recipients, subject, HTML/text/payload, Ready?; empty-week policy |
| Arm send | **119** (Sun 10:00 AM Denver; currently OFF) | Set `Send to Make?` when Ready && !Sent |
| Webhook handoff | **074** (ON) | POST to Make; clear `Send to Make?`; does **not** mark Sent? |
| Email + writeback | Make **`Weekly Athlete Summary - Bulk Email - May 18`** (ON) | Gmail; Live branch writes Sent? after success |

**Corrections to preserve**

- **119 does not post the webhook** — it only arms `Send to Make?`.
- **074 posts the webhook**.
- **072 owns empty-week policy** (`send_short` / `send_normal` / `suppress`).
- **Make owns final Gmail-success writeback** (Live branch).
- Do **not** use Make scenario `Weekly Athlete Summary Updated` as the email sender.

## Tables

- **Weekly Athlete Summary** — one row per Enrollment × Week
- **Enrollments** — Active?, cleaned parent/athlete emails
- **Weeks** — Start/End, Week End Key, Config-linked unique id (e.g. `2026-2027|Week 1`)
- **Submissions / Homework / XP / Zoom / Video** — activity sources for 072

## Week boundary

| Setting | Value |
|---------|--------|
| Target week for Sunday runs | Prior Saturday Week End (America/Denver) |
| Timezone | America/Denver |
| Season Weeks | 2026–2027 Week 0–9 + Post-Challenge now exist |
| Canonical Week key (ops) | `{challengeYear}\|Week Name` e.g. `2026-2027|Week 1` — **not** the same as Airtable `Week Key` formula (`RECORD_ID()` today) |
| Uniqueness | One WAS per Enrollment record ID + Week record ID |

**Annual rollover / challenge-year tooling (repo):** [`docs/challenge-year/`](../challenge-year/README.md) — Config resolver, Week generator/validator, Activity Date→Week checks, WAS uniqueness validation, preflight + manifest. Does not auto-create Weeks or activate schedules.

## Empty-week email policy (SC-035)

Default **`send_short`** (approved 2026-07-24). Enforced in **072 v4.0**.

| Policy | Empty week | Non-empty |
|--------|------------|-----------|
| `send_short` | Concise Weekly Check-In; send-ready | Full summary |
| `send_normal` | Full zero-activity summary | Full summary |
| `suppress` | Not send-ready | Full summary |

## Verified controlled proof

Schmidt empty week ending **2026-07-18** (`recWeVrSabnsYaHc2` / WAS `recu4X8m6rWlEWoNy`) delivered:

`127 Sports Intensity Weekly Check-In | Testing Schmidt | Testing Week`

to `mschmidt@fairfield.k12.mt.us` via Test mode.

## Failure modes

| Symptom | Action |
|---------|--------|
| WAS exists, no HTML | Confirm 118 armed Build; 072 ran; check Active?/Schmidt gates |
| Ready but never sent | Confirm 119 armed Send to Make?; 074 ON; Make scenario ON |
| Duplicate emails | `Weekly Email Sent?` + Make Live writeback; 074 blocks when already Sent? |
| Full zero report on empty week | Confirm 072 **v4.0** + `emptyWeekPolicy=send_short` |

## Related

- [`WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](../next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md)
- [`EMPTY-WEEK-072-PROD-PASTE-RUNBOOK.md`](../next-wave/was-email/EMPTY-WEEK-072-PROD-PASTE-RUNBOOK.md)
- [`WEEKLY-EMAIL-PROD-INSTALL-RUNBOOK.md`](../next-wave/was-email/WEEKLY-EMAIL-PROD-INSTALL-RUNBOOK.md)
- [C-011 activation checklist](../deploy-checklists/C-011-weekly-email-schedule-activation-checklist.md)
