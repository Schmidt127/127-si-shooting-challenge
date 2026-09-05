# SC Wave 2026-09-05 — Independent QA checklist (Agent 6)

**Status:** Baseline published · Other-agent PRs **not open yet** at first publish (2026-09-05)  
**Branch:** `wave/a6-coach-queues-qa-20260905`  
**Base SHA:** `ba287eef8be430d1606950c39f2cf5a2e3875d46`  
**Scope:** Cross-wave review only — no FUT-029, Season Sim, Game Manual edits, broad cleanup, or non-disposable deletes

When Agent 2–5 PR URLs appear, re-run the relevant sections against those diffs and comment on the PRs via `gh`.

---

## How to use

| Phase | Action |
|---|---|
| Now | Use **Baseline findings** below against `origin/master` @ base SHA |
| After PRs land | Diff each agent PR; tick items; leave `gh pr comment` with file:line findings |
| Before merge to master | Full pass on integration branch; block on P0/P1 |

Severity: **P0** ship-blocker · **P1** must-fix before prod · **P2** follow-up · **P3** nit

---

## Checklist matrix

### Privacy / child safety / auth

| ID | Check | Baseline | Per-PR |
|---|---|---|---|
| QA-PRIV-01 | No athlete PII (email, phone, address) on public routes without auth | [ ] | [ ] |
| QA-PRIV-02 | Family Dashboard `/dashboard` remains auth-gated; sign-in is the only public FD entry | [ ] | [ ] |
| QA-PRIV-03 | Magic-link / session tokens not logged; verify route uses `token` query only server-side | [ ] | [ ] |
| QA-PRIV-04 | Public athlete profiles use slug + `noindex` defaults; no sibling/parent email leakage | [ ] | [ ] |
| QA-PRIV-05 | Coach/reviewer URLs (Lambda) not exposed in client bundles or public HTML when gated | [ ] | [ ] |
| QA-SAFE-01 | No CSAM / exploitative content paths; uploads stay server/Airtable/S3 controlled | [ ] | [ ] |
| QA-AUTH-01 | `getAthleteAuthSecret()` missing → fail closed (no silent public dashboard) | [ ] | [ ] |
| QA-AUTH-02 | Enrollment selection keys HMAC-bound to parent email (select flow) | [ ] | [ ] |

### Routes / basePath

| ID | Check | Baseline | Per-PR |
|---|---|---|---|
| QA-ROUTE-01 | No broken primary nav hrefs relative to `basePath` `/shoot` | [ ] | [ ] |
| QA-ROUTE-02 | No `/shoot/shoot` duplication in generated links | [ ] | [ ] |
| QA-ROUTE-03 | Leaderboard (SC-161), Homework (SC-162), Levels (SC-164) detail routes resolve | [ ] | [ ] |
| QA-ROUTE-04 | Family Dashboard appears in More menu when SC-149 residual ships (today: `MORE_NAV_HREFS` = game-manual, faq, achievements only) | n/a until A5 | [ ] |
| QA-ROUTE-05 | Game Manual **unchanged** this wave (out of scope) | [x] | [ ] |

### Responsive / keyboard / screen reader

| ID | Check | Baseline | Per-PR |
|---|---|---|---|
| QA-A11Y-01 | Primary nav keyboard reachable; focus visible | [ ] | [ ] |
| QA-A11Y-02 | Interactive controls have accessible names | [ ] | [ ] |
| QA-A11Y-03 | Leaderboard / Levels / Homework lists readable at 320–768–1280 widths | [ ] | [ ] |
| QA-A11Y-04 | Empty / error / loading states announced or text-visible (not icon-only) | [ ] | [ ] |
| QA-A11Y-05 | No keyboard traps in modals/menus added this wave | [ ] | [ ] |

### Error / empty / stale states

| ID | Check | Baseline | Per-PR |
|---|---|---|---|
| QA-STATE-01 | Airtable/API failure shows safe empty or error UI (no stack traces / tokens) | [ ] | [ ] |
| QA-STATE-02 | Empty leaderboard / homework / levels do not look “broken” | [ ] | [ ] |
| QA-STATE-03 | Stale cache / ISR: no cross-athlete data bleed | [ ] | [ ] |

### Secrets / logging

| ID | Check | Baseline | Per-PR |
|---|---|---|---|
| QA-SEC-01 | `AIRTABLE_API_TOKEN` server-only; never in client components | [ ] | [ ] |
| QA-SEC-02 | No secrets in URLs beyond short-lived auth tokens on verify route | [ ] | [ ] |
| QA-SEC-03 | No PAT / webhook / Resend secrets in committed docs or PR bodies | [ ] | [ ] |
| QA-SEC-04 | `/api/airtable` health does not echo token values | [ ] | [ ] |

### Homework / XP regressions

| ID | Check | Baseline | Per-PR |
|---|---|---|---|
| QA-HW-01 | Homework catalog + `/homework/[id]` still load; durable links (SC-162) do not break identity | [ ] | [ ] |
| QA-HW-02 | No FUT-029 / grade-band player / intake adapter introduced | [ ] | [ ] |
| QA-XP-01 | No XP amount / Perfect Week rule / Source Key pattern changes outside assigned agents | [ ] | [ ] |
| QA-XP-02 | Goal Met Date work (SC-163) does not rewrite Weeks or steal XP Events | [ ] | [ ] |
| QA-XP-03 | Levels UX (SC-164) is presentation-only — no gate/XP logic change | [ ] | [ ] |

### Coach queues (SC-166)

| ID | Check | Baseline | Per-PR |
|---|---|---|---|
| QA-CQ-01 | HC/VF Active filters documented; Mike checklist exists | [x] | n/a |
| QA-CQ-02 | Mike applied Interface filters (UI-only) — **not done at docs ship** | [ ] | n/a |
| QA-CQ-03 | Failed send/delivery rows remain on Active | pending Mike | n/a |
| QA-CQ-04 | No HC/VF deletes for queue hygiene | [x] policy | n/a |

---

## Baseline findings (master @ `ba287eef`, before wave UI PRs)

| Sev | ID | Finding | Evidence | Recommended owner |
|---|---|---|---|---|
| P1 | QA-ROUTE-04 | Family Dashboard **not** in More menu (`MORE_NAV_HREFS`) — known SC-149 residual | `web/lib/navigation/nav-priority.ts` | Agent 5 |
| P1 | QA-CQ-02 | Coach grading Interfaces show completed + incomplete VF/HC mix | MCP `list_records_for_page` on `pag1ohNraczU0PgjM` / `pagK6dWwNon0Vv6MQ` | Mike UI + SC-166 checklist |
| P2 | QA-CQ-02b | VF `Video Feedback Workflow Status` often stuck at `Ready for XP` after Awarded+Delivered | Live VF sample `rec3m9qgmk8INccNn` et al. | Mike optional backfill to `Completed`; do not sole-filter on it yet |
| P2 | QA-PRIV-03 | Auth verify reads `token` from query string (expected for magic link) — ensure no client logging of full URL in new code | `web/app/api/auth/verify/route.ts` | All agents — watch diffs |
| P3 | QA-ROUTE-02 | Existing tests assert no `/shoot/shoot` for Family Dashboard helper — keep green | `family-dashboard-link.test.ts` | Agents 2/3/5 |

No P0 baseline blockers identified on master for this wave start. **Ship-blockers for SC-166 itself** remain Mike’s Interface filter application (UI-only).

---

## Per-agent PR review log

| Agent | PR | Reviewed | Findings posted | Notes |
|---|---|---|---|---|
| 1 Truth/preflight | — | — | — | None open at checklist publish |
| 2 Leaderboard SC-161 | — | — | — | |
| 3 Homework SC-162 | — | — | — | Watch FUT-029 creep |
| 4 Goal Met Date SC-163 | — | — | — | |
| 5 Nav/Levels/messaging | — | — | — | Expect MORE_NAV FD + Levels UX |
| 6 Coach queues + QA | this PR | self | n/a | Docs only |

### Comment template (for later `gh pr comment`)

```text
Agent 6 independent QA (SC-WAVE-20260905)

Checklist: docs/audits/SC-WAVE-20260905-QA-CHECKLIST-20260905.md

Findings:
- [Sev] path:line — summary
- …

No merge requested from A6.
```

---

## Explicit non-goals this wave

- FUT-029 implementation  
- Season Sim / disposable mass cleanup  
- Restoring retired automations (006/043/075/077/111/112/115, etc.)  
- Game Manual content/route changes  
- Deleting non-disposable Airtable records  

## Related

- Ownership: [`SC-WAVE-20260905-OWNERSHIP-LEDGER.md`](./SC-WAVE-20260905-OWNERSHIP-LEDGER.md)  
- SC-166 rules: [`SC-166-COACH-WORK-QUEUE-RULES-20260905.md`](./SC-166-COACH-WORK-QUEUE-RULES-20260905.md)  
- Mike filters: [`../deploy-checklists/SC-166-coach-work-queue-filters.md`](../deploy-checklists/SC-166-coach-work-queue-filters.md)
