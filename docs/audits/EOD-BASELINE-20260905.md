# End-of-day baseline — 2026-09-05

**Status:** Authoritative living pointer for tomorrow’s sessions  
**Verdict:** `END-OF-DAY BASELINE COMPLETE` (pending this PR merge onto `master`)  
**Starting `origin/master`:** `ba969433c84b8418fd453658df0a5a39ca5e679e
**Docs tip after PR #458:** 5a526c33f8325bf072e5a0c19e29cb81c420bd5d (docs-only)
**Vercel Production SHA:** ba969433c84b8418fd453658df0a5a39ca5e679e (aligned; docs-only tip does not require functional redeploy)`  
**Authority:** Live GitHub + Vercel + Airtable MCP reads this session; living docs reconciled here

> **Read this file first** before proposing work already closed on 2026-09-05 (SC-160–169, OPS-PURGE, Season Sim, formula restore, 010 v10.14, 066 v4.1).

---

## 1. GitHub / master

| Item | Value |
|------|--------|
| `origin/master` | `ba969433c84b8418fd453658df0a5a39ca5e679e
**Docs tip after PR #458:** 5a526c33f8325bf072e5a0c19e29cb81c420bd5d (docs-only)
**Vercel Production SHA:** ba969433c84b8418fd453658df0a5a39ca5e679e (aligned; docs-only tip does not require functional redeploy)` |
| Tip merge | PR **#457** OPS-PURGE-20260905 closeout |
| Open PRs with required unmerged work | **None** at audit start |
| Repository QA on tip | **success** (run `33993112129`) |
| Vercel GitHub check on tip | **success** |

PRs **#435–#457** (2026-09-05 waves) are merged or correctly closed (**#443** superseded).

---

## 2. Vercel / Production website

| Item | Value |
|------|--------|
| Team / project | `127-sports-intensity` / `127-si-shooting-challenge` (`prj_Qbwjx6JIazQHTHZwDxSv8zPvrTIH`) |
| Production deployment | `dpl_C6ngdr8g84T7X5rC3XLYQCghSmZU` |
| Deployed Git SHA | **`ba969433`** (aligned with `origin/master`) |
| State | READY / production |
| Public URL | https://www.fairfieldbasketballclub.com/shoot |
| Env names present (values not disclosed) | `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`, `NEXT_PUBLIC_*`, `ATHLETE_AUTH_*`, `RESEND_*`, `UPSTASH_*` |

### Smoke (HTTP GET only)

| Route | Result |
|-------|--------|
| `/shoot` | 200 |
| `/shoot/overview` | 404 (no such route — Overview is home) |
| `/shoot/leaderboard` | 200 (empty transactional state) |
| `/shoot/homework` | 200 (catalog) |
| `/shoot/homework/[id]` | 200 + CloudFront homework URLs present |
| `/shoot/levels` | 200 |
| `/shoot/dashboard/sign-in` | 200 |
| `/shoot/game-manual` | 200 |
| `/shoot/api/airtable` | 200 `{ ok: true, tokenValid: true }` |
| `https://d21ixrrrqpqz29.cloudfront.net/` root | 403 expected (object distribution; not a directory index) |

---

## 3. Airtable Production (`appn84sqPw03zEbTT`)

### Transactional counts (MCP `totalRecordCount`)

| Table | Count |
|-------|------:|
| Athletes | 0 |
| Enrollments | 0 |
| Submissions | 0 |
| Submission Assets | 0 |
| Homework Completions | 0 |
| Video Feedback | 0 |
| Weekly Athlete Summary | 0 |
| XP Events | 0 |
| Athlete Achievement Unlocks | 0 |
| Streak Occurrences | 0 |
| Zoom Attendance | 0 |
| Email Handoff Queue | 0 |
| Award Recipients | 0 |

No late automation remnants observed after purge.

### Protected reusable content

| Table | Count |
|-------|------:|
| Zoom Meetings | **2** (Introduction, Motivation) |
| Program Homework Assignments | 18 |
| Weeks | 11 |
| Homework Library | 121 |
| Countries | 194 |
| State | 50 |

### Formula restoration (Submissions)

| Field | `isValid` | Result type | Production-normal check |
|-------|-----------|-------------|-------------------------|
| Activity Date Is Future? | true | number | Uses `NOW()`; no Season Sim branch |
| Submitted Same Day? | true | number | Uses real **Submitted At** + Activity Date; no Season Sim branch |
| Perfect Week Grace Eligible? | true | number | Uses real dates + `TODAY()`; no Season Sim branch |

Season Sim gate fields may still exist as schema (checkbox/datetime) but formulas are Production-normal. **Do not change formulas.** Next Season Sim execute **NOT authorized**.

### Live automation versions (Automations table Name / Status / Code)

| Code | Live status | Live version (body/Code) | GitHub |
|------|-------------|--------------------------|--------|
| 010 | Live | **v10.14** | v10.14 |
| 020 | Live | **v4.1** | v4.1 |
| 057 | Live | **2.5** | aligned |
| 058 | Live | **1.7** | aligned |
| 059 | Live | **v3.8** | aligned |
| 065 | Live | **v10.7** | v10.7 |
| 066 | Live | **v4.1** | v4.1 |
| 113 | Live | v6.4 | video XP |
| 114 | Live | v6.2 | video XP |
| 072 / 074 / 079 / 118 / 119 | Live | weekly email plane | owners unchanged |

**122** remains superseded / uninstalled. Optional **013** / **067** structural pastes remain declined (bodies may still be Live historically — do not treat as paste queue). Do **not** revive the retracted false **021** mismatch.

---

## 4. Master list / completed work (do not re-assign)

**COMPLETE (do not reopen):** SC-160 through SC-169 · OPS-PURGE-20260905 · Season Sim T122531Z cleaned/closed · formula restore · FUT-002 Batch 2 · SC-161–165 web wave · 010 v10.14 · 066 v4.1

**Deferred / do not implement:** FUT-029 · FUT-048 (CloudFront custom domain; `d21ixrrrqpqz29.cloudfront.net` acceptable)

**Mike-owned / manual (not core app blockers):** SC-166 Interface fine-tuning · FUT-003 Make activation when paid registration opens · launch items requiring Mike (see Section G)

**Section G snapshot (generator):** Total **77** · COMPLETE **62** · IN PROGRESS **3** · BLOCKED **0** · READY **2** · DEFERRED **10**

---

## 5. Local operator notes (preserve)

Main checkout may sit on `docs/transactional-purge-20260905` with untracked Season Sim helper scripts and many historical worktrees/stashes. **Do not delete** unknown local artifacts. Optional cleanup list only.

---

## 6. Prohibited actions confirmation

This baseline audit did **not**: create features; mutate Airtable; run Season Sim; send email; enable registration/payment; implement FUT-029; paste 013/067/122; change 021; delete branches/worktrees/stashes; expose secrets.
