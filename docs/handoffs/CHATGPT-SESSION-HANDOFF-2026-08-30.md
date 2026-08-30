# ChatGPT Session Handoff — 2026-08-30

**Audience:** Mike + ChatGPT (Phase 4 review / planning)  
**Repo:** `Schmidt127/127-si-shooting-challenge`  
**Branch:** `master`  
**SHA (verified 2026-08-30):** `9f4a64b67505832dc724c785ed9769ab7a5efcc2`  
**Re-verify:** `git fetch origin && git rev-parse origin/master`

---

## 1. Purpose

Mike — paste this document into ChatGPT when you want a **planning and review session** aligned with what Cursor cloud agents shipped today. It summarizes **15 merged PRs** (#279–#293), repo-side completion by area, validation counts, Mike-only follow-ups, open PRs, and recommended next actions across ChatGPT / OMNI / Cursor.

This is **not** a Production paste queue. Cursor completed GitHub work, checklists, offline tests, and read-only Production dry-runs. Anything that touches live Airtable automations, schema deletion, Vercel env cutovers, or supervised attachment apply remains **Mike-only** unless explicitly noted.

**Companion docs to keep open in ChatGPT:**

- [`docs/CURRENT-TRUTH.md`](../CURRENT-TRUTH.md) — primary ops snapshot (note: written at PR #285 merge; master has advanced through #292)
- [`MASTER_REMAINING_WORK_LIST.md`](../../MASTER_REMAINING_WORK_LIST.md) — operator queue
- [`docs/127-SI-MASTER-FUTURE-WORK-LIST.md`](../127-SI-MASTER-FUTURE-WORK-LIST.md) — canonical backlog

---

## 2. Executive summary

On **2026-08-30**, Cursor cloud agents merged a **public UX and portfolio wave** (homepage parent clarity FUT-018, unified footer FUT-019, athlete SEO gate FUT-025, Tutorials FUT-016, Zoom Meetings FUT-017), **closed production smoke and contract-suite regressions** after the homepage redesign (MRW-E04 50/50, MRW-F08 34/34 Agent 4 suite), **shipped deploy checklists and attestation tooling** for Fairfield branding (SC-149 / MRW-E02), Game Manual PDF env (SC-109), and athlete indexing cutover (FUT-025), **refreshed CURRENT-TRUTH and remaining-work docs** (MRW-G08), **ran read-only FUT-010 attachment-cleanup dry-runs** against Production (zero eligible rows — fail-closed by design), **prepped SC-147 Recorded Zoom half-XP** as offline draft + conflict matrix (no Live paste), **built MRW-F07 weekly email positive-arm harness** for disposable 118→072→119→074→079 proof, **audited 1,347 Production fields read-only** for FUT-002 (281 unknown — OMNI review before any deletion), and **re-fixed CHANGELOG merge markers** (#293, then again after #292 reintroduced them). Repository validation: **481 Vitest**, **50/50 prod smoke**, **34/34 offline contract suite**. Multiple Vercel env cutovers and Airtable apply steps remain on Mike's checklist below.

---

## 3. Merged PRs today

| PR | Title | Backlog IDs | Merge SHA |
|----|-------|-------------|-----------|
| [#279](https://github.com/Schmidt127/127-si-shooting-challenge/pull/279) | MRW-B06: Rebase public UX (FUT-018/019/025) after homepage redesign #270 | MRW-B06, FUT-018, FUT-019, FUT-025 | `b8210abd` |
| [#280](https://github.com/Schmidt127/127-si-shooting-challenge/pull/280) | SC-149 / MRW-E02: Fairfield branding URL audit + Vercel checklist | SC-149, MRW-E02 | `7bdf7572` |
| [#281](https://github.com/Schmidt127/127-si-shooting-challenge/pull/281) | FUT-025 / MRW-G07: Athlete profile SEO cutover path (env-gated, default noindex) | FUT-025, MRW-G07 | `740bc306` |
| [#282](https://github.com/Schmidt127/127-si-shooting-challenge/pull/282) | MRW-E04: Fix production smoke suite home h1 assertion (50/50) | MRW-E04, FUT-018 | `a4fb5fe5` |
| [#283](https://github.com/Schmidt127/127-si-shooting-challenge/pull/283) | MRW-F08: Green offline contract suite on master | MRW-F08, PKG-041 | `5f0231b7` |
| [#284](https://github.com/Schmidt127/127-si-shooting-challenge/pull/284) | FUT-016: Tutorials portfolio catalog redesign | FUT-016, SC-105 | `dacbe63e` |
| [#285](https://github.com/Schmidt127/127-si-shooting-challenge/pull/285) | FUT-017: Zoom Meetings portfolio redesign | FUT-017, SC-108 | `8cce1dea` |
| [#286](https://github.com/Schmidt127/127-si-shooting-challenge/pull/286) | docs: MRW-G08 refresh CURRENT-TRUTH and remaining work list | MRW-G08 | `cb543a68` |
| [#287](https://github.com/Schmidt127/127-si-shooting-challenge/pull/287) | SC-109 Game Manual URL deploy checklist and smoke assertions | SC-109, EXT-QA-001 | `ff49f01f` |
| [#288](https://github.com/Schmidt127/127-si-shooting-challenge/pull/288) | MRW-E02 SC-149 Fairfield production attestation | MRW-E02, SC-149 | `b51e0bdd` |
| [#289](https://github.com/Schmidt127/127-si-shooting-challenge/pull/289) | MRW-F07 weekly email positive-arm harness | MRW-F07, SC-031, SC-035 | `fcbff327` |
| [#290](https://github.com/Schmidt127/127-si-shooting-challenge/pull/290) | MRW-C10: FUT-010 Production dry-run evidence | MRW-C10, FUT-010 | `648467c0` |
| [#291](https://github.com/Schmidt127/127-si-shooting-challenge/pull/291) | SC-147 prep: Recorded Zoom half-XP draft + offline conflict matrix | SC-147, MRW-H10 | `7329fd45` |
| [#292](https://github.com/Schmidt127/127-si-shooting-challenge/pull/292) | FUT-002: unused Airtable field inventory audit (MRW-H01) | FUT-002, MRW-H01 | `9f4a64b6` |
| [#293](https://github.com/Schmidt127/127-si-shooting-challenge/pull/293) | fix(docs): remove CHANGELOG merge conflict markers | — (docs hygiene) | `e9a12b28` |

**Also merged same calendar day (context, not in minimum set):**

| PR | Title | Notes |
|----|-------|-------|
| [#277](https://github.com/Schmidt127/127-si-shooting-challenge/pull/277) | Weekly settlement QA harness | SC-WEEKLY-SETTLEMENT-E2E |
| [#278](https://github.com/Schmidt127/127-si-shooting-challenge/pull/278) | Abandon PR #240 xp-activity stack | Superseded by FUT-012 Game Log |

---

## 4. What Cursor completed (repo-side)

### Web

| Item | What shipped | Key paths |
|------|--------------|-----------|
| **MRW-B06 public UX rebase** | Rebased FUT-018 parent section, FUT-019 unified footer, FUT-025 athlete privacy metadata onto homepage redesign (#270) | `web/components/`, `web/lib/seo/` |
| **FUT-016 Tutorials** | Portfolio catalog at `/shoot/tutorials` — feature banner, AccentRail cards, in-page vs external badges, EXT-QA-003 cross-program de-emphasis | `web/app/tutorials/`, `web/lib/data/tutorial-presentation.ts` |
| **FUT-017 Zoom Meetings** | Portfolio catalog at `/shoot/zoom-meetings` — live vs recording orientation, week-grouped cards, 410 cover fallback | `web/app/zoom-meetings/` |
| **FUT-025 athlete SEO** | Fail-closed env gate `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING` (requires `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING`); profiles stay `noindex` by default | `web/lib/seo/`, deploy checklist |
| **SC-149 Fairfield branding** | Confirmed `resolveLandingUrl` / `resolveSiteUrl` → Fairfield Basketball Club; legacy host rewrite; Vitest + smoke guards | `web/lib/brand/`, [`SC-149-fairfield-branding-url-verification.md`](../deploy-checklists/SC-149-fairfield-branding-url-verification.md) |
| **MRW-E02 attestation script** | Read-only production render check — PASS with JSON evidence | `tools/testing/sc-149-fairfield-attestation.mjs` |
| **SC-109 Game Manual** | Deploy checklist; smoke asserts configured vs coming-soon manual link; live XP/level sections | [`SC-109-game-manual-url-verification.md`](../deploy-checklists/SC-109-game-manual-url-verification.md), `web/tests/helpers/smoke.ts` |
| **MRW-E04 prod smoke** | Home hero h1 aligned to FUT-018 copy (`Earn XP. Climb 12 Levels.`) — **50/50** | `web/tests/helpers/smoke.ts` |

### Airtable / tools

| Item | What shipped | Key paths |
|------|--------------|-----------|
| **FUT-010 dry-run (MRW-C10)** | Read-only Production preflight + dry-run + reconcile; **0 eligible rows**; no writes | `tools/airtable/fut_010_intake_attachment_cleanup.py`, [`FUT-010-DRY-RUN-2026-08-30.md`](../testing/evidence/FUT-010-DRY-RUN-2026-08-30.md) |
| **SC-147 half-XP prep (MRW-H10)** | Draft automation, pure helpers, 17 offline conflict-matrix tests; **not Live** | `airtable/automations/shooting-challenge/drafts/sc-147-zoom-recording-half-xp.js`, `lib/sc-147-zoom-recording-credit.js` |
| **MRW-F07 weekly email harness** | Disposable positive-arm CLI for 118→072→119→074→079; 7 offline contract tests | `tools/testing/mrw-f07-weekly-email-positive-arm.mjs`, [`MRW-F07-POSITIVE-ARM-HARNESS.md`](../testing/weekly-email/MRW-F07-POSITIVE-ARM-HARNESS.md) |
| **FUT-002 field inventory (MRW-H01)** | Read-only scan of 1,347 fields; classification JSON + audit doc; **no deletions** | `tools/airtable/fut_002_field_inventory.py`, [`FUT-002-unused-field-inventory-2026-08-30.md`](../audits/FUT-002-unused-field-inventory-2026-08-30.md) |
| **MRW-F08 contract suite** | Agent 4 suite green on master — **34/34** including SC-147 + MRW-F07 wiring | `tools/testing/run-agent4-suite.js`, `.github/workflows/repository-qa.yml` |

### Docs

| Item | What shipped | Key paths |
|------|--------------|-----------|
| **MRW-G08 CURRENT-TRUTH refresh** | Git SHA, merged PR ledger (#279–#285 at time of write), vitest/smoke counts, pending Mike list | [`CURRENT-TRUTH.md`](../CURRENT-TRUTH.md) |
| **Deploy checklists** | SC-149, SC-109, FUT-025 athlete indexing cutover | `docs/deploy-checklists/` |
| **CHANGELOG hygiene** | #293 removed conflict markers; #292 merge reintroduced them — handoff PR re-merges both Added sections cleanly | `CHANGELOG.md` |
| **This handoff** | ChatGPT planning packet for 2026-08-30 session | `docs/handoffs/CHATGPT-SESSION-HANDOFF-2026-08-30.md` |

---

## 5. What is NOT done — Mike-only checklist

Use these as Phase 4 decisions. Cursor must **not** delete Airtable fields, paste automations to Production, or run destructive apply without your explicit approval.

### Vercel / web cutovers

- [ ] **SC-149 — Vercel env dashboard attestation** — Confirm Production env names/values for Fairfield URLs per [`docs/deploy-checklists/SC-149-fairfield-branding-url-verification.md`](../deploy-checklists/SC-149-fairfield-branding-url-verification.md). Repo attestation PASS (`docs/testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-08-30.json`); dashboard checkboxes still Mike-only.
- [ ] **FUT-025 — athlete indexing cutover env** — When ready to index athlete profiles, set `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING=true` (requires `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` already set). Follow [`docs/deploy-checklists/2026-08-30-athlete-profile-indexing-cutover.md`](../deploy-checklists/2026-08-30-athlete-profile-indexing-cutover.md). Default remains `noindex`.
- [ ] **SC-109 — `NEXT_PUBLIC_GAME_MANUAL_URL`** — Set Adobe/hosted PDF URL in Vercel Production and redeploy per [`docs/deploy-checklists/SC-109-game-manual-url-verification.md`](../deploy-checklists/SC-109-game-manual-url-verification.md) (EXT-QA-001). Page renders live-config sections today; PDF link shows coming-soon until env is set.

### FUT-010 attachment cleanup (supervised apply)

- [ ] **Formula attestation** — Review preflight `formulaPipelineSafety` in [`docs/deploy-checklists/FUT-010-intake-attachment-cleanup.md`](../deploy-checklists/FUT-010-intake-attachment-cleanup.md) and sign that Production formulas/views tolerate empty attachment on Uploaded rows.
- [ ] **AWS credentials** — Provide read-only S3 `HeadObject` creds in operator environment before pilot apply (agent dry-run had `AIRTABLE_API_TOKEN` only).
- [ ] **Supervised apply** — Do **not** run `apply --confirm-delete` until attestation + creds + spot-checks complete.

**Why dry-run showed 0 eligible rows (not a harness failure):**

| Scan | Scanned | Eligible | Primary blockers |
|------|--------:|---------:|------------------|
| Dry-run (`--limit 50`) | 50 | **0** | 27 verification failures (20 legacy Storage Key format ≠ `shooting-challenge/` prefix; 7 missing Canonical File URL); 23 ineligible (16 unsupported destination; 7 not Uploaded) |
| Reconcile (`--limit 100`) | 24 candidates | **0** | All 24 failed Storage Key format — keys use enrollment-slug prefixes (e.g. `Schmidt_Barbie/Shooting_Challenge_2026-2027/...`) |

Fail-closed gates worked as designed. No attachment clears were attempted. Evidence: [`docs/testing/evidence/FUT-010-DRY-RUN-2026-08-30.md`](../testing/evidence/FUT-010-DRY-RUN-2026-08-30.md).

### SC-147 Recorded Zoom half-XP

- [ ] **Automation slot assignment** — Draft lives at `drafts/sc-147-zoom-recording-half-xp.js`; slot TBD (~4 free Production slots per CURRENT-TRUTH). **Do not paste until slot + rule row approved.**
- [ ] **`ZOOM_RECORDING` XP Reward Rules row** — Approve/create config row amount (half of live base per design brief). Review conflict matrix: live **101** blocks recording credit for same meeting; **117** remains email-only.

Design brief: [`docs/challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md`](../challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md).

### FUT-002 field inventory (OMNI-first)

- [ ] **281 unknown fields — OMNI review before any deletion** — No repo reference; may still be used in Airtable interfaces, views, or automations outside grep scope. Classify in OMNI before Cursor/schema work.
- [ ] **21+ Drive-related fields blocked by formulas** — 22 fields marked do-not-delete (formula dependencies); 18 legacy/duplicate fields marked safe-to-delete **after** formula retarget per [`docs/audits/google-drive-field-removal-prep-2026-08-17.md`](../audits/google-drive-field-removal-prep-2026-08-17.md). **Agents must not delete fields or attachments.**

Audit: [`docs/audits/FUT-002-unused-field-inventory-2026-08-30.md`](../audits/FUT-002-unused-field-inventory-2026-08-30.md).

### MRW-F07 weekly email (optional proof)

- [ ] **Live positive-arm `--apply` on disposable WAS** — Harness shipped; optional disposable proof of 118→072→119→074→079 before season send volume. Requires Schmidt enrollment or `WETEST|` week. See [`docs/testing/weekly-email/MRW-F07-POSITIVE-ARM-HARNESS.md`](../testing/weekly-email/MRW-F07-POSITIVE-ARM-HARNESS.md).

### Season / content (from CURRENT-TRUTH pending list)

- [ ] **Weeks 2026–27 import** — Challenge calendar configuration; Weeks table excluded from disposable-data deletion.
- [ ] **EXT-QA Airtable content fixes** — EXT-QA-002 achievements re-seed; EXT-QA-003 Tutorials/Dribble category; EXT-QA-004 expired Zoom cover URLs; EXT-QA-005 leaderboard grade/school year; EXT-QA-006 stale homework rows.
- [ ] **010 v10.12 paste** — If Automations Code column still lags v10.10 (settlement grace).
- [ ] **057 v2.2 repaste** — Config field **`Perfect Week Video Minimum`** renamed in Production.
- [ ] **Tremendous production API** — Sandbox validated; production API pending vendor approval.
- [ ] **Optional disposable fixture cleanup** — `recdj8MD0szplMW5r`, `recxIzdVil9ewhBxN`, `recPg14iNRkxblMLs`.

---

## 6. Validation state

| Suite | Command / location | Result (2026-08-30) |
|-------|-------------------|----------------------|
| **Vitest (web)** | `cd web && npm test` | **481 / 481** pass (59 files) |
| **Production smoke** | `cd web && npm run test:smoke:prod` | **50 / 50** pass (MRW-E04 — home hero aligned to FUT-018) |
| **Offline contract suite (MRW-F08)** | `node tools/testing/run-agent4-suite.js` | **34 / 34** pass (includes SC-147, MRW-F07, challenge-year-engine, season-launch-control) |
| **FUT-010 offline** | `node lib/intake-attachment-cleanup/intake-attachment-cleanup.test.js` | **15 / 15** |
| **FUT-010 Python** | `cd tools/airtable && python3 -m unittest tests.test_fut_010_intake_attachment_cleanup` | **19 / 19** |
| **FUT-010 Production dry-run** | Read-only API | **0 eligible** / 50 scanned; reconcile **0 eligible** / 24 |
| **SC-147 offline** | `node airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js` | **17 / 17** pass |
| **MRW-F07 offline** | `node tools/testing/tests/test_mrw_f07_weekly_email_contract.mjs` | **7 / 7** pass |

**Not re-run in this handoff session:** live `npm run test:smoke:prod` (requires network + prod credentials; last green on merge #282). Web CI expected green on merged PRs #284/#285 per CURRENT-TRUTH.

---

## 7. Open PRs / drafts

| PR | State | Title | Notes |
|----|-------|-------|-------|
| [#276](https://github.com/Schmidt127/127-si-shooting-challenge/pull/276) | Open (CI green) | SC-ATHLETE-WF-001: individual athlete workflow QA harness | Review before merge |
| [#262](https://github.com/Schmidt127/127-si-shooting-challenge/pull/262) | Draft | docs: next paste packages after Jul 30 sequence supersession | May be stale — compare to CURRENT-TRUTH paste queue |
| [#244](https://github.com/Schmidt127/127-si-shooting-challenge/pull/244) | Draft | WAS XP reconciliation tooling | Review vs Perfect Week COMPLETE status |
| [#238](https://github.com/Schmidt127/127-si-shooting-challenge/pull/238) | Draft | fix(010): v10.12 — skip formula/link lag | Paste package candidate |
| [#237](https://github.com/Schmidt127/127-si-shooting-challenge/pull/237) | Draft | fix(057): v1.10 Counted Activity Date Key | Likely superseded by v2.2 — verify before merge |
| [#234](https://github.com/Schmidt127/127-si-shooting-challenge/pull/234) | Draft | docs: Perfect Week PROD audit reconciliation | Evidence doc — may close without merge |

---

## 8. Recommended ChatGPT next actions

### Decide in ChatGPT (planning / Phase 4)

1. **Prioritize Mike-only cutover order** — SC-149 dashboard attestation vs FUT-025 athlete indexing vs SC-109 Game Manual PDF: which unblocks parent-facing launch narrative first?
2. **SC-147 go/no-go** — Is Recorded Zoom half-XP in scope for 2026–27 launch? If yes, plan slot assignment + `ZOOM_RECORDING` rule row + Perfect Week formula attestation before any Cursor paste package.
3. **FUT-010 path forward** — Given 0 eligible rows, decide: (a) normalize legacy Storage Keys first, (b) defer attachment cleanup until more canonical-path uploads exist, or (c) narrow pilot to specific record IDs after manual reconciliation.
4. **FUT-002 deletion wave planning** — Sequence OMNI review of 281 unknowns → formula retarget for Drive fields → staged deletion packets (never bulk delete from audit alone).
5. **Open PR disposition** — #276 athlete workflow harness: merge now or defer? Close superseded drafts (#237, #244, #234)?
6. **EXT-QA content batch** — Group EXT-QA-001 through -006 into a single OMNI session vs web-only fixes.

### Route to OMNI (in-Airtable)

- FUT-002 **281 unknown field** interface/view dependency review
- EXT-QA content fixes (achievements, Zoom covers, homework stale rows, leaderboard display fields)
- Formula attestation for FUT-010 (Upload Ready?, Ready to Send to Make?, Workflow Next Step behavior when attachment cleared)
- Weeks 2026–27 calendar import and verification

### Route to Cursor (Phase 3, after ChatGPT decision)

- Paste packages (010 v10.12, 057 v2.2) once approved
- SC-147 Production paste after slot + rule row approval
- FUT-010 supervised apply tooling support (with Mike present)
- MRW-F07 live `--apply` on disposable WAS if Mike wants automated evidence capture
- Merge #276 or close stale drafts per ChatGPT disposition
- CURRENT-TRUTH refresh to `9f4a64b6` + PRs #286–#293 (MRW-G08 stopped at #285)

---

## 9. Evidence links

| Artifact | Path |
|----------|------|
| This handoff | `docs/handoffs/CHATGPT-SESSION-HANDOFF-2026-08-30.md` |
| CURRENT-TRUTH | `docs/CURRENT-TRUTH.md` |
| Master remaining work | `MASTER_REMAINING_WORK_LIST.md` |
| SC-149 attestation JSON | `docs/testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-08-30.json` |
| FUT-010 dry-run report | `docs/testing/evidence/FUT-010-DRY-RUN-2026-08-30.md` |
| FUT-010 dry-run JSON | `tools/airtable/_preview/fut-010-dry-run-2026-08-30.json` |
| FUT-010 reconcile JSON | `tools/airtable/_preview/fut-010-reconcile-2026-08-30.json` |
| FUT-002 field audit | `docs/audits/FUT-002-unused-field-inventory-2026-08-30.md` |
| FUT-002 JSON inventory | `docs/audits/fut-002-unused-field-inventory.json` |
| SC-147 design brief | `docs/challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md` |
| SC-147 draft script | `airtable/automations/shooting-challenge/drafts/sc-147-zoom-recording-half-xp.js` |
| MRW-F07 harness doc | `docs/testing/weekly-email/MRW-F07-POSITIVE-ARM-HARNESS.md` |
| Perfect Week award proof | `docs/testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json` |
| Deploy: SC-149 branding | `docs/deploy-checklists/SC-149-fairfield-branding-url-verification.md` |
| Deploy: SC-109 Game Manual | `docs/deploy-checklists/SC-109-game-manual-url-verification.md` |
| Deploy: FUT-025 athlete SEO | `docs/deploy-checklists/2026-08-30-athlete-profile-indexing-cutover.md` |
| Deploy: FUT-010 attachments | `docs/deploy-checklists/FUT-010-intake-attachment-cleanup.md` |
| Agent 4 suite runner | `tools/testing/run-agent4-suite.js` |
| CHANGELOG (today's entries) | `CHANGELOG.md` § [Unreleased] |

---

*Generated by Cursor cloud agent — 2026-08-30. For ChatGPT Project Sources sync, this file is linked from `docs/README.md`; re-run `tools/docs/sync-chatgpt-sources.ps1` if you import the chatgpt-sources folder.*
