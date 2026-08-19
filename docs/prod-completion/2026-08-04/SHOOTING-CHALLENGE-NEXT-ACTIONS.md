# Shooting Challenge — Next Actions Checklist

| Field | Value |
|-------|--------|
| Date | **2026-08-04** |
| Authority | [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../../SHOOTING_CHALLENGE_COMPLETION_MASTER.md) |
| Full audit | [`SHOOTING-CHALLENGE-REMAINING-WORK-AUDIT.md`](./SHOOTING-CHALLENGE-REMAINING-WORK-AUDIT.md) |
| Base | PROD `appn84sqPw03zEbTT` |
| Rule | One package at a time · install + live-test · update completion master after each · GitHub ≠ Installed |

**Do not:** turn 118/119 OFF · install Stage 16 117a/117b · enable 112 · enable 070a without SC-095 · treat Softr as a gate · force 074 Test mode for season.

Schmidt enrollment RID: `recgP9qZYjAhE7NXm` · Athlete: `recgqVstObQRzgXJF`

---

## Package checklist (execute in order)

| # | Package | SC IDs | Current state | Next concrete action | System | Who | Test required | Evidence location | Status after success |
|---|---------|--------|---------------|----------------------|--------|-----|---------------|-------------------|----------------------|
| **1** | Foundation attestation + Testing views | SC-003, SC-046, SC-058, SC-059 | Planned / Built / Installed (attest open) | Create Testing views per `docs/overnight/testing-integrity/TESTING-VIEWS-MIKE-ACTIONS.md`; paste full automation ON/OFF/version list; confirm **112 OFF** and **117 XOR 117c** | Airtable UI / OMNI | **Mike** | Open each Testing view; Schmidt rows visible | `docs/testing/evidence/YYYY-MM-DD-testing-views-attest/` + attestation packet | SC-003 → Installed or LT; SC-058/059 → closer to Complete |
| **2** | Critical pastes (067 → 057 → 035 enable) | SC-013, SC-014, SC-021, SC-028, SC-077, SC-049 | **067 done (LT)**; 057 Ready-for-Paste; 035 LT-but-OFF | **Next:** Paste **057 v1.4** from `docs/deploy-checklists/057-perfect-week-denver-v1.4.md` (open existing 057 → replace script body only). Then Denver PW boundary test. After Mike approve, enable **035** (keep OFF until then). 067 Option B already Live Tested — evidence `docs/testing/evidence/2026-08-04-package-02-critical-pastes/` | Airtable automations | **Mike** | Denver PW boundary; 035 enable smoke if ON | `docs/testing/evidence/` + deploy checklists | SC-013/014 → **LT (done)**; SC-021/028/077 → LT after 057; SC-049 → season-enabled when ON |
| **3** | Homework E2E re-proof | SC-009–017, SC-071 | Installed (not retested) | Schmidt: written HC → coach satisfactory → XP → 071; multi-file; duplicate HC attempt; quiz path if #2 done. Photo/PDF may wait on SC-095 | Airtable + Fillout/Make as needed | Mike + Cursor (w/ PAT) | One HC per assignment; one XP after satisfactory; no fake assets | `docs/testing/evidence/YYYY-MM-DD-homework-e2e/` | SC-009–017,071 → Live Tested |
| **4** | Video + asset writeback | SC-011, SC-072, SC-094–099 | Installed | Schmidt video asset → Lambda writeback → 070c verify → `VIDEO_SUBMISSION\|` XP | Airtable + Make + Lambda | Mike + Cursor | Canonical URL + hash + one video XP; idempotent rerun | `docs/testing/evidence/YYYY-MM-DD-video-assets/` | SC-072,094–099 → LT |
| **5** | Zoom live + recording exclusivity | SC-073, SC-074, SC-084–091 | Installed | Seed Zoom meeting; Schmidt live attend (101); recording credit; prove Conflict=1 blocks double credit; gate/PW hooks after #2 | Airtable + Zoom config | Mike + Cursor | Live XP only via Attendees; recording soft-void on conflict | `docs/testing/evidence/YYYY-MM-DD-zoom/` | SC-073/074,084–091 → LT |
| **6** | Streak / milestone / Perfect Week / gates | SC-027, SC-029, SC-075–080, SC-083 | Installed (054 v5.6 / 066 v3.3 not LT) | Supervised 3-day streak; milestone natural run; Perfect Week after 057 v1.4; gate block then clear | Airtable | Mike + Cursor | Idempotent Source Keys; no double unlocks | `docs/testing/evidence/YYYY-MM-DD-progression/` | SC-075–080,027,083 → LT |
| **7** | Weekly email residuals + other emails | SC-031, SC-035, SC-036, SC-045, SC-041 | LT / Complete / Installed mix | Confirm season inputs (`dryRun=false`, Live, `includeSchmidt=false`); paste **118 v1.5** only if PROD &lt; v1.5; re-test homework/welcome emails; optional authorized fail→recover (SC-041) | Airtable + Make | Mike | Empty-week still `send_short`; Sent? writeback; no double send | `docs/testing/evidence/YYYY-MM-DD-emails/` | SC-036/045 → LT; SC-041 → LT if tested |
| **8** | Season Launch + Weeks | SC-032, SC-065, SC-068 | Built | Run `generate-week-package`; manually import Weeks; authorize Launch Status fields if approved; harden Active? | Repo CLI + Airtable | Mike + Cursor | Sunday–Saturday weeks; Week 0 / Post-Challenge; date keys Denver | `docs/challenge-year/` + evidence | SC-032/065 → Installed then LT |
| **9** | Full Schmidt dry-run matrix | SC-005, SC-007, SC-008, SC-135 | Planned | Execute `V2_END_TO_END_TEST_MATRIX.md` remaining rows; expand idempotency packs; failure inject (webhook/Lambda) | All systems | Mike + Cursor | Matrix mostly green; controlled emails only | `docs/testing/evidence/YYYY-MM-DD-dry-run/` | SC-005/135 → LT; gate for intake |
| **10** | Web Production confirm (Fairfield / a11y / smoke / PDF) | SC-148, SC-149, SC-118, SC-109 | Built (PRs merged) | Confirm Vercel env Fairfield URLs; run production smoke; set `NEXT_PUBLIC_GAME_MANUAL_URL` if ready; Mike visual check | Vercel + browser | Mike (+ Cursor smoke) | Logo/footer → fairfieldbasketballclub.com; `/shoot` 200; tokenValid | `docs/testing/evidence/` | SC-148/149/118 → Installed/LT; SC-109 PDF if set |

---

## Immediate Mike decisions (unblock or defer explicitly)

| ID | Ask | Blocking for packages? | Default if deferred |
|----|-----|------------------------|---------------------|
| SC-095 | Turn **070a** ON? | Blocks photo/PDF HW S3 (#3 partial) | Keep OFF; test written/quiz first |
| SC-049 | Enable **035**? | Threshold XP season path | Keep OFF until approved |
| SC-022 | Video XP 1 vs 25 intentional? | Config honesty | Document current live value |
| SC-112 | Athlete auth approach? | Real dashboard only | Demo OK for launch if accepted |
| SC-115 | Remove noindex? | SEO only | Keep noindex |
| SC-044 | Major-event SMS/email? | Comms enhancement | Defer |
| SC-081 | Streak repeat behavior? | Progression nuance | Amounts-only |
| SC-066 | Early-bird? | Calendar | No |
| SC-018/032 | Authorize new schema fields? | LA / Launch | Delay LA until after #3 |

Open issues: [#57](https://github.com/Schmidt127/127-si-shooting-challenge/issues/57) (SC-112), [#56](https://github.com/Schmidt127/127-si-shooting-challenge/issues/56) (SC-115). Stale overnight issues #1/#8/#9/#11/#17 → close under SC-138 when convenient.

---

## Standing ON / OFF cheat sheet

| Item | State (per master) | Action |
|------|--------------------|--------|
| 118 schedule | **ON** Sun 5:00 AM Denver | Do not disable |
| 119 schedule | **ON** Sun 10:00 AM Denver | Do not disable |
| 074 sendMode | **Live** | Never force Test for season |
| 035 Weekly Threshold | **OFF** (LT proof done) | Enable only when Mike approves |
| 070a homework S3 | **OFF** intentional | SC-095 |
| 112 | Must stay **OFF** | Attest |
| 117 vs 117c | Exactly one ON | Attest XOR |
| Fillout daily intake | **OFF** (SC-146 Deferred) | Reopen only after package #9 PASS |
| Site noindex | Still on | SC-115 |

---

## After every completed package

1. File evidence under `docs/testing/evidence/` (or package-specific path).
2. Update `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` status + dashboard counts.
3. Do **not** mark Complete without repo + PROD install + live proof where applicable.
4. Recalculate dashboard (watch SC-021 Ready-for-Paste orphan; Built/Planned off-by-one already noted in audit).

---

## Parallel (non-blocking) while waiting on Mike UI

| Work | SC | Note |
|------|-----|------|
| Stale-doc banners (118 OFF, production-only, never-115, Softr, hoopchallenges) | SC-139 | Repo docs only |
| Close overnight GitHub issues | SC-138 | Docs/issues |
| RCC fixture re-runs (no PROD write) | SC-147 | Offline |
| Install SCN-021–043 into Testing Scenarios table | SC-002 | After views exist |
| Plaque follow-up review (not deploy until approved) | SC-111 | Built locally |

---

## Definition of “stop and ask Mike”

- Any schema create/rename/delete
- Enabling 035, 070a, 112, or second Zoom XP writer
- Reopening Fillout intake
- Removing noindex
- Bulk email retry / mass parent send outside Schmidt
- Treating a GitHub script as Live Tested without record IDs

---

*Checklist pairs with the 2026-08-04 Remaining Work Audit. Prefer this file for day-to-day execution; prefer the audit for rationale and full inventories.*
