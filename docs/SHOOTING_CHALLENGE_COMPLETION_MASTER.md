Warning: truncated output (original token count: 31885)
Total output lines: 1039

# Shooting Challenge Completion Master

**Controlling source of truth** for finishing Shooting Challenge V2.

**Authority map:** [`docs/AUTHORITY-MAP.md`](./AUTHORITY-MAP.md)

Older files (`docs/v2-change-backlog.md`, `docs/CHATGPT-MASTER-PLAN-BRIEF.md`,
close-out notes, overnight packets, deploy checklists) remain as **narrow
purpose documents, evidence, or history**. Do not delete them. When they
describe release status, this document wins; when they describe live-system
state, the named live system wins.

| Field | Value |
|-------|--------|
| Created | 2026-07-23 |
| Last updated | **2026-08-16** (PKG-038 Production proof; completion-status reconciliation) |
| Environment | **PROD Airtable base is the active construction and testing base** (`appn84sqPw03zEbTT`) |
| Scope | Controlling completion plan (updated by Foundation Reset Pack 2026-07-23) |

---

## 1. Operating Rules

These rules apply to this reconciliation and future release-status maintenance.

1. **GitHub is the source of truth for committed code, scripts, and documentation.**
2. **Airtable, Fillout, Make, Gmail, Lambda, and Vercel live state belongs to those systems.** Repository text must not be used to claim current live configuration.
3. **DEV-first and Mike approval rules remain in force.** This reconciliation makes no live-system changes.
4. **Historical evidence is preserved.** Do not delete historical documents, records, or useful test evidence as a documentation cleanup.
5. **Controlled tests, natural triggers, offline tests, and full end-to-end proof are distinct evidence classes.**
6. **Automation 115 is intentionally request-based, not idempotent:** every explicit checked Run Test request creates one new production-shaped Submission; downstream dedupe is a separate contract.
7. **A successful 115 creation does not prove 005, 009, 020, 064, XP, weekly summary, Make, or email behavior.**
8. **System dependency safety remains mandatory.** Protect structure and connected workflows:
   - table links, formulas, lookups, rollups, counts
   - automation scripts and triggers
   - Make scenarios
   - Fillout field mappings
   - Lambda / storage workflows
   - website Airtable queries
   - field names and single-select options used by scripts
   - duplicate-prevention keys (Source Keys / XP Dedupe Keys)
   - one writer per field (do not create competing automations)
9. **Schmidt testing enrollment** is the primary controlled live test athlete when Mike runs an authorized check.
10. **Code in GitHub is not the same as “working in PROD.”** A feature is only Complete when repository work, installation, and live testing are all satisfied where they apply.
11. **Airtable automation-count constraint:** Use consolidated automations where practical. Repository-only modular alternatives must not be represented as active PROD automations. The active canonical automation directory and deployment inventory must distinguish deployed scripts from archived/design alternatives.

---

## 1A. Zoom workflow ownership (PROD)

| Function | Active owner | Airtable automation slot used? |
| -------------------------------- | ------------------ | ------------------------------ |
| Zoom attendance normalization (recording quiz) | No deployed Airtable automation (design alternatives only) | No |
| Zoom attendance credit / `ZOOM_CREDIT` XP | No deployed Airtable automation | No |
| Live Zoom meeting XP | Automation **101** | Yes |
| Gate Applied? | Automation **042** | Yes |
| Perfect Week Applied? | Automation **057** | Yes |
| Recording approval email handoff | Automation **117** | Yes |
| Make/Gmail email send + dedupe | Make workflow **117f** | No Airtable slot |

Canonical file for Automation 117: `airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js`.
Runbook: `docs/deploy-checklists/117-zoom-recording-approval-email.md`.
**Do not** paste the Stage 17 orchestrator into PROD Automation 117. **Do not** create 117a/117b/117c Airtable slots.

## 2. Status Definitions

| Status | Plain-language meaning |
|--------|------------------------|
| **Brainstormed** | Idea exists; no firm plan yet. |
| **Decision Needed** | Mike must choose before more build work. |
| **Planned** | Direction is clear enough to implement; not built yet. |
| **Built in Repository** | Code/docs/scripts exist in GitHub; not confirmed installed in PROD. |
| **Installed in PROD** | Present in the live PROD base / Make / Lambda / web deploy, but not fully live-tested after the empty-base reset (or never live-tested). |
| **Live Tested in PROD** | Installed and proven with controlled live PROD records (Schmidt or equivalent). Still missing final close-out if any. |
| **Complete** | Repository work + PROD install + live PROD test all done (where applicable), or the item is fully finished documentation/decision work that needs no further live proof. |
| **Deferred** | Intentionally postponed. |
| **Superseded** | Replaced by a newer SC item or design. |
| **Not Needed** | No longer required under current operating rules or product decisions. |

**Honesty rule:** Prior 2025–26 “live pass” evidence used athlete data that no longer exists. After the empty-base reset, athlete-path features that were once proven are treated as **Installed in PROD** (or lower) until re-proven on Schmidt test data — unless the item was pure documentation, a one-off historical repair, or a permanent external system (for example Lambda code) that does not depend on wiped rows.

---

## 2A. Current release-control truth — 2026-08-16

This section is the current release-status overlay. Dated sections below are
historical evidence ledgers and technical records; they do not supersede this
overlay.

### Proven

- PR [#137](https://github.com/Schmidt127/127-si-shooting-challenge/pull/137),
  [#138](https://github.com/Schmidt127/127-si-shooting-challenge/pull/138),
  and [#139](https://github.com/Schmidt127/127-si-shooting-challenge/pull/139)
  are merged to `master`.
- Automation 067 v3.4 controlled PROD first pass and replay passed.
- Automation 115 v2.1 controlled PROD proof passed twice. Each explicit checked
  request intentionally created one distinct Submission.
- Testing Scenarios.Homework Assignment links **Program Homework Assignments**.
- Mike supplied Production evidence that Homework XP 020 v3.5, 064 v12.2,
  and 065 v10.1 were installed with 064/065 ON and 071 OFF; 063/068 were
  absent/retired. Completion `rec3FDdZXlXjhcTj4` created, withdrew, and
  restored the same canonical event `recJGcfipFyKwiSC5` with Source Key
  `HOMEWORK_XP|rec3FDdZXlXjhcTj4`. Cursor did not independently access
  Airtable.
- **PKG-006R Complete (2026-08-15):** Automation 010 v10.9 ON after manual and
  native create/replay, same-event withdrawal/restoration, settled totals, zero
  backlog, and read-only audit with zero errors.
- **PKG-036 Complete (2026-08-15):** Automation 041 v5.0 and 042 v4.1.2 ON;
  controlled Charlie 0 → 1 → 0 queue test; progression audit zero findings;
  Automation 043 remains absent.
- **PKG-040 Complete (2026-08-15):** Public standings/leaderboard verified on
  live `/shoot` routes for three active 2026–2027 Enrollments (PR #206).
- **PKG-038 Complete (2026-08-16):** 053 v5.5, 054 v5.8, 066 v3.8, and 059
  v3.6 installed and ON. Charlie Schmidt Early Bird path: 3-day streak XP,
  shot-milestone XP, weekly-threshold XP Events, WAS links submissions and XP
  Events; final audit v2.1 issueTotal = 0.
- **PKG-034 base lifecycle (2026-08-13):** Nine reconciliation fields installed;
  Automation 101 v6.1 ON with sole `Zoom XP Reconciliation Needed? = 1`
  trigger; empty-roster reconciliation proven for Introduction and Motivation
  meetings. **Do not retest installation or empty-roster acknowledgement.**
- **PKG-039 goal-link repair (2026-08-15):** Curtis and Xavier Early Bird WAS
  goal links restored; 032 v3.4 and 030 v3.0 natural restores; audit zero
  findings after repair.
- The `/shoot` web release includes PR #138 imagery and retains the approved
  pre-launch `noindex, nofollow` policy. Deployment state must still be verified
  in Vercel.

### Not proven by this package

- 067/115 creation does not prove 005/009/020/064, Homework XP, summaries,
  Make/S3, email, or full season behavior.
- Controlled automation-action tests do not prove natural-trigger behavior.
- Offline tests do not prove controlled PROD behavior.
- The supplied Homework evidence proves creation, automatic withdrawal, and
  same-event restoration for that controlled lifecycle only; it does not prove
  every Homework path, progression rollup, standings path, or full-season
  behavior.
- Repository text does not prove current Airtable, Fillout, Make, Gmail, or
  Vercel configuration.

### Open / blocked / deferred

- PKG-034 live-attendee XP, bonuses, withdrawal/restoration, and downstream
  progression/standings readback remain open (base installation is proven).
- PKG-039 Lane A first-create/replay and 118 v2.0 weekly-scheduler proof remain
  open (goal-link repair is proven).
- Communications Hub **DAILY_SUBMISSION** isolated live proof remains open
  (WELCOME controlled path is proven; 076→079 offline/repo-ready only).
- Automation **022** remains repository-prepared only — no Production install or
  live-proof packet.
- PKG-037 core certification remains open — prerequisites partially satisfied;
  final four-lane certification not executed.
- PKG-009 Weeks scaffold appears live (Early Bird, Week 1–9, Post-Challenge,
  Program Instance `Shooting Challenge | 2026-2027`, Early Bird HW1/HW2) but
  final activation checklist and Fillout launch approval remain open.
- Fillout activation, season-sensitive automation review, Make/email safety,
  and final Mike launch approval remain open.
- The current today-based Early Bird record is a temporary testing fixture and
  must be shortened or replaced before the 2027 launch.
- No fixed week count is authoritative; Airtable Weeks is manually maintained.

### 2027 season authority

Challenge window is May 1–June 30, 2027; Early Bird is April 25–May 1, 2027;
Week 1 starts May 2, 2027. Every new season begins at Level 1 with 0 season XP.
Fillout manually controls enrollment availability. See the
[authority map](./AUTHORITY-MAP.md) for ownership and evidence boundaries.

### Rolling next actions

| Owner | Next action |
|---|---|
| Mike | Verify live Weeks/config, temporary Early Bird fixture, Fillout availability, and launch approval in the named live systems |
| Cursor Desktop | Maintain the Completion Master, CONTROL, authority map, and deterministic stale-reference audit |
| Cursor Online | Review the focused reconciliation PR and its evidence boundaries |
| Airtable | Supply a read-only current export or UI attestation for live configuration and controlled test results |
| Codex | No action until a named, approved repository task is assigned |

---

## 2B. Active Execution Matrix — 2026-08-10

This is the execution queue for approved work that is still incomplete,
blocked, awaiting live proof, awaiting a Mike decision, or explicitly deferred.
It is a traceability index, not a second status authority or a production
activation plan. Complete items are intentionally omitted from the active queue;
their historical evidence remains below.

**State vocabulary:** `ready` means a bounded repository package can start;
`needs repo work` means implementation or documentation is incomplete;
`needs live proof` means repository work exists but live-system evidence is
missing; `Mike decision` means product, activation, schema, or external-service
authorization is required; `blocked` means a dependency prevents safe work;
`deferred` means intentionally postponed.

**Package traceability rule:** Every implementation PR must state
`Execution matrix IDs advanced: <PKG-* IDs>` in its description (reviewer
convention; the local audit cannot inspect GitHub PR descriptions). The PR must
also update the corresponding row's state and **Current evidence / updated**
field with a dated entry beginning `Execution matrix IDs advanced: PKG-###`.
A repository or offline test cannot promote an item to controlled PROD proof,
natural-trigger proof, or activation.

Current traceability entry dated 2026-08-10:

Matrix initialized 2026-08-10 — no implementation package has started; all
rows remain at their queued baseline.

Execution matrix IDs advanced: PKG-025 — repository-only Levels orientation
added; no live deployment, smoke proof, or activation claim.

Execution matrix IDs advanced: PKG-025 — repository-only Public Display
refresh control added; no live deployment, smoke proof, or activation claim.

Execution matrix IDs advanced: PKG-021 — repository-only Game Manual
quick-start orientation added; no approved 2027 rules, live proof, or
activation claim.

Execution matrix IDs advanced: PKG-002 — repository-only configuration
inventory and DEV-safe local configuration boundary; no live-system proof.

Execution matrix IDs advanced: PKG-037 — repository-only core-certification
packet, offline mixed-XP contract, and stale operator-instruction corrections;
no live-system proof, activation, or Production data claim.

### Recommended sequence

1. **Next package — `PKG-001` (P0): Automation 005 / SC-076 failure
   investigation.** Reproduce the unresolved failure classes with current
   source contracts and offline fixtures, document the root cause and exact
   live proof still needed, and add only deterministic tests or evidence
   boundaries. This is the highest-value unresolved item that can advance in
   the repository without Airtable, Fillout, Make, Vercel, or production
   changes.
2. **Following package — `PKG-002` (P1): Config-over-code and automation
   hardcode inventory.** Complete the bounded V2-002 / SC-034 inventory and
   contract checks after `PKG-001`; do not rewrite automations or change
   configuration in that package.

Neither package is started by this traceability PR. `PKG-005` (Learning
Activities schema) and `PKG-009` (2027 Weeks/activation) remain later because
they require Mike-owned schema or live-system decisions.

| ID | Exact feature / fix / improvement | State | Source section / link | Dependency | Owner | Evidence required for completion | Current evidence / updated | Systems involved | Recommended next action | Order |
|---|---|---|---|---|---|---|---|---|---|---:|
| `PKG-001` | Investigate unresolved Automation 005 failure behavior and the remaining SC-076 first-create versus replay boundary | `needs live proof` | §4 SC-005, SC-076; §5 Testing / XP | Current 005/066 source and fixtures; no live write | Cursor | Reproducible offline result, source-level root cause, explicit controlled-proof card, and separate natural-trigger requirement | 2026-08-10 — Execution matrix IDs advanced: PKG-001 — diagnosis report `docs/agent-runs/results/PKG-001-AUTOMATION-005-SC-076-DIAGNOSIS.md`; no safe code fix; deployed intake mapping and controlled live readback remain unverified | Repo; Airtable; Mike | Mike supplies deployed 005/023 versions, trigger/action trace, and controlled record values before a repair package | 1 |
| `PKG-002` | Finish the config-over-code and hardcoded-value inventory across active automations | `needs repo work` | §4 SC-021, SC-034; backlog V2-002 | `PKG-001`; current automation inventory | Cursor | Complete inventory, contract tests, exception list, and evidence row; no unsupported PROD claim | 2026-08-10 — Execution matrix IDs advanced: PKG-002 — inventory report `docs/investigations/PKG-002-CONFIGURATION-OVER-CODE-INVENTORY.md`; no runtime values changed; DEV-safe configuration boundary and follow-up tests remain | Repo | Add deterministic configuration-boundary tests only; defer runtime rewrites and live verification to a separate approved package | 2 |
| `PKG-003` | Reconcile remaining stale operational/status references after each approved package | `needs repo work` | §4 SC-139; [Authority Map](./AUTHORITY-MAP.md) | `PKG-001` and later package evidence | Cursor | Audit pass, corrected active wording, preserved historical notices, and changed-file traceability | 2026-08-10 — queued; no package evidence yet | Repo | Sweep only named stale rows; do not create another status document | 3 |
| `PKG-004` | Establish field ownership and dedupe-key contracts before new schema/features | `blocked` | §4 C-012, C-024; backlog Wave 2 | V2-013 architecture boundary and Mike schema authority | Cursor; Mike | Ownership matrix, one-writer decisions, key contract, safe rerun tests, and approved schema scope | 2026-08-10 — queued; no package evidence yet | Repo; Airtable; Mike | Keep as a gate for schema work; do not modify Airtable schema here | 4 |
| `PKG-005` | Add Learning Activities catalog, response routing, and `countsAsHomework` behavior without a second XP pipeline | `Mike decision` | §4 SC-018–SC-020; backlog C-009 / LA-000–002 | `PKG-004`; Mike authorization for schema | Cursor; Mike | Approved schema, seed/readback evidence, routing tests, Fillout/web mapping, and coach-view proof | 2026-08-10 — queued; no package evidence yet | Repo; Airtable; Fillout; Mike | Mike approves schema direction; then implement repo contract before any base change | 5 |
| `PKG-006` | Prove natural Fillout-shaped intake from identity through Submission, Enrollment, Week, and PHA | `needs live proof` | §4 SC-001, SC-004, SC-060, SC-064, SC-069 | `PKG-004`; valid 2027/Testing Weeks; Fillout availability decision | Mike; Cursor | Controlled Fillout-shaped run, identity/no-duplicate evidence, date-boundary proof, and natural-trigger evidence | 2026-08-11 — Execution matrix IDs advanced: PKG-006 — controlled-proof specification `docs/investigations/CONTROLLED-PROOF-SPECIFICATION-PKG-006-015.md` provides repository-only evidence design supporting PKG-007 through PKG-015; no live proof or completion claim | Airtable; Fillout; Mike | Prepare a Schmidt-only proof card; do not reopen intake from this PR | 6 |
| `PKG-007` | Prove homework, video, written, multi-file, HC reuse, and post-review XP positive paths | `needs live proof` | §4 SC-010–SC-016, SC-071–SC-072; [Authority Map](./AUTHORITY-MAP.md) | `PKG-005` where Learning Activities are used; `PKG-006` intake | Mike; Cursor | One controlled run per path, correct HC/asset/XP identity, no duplicate, and explicit Make/S3/email boundaries | 2026-08-13 — Homework XP child lifecycle proven (020/064/065). 113/114 repository-ready; PKG-006R/036 locks released 2026-08-15. Video Production paste/proof may proceed under separate Mike authorization. Broader Homework/video/written/multi-file paths remain unproven. | Airtable; Fillout; Make; Mike | Preserve Homework evidence; execute Video XP proof when authorized | 7 |
| `PKG-008` | Prove weekly summary build/send positive branches and retry/failure behavior | `needs live proof` | §4 SC-031, SC-035–SC-037, SC-041, SC-045 | Eligible completed Week/package; `PKG-006` | Mike; Cursor | `build_armed` and send-arm results, WAS uniqueness, 072→119→074/Make evidence, and no-target safety | 2026-08-11 — Supporting proof design in PKG-006’s controlled-proof specification defines the positive send, retry, Make/Gmail, writeback, and replay evidence required; no live proof or completion claim | Airtable; Make; Gmail; Mike | Wait for an eligible package, then run bounded live proof with Schmidt-only recipients | 8 |
| `PKG-009` | Reconcile Airtable Weeks and prepare final 2027 season activation package | `partially proven` | §2A 2027 season authority; §4 SC-032, SC-065, SC-146; §2C | Mike-maintained Weeks; `PKG-006`; final launch approval | Mike; Cursor | Weeks export/UI attestation for May 1–June 30, Early Bird Apr 25–May 1, Week 1 May 2, no fixed count, and temporary-fixture cleanup | 2026-08-16 — Weeks scaffold appears live: Early Bird, Week 1–9, Post-Challenge; Program Instance `Shooting Challenge \| 2026-2027`; Early Bird HW1 Shot Tracker Usage and HW2 Website Exploration. Final activation checklist, temporary Early Bird fixture cleanup, and Fillout launch approval remain open. | Airtable; Fillout; Mike | Record activation checklist completion; do not retest Weeks existence | 9 |
| `PKG-010` | Decide the future Zoom recording-credit writer without taking the email slot or writing Attendees | `Mike decision` | §4 SC-074, SC-086; C-025 | C-024 dedupe contract; C-025 email ownership | Mike; Cursor | Written product decision, slot/owner contract, rollback, and no-double-credit test plan | 2026-08-11 — Supporting proof design in PKG-006’s controlled-proof specification separates live attendance, recording approval email, and recording-credit ownership; no product decision or live proof claim | Repo; Airtable; Make; Mike | Choose dedicated future writer or retain email-only 117; do not revive Stage 16/117a alternatives | 10 |
| `PKG-011` | Define major-event notifications for level-up, milestones, Perfect Week, and gate-clear events | `Mike decision` | §4 SC-044; backlog C-027 | `PKG-004`; V2-008 game-manual language | Mike; Cursor | Recipient, channel, consent, quiet hours, template, and idempotent-send decision | 2026-08-11 — Supporting proof design in PKG-006’s controlled-proof specification preserves notification behavior as a separately authorized boundary; no product decision, implementation, or live proof claim | Repo; Airtable; Make; Mike | Mike chooses SMS/email and recipient policy before implementation | 11 |
| `PKG-012` | Remove the 059 Shot Milestone filter and prove Perfect Week auto-fire plus Batch A/B fixtures | `needs live proof` | §4 SC-028, SC-077; `059-perfect-week-trigger-coverage.md` | Mike UI action; C-025 Zoom policy | Mike; Cursor | Trigger-only and end-to-end fixture results, date-key correctness, and no duplicate XP | 2026-08-11 — Supporting proof design in PKG-006’s controlled-proof specification defines the Perfect Week fixture, trigger/action, replay, and negative-control evidence; no live proof or completion claim | Airtable; Mike | Mike performs the narrowly scoped trigger edit; Cursor reviews evidence afterward | 12 |
| `PKG-013` | Resolve XP/config choices: Video XP amount, recording/manual rules, streak economics, and next-season gate tuning | `Mike decision` | §4 SC-022, SC-029, SC-081–SC-082; V2-005–007 | Grade-band ownership; 2027 season policy | Mike | Written decisions plus approved Airtable rule/config evidence and controlled regression proof | 2026-08-11 — Supporting proof design in PKG-006’s controlled-proof specification identifies XP/config and recording-credit decisions as prerequisites; no decision, config change, or live proof claim | Airtable; Mike | Decide amounts and repeat-after-break behavior before any config edit | 13 |
| `PKG-014` | Prove level progression beyond the current baseline, blocked-gate clear, and Zoom-credit participation | `needs live proof` | §4 SC-024, SC-078–SC-080 | `PKG-009`; `PKG-010`; eligible Schmidt fixtures | Mike; Cursor | Controlled level-up, gate-clear, and replay/no-churn evidence | 2026-08-12 — Immediate initial-assignment child scope completed in PROD on Enrollment `recqOR0A3RGjFjI3u`: zero XP assigned Beginner → Rookie Shooter with Level 2 Gate and Status Assigned; broader level-up, blocked-gate-clear, replay/idempotency, and Zoom-credit proof remain open | Airtable; Mike | Complete the remaining bounded progression and Zoom proof; do not treat initial assignment as full PKG-014 completion | 14 |
| `PKG-015` | Re-prove live attendance, live/recording exclusivity, Zoom totals, gate, Perfect Week, and public-page integrations | `needs live proof` | §4 SC-073, SC-084–SC-093; C-025 | `PKG-010`, `PKG-012`, `PKG-014` | Mike; Cursor | Meeting/recording conflict cases, no Attendees write, XP/source keys, rollup totals, and web readback | 2026-08-11 — Supporting proof design in PKG-006’s controlled-proof specification names attendance, recording exclusivity, totals, Perfect Week, gate, and web-readback evidence; no live proof or completion claim | Airtable; Vercel; Mike | Execute only after the recording-credit decision and eligible fixtures exist | 15 |
| `PKG-016` | Complete live automation trigger/version inventory and retain the 112 OFF / 043 no-recreate disposition | `needs live proof` | §4 SC-057–SC-059; `PROD-STATE-RECONCILIATION-010-031-066-118-119-043.md` | Current UI access and automation ownership | Mike; Cursor | Dated UI attestation for trigger/version state and explicit 112/043 disposition | 2026-08-12 — Bounded attestation complete for 001 v5.4, 041 v4.0, 042 v3.4, view filters, blank 041 `recordId`, and 043 retired/not deployed; full live automation inventory remains open | Airtable; Mike | Complete the remaining live inventory; do not restore retired slots | 16 |
| `PKG-017` | Finish sibling/email validation and inactive-processing controls without excluding Schmidt from public standings | `needs repo work` | §4 SC-062–SC-069; C-010, C-017, C-018 | `PKG-004`; Fillout policy; Schmidt visibility decision | Cursor; Mike | Contract tests, Fillout rules, sibling live case, Active? consumer audit, and email-path proof | 2026-08-10 — queued; no package evidence yet | Repo; Airtable; Fillout; Make; Mike | Close repo contract gaps first, then schedule live cases | 17 |
| `PKG-018` | Make Grade Bands the linked source of truth and complete the C-021/V2-002 consumer audit | `needs repo work` | §4 SC-021–SC-023; backlog C-021 | `PKG-004`; `PKG-002` inventory | Cursor | No hardcoded band strings, linked-rule tests, rename safety, and later live verification | 2026-08-10 — queued; no package evidence yet | Repo; Airtable | Add tests/inventory only; defer schema renames and production changes | 18 |
| `PKG-019` | Complete content-hash dedupe verification while keeping the later Drive/attachment retirement separate | `needs live proof` | §4 SC-094, SC-096–SC-099; backlog C-023 | `PKG-004`; S3/reviewer-link contracts | Cursor; Mike | 116 live proof, hash write/review evidence, and safe confirm/reversal; no auto-reuse | 2026-08-10 — queued; no package evidence yet | Repo; Airtable; Make; Mike | Verify 116 and writeback without auto-reuse; leave SC-100 deferred | 19 |
| `PKG-020` | Implement Presentation fields and consume them in homework, weekly, video, Zoom, and public web labels | `needs repo work` | §4 SC-054, SC-092, SC-102, SC-110, SC-117; C-022 | `PKG-004`; Learning Activities and Weeks field decisions | Cursor | Query/source tests showing Presentation-only labels and no primary-field fallback | 2026-08-10 — queued; no package evidence yet | Repo; Airtable | Build a bounded query/contract package after field ownership is approved | 20 |
| `PKG-021` | Publish the game manual from config and expose the approved 2027 rules | `Mike decision` | §4 SC-109; V2-008 | `PKG-013`; `PKG-020` | Mike; Cursor | Approved copy, config readback, `NEXT_PUBLIC_GAME_MANUAL_URL` decision, and web smoke | 2026-08-10 — queued; no package evidence yet | Repo; Airtable; Vercel; Mike | Mike approves wording and URL before any public-indexing change | 21 |
| `PKG-022` | Choose and implement real athlete authentication for dashboard/profile data | `Mike decision` | §4 SC-112, SC-116; [admin roadmap](../web/docs/admin-roadmap.md) | Privacy boundary; no web writes; auth architecture choice | Mike; Cursor | Auth decision, threat/model review, read-only data proof, and no mock-data confusion | 2026-08-10 — queued; no package evidence yet | Repo; Vercel; Mike | Mike chooses parent magic-link or another approved approach | 22 |
| `PKG-023` | Decide whether and when to remove sitewide `noindex` | `Mike decision` | §4 SC-115; `INDEXING-SEO-DECISION.md` | `/shoot` noindex policy and content readiness; `PKG-009`, `PKG-021`, `PKG-022` | Mike | Written SEO approval, content/soft-cutover checklist, and post-change crawl evidence | 2026-08-10 — queued; no package evidence yet | Repo; Vercel; Mike | Keep `noindex` until written approval; no activation in this queue PR | 23 |
| `PKG-024` | Install and review Reliability Command Center views without automatic repairs | `Mike decision` | §4 SC-147; `RCC-OMNI-VIEW-INSTALL.md` | Repo CLI/export and dry-run report | Mike/OMNI; Cursor | View installation/readback and first health review; no auto-repair permission | 2026-08-10 — queued; no package evidence yet | Airtable; Mike | Mike uses OMNI to install/review views if approved | 24 |
| `PKG-025` | Install and live-check the read-only `/shoot` smoke/accessibility package | `needs live proof` | §4 SC-118, SC-148 | Current web merge line; `SC-102` | Cursor; Mike | Vercel deployment, HTTP/Playwright/optional axe results, and Mike production smoke | 2026-08-10 — queued; no package evidence yet | Repo; Vercel; Mike | Keep tests read-only; schedule after an approved web integration merge | 25 |
| `PKG-026` | Verify Fairfield landing/site environment values and public catalog/content hygiene | `needs live proof` | §4 SC-103–SC-110, SC-149; EXT-QA-001–006 | Repo URL/config tests; `/shoot` base path; `PKG-020`, `PKG-021` | Cursor; Mike | Vercel env inspection, public smoke, stale rows/media cleanup evidence | 2026-08-10 — queued; no package evidence yet | Repo; Airtable; Vercel; Mike | Read-only inspect first; no env or content changes in this queue | 26 |
| `PKG-027` | Run the full pre-season audit pack and dry-run season before public intake | `blocked` | §4 SC-134–SC-135; V2-011–012 | Stages A–J tooling; test cards; current authority boundaries; `PKG-006` through `PKG-026`; Mike launch approval | Mike; Cursor | Green dry-run, explicit blocked/not-tested ledger, controlled email results, rollback/activation checklist | 2026-08-10 — queued; no package evidence yet | Repo; Airtable; Fillout; Make; Vercel; Mike | Do not start until dependency packages and 2027 Weeks proof are complete | 27 |
| `PKG-028` | Export Automation 079 and reconcile the Communications Hub welcome contract | `needs repo work` | §9M; SC-045 | Controlled test evidence; participant activation remains blocked; final approved copy and recipient authorization | Cursor; Mike | GitHub source, template review, consent, test-mode proof, Delivery audit, suppression check | 2026-08-10 — queued; no package evidence yet | Repo; Airtable; Make; Mike | Export/document 079 before its next code change; keep participant sends disabled | 28 |
| `PKG-029` | Program Instance multi-year architecture and migration wave | `deferred` | §4 SC-067; backlog V2-013 | Decision direction and Season Launch Control interim layer; `PKG-004`, `PKG-009`; dedicated approved architecture wave | Mike; Cursor | Approved architecture, schema migration plan, historical-data proof, views/interfaces, automation isolation | 2026-08-10 — queued; no package evidence yet | Repo; Airtable; Mike | Do not start incremental PI edits or block 2027 launch on this wave | 29 |
| `PKG-030` | Retire or merge Tutorials tables, rename Softr-named publish flag, and other breaking schema cleanup | `deferred` | §4 SC-105, SC-144; backlog C-026 | Current `Tutorials` web ownership; Softr is obsolete; `PKG-004`, `PKG-020`, V2-013 where schema-wide | Mike; Cursor | Row/field diff, migration, repointed views/interfaces, web regression, and approved schema change | 2026-08-10 — queued; no package evidence yet | Repo; Airtable; Vercel; Mike | Keep deferred until field ownership and season architecture are approved | 30 |
| `PKG-031` | Future communications/message-center and media-kit platform work | `deferred` | §4 SC-131, SC-133; backlog V2-014b, V2-028 | Manual 2025–26 kits and current email paths; `PKG-008`, `PKG-011`, `PKG-021` | Mike; Cursor | Product scope, templates, config model, delivery/dedupe evidence, and separate activation approval | 2026-08-10 — queued; no package evidence yet | Repo; Airtable; Make; Mike | Do not expand scope during season launch; revisit after core proof | 31 |
| `PKG-032` | Low-priority deferred cleanup: Drive/attachment retirement, archive/clone rollover, Award Recipients scope, duplicate award bucket, conquered-goal lookup, repo-health follow-ups, and multi-challenge vision | `deferred` | §4 SC-100, SC-125, SC-127–SC-129, SC-143, SC-145; backlog V2-001, H-003, H-004, H-006 | Core 2027 launch and higher-priority reliability work | Mike; Cursor | Explicit reactivation request, narrow scope, impact review, and independent evidence package | 2026-08-10 — queued; no package evidence yet | Repo; Airtable; Mike | Leave deferred; do not let these items compete with season launch or core proof | 32 |
| `PKG-033` | Core App Reliability and End-to-End Production Readiness: registration-to-participation, Weekly Athlete Summary, Zoom attendance/XP, progression/levels, standings, and one consolidated Production test specification | `needs live proof` | §4 SC-001–SC-004, SC-024, SC-031, SC-035–SC-037, SC-073–SC-093; PKG-006, PKG-014, PKG-015 | PKG-006 daily-submission/core participation ownership; PKG-014 progression/levels ownership; PKG-015 Zoom/public integration proof boundaries; merged PR #166 Homework XP and PR #165 Video XP | Mike; Cursor | Five repository evidence lanes, independent review, offline lifecycle/concurrency tests where justified, exact ownership/evidence-gap maps, and a plain-language Schmidt Production journey; no offline result may be called Production proof | 2026-08-13 — repository evidence, WAS harness, retired-043 inventory correction, and Mike-only Schmidt packet prepared in draft PR #167; this is not implementation completion; independent review YES for draft publication; current live versions/triggers/schema/formula settling and controlled Production proof remain pending | Repo; Airtable evidence supplied by Mike; Fillout; Vercel readback only if separately approved | Mike reviews draft PR #167 and supplies live evidence; serialize any later source repair as a separate independently reviewed package | 33 |
| `PKG-034` | Zoom live-attendance XP lifecycle reliability: formula-backed reconciliation, base XP, cumulative bonuses, withdrawal, restoration, ownership guards, and downstream readback | `partially proven` | §4 SC-073–SC-093; §2C; PKG-033 | Automation 101 sole live-attendance XP writer; recording XP and Automation 117 email remain out of scope | Mike; Cursor | Repository implementation, independent review, exact nine-field Production contract, controlled Schmidt-only lifecycle proof, same-event restoration, and settled WAS/lifetime/progression/standings evidence; offline results are not Production proof | 2026-08-13 — Mike supplied evidence that all nine fields are installed in `appn84sqPw03zEbTT`, Automation 101 v6.1 is ON with the sole `Zoom XP Reconciliation Needed? = 1` trigger and dynamic `recordId`, and the final read-only audit checked 2 meetings / 16 XP Events with 0 Zoom XP Events, 0 unsupported recording XP Events, and 0 duplicate/rule/ownership/backlink/lifecycle errors. Introduction `recMFP2x5LDqea9ax` and Motivation `recb9EjQIJVzaRpZa` both acknowledged empty rosters with `reconciled_empty_roster_no_award`, Needed = 0, and no XP Event. Two missing-enrollment warnings are the intentional empty rosters; Mike manually deleted unused meetings `rec3ToANr5pcs2SRG` and `reczeUT0AJUWMmEOb`. **Do not retest installation or empty-roster path.** Live-attendee XP and downstream lifecycle remain pending. | Repo; Airtable; Mike-controlled Production UI | Execute live-attendee proof only; do not repeat installation | 34 |
| `PKG-037` | Core Production certification packet and operator-instruction reconciliation | `needs live proof` |
| `PKG-038` | Streak and shot-milestone XP corrected-history lifecycle reliability | `Complete` | [`deploy-checklists/PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md`](./deploy-checklists/PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md); §2C | 010 remains Submission Base XP owner; 041/042 progression | Mike; Cursor | 053/054 streak topology + exact STREAK_XP lifecycle; 066/059 shot-milestone lifecycle; audit zero findings | 2026-08-16 — Production proof passed: 053 v5.5, 054 v5.8, 066 v3.8, 059 v3.6 ON. Charlie 3-day streak + shot-milestone + weekly-threshold XP; audit v2.1 issueTotal=0. **Do not retest.** | Repo; Airtable | Closed for Early Bird scope; do not change Early Bird dates | 38 | [`deploy-checklists/PKG-037-CORE-APPLICATION-PRODUCTION-CERTIFICATION.md`](./deploy-checklists/PKG-037-CORE-APPLICATION-PRODUCTION-CERTIFICATION.md) | PKG-007 evidence; PKG-034 live-attendee proof (006R/036/038 complete) | Mike; Cursor | Four evidence lanes per lifecycle step; exact source keys, same-event reversals, settled totals, progression, standings, and final audit | 2026-08-16 — Prerequisites 006R, 036, and 038 now complete; packet and offline tests committed; certification execution remains open | Repo; Airtable; Mike | Capture certification-athlete baseline and execute packet preflight | 37 |
| `PKG-039` | WAS and weekly-goal reliability | `partially proven` | [`deploy-checklists/PKG-039-WAS-WEEKLY-GOAL-INTEGRITY-PRODUCTION-PACKET.md`](./deploy-checklists/PKG-039-WAS-WEEKLY-GOAL-INTEGRITY-PRODUCTION-PACKET.md); §2C | Target Goal Shots.Program Instance field and formula contract | Cursor; Mike | 031 sole WAS creator; exact PI + Grade Band goal; Lane A 031→032→118 proof | 2026-08-15 — Goal-link repair complete for Curtis/Xavier; 032 v3.4 + 030 v3.0 natural restores; audit zero findings. **Do not retest goal repair.** First-create/replay and 118 v2.0 scheduler proof remain open. | Repo; Airtable; Mike | Complete Lane A remainder only | 39 |
| `PKG-040` | Standings and leaderboard data-integrity reliability | `Complete` | [`deploy-checklists/PKG-040-STANDINGS-LEADERBOARD-PRODUCTION-VERIFICATION.md`](./deploy-checklists/PKG-040-STANDINGS-LEADERBOARD-PRODUCTION-VERIFICATION.md) | Production public-data adapter repair and live verification | Cursor; Mike | `Web - Leaderboard` boundary, exactly one active Enrollment identity, settled Level/XP/shots, deterministic public ordering, no private record IDs in public model, realistic adapter coverage, and live route verification | 2026-08-15 — PR #206 merged/deployed. Connected Airtable readback confirmed exactly three active Enrollments linked to Registering `Shooting Challenge | 2026-2027` (Xavier, Curtis, Charlie), each with one Athlete, one Program Instance, one Current Level, settled XP/shots, and level rank. Direct live checks of `/shoot`, `/shoot/leaderboard`, and `/shoot/public-display` returned that same set without “temporarily unavailable”; `/shoot/homework` also returned successfully. No production runtime errors after verification. | Repo; Airtable; Vercel | Closed. Retain the read-only audit for any future data correction or scope change; do not reopen this completed package for unrelated website styling work. | 40 |

### 2C. Package status reconciliation — 2026-08-16

This table is the current release-status summary for the named packages and
related automations. **Complete** items must not be reopened without new
contradicting evidence. See **Do not retest** and **Still open** subsections
below.

| Package / item | Status | Latest proof / evidence | Remaining action | Retest required? | Production logic change? |
|---|---|---|---|---|---|
| **PKG-006R** | **Complete** | 010 v10.9 ON; manual + native create/replay, withdrawal/restoration, settled totals, zero backlog, audit zero errors (2026-08-15) | None for reconciliation scope | **No** | **No** |
| **PKG-036** | **Complete** | 041 v5.0 + 042 v4.1.2 ON; Charlie 0→1→0 queue test; audit 12 Levels, 12 gates, 3 Enrollments, zero findings (2026-08-15) | None for progression reliability scope | **No** | **No** |
| **PKG-038** | **Complete** | 053 v5.5, 054 v5.8, 066 v3.8, 059 v3.6 ON; Charlie 3-day streak + shot-milestone + weekly-threshold XP; audit v2.1 issueTotal=0 (2026-08-16) | Resume after first regular Week closes (~May 8, 2027); do not change Early Bird dates | **No** | **No** |
| **PKG-040** | **Complete** | PR #206; three Enrollments on `/shoot`, `/leaderboard`, `/public-display` (2026-08-15) | None unless adapter scope changes | **No** | **No** |
| **PKG-034** (base lifecycle) | **Partially proven** | Nine fields + 101 v6.1 ON; empty-roster reconciliation for Introduction/Motivation; audit zero errors on empty rosters (2026-08-13) | Live-attendee XP, bonuses, withdrawal/restoration, progression/standings readback | **No** for installation/empty-roster; **Yes** for live-attendee path | **No** unless defect found |
| **PKG-039** (goal-link repair) | **Partially proven** | Curtis/Xavier goal links restored; 032 v3.4 + 030 v3.0 natural restores; audit zero findings (2026-08-15) | Lane A first-create/replay; 118 v2.0 scheduler proof | **No** for goal repair; **Yes** for Lane A remainder | **No** unless defect found |
| **PKG-009** (2026–2027 Weeks) | **Partially proven** | Weeks scaffold live: Early Bird, Week 1–9, Post-Challenge; PI `Shooting Challenge \| 2026-2027`; Early Bird HW1 Shot Tracker + HW2 Website Exploration (Mike attestation 2026-08-16) | Final activation checklist, temporary Early Bird fixture cleanup, Fillout launch approval | **No** for Weeks existence; **Yes** before season launch | **No** unless activation gap found |
| **PKG-037** | **Open** | Packet + offline tests committed (2026-08-13); prerequisites 006R/036/038 now satisfied | Execute four-lane core certification preflight | **Yes** when certification starts | **No** unless certification finds defect |
| **Automation 022** | **Open** (repo only) | GitHub v1.1 source exists; foundation reset: UI presence unverified | Install, configure trigger, controlled upload writeback proof | **Yes** after install | **No** until paste approved |
| **DAILY_SUBMISSION Hub** | **Open** | WELCOME controlled path proven (§9M); 076 v8.6 + 079 v2.0 repo-ready; offline tests PASS | Isolated live Hub delivery proof for daily path | **Yes** for daily path only | **No** until promotion approved |
| **118 v2.0 scheduler** (PKG-039 Lane A) | **Open** | 118 v1.7 fail-safe PASS (2026-08-08); v2.0 in GitHub | Paste v2.0 + dryRun then positive `build_armed` after eligible Week | **Yes** | **No** until paste approved |
| **119 positive send** | **Open** | 119 v1.7 fail-safe PASS; historical 2026-07-24 E2E retained | Positive send-arm after eligible completed Week | **Yes** when Week eligible | **No** until defect found |
| **031 v4.1** (PKG-039) | **Open** | v3.5 canonical resolution PASS (2026-08-08); v4.1 repo-ready | Lane A first-create/replay proof with 032/118 | **Yes** for Lane A | **No** until paste approved |
| **035 weekly threshold** | **Deferred** | v1.2 live-tested historically; OFF pending approval (SC-049) | Mike approval before re-enable | Per approval | Per approval |
| **057 Perfect Week** | **Open** | v1.7 repo-ready; SC-028 auto-fire blocked until trigger filter removed | Trigger edit + fixture proof | **Yes** | Per approval |
| **076 daily email queue** | **Open** | v8.6 repo-ready; blocked pending DAILY_SUBMISSION promotion | Paste + trigger verification + Hub proof | **Yes** | Per approval |
| **079 dispatcher** | **Partially proven** | WELCOME controlled live proof; v2.0 accepts DAILY_SUBMISSION keys offline | Production replacement for full dispatcher; daily live proof | **No** for WELCOME; **Yes** for daily | Per approval |

#### Do not retest / proven improvements

Do **not** repeat these bounded proofs unless a dependency breaks or new
contradicting evidence appears:

1. **PKG-006R** — 010 v10.9 reconciliation lifecycle (create/replay,
   withdrawal/restoration, settled totals, zero backlog).
2. **PKG-036** — 041/042 bidirectional progression queue and Charlie 0→1→0
   controlled adjustment.
3. **PKG-040** — Public standings adapter and live `/shoot` leaderboard routes
   for the three active 2026–2027 Enrollments.
4. **PKG-034 base lifecycle** — Nine-field installation, 101 v6.1 trigger
   contract, empty-roster reconciliation (`reconciled_empty_roster_no_award`).
5. **PKG-038** — Charlie Schmidt Early Bird streak (3-day), shot-milestone XP,
   weekly-threshold XP, WAS linkage, deactivation/restoration through same XP
   Event IDs; audit v2.1 issueTotal=0.
6. **PKG-039 goal-link repair** — Curtis/Xavier WAS goal links; 032/030 natural
   restores; post-repair audit zero findings.
7. **PKG-009 Weeks scaffold** — Early Bird + Week 1–9 + Post-Challenge rows;
   Program Instance link; Early Bird HW1/HW2 PHA assignments (existence only —
   not season launch activation).
8. **Communications Hub WELCOME** — Controlled 079→Hub→Resend path (§9M); replay
   dedupe proven.
9. **005 Program Instance isolation** — PROD paste + live test PASS (do not
   retest unless Week/PI contract changes).
10. **Homework XP controlled path** — 020/064/065 lifecycle on completion
    `rec3FDdZXlXjhcTj4`.
11. **Automation 043** — Retired/absent; **do not recreate**; 042 is sole
    progression-output writer.

#### Still open / needs final proof

1. **Communications Hub DAILY_SUBMISSION** — Isolated live Hub delivery proof
   (offline/repo-ready only; no Production `Sent` claim for daily path).
2. **PKG-037** — Final core application Production certification (four lanes).
3. **Automation 022** — Installation, trigger configuration, and upload
   writeback proof (GitHub source prepared only).
4. **PKG-039 Lane A remainder** — 031 first-create/replay; 118 v2.0 scheduler
   dryRun then positive arm (distinct from 118 v1.7 fail-safe).
5. **PKG-034 live-attendee path** — Base XP creation, bonuses, withdrawal,
   restoration, downstream WAS/progression/standings.
6. **PKG-009 activation** — Fillout availability, temporary Early Bird fixture
   cleanup, final launch approval (Weeks existence is not activation).
7. **118/119 positive weekly email** — Await eligible completed Week (~May 8,
   2027 for first regular Week close).
8. **076/079 DAILY_SUBMISSION promotion** — Paste, trigger-owner verification,
   controlled Production proof.
9. **PKG-007 Video XP** — 113/114 Production paste/proof (repository-ready;
   Homework child path proven).
10. **057/058 Perfect Week** — Trigger filter removal and fixture proof.


> **Completion update — 2026-08-15:** **PKG-006R Complete.** Automation 010 v10.9 is ON after manual and native lifecycle proof: same-event create/replay, withdrawal, restoration, settled totals, zero backlog, and read-only audit with zero errors. **PKG-036 Complete.** Automation 041 v5.0 and 042 v4.1.2 are ON after a controlled Charlie adjustment 0 → 1 → 0: 041 queued exactly one record each time, 042 automatically cleared the queue and restored the correct state, and the final progression audit returned 12 active Levels, 12 active Gate Rules, 3 active Enrollments, and zero findings. Automation 043 remains absent. The separate two-row weekly-goal warning remains PKG-039 scope.

Mike supplied the authoritative Production baseline for the unified operator
packet ([`PKG-006R-PKG-036-PRODUCTION-OPERATOR-PACKET.md`](./deploy-checklists/PKG-006R-PKG-036-PRODUCTION-OPERATOR-PACKET.md)).

Execution matrix IDs advanced: PKG-006 — 2026-08-13 PKG-006R operator packet
consolidation and offline packet-contract coverage added.
Execution matrix IDs advanced: PKG-036 — 2026-08-13 active trigger-map
correction and unified PKG-036 preflight added. No Airtable, Production data,
automation installation/toggle, deployment, package-lock release, or live-proof
claim occurred.

| Item | Current status | Current truth |
|------|----------------|---------------|
| PKG-006R reconciliation fields (12) | **Installed / verified** | Verify exact names and types; do not recreate |
| Automation **010 v10.9** | **Installed in PROD / ON** | Lifecycle proof complete 2026-08-15; **do not retest** unless source/trigger changes |
| Automation **041 v5.0** | **Installed in PROD / ON** | Queue-only reconciliation; proven in PKG-036 |
| Automation **042 v4.1.2** | **Installed in PROD / ON** | Sole progression-output writer; proven in PKG-036 |
| `Progression Last Reconciled Signature` | **Created** | Verify writable single-line text and field ID |
| `Progression Last Queued Signature` | **Present** | Unchanged (`fldw2p0bfT54vk6ag`) |
| Levels / Gate Rules | **12 active Levels; 12 school-year gate rules (Level 1–12)** | School Year / Rule Set scope; one Program Instance per school year |
| Levels inverse links | **Renamed (PR #177)** | `Enrollments — Current Level`, `Enrollments — Next Level` |
| Automation **043** | **Retired / absent** | Do not recreate |
| Automation **077** | **Deleted from Airtable** | Retired Make/Gmail path; GitHub source archived; slot recovered |

**PKG-006R lock:** **Released 2026-08-15.** PKG-006R and PKG-036 are complete. Do not
reopen unless new contradicting evidence appears.

**PKG-007-RDY-001 coordination hold:** **Released 2026-08-15** with PKG-006R and
PKG-036 completion. Video XP 113/114 Production paste may proceed under separate
Mike authorization; this does not alter 041/042 ownership.

---

### PKG-034 Production installation closeout — 2026-08-13

Mike supplied the authoritative evidence for Production base
`127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026`
(`appn84sqPw03zEbTT`). Automation 101 v6.1 is installed and ON with a
`When record matches conditions` trigger on `Zoom Meetings`, sole condition
`Zoom XP Reconciliation Needed? = 1`, and dynamic `recordId`. No
`Create XP Events`, `Attendees`, or `Completed` trigger condition is present.
The nine field IDs are recorded in
[`pkg-034-zoom-reconciliation-fields.md`](pkg-034-zoom-reconciliation-fields.md).

After Mike manually deleted unused 2025–2026 meetings
`rec3ToANr5pcs2SRG` and `reczeUT0AJUWMmEOb`, the final read-only
`audit-zoom-live-attendance-xp-lifecycle` v1.0 checked 2 meetings and 16 XP
Events: 0 Zoom XP Events, 0 unsupported recording XP Events, and 0
duplicate/reward-rule/ownership/backlink/lifecycle errors. The 2
`missing_enrollment_links` warnings correspond to the two intentionally empty
future rosters. Introduction `recMFP2x5LDqea9ax` and Motivation
`recb9EjQIJVzaRpZa` both reached Needed = 0 with
`reconciled_empty_roster_no_award` and no XP Event.

This is installation and empty-roster Production proof only. Live-attendee
Base XP creation, replay/deduplication, Bonus 2, Bonus 3, fourth-meeting
preservation, withdrawal, same-event restoration, inactive Enrollment
correction, WAS/lifetime XP, 041→042 progression, standings, and recording XP
remain pending. Cursor did not access or modify Production.

The immediate-initial-assignment child scope of `PKG-014` is complete in
Production; the broader level-progression, blocked-gate-clear, replay, and
Zoom-credit proof remains open. The bounded trigger/version attestation for
`PKG-016` is recorded below; the full live automation inventory remains open.

The matrix preserves the final 2027 rules: challenge season **May 1–June 30,
2027**; normal Early Bird **April 25–May 1, 2027**; Week 1 begins **May 2,
2027**; Airtable Weeks is manually maintained and authoritative; there is no
fixed season-week count; every new season starts at Level 1 with 0 season XP;
Fillout availability is manually controlled; and the current today-based Early
Bird record is temporary testing only.

---

### Current PROD reconciliation (2026-08-12)

This is the closeout evidence for the immediate initial-level assignment
promotion. DEV validation was skipped under Mike’s explicit Production
authorization; no DEV proof is claimed. The next scheduled 041 idempotency
observation was not supplied and remains pending.

| Item | Current status | Current truth |
|------|----------------|---------------|
| Automation **001 v5.4** | **Installed in PROD / controlled registration PASS** | Existing registration trigger and dynamic Enrollment `recordId` preserved. Controlled `RADON Schmidt` registration created Enrollment `recqOR0A3RGjFjI3u` (`Schmidt, RADON - 2026-2027`) in Production base `appn84sqPw03zEbTT`; Active, School Year `2026-2027`, Program Instance `Shooting Challenge \| 2026-2027`, Grade Band `5-6`. Welcome email received once; no manual recalculation intervention. |
| Automation **041 v4.0** | **Installed in PROD / scheduled reconciliation retained** | Scheduled trigger ON; optional `recordId` blank. Earlier scheduled scan reported `success`, `queued`, `scannedCount = 7`, `queuedCount = 7`. Post-registration idempotency observation remains pending. |
| Automation **042 v3.4** | **Installed in PROD / immediate initial assignment PASS** | Existing “when record enters view” trigger, selected view, and dynamic triggering-record `recordId` preserved. The controlled Enrollment reached Lifetime XP `0`, Current Level `Beginner`, Next Level `Rookie Shooter`, Level Gate Rule `Level 2 Gate`, Level Status `Assigned`; 001 checked the request and 042 cleared it before the next scheduled 041 scan. |
| Production view **042 - Needs Level Assignment** | **Configured** | Filters are `Level Recalc Needed?` checked and `Active?` checked. The existing inactive blocked duplicate is absent from the view; it was not manually processed and no new duplicate was created. |
| Level configuration | **Verified** | Exactly one active cumulative zero-XP Level exists (`Beginner`); `Rookie Shooter` requires `200 XP`; an active `2026-2027` Level 2 Gate exists. |
| Automation **043** | **Retired / not deployed** | No recreation or replacement was performed; 042 remains the progression-output writer. |

Exact registration, Automation 001, and Automation 042 run timestamps were
not supplied in the Production evidence and remain unrecorded.

---

### Current PROD reconciliation (2026-08-08)

This is a dated evidence record for the affected automations. Older dashboard
reconciliations below remain historical evidence and must not be read as
current paste-pending status. Live installation and controlled Schmidt proof
must be verified in Airtable; repository text records the evidence boundary only.

| Item | Current status | Current truth |
|------|----------------|---------------|
| Automation **010 v10.6** | **Installed in PROD / live replay PASS** | Controlled replay of `recElDBcFvuE6jWwc` reused/updated existing XP Event `recHHhpkgQS1hhIHo`; candidate count `1`, no duplicate, operator restored 010 ON. This proves idempotent replay/update behavior, not separate first-create proof. |
| Automation **031 v3.5** | **Installed in PROD / canonical resolution PASS** | Empty-link controlled run resolved the canonical summary, rejected a malformed zero-Week candidate, created no duplicate summary, and caused no XP churn; operator restored 031 ON. Already-linked stale-summary repair remains offline-tested only. |
| Automation **053 v5.3** | **Existing verified PROD status retained** | Prior operator-confirmed current status remains controlling for this reconciliation. |
| Automation **066 v3.5** | **Live Tested in PROD (existing-unlock replay)** | Controlled enrollment replay found 8 eligible milestones, skipped all 8 existing unlocks, created no duplicates, and did not reproduce the prior `records[0].fields` error. |
| Automation **042 v3.3** | **Complete / Live Tested in PROD** | Installed in PROD and run twice on controlled Schmidt Enrollment `recCyFEPeATOVNlr9` (`School Year = 2026-2027`). First run PASS and controlled replay PASS: Lifetime XP `688`; Current Level `Rookie Shooter`; Next Level `Developing Shooter`; selected `Level 3 Gate` `recrLcVfwPcWGflR2` from the `2026-2027` rule set; `Gate Blocked` because `Submissions 13/15`; `Level Recalc Needed?` cleared. Replay produced the identical result with no unexpected link/status churn. 042 remains the sole progression-output writer; 043 is not deployed and must not be recreated. GitHub issue **#97 complete**. |
| Automation **118 v1.7** | **Installed/active in PROD; no-target fail-safe PASS** | Production inputs were restored and the schedule is ON. `skipped_no_target_week` produced zero writes and zero armed builds; the positive `build_armed` branch awaits a real eligible completed Week. |
| Automation **119 v1.7** | **Installed/active in PROD; no-target fail-safe PASS** | Production inputs were restored and the schedule is ON. `skipped_no_target_week` produced zero writes and zero armed sends; the positive send-arm branch awaits a real eligible completed Week/package. |
| Automation **043** | **Not deployed / not required** | No native Airtable automation was found. The stale governance row is not deployment proof. Do not recreate 043; 042 remains the sole progression-output writer. Issue #95 is superseded/not planned; Issue #97 is complete; Issue #98 remains open. |

Evidence: [`AUTOMATION-042-V3.3-SCHOOL-YEAR-LIVE-PROOF.md`](./prod-completion/2026-08-08/AUTOMATION-042-V3.3-SCHOOL-YEAR-LIVE-PROOF.md), [`docs/prod-completion/2026-08-08/PROD-STATE-RECONCILIATION-010-031-066-118-119-043.md`](./prod-completion/2026-08-08/PROD-STATE-RECONCILIATION-010-031-066-118-119-043.md), [`AUTOMATION-010-V10.6-LIVE-REPLAY-PROOF.md`](./prod-completion/2026-08-08/AUTOMATION-010-V10.6-LIVE-REPLAY-PROOF.md), [`AUTOMATION-031-V3.5-CANONICAL-RESOLUTION-LIVE-PROOF.md`](./prod-completion/2026-08-08/AUTOMATION-031-V3.5-CANONICAL-RESOLUTION-LIVE-PROOF.md), [`AUTOMATION-066-V3.5-LIVE-PROOF.md`](./prod-completion/2026-08-08/AUTOMATION-066-V3.5-LIVE-PROOF.md).

**Issue boundaries:** #97 is complete; #98 remains unresolved/open. Do not reintroduce the stale orphan-XP bulk count from #100; remaining #100 scope is recurrence prevention only.

---

## 2A. Current app/base closeout overlay — 2026-08-10

The dated packet [`SCV2-APP-BASE-CLOSEOUT-001.md`](./prod-completion/2026-08-10/SCV2-APP-BASE-CLOSEOUT-001.md) is the current evidence overlay for the PHA-first homework closeout. It preserves historical evidence and does not reopen Package 10.

| Item | Current status | Current evidence / next proof |
|---|---|---|
| 005 → 009 → 020 | **Installed in PROD / path proven** | Initial `rectWmGA1K2RSN4bp` and replay `recPPrwds0oz0EB4C` reused Homework Completion `recyU1G9mWC1rQSst`; no duplicate created |
| 067 v3.4 | **Live Tested in PROD** | Quiz `recAO1S9TdZHupl7t` created/reused Homework Completion `reckpeVV9G3M13j5U`; controlled proof passed, including idempotency. This proves the 067 bridge and duplicate guard, not Homework XP or full downstream completion. |
| 115 v2.1 | **Live Tested in PROD** | Scenario `recXjRRg8n0NodziZ` produced Submissions `rec7e5X7QaVDZLpiL` and `recbbO685zSEuyzM9` from two explicit checked `Run Test?` requests. Each request intentionally creates a new production-shaped Submission; 115 is not an idempotent Submission processor. |
| Homework Library | **Proven for the 067/115 controlled paths** | Current controlled proof used the PHA-linked Homework Library identity; no unsupported historical record identity is asserted here |
| Program Homework Assignment | **PHA-first identity proven for the 067/115 controlled paths** | Testing Scenarios Homework Assignment links Program Homework Assignments; 115 carries the PHA RID and 005/020 preserve the PHA + Library distinction |
| Package 10 | **Closed / preserved** | PR #133 merged/deployed; PR #134 corrected 115's stale header; no reopen |

### Closeout items still requiring Mike evidence

Fresh Schmidt athlete-path proof after the reset and season-launch readiness remain open. Testing Views (10/10, zero sanity failures), Automation 057 controlled PROD proof, Automation 035 v1.2 creation/idempotency proof, and the current 067/115 controlled PROD outcomes are preserved evidence. Automation 035 remains OFF pending approval. The 067/115 proofs do not claim Homework XP, Make/S3, email, or full end-to-end season behavior.

No status in this overlay is marked Complete or Live Tested solely from a governance-table row, stale install packet, or script header. The full test cards, expected links, duplicate checks, returned record IDs, and console-output requirements are in the dated packet.

---

## 3. Completion Dashboard

The bucket counts below are the historical **2026-08-06** snapshot. For the affected automations, the dated Current PROD reconciliation above supersedes these older aggregate counts and rows.

| Bucket | Count |
|--------|------:|
| **Total items** | **150** |
| Complete | 17 |
| Live Tested in PROD | 34 |
| Installed but not tested *(Installed in PROD)* | 41 |
| Built but not installed *(Built in Repository)* | 21 |
| Ready for PROD Paste *(informal)* | 0 |
| Planned | 16 |
| Decision Needed | 5 |
| Deferred | 10 |
| Superseded | 4 |
| Not Needed | 2 |
| Brainstormed | 0 |

### Historical dashboard reconciliation (2026-08-06 — Program Instance isolation package)

| Item | Status | Evidence |
|------|--------|----------|
| Architecture rule | Documented | Athlete → Enrollment → Program Instance scopes all challenge progress |
| Automation **005 v4.1** | **Live Tested in PROD** | Activity Date Fallback → Early Bird `recWeVrSabnsYaHc2`; 12 same-PI / 13 other-PI excluded on `recElDBcFvuE6jWwc` |
| Automation **023 v3.1** | **Installed in PROD** / **Live Tested PASS** | Primary controlled run on `recElDBcFvuE6jWwc` assigned `recCyFEPeATOVNlr9` with `programInstanceSource=submission-week`; replay returned `existing-valid-enrollment` with `wroteUpdate=false`. |
| Automations **053 5.3**, **066 v3.5**, **118/119 v1.7** | **Current PROD state recorded above** | PI-scoped Enrollment/Week matching |
| Automation **043** | **Not deployed / do not recreate** | Stale governance row is not native automation proof; 042 remains the single progression writer |
| Historical PROD paste order | **Superseded: 023 v3.1 → 053 → 066 → 118 → 119 → 043-if-Live** | [`docs/deploy-checklists/2026-08-06-PROGRAM-INSTANCE-ISOLATION-PASTE.md`](./deploy-checklists/2026-08-06-PROGRAM-INSTANCE-ISOLATION-PASTE.md) |
| Website queries | **Built in Repository** | Optional `AIRTABLE_ACTIVE_SCHOOL_YEAR` |
| Static audit tool | **Built in Repository** | `tools/program-instance-isolation/` |
| Test fixture Week `reci5GdxEC57vfoS3` | Operator cleanup required | Must not stay Active overlapping Early Bird in same PI |

**Issue #116 correction (historical):** 023 cleared its controlled gate. The old remaining paste order is retained only as history; the 2026-08-08 reconciliation records the current state through 119 and removes 043 from the deployment sequence.
| PR **#92** | **Merged** to `master` | Merge `3c3e5d3` (`3c3e5d33a589f23048db874d10c8f9a141aeee85`) |

| Automation | Repository Updated | Merged to Master | PROD Pasted | Live Tested | Result |
| ---------- | ------------------ | ---------------- | ----------- | ----------- | ------ |
| 005 v4.1 | Yes | Yes | Yes | Yes | **PASS** |
| 023 v3.1 | Yes | Yes (`1d5ca1a` / PR #93) | Yes | Yes — primary Week→PI path and replay no-write proof | **PASS** |
| 053 5.3 | Yes | Yes | No | No | — |
| 066 v3.5 | Yes | Yes | Yes | Yes — existing-unlock replay | **PASS** |
| 118 v1.7 | Yes | Yes | Yes | No-target fail-safe PASS; positive build arm pending eligible Week | — |
| 119 v1.7 | Yes | Yes | Yes | No-target fail-safe PASS; positive send arm pending eligible Week/package | — |
| 043 | Yes | Yes | No native automation found | Not applicable | **Do not recreate** |

**Do not mark isolation Complete** until remaining pastes + controlled Schmidt retests finish. Package: [`docs/prod-completion/2026-08-06/PROGRAM-INSTANCE-ISOLATION-PACKAGE.md`](./prod-completion/2026-08-06/PROGRAM-INSTANCE-ISOLATION-PACKAGE.md).

### Dashboard reconciliation (2026-08-12 — Automation 076 v8.5 single-select write hotfix)

| Item | Status | Evidence |
|------|--------|----------|
| Automation **031 v4.0 / 076 v8.5** | **Built in Repository; Production replacement pending** | 031 remains the approved authoritative normal-athlete-activity WAS creator. 076 v8.5 retains the v8.4 cleaned-recipient correction and writes queue `Event Type` and `Status` single-selects using Airtable-compatible `{ name: ... }` objects. The verified `Program Instance - Sync` table, queue behavior, readiness guards, dynamic `recordId`, and deterministic replay remain intact. `rec58gdymfPKKeVRI` is temporary manual-test-only. Paste order is 076 v8.5 first, then 031 v4.0. [`AUTOMATION-031-PASTE-AND-TEST-PACKET.md`](./prod-completion/2026-08-07/AUTOMATION-031-PASTE-AND-TEST-PACKET.md) · [`PKG-006-DAILY-SUBMISSION-HUB-HANDOFF.md`](./deploy-checklists/PKG-006-DAILY-SUBMISSION-HUB-HANDOFF.md) |
| Focused validation | **PASS — 031 28/28; 076 v8.5 focused suite; 010 9/9** | 031 tests: **28/28 passed**; 076 focused tests cover cleaned-parent success, raw-parent rejection, recipient deduplication, invalid/missing parent fail-closed behavior, Airtable-compatible single-select writes, and deterministic replay; 010 tests: **9/9 passed**; 076 canonical contracts passed; syntax passed; `git diff --check` passed; IDE diagnostics reported no errors. Repository ESLint remains unavailable because no `eslint.config.*` exists; broad lint is not claimed. |

Production installation, live testing, and email delivery remain Mike-owned and are not claimed by this repository change.

### Dashboard reconciliation (2026-08-07 — Automation 031 stale-link repo repair)

| Item | Status | Evidence |
|------|--------|----------|
| Automation **031 v3.5** | **Historical: Built in Repository; now Installed in PROD / canonical resolution PASS** | Issue **#96** repair validates existing/candidate summaries against Enrollment + Week + Program Instance + Summary Key; 2026-08-08 live proof confirms malformed-candidate rejection and canonical empty-link resolution. Already-linked stale-summary repair remains offline-tested only. |
| Offline regression | **PASS** | `node --test tools/testing/tests/test_031_offline.mjs` (13/13) |
| Airtable editor installation | **Confirmed v3.5** | Operator restored 031 ON after controlled test |
| Controlled PROD live test | **PASS for canonical empty-link path** | Do not claim already-linked stale-summary repair live-proven |

Evidence: [`docs/prod-completion/2026-08-07/AUTOMATION-031-PASTE-AND-TEST-PACKET.md`](./prod-completion/2026-08-07/AUTOMATION-031-PASTE-AND-TEST-PACKET.md) · [`docs/prod-completion/2026-08-06/AUTOMATION-031-DEFECT-AND-ZOOM-FIXTURE-RETIREMENT.md`](./prod-completion/2026-08-06/AUTOMATION-031-DEFECT-AND-ZOOM-FIXTURE-RETIREMENT.md).

### Dashboard reconciliation (2026-08-06 — Repository finalization / PR #88)

| Item | Status | Evidence |
|------|--------|----------|
| PR **#88** | **Merged** to `master` | Merge `23642a6` — Automation **066 v3.4** + offline regression on `master` |
| PR **#87** | **Closed** (superseded) | Replaced by post-merge `2026-08-05-OVERNIGHT-FINAL-SUMMARY.md` + merge reconciliation |
| Automation **033 v3.3** | **Installed in PROD** (operator-attested paste) | Mike pasted — do not paste again; live WAS assign verification optional |
| Automation **059** trigger | **Operator-attested corrected** | Pending-only; no Shot Milestone filter; Test input = Unlock ID (never WAS) |
| Automation **066 v3.4** | **Historical/superseded by v3.5 live proof** | Prior natural-path failure was corrected; 2026-08-08 v3.5 replay passed with 8 existing unlocks skipped and no duplicates |
| Automation **020 v3.2.0** | **Built in Repository** — paste not confirmed | Still required Mike paste |
| SC-027 / SC-076 | Unchanged bucket | Unlock/XP Live Tested via backfill→059 only; natural 066 not advanced by PR merge |

**Net math:** no Section 4 Complete/LT/Installed bucket moves from PR #88 alone. 033 Installed attestation is operator paste (was Built paste-pending).

Checklist: [`docs/deploy-checklists/2026-08-06-FINAL-AIRTABLE-PASTE-AND-VERIFY.md`](./deploy-checklists/2026-08-06-FINAL-AIRTABLE-PASTE-AND-VERIFY.md) · Report: [`docs/overnight/2026-08-06-REPOSITORY-DEPLOYMENT-FINAL-RECONCILIATION.md`](./overnight/2026-08-06-REPOSITORY-DEPLOYMENT-FINAL-RECONCILIATION.md).

### Dashboard reconciliation (2026-08-07 — Automation 010 replay-safety repo repair)

| Item | Status | Evidence |
|------|--------|----------|
| Automation **010 v10.6** | **Historical: Built in Repository; now Installed in PROD / replay PASS** | 2026-08-08 controlled replay reused/updated the existing XP Event with one candidate and no duplicate; first-create proof remains separate |
| Offline regression | **PASS** | `node --test tools/testing/tests/test_010_offline.mjs` |
| Airtable editor installation | **Confirmed v10.6** | Operator restored 010 ON after controlled test |
| Controlled PROD live test | **PASS for idempotent existing-event replay** | Do not claim first-create behavior proven from replay alone |

Evidence: [`docs/prod-completion/2026-08-07/AUTOMATION-010-XP-WRITER-RECONCILIATION.md`](./prod-completion/2026-08-07/AUTOMATION-010-XP-WRITER-RECONCILIATION.md).

### Dashboard reconciliation (2026-08-06 — Automation 066 v3.4 createRecords fields fix)

| Item | Status | Evidence |
|------|--------|----------|
| Automation **066** natural path | **Historical failure — superseded by v3.5 live proof** | v3.3 previously failed on raw `createRecordsAsync` payloads; the 2026-08-08 v3.5 controlled replay passed on `recCyFEPeATOVNlr9`. |
| Repo fix | **Installed and Live Tested in PROD — v3.5** | Existing-unlock replay detected 8 eligible milestones, skipped all 8, created 0 duplicates, and reproduced no `records[0] should have a 'fields' property` error. |
| SC-027 / SC-076 current claim | **Live Tested in PROD for existing-unlock replay** | This proves the controlled replay/idempotency path; retain the separate distinction between backfill-created awards and natural first-create behavior. |
| PROD paste | **Complete for this proof** | No further 066 paste/replay is required unless source, trigger, schema, or milestone data changes. |

**Do not award duplicate milestone XP during retest** — existing `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|*` unlocks/XP must be linked/skipped, not recreated.

Evidence: script `066-achievements-and-milestones-create-shot-milestone-unlocks.js` · overnight Agent 2 backfill pack [`docs/testing/evidence/2026-08-05-agent2-foundation/`](./testing/evidence/2026-08-05-agent2-foundation/).

### Dashboard reconciliation (2026-08-05 — Perfect Week gated test timestamp)

| SC | Old status | New status | Evidence |
|----|------------|------------|----------|
| SC-021 | Installed in PROD | **Installed in PROD** | Gated `Submitted Same Day?` formula for Schmidt enrollment `recCyFEPeATOVNlr9` only when both test fields set; **not athlete-facing**; normal athletes stay on Submitted At vs Activity Date |
| SC-028 / SC-077 | *(see Agent 3)* | **Live Tested in PROD** | CASE-01 used gated fixtures; unlock/XP proven; do not revert to Installed from this gated-path note |

**Do not mark Perfect Week Complete.** Method: [`PERFECT-WEEK-FIXTURE-METHOD.md`](./testing/perfect-week/PERFECT-WEEK-FIXTURE-METHOD.md) · Rollback: [`PERFECT-WEEK-GATED-TEST-TIMESTAMP-ROLLBACK.md`](./testing/perfect-week/PERFECT-WEEK-GATED-TEST-TIMESTAMP-ROLLBACK.md).

### Dashboard reconciliation (2026-08-05 — Overnight Agent 2 foundation)

| SC | Old status | New status | Evidence |
|----|------------|------------|----------|
| SC-023 | Installed in PROD | **Live Tested in PROD** | Cleared Grade Band on `recCyFEPeATOVNlr9`; Automation **002** reassigned **3-4** (`reclWDQZzKbVBtdhG`) within ~6s |
| SC-027 | **Live Tested in PROD** | 066 v3.5 controlled replay on `recCyFEPeATOVNlr9`: 8 eligible milestones, 8 existing unlocks skipped, 0 duplicates; prior v3.3 failure is historical |
| SC-029 | Installed in PROD | **Live Tested in PROD** | Schmidt streak ladder XP present (3 Source Keys); Current Streak **8** |
| SC-048 | Planned | **Live Tested in PROD** | PROD formula `XP Date Resolved` SWITCH case fixed `Submission Base`→`Shooting Base` (Meta API); `isValid=true` |
| SC-060 | Built in Repository | **Live Tested in PROD** | Align with existing 001 v5.2 PROD paste + live proof (`recCyFEPeATOVNlr9`) |
| SC-061 | Built in Repository | **Live Tested in PROD** | Same — matched-existing athlete, no duplicate |
| SC-075 | Installed in PROD | **Live Tested in PROD** | Streak XP Events on enrollment; Current Streak 8 / Longest 7 |
| SC-076 | **Live Tested in PROD** | Existing-unlock replay through 066 v3.5 passed with 8 skips and 0 new unlocks; prior 059/backfill proof remains historical context |
| SC-079 | Installed in PROD | **Live Tested in PROD** | Level Status **Gate Blocked**; Gate Debug `Sub 9/10 \| Vid 5/6` |

**Net math vs concurrent Agent 1/3/4 dashboard (LT 25 / Installed 46 / Built 24 / Planned 17):** LT →**34**; Installed →**40**; Built →**22**; Planned →**16**. Complete unchanged.

**Historical blocker (superseded 2026-08-08):** Automation **066** v3.3 previously failed live with `createRecordsAsync` missing `fields`. Automation 066 v3.5 now has a controlled PROD replay/idempotency PASS; do not carry the old v3.3/v3.4 paste-required state forward as current truth.

Evidence: [`docs/testing/evidence/2026-08-05-agent2-foundation/`](./testing/evidence/2026-08-05-agent2-foundation/) · Handoff: [`docs/overnight/2026-08-05-OVERNIGHT-MASTER-HANDOFF.md`](./overnight/2026-08-05-OVERNIGHT-MASTER-HANDOFF.md).

### Dashboard reconciliation (2026-08-05 — Overnight Agent 1 homework MVP)

| Item | Status | Evidence |
|------|--------|----------|
| Program Homework Assignments | **Live in PROD** — **92** active rows; Operator Status / Notes / Completions Count; descriptions | `tblhA3maf7xOa8EUS` |
| Automation **033** | **Installed in PROD** **v3.3** (Mike operator-attested paste 2026-08-06) — do not re-paste; optional live WAS assign verify | PHA match previously PASS WAS `recKebuZ79QFTwivA` |
| Automation **020** | **Built in Repository** **v3.2.0** — paste **not** confirmed | Offline SC-016 identity PASS |
| SC-016 | Installed → **Live Tested in PROD** | 3 dupe groups cleaned; 0 remaining; not Complete until 020 paste + re-submit |
| CASE-01 homework | **2/2** assigned/satisfactory; Eligible **1** | PHA HW2 aligned to `rec6WmXjpLtIWDERo` |

**Net math vs Agent 3 closeout (intermediate, before Agent 2):** LT 24→**25**; Installed 47→**46**. Final dashboard after Agent 2: LT **34** / Installed **40** / Built **22** / Planned **16**.

Evidence: [`docs/testing/evidence/2026-08-05-agent1-homework/`](./testing/evidence/2026-08-05-agent1-homework/) · [`program-homework-assignments-operator-guide.md`](./deploy-checklists/program-homework-assignments-operator-guide.md).

### Dashboard reconciliation (2026-08-05 — Overnight Agent 4 ops / launch readiness)

| SC | Old status | New status | Evidence |
|----|------------|------------|----------|
| SC-088 | Built in Repository | **Built in Repository** (offline Live-ready) | 117 email handoff offline **7/7 PASS**; [`117-ZOOM-APPROVAL-GO-LIVE.md`](./deploy-checklists/117-ZOOM-APPROVAL-GO-LIVE.md); live Gmail **not** executed |
| SC-045 | Installed in PROD | **Installed in PROD** (notes) | 071 Complete; **WELCOME send path** live-proven controlled-test via **079→Communications Hub→Resend** (§9M); participant activation + approved Hub template pending; 073/117f fixtures missing |
| SC-041 | Built in Repository | **Built in Repository** (executable packet) | [`SC-041-WEEKLY-EMAIL-RETRY-EXECUTABLE.md`](./deploy-checklists/SC-041-WEEKLY-EMAIL-RETRY-EXECUTABLE.md); probe found no armed retry candidates |
| SC-058 | Built in Repository | **Historical drift-auditor snapshot** | Operator-table audit 48 rows; the 117/118/119 absence is superseded by the 2026-08-08 direct editor/schedule proof; 112 still requires UI attestation |
| SC-147 | Built in Repository | **Built in Repository** (PROD export+CLI) | Sanitized export + RCC CLI exit 0; views not installed — [`RCC-OMNI-VIEW-INSTALL.md`](./deploy-checklists/RCC-OMNI-VIEW-INSTALL.md) |
| SC-032 / SC-065 | Built in Repository | **Built in Repository** (startup checklist) | [`NEXT-SEASON-RESET-STARTUP.md`](./deploy-checklists/NEXT-SEASON-RESET-STARTUP.md) |
| SC-139 | Built in Repository | **Built in Repository** (partial) | automation-index 117/117c wording corrected |

**Net math:** no bucket moves. Packages reduce Mike setup friction; live 073/117f still need Mike-authorized fixtures. **WELCOME send** is Communications Hub (079), not Make — see §9M.

**Do not claim:** live Gmail sends, Make webhook posts, RCC views installed, SC-088 Complete.

Evidence: [`docs/testing/evidence/2026-08-05-agent4-ops/`](./testing/evidence/2026-08-05-agent4-ops/).

### Dashboard reconciliation (2026-08-05 — Agent 3 Perfect Week 058→059 chain)

| SC | Old status | New status | Evidence |
|----|------------|------------|----------|
| SC-028 | Installed in PROD | **Live Tested in PROD** | CASE-01: Eligible→Unlock `recALZFQNL3XicEOX`→XP `recMdcI5lN8gJ6830` (100); multi-case fixtures still open |
| SC-077 | Installed in PROD | **Live Tested in PROD** | Same XP path; Source Key exact; idempotent re-award; **059 UI trigger still blocks auto-fire** |
| SC-021 | Installed in PROD | **Installed in PROD** | Unchanged — broader config audit; PW slice advanced under SC-028/077 |
| SC-091 | Installed in PROD | **Installed in PROD** | Zoom+PW fixtures CASE-10…13 not run this package |
| SC-026 / SC-107 | Installed | **Installed** (Visible? fixed) | Perfect Week + Shot Milestone `Visible?`=true in PROD |

**Net math vs post–HC WAS Link closeout:** Installed 49→**47**; LT 22→**24**. Complete unchanged. **Do not mark Perfect Week Complete** until 059 trigger covers Perfect Week auto-fire + remaining fixture cases.

**Next package:** Mike UI — remove Shot Milestone filter on 059 ([`059-perfect-week-trigger-coverage.md`](./deploy-checklists/059-perfect-week-trigger-coverage.md)); then Batch A/B fixtures + level-gate soak (Schmidt Gate Blocked: Sub 9/10, Vid 5/6).

Evidence: [`docs/testing/evidence/2026-08-05-agent3-perfect-week/`](./testing/evidence/2026-08-05-agent3-perfect-week/).

### Dashboard reconciliation (2026-08-05 — HC WAS Link clarification + CASE-01 + 057 PASS) — **PACKAGE COMPLETE**

| Item | Status | Evidence |
|------|--------|----------|
| HC `Weekly Athlete Summary` (`fldhpGNYnu2l3bpUP`) | **singleLineText** — empty on CASE-01; **unused/legacy** | Do not delete/rename this package |
| HC `Weekly Athlete Summary Link` (`fldkoEbVnCugcMCCi`) | **multipleRecordLinks** — both HCs → `recKebuZ79QFTwivA` | Canonical; Automation **020** writer |
| CASE-01 | fully **PASS** | Eligible **1**; helpers populated by 057 |
| Automation 057 | **PASS** (manual script Test) — no code change | Attempt 1 trigger-only (no-op); Attempt 2 `recordId=recKebuZ79QFTwivA` success |
| Package | **COMPLETE / closed** | [`057-MANUAL-TEST.md`](./testing/evidence/2026-08-05-pha-was-link-clarification/057-MANUAL-TEST.md); [`CASE01-057-PASS.json`](./testing/evidence/2026-08-05-pha-was-link-clarification/CASE01-057-PASS.json) |

**Note:** This closes the HC WAS Link clarification + CASE-01 eligibility proof package. Broader Perfect Week SC items (unlock 058 / XP 059 / multi-case fixtures) remain open per SC-021/028/077 — do not mark those Complete from CASE-01 alone.

Evidence: [`docs/testing/evidence/2026-08-05-pha-was-link-clarification/`](./testing/evidence/2026-08-05-pha-was-link-clarification/).

### Dashboard reconciliation (2026-08-05 — Program Homework Assignments MVP)

| Item | Status | Evidence |
|------|--------|----------|
| Junction table `Program Homework Assignments` | **Live in PROD** `tblhA3maf7xOa8EUS` | Additive scheduling; library Week links untouched |
| Automation 033 / 020 | **033 v3.3 Installed in PROD** (Mike paste attested); **020 v3.2.0 Built** — paste still required | Prefer PHA; legacy fallback retained; SC-016 identity in 020 |
| Perfect Week WAS `recKebuZ79QFTwivA` homework | Assigned **2** / Satisfactory **2** | PHA + HC via **Link** field; **92** PHA rows seeded season-wide |
| Perfect Week 057 on CASE-01 | **PASS** (manual Test) | See HC WAS Link closeout above |

Runbook: [`docs/deploy-checklists/program-homework-assignments-mvp.md`](./deploy-checklists/program-homework-assignments-mvp.md) · Operator guide: [`program-homework-assignments-operator-guide.md`](./deploy-checklists/program-homework-assignments-operator-guide.md).

### Dashboard reconciliation (2026-08-05 — Automation 057 v1.5 install + Perfect Week fixtures)

| SC | Old status | New status | Evidence |
|----|------------|------------|----------|
| SC-021 | Ready for PROD Paste | **Installed in PROD** | PROD 057 **v1.5** enabled/running (Mike 2026-08-05); repo script **v1.5** matches; do **not** paste/downgrade to v1.4; Perfect Week cross-boundary verification still open |
| SC-028 | Installed in PROD | **Installed in PROD** (notes corrected) | Same — not Live Tested / Complete |
| SC-077 | Installed in PROD | **Installed in PROD** (notes corrected) | Same — XP path not fixture-proven |
| SC-091 | Installed in PROD | **Installed in PROD** (notes corrected) | Same — Zoom+PW fixtures pending |

**Net math vs post–071/SC-003 closeout:** Ready for PROD Paste 1→**0**; Installed 48→**49** (SC-021). Complete/LT unchanged. **Do not mark Perfect Week Complete.**

**Next package:** Omni Perfect Week fixtures + verifier — [`docs/testing/perfect-week/PERFECT-WEEK-OMNI-PROMPT.md`](./testing/perfect-week/PERFECT-WEEK-OMNI-PROMPT.md) · [`docs/deploy-checklists/057-perfect-week-v1.5-live-verification.md`](./deploy-checklists/057-perfect-week-v1.5-live-verification.md).

### Dashboard reconciliation (2026-08-05 — Automation 071 live closeout and SC-003 completion)

| SC | Old status | New status | Evidence |
|----|------------|------------|----------|
| SC-017 | Installed in PROD | **Complete** | 071 **v3.5** pasted PROD; operator attestation on HC `recH71jEgjxzLup6F` / asset `recaGfnTzKFnCDazA`: Reviewer File URL → Make → Gmail → Sent?/Sent On by Make; no duplicate on rerun | `docs/deploy-checklists/071-homework-feedback-email-closeout.md`; PR #77 merge `5e17b85` |
| SC-003 | Live Tested in PROD | **Complete** | Views installed under `02 TESTING` (short-name aliases); `--require-installed` PASS 10/10; 0 sanity fails; Schmidt rows visible; `Grid Testing View` not accepted for WAS | `TESTING-VIEWS-SPEC.json`; `TESTING-VIEWS-VERIFY.json`; evidence README closeout 2026-08-05 |
| SC-045 | Installed in PROD | **Installed in PROD** | Homework parent email (071) live-proven; welcome / video / Zoom recording approval (117f) still need individual re-proof | Same 071 closeout |

**Net math vs post–SC-009/SC-101 closeout:** Complete 15→**17**; LT 23→**22** (SC-003 −1); Installed 49→**48** (SC-017 −1); Built stays **24**.

**Historical next-package note (superseded):** earlier closeout said paste **057 v1.4** — PROD is now **v1.5**; use live-verification runbook instead.

### Dashboard reconciliation (2026-08-05 — Automation 071 Reviewer File URL)

| SC | Old status | New status | Source of change | Evidence |
|----|------------|------------|------------------|----------|
| SC-017 | Installed in PROD | **Installed in PROD** (repo advanced; later closed) | Automation **071 v3.5** uses `Reviewer File URL` → Drive View → Drive File | `071-…js` v3.5; offline tests; superseded by live closeout above |
| SC-045 | Installed in PROD | **Installed in PROD** | Homework parent email contract unblocked for AWS/Lambda assets | Same |

**Historical note:** At merge of PR #77 the package was pending PROD paste. Operator attestation 2026-08-05 closed the live gate (see reconciliation above).

**Parent email asset URL priority:** `Reviewer File URL` → `Google Drive View URL` → `Google Drive File URL`. Filenames are labels only. Make owns Sent? after Gmail success.

### Dashboard reconciliation (2026-08-05 — SC-009 / SC-101 final PROD closeout)

| SC | Old status | New status | Source of change | Evidence |
|----|------------|------------|------------------|----------|
| SC-009 | Live Tested in PROD | **Complete** | 070a v4.5 pasted; Mike operator-attested Schmidt image rerun: Make→Lambda→Airtable writeback; reviewer OK; canonical private; one HC/XP; no second writer | `docs/testing/evidence/2026-08-04-sc-009-photo-homework/` (+ dated closeout section); `docs/deploy-checklists/SC-009-photo-homework-prod.md` |
| SC-101 | Installed in PROD | **Complete** | Video route: C-013 PROD E2E; homework route: SC-009 evidence + Mike post-paste Make/Lambda writeback attestation | SC-009 evidence; C-013 closeout; Issue #70 closed |
| SC-095 | Built in Repository | **Live Tested in PROD** | Homework S3 / 070a route proven in PROD (aligned with SC-009 Complete) | Same SC-009 evidence |

**Net math vs post–SC-003 aliases:** Complete 13→**15**; LT 23 stays **23** (SC-009 −1, SC-095 +1); Installed 50→**49**; Built 25→**24**. Credential rotation intentionally deferred until go-live (Mike decision 2026-08-05) — not a blocker.

### Dashboard reconciliation (2026-08-05 — SC-003 Testing Views short-name aliases)

| SC | Old status | New status | Source of change | Evidence |
|----|------------|------------|------------------|----------|
| SC-003 | Built in Repository | **Live Tested in PROD** | Meta API listed short names under section `02 TESTING`; aliases added; `--require-installed` PASS (10/10 required, 0 sanity fails) | `docs/testing/views/TESTING-VIEWS-SPEC.json`; `TESTING-VIEWS-VERIFY.json` |

**Net math:** Built 26→**25**; LT 22→**23**. Live matches include `Schmidt Testing` (not `Schmidt Scenarios`), `Schmidt Submissions`, `Schmidt WAS`, etc. `Grid Testing View` remains unacceptable for WAS.

### Dashboard reconciliation (2026-08-04 — SC-003–SC-006 testing control center)

| SC | Old status | New status | Source of change | Evidence |
|----|------------|------------|------------------|----------|
| SC-003 | Planned | **Built in Repository** | Views install package + Meta API verifier; canonical views **not** present in PROD | `docs/testing/views/`; `TESTING-VIEWS-VERIFY.json` (9/10 required missing) |
| SC-004 | Live Tested in PROD | **Live Tested in PROD** | Fresh identity verifier PASS (17/17); Active athlete+enrollment; WAS `recuxvGq2kY8WKcey` | `SCHMIDT-IDENTITY-VERIFY.json` |
| SC-005 | Planned | **Live Tested in PROD** | Executable matrix ran on PROD: 11 PASS / 4 BLOCKED / 2 NOT_TESTED / 0 FAIL | `E2E-MATRIX-RESULTS.json`; `run_e2e_matrix.mjs` |
| SC-006 | Built in Repository | **Live Tested in PROD** | Expanded read-only verifier + live runs; writeback remains off | `tools/testing/lib/expected_actual.js`; offline 11/11 |

**Net math vs post–SC-007/008/009:** Planned 19→**17**; LT 20→**22**; Built stays **26** (SC-003 +1, SC-006 −1). SC-003 must not advance to Installed until Omni/Mike creates views and `--require-installed` passes.

### Dashboard reconciliation (2026-08-04 — SC-007 / SC-008 reliability proof)

| SC | Old status | New status | Source of change | Evidence |
|----|------------|------------|------------------|----------|
| SC-007 | Live Tested in PROD | **Live Tested in PROD** (expanded) | Offline idempotency pack + Schmidt XP inventory (14 keys, 0 dups) covering submission/HW/video/Zoom credit/streak/threshold | `docs/testing/evidence/2026-08-04-sc-007-008-reliability/` |
| SC-008 | Planned | **Live Tested in PROD** | Failure-path offline pack + PROD upload success contract on `recaXBfjeeu3bcm0t`; anonymous S3 403; reviewer URL 302 | Same folder; `SC-007-008-RELIABILITY-RUNBOOK.md` |

**Net math vs post–SC-009:** Planned 20→**19**; LT 19→**20**. Residual: optional Mike-authorized live 074 webhook inject (SCN-029); 010 UI re-trigger attest; milestone/Perfect Week / Zoom attend live fixtures when available.

### Dashboard reconciliation (2026-08-04 — SC-009 photo homework E2E)

| SC | Old status | New status | Source of change | Evidence |
|----|------------|------------|------------------|----------|
| SC-009 | Installed in PROD | **Live Tested in PROD** | Schmidt PNG+JPG → 009/020 → Lambda `homework_completion` → S3 writeback → reviewer URL → coach → one XP; formula gates fixed | `docs/testing/evidence/2026-08-04-sc-009-photo-homework/`; asset `rec9qz0QHSUzgWA1y`; XP `recuG91F7fKXKtV74` |

**Net math:** LT 18→**19**; Installed 51→**50**. Not Complete: Make `Accepted` without writeback remains SC-101 follow-up; paste 070a v4.5 to Airtable still required. Canonical S3 stays private.

### Dashboard reconciliation (2026-08-04 — SC-150 private reviewer file links Complete)

| SC | Old status | New status | Source of change | Evidence |
|----|------------|------------|------------------|----------|
| SC-150 | Built in Repository | **Complete** | PROD Lambda `-CodeOnly` deploy `2026-08-04T23:57:36Z` + Airtable Interface open of Reviewer File URL on `recaXBfjeeu3bcm0t` | `docs/deploy-checklists/SC-150-prod-reviewer-file-links.md`; Lambda `127si-upload-asset` `us-east-2`; 78 unit tests OK |

**Net math:** Built 27→**26**; Complete 12→**13**. Private S3 unchanged; coaches open files via tokenized Function URL viewer. **Separate P0 follow-up:** rotate credentials exposed during terminal troubleshooting (not part of this commit).

### Dashboard reconciliation (2026-08-04 — Automation 067 v2.0 Option B PROD proof)

| SC | Old status | New status | Source of change | Evidence |
|----|------------|------------|------------------|----------|
| SC-013 | Built in Repository | Live Tested in PROD | 067 v2.0 pasted; Schmidt quiz→HC→coach→064/065 XP | `docs/testing/evidence/2026-08-04-package-02-critical-pastes/`; HC `recrBnHbLvDpFyIeO`; XP `rec6xE4V1t0atiTIP` |
| SC-014 | Built in Repository | Live Tested in PROD | Option B attachment-less proven (0 assets; multi-attempt reuse) | Same folder; quizzes `recxtTv0AD7G3XpGv`, `recFsN2KruSnerfns` |

**Net math:** LT 16→**18** (SC-013 + SC-014). Built bucket recount after move: prior claimed Built 29 included status orphans; Section 4 recount now **Built 26** + **Ready for PROD Paste 1 (SC-021)** + **Planned 20**. Highest status supported by evidence is Live Tested (not Complete — Package 2 still needs 057 v1.4 paste).

### Dashboard reconciliation (2026-08-04 — SC-111 production publish)

| SC | Old status | New status | Source of change | Evidence |
|----|------------|------------|------------------|----------|
| SC-111 | Built in Repository | Live Tested in PROD | PR #58 merge + Vercel production READY + live Playwright/HTML checks | `docs/testing/evidence/athlete-profiles-2026-08-04/`; merge `ce7723a`; deploy `dpl_wakFzRMAX2HJAyzX8eBoPxquVXEj` |

**Net math:** LT 15→**16**; Built 30→**29**. Installed briefly then immediately Live Tested after production verification the same day.

### Dashboard reconciliation (2026-08-04 — PR #52/#53/#54 integration)

| SC | Old status | New status | Source of change | Evidence |
|----|------------|------------|------------------|----------|
| SC-149 | *(new)* | Built in Repository | Landing domain transition to Fairfield Basketball Club | `web/lib/app-config.ts`; Vitest + Playwright; env examples |
| SC-148 | *(new)* | Built in Repository | Mobile usability + accessibility for public `/shoot` | `web/components/layout/product-nav.tsx`; `web/tests/mobile-a11y.spec.ts` |
| SC-118 | Built in Repository | Built in Repository — smoke suite successfully executed against current PROD | Production smoke package (read-only Playwright + HTTP) | `docs/testing/PRODUCTION-SMOKE-RUNBOOK.md`; `docs/testing/evidence/PRODUCTION-SMOKE-2026-08-04.md` |

**Net math vs 2026-08-03:** Total 147→**149**; Built 28→**30**. SC-118 stays Built (smoke executed against PROD is evidence, not Installed/Live Tested for web deploy of this branch). SC-148/SC-149 not Installed until Vercel deploy + Mike production check.

### Dashboard reconciliation (2026-08-03 — Automation 035 v1.2)

| SC | Old status | New status | Source of change | Evidence |
|----|------------|------------|------------------|----------|
| SC-049 | Pre-v1.2 paste-ready | Live Tested in PROD | 035 v1.2 percent-ratio fix pasted + Schmidt award + idempotency | WAS `rechWp330MqSgRWzN`; first run 3 created; rerun 0 created / 3 skipped; automation **OFF** pending PR #50 merged-source reconciliation |

**Net math vs 2026-07-25 dashboard:** LT 14→**15**. SC-049 left the informal Ready-for-Paste posture (not a dashboard bucket) into Live Tested. Automation remains OFF — do not treat as season-enabled Complete.

### Dashboard reconciliation (2026-07-25 — PROD Completion Agent + Browser QA)

| SC | Old status | New status | Source of change | Evidence |
|----|------------|------------|------------------|----------|
| SC-102 | Installed in PROD | Live Tested in PROD | Public smoke + browser QA | `PUBLIC-SHOOT-SMOKE.md`; `BROWSER-QA-REPORT-2026-07-25.md` |
| SC-103 | Installed in PROD | Live Tested in PROD | Browser QA 2026-07-25 | Leaderboard shows Testing Schmidt |
| SC-106 | Installed in PROD | Live Tested in PROD | Browser QA 2026-07-25 | 12 active levels |
| SC-108 | Installed in PROD | Live Tested in PROD | Browser QA 2026-07-25 | Zoom catalog/detail |
| SC-113 | Installed in PROD | Live Tested in PROD | Browser QA 2026-07-25 | Demo/empty/error states |
| SC-109 | Built in Repository | Installed in PROD | Browser QA 2026-07-25 | XP/Levels live; PDF env still missing |
| SC-139 | Planned | Built in Repository | Stale-doc refresh pack started | `docs/prod-completion/2026-07-25/` |
| SC-013 / SC-014 | Built in Repository | Live Tested in PROD | 067 v2.0 Option B Schmidt PROD proof (2026-08-04) | `docs/testing/evidence/2026-08-04-package-02-critical-pastes/` |
| SC-028 / SC-077 | Installed in PROD | Installed in PROD | 057 v1.4 Ready for PROD Paste (code in PR #43) | paste runbook + deploy checklist |

**Blocker:** no `AIRTABLE_API_TOKEN` in cloud agent for Schmidt mutations (`ACCESS-BLOCKER.md`). 035 owned by PR #43.

**Net math vs post–SC-002:** LT 9→**14**; Installed 55→**51**; Built 28→**28** (SC-139 +1, SC-109 −1); Planned 22→**21**.

### Dashboard reconciliation (2026-07-24)

Baseline before go-live (`a8f3b00`): Total **146** · Complete **10** · Live Tested **10** · Installed **54** · Built **28**.

| SC | Old status | New status | Source of change | Evidence | PR #41 alone? |
|----|------------|------------|------------------|----------|---------------|
| SC-031 | Historical: Built in Repository | **Historical live-tested claim; current status is Installed in PROD** | Go-live (`7c7a79a`) | 118/119 schedules ON + prior Live writeback | Superseded by 2026-08-08 no-target/positive-path distinction |
| SC-038 | Historical: Live Tested in PROD | **Historical Complete claim; current positive 118 build arm remains unproven** | Go-live (`7c7a79a`) | Prior 118/072 package evidence | Superseded by 2026-08-08 reconciliation |
| SC-039 | Historical: Live Tested in PROD | **Historical Complete claim; current positive 119 send arm remains unproven** | Go-live (`7c7a79a`) | Prior 119/074 writeback evidence | Superseded by 2026-08-08 reconciliation |
| SC-147 | *(new)* | Built in Repository | PR #40 (merged) | RCC framework + MVP install packet | No |
| SC-032 | Planned | Built in Repository | PR #41 Season Launch | Launch lifecycle + CLI + packages; not live-installed | **Yes** |
| SC-114 | Decision Needed | Superseded | PR #41 Softr Obsolete | `/shoot` active; Softr not a launch dependency | **Yes** |
| SC-065 | Built in Repository | Built in Repository | PR #41 evidence refresh | `generate-week-package` | Evidence only |
| SC-067 | Deferred | Deferred | PR #41 notes | Season Launch interim until Program Instance | Notes only |
| SC-002 | Built in Repository | Installed in PROD | PROD scenario catalog install + fresh readback | `docs/testing/scenarios/PROD-INSTALL-EVIDENCE-2026-07-25.md`; `docs/testing/scenarios/SC-002-COMPLETION-MASTER-RECONCILIATION-2026-07-25.md` | No |

**Net math:** After PR #40 on master: Total **147**, Built **28**, Planned **23**, Decision Needed **6**, Superseded **3**. PR #41 then: SC-032 Planned→Built (Built **29**, Planned **22**); SC-114 Decision→Superseded (Decision Needed **5**, Superseded **4**). SC-147 is the only item added by PR #40. No silent Complete↔Live Tested swaps. **2026-07-25:** SC-002 Built→Installed (Installed **55**, Built **28**) for SCN-001–020 PROD catalog; PR #43 repo fixtures SCN-021–026 remain Built pending PROD install (do not count as Live Tested).

**Reading tip:** “Installed but not tested” remains large — many pipelines still need Schmidt re-proof after the empty-base reset. **Weekly email (2026-07-24):** `118→072 v4.0→119→074→Make Bulk Email May 18` E2E PASS with empty-week **`send_short`**; **074 PROD sendMode=Live** (never fixed Test) + Make Live writeback PASS (`Weekly Email Sent?`, `Make Send Status=Sent`, `Weekly Summary Sent At`); **118/119 schedules ON** (Sun 5:00 / 10:00 AM Denver). Repo **118 v1.5** is the Live-season functional fix; **119 v1.5** is docs/CONFIG alignment only. Do not disable schedules based on older OFF guidance. **Launch certification (2026-07-25):** PR #42 merged; READY WITH NON-BLOCKING FOLLOW-UPS; public `/shoot` re-smoked PASS (SC-102 Live Tested). **SC-147** Built in Repository. **SC-032** Built (not live-installed). Softr Obsolete / Not Used. Architecture: `docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`. Config rows year-specific (do not collapse). Current 067/115 proof is recorded in §2A; it does not make the broader season matrix live-tested. 020 PROD = v3.0.0. **054 v5.6** + **066 v3.3** Installed. **Cloud agent Airtable API token missing** — Schmidt mutation packages blocked until env PAT added (`docs/prod-completion/2026-07-25/ACCESS-BLOCKER.md`).

---

## 4. Master Completion Table

Columns:

- **Mike’s Goal** — what success looks like in plain language
- **What Already Exists** — evidence in repo / prior PROD work
- **What Is Still Needed** — remaining work
- **Evidence** — old IDs and key doc/script paths for traceability

| ID | Area | Mike’s Goal | Current Status | What Already Exists | What Is Still Needed | Dependencies | PROD Safety/Dependency Notes | Evidence | Mike Decision | Priority | Last Updated |
|----|------|-------------|----------------|---------------------|----------------------|--------------|------------------------------|----------|---------------|----------|--------------|
| SC-001 | Testing | Universal Testing Scenarios framework so Mike can run Fillout-shaped tests without Fillout | Live Tested in PROD | **115 v2.1** controlled PROD Homework proof passed 2026-08-10: scenario `recXjRRg8n0NodziZ` created `rec7e5X7QaVDZLpiL` and `recbbO685zSEuyzM9` from two explicit requests; offline contract suite covers allowlist, PHA identity, attachments, trigger guard, and no XP/Week/WAS writes | Broader season matrix, Homework XP after review, Make/S3, and email remain separate release work | SC-004, SC-059 | 115 creates one new Submission per explicit request; do not label explicit reruns idempotent; downstream 020/XP identity contracts remain responsible for dedupe | `tools/testing/tests/test_115_offline.mjs`; `docs/deploy-checklists/C-020-testing-scenarios-script-checklist.md`; current controlled proof reported 2026-08-10 | **Resolved:** allowed in PROD | P0 | 2026-08-10 |
| SC-002 | Testing | Test scenario library / templates for repeatable suites | Installed in PROD | PROD has SCN-001–020 installed and revalidated 2026-07-25 (`Run Test?` off; Schmidt-linked); repo also has **SCN-021–026** (PR #43) + **SCN-027/028** quiz Option B (PR #44) + **SCN-029** weekly-email retry (PR #46) + **SCN-030–043** Agent 1 hardening fixtures Built pending PROD install | Install/execute SCN-021–043 on Schmidt; expand matrix; optional Airtable fields/UI only if approved | SC-001 | Library is config, not a second XP path; do not mark Live Tested from install alone | `docs/testing/scenarios/`; `PROD-INSTALL-EVIDENCE-2026-07-25.md`; `SC-002-COMPLETION-MASTER-RECONCILIATION-2026-07-25.md` | Confirm Airtable library table still wanted | P1 | 2026-07-27 |
| SC-003 | Testing | Testing views on key pipeline tables | Complete | PROD views under section `02 TESTING` with short names; verifier aliases match Meta API; `--require-installed` PASS 2026-08-05 (10/10 required; 0 sanity fails; known Schmidt IDs visible); `Grid Testing View` not accepted for WAS | None required — optional rename to canonical `Testing - …` names is cosmetic only | SC-004 | API cannot create views; **do not hide Schmidt**; do not accept `Grid Testing View` for WAS | `docs/testing/views/TESTING-VIEWS-SPEC.json`; `docs/testing/evidence/2026-08-04-sc-003-006-testing-control-center/` (+ 2026-08-05 Complete closeout) | — | P0 | 2026-08-05 |
| SC-004 | Testing | Permanent Schmidt testing enrollment for live PROD tests | Live Tested in PROD | Athlete `recgqVstObQRzgXJF` + Enrollment `recgP9qZYjAhE7NXm` re-verified Active; Week `recVDKiYATgzsfpmE`; WAS `recuxvGq2kY8WKcey`; Submission→XP→HW→VF→Zoom links PASS (identity verifier 17/17) | Keep emails Schmidt-only; **Schmidt remains visible on public standings**; optional refresh when foundation WAS IDs change | — | No separate exclusion field; web must not invent name filters | `SCHMIDT-IDENTITY-VERIFY.json`; `PROD-LIVE-SNAPSHOT.json`; foundation reset evidence | **Resolved:** Active?=true; standings visibility = keep Schmidt for now | P0 | 2026-08-04 |
| SC-005 | Testing | Full end-to-end live PROD matrix (all major paths) | Live Tested in PROD | Executable runner `run_e2e_matrix.mjs`; 2026-08-04 PROD run 11 PASS / 4 BLOCKED / 2 NOT_TESTED / 0 FAIL covering identity, daily XP, homework, video presence, Zoom presence, WAS, idempotency refs | Unblock B3 policy / B5 backdate week; streak+milestone when unlocks exist; email/failure inject → SC-008 | SC-001–SC-004, core pipelines | Controlled data only; no mass email | `E2E-MATRIX-RESULTS.json`; `docs/V2_END_TO_END_TEST_MATRIX.md` | B3 Count-It day policy still open | P0 | 2026-08-04 |
| SC-006 | Testing | Automatic Expected-versus-Actual results on scenarios | Live Tested in PROD | Expanded read-only verifier (daily + Schmidt identity + homework + video + zoom + writeback policy); offline 11/11; live matrix/identity PASS | Keep read-only unless Mike designates one Pass/Fail writer; optional wire CLI report into scenario UI manually | SC-001, SC-002 | Read-only scoring preferred — no competing production writer | `tools/testing/lib/expected_actual.js`; `airtableWritebackPolicy()`; evidence folder | **Decision:** writeback stays off for now | P2 | 2026-08-04 |
| SC-007 | Testing | Duplicate and rerun testing (idempotency proof) | Live Tested in PROD | Offline SC-007 pack + matrix; Schmidt inventory **14 XP / 0 blank / 0 dup Source Keys** (submission, HW `HOMEWORK_XP\|recrBnHbLvDpFyIeO`, video, `ZOOM_CREDIT`, streak×3, threshold×3); WAS uniqueness PASS | Optional: 010 UI re-trigger attest; milestone/PW/Zoom-attend live fixtures when present | SC-066, SC-096+ | Never create double XP; do not invent new keys | `docs/testing/evidence/2026-08-04-sc-007-008-reliability/`; `tools/testing/sc-007-008/` | Decide 115 Count It vs 007a policy | P0 | 2026-08-04 |
| SC-008 | Testing | Email, Make, upload, and failure-path testing | Live Tested in PROD | Failure-path pack (webhook null/502/malformed, blank recipient rearm, Lambda reject, incomplete writeback, retry idempotent); Lambda auth/viewer/token units; PROD asset `recaXBfjeeu3bcm0t` success contract PASS; Canonical anonymous **403**; Reviewer URL **302** | Optional Mike-authorized live 074 invalid-webhook inject (SCN-029) — offline+SOP already cover keep-Send-to-Make? | SC-131+, SC-051+, SC-150 | Schmidt-only emails; no global service disable | `docs/testing/SC-007-008-RELIABILITY-RUNBOOK.md`; evidence folder above | — | P1 | 2026-08-04 |
| SC-009 | Homework | Photo / image homework submissions work end-to-end | Complete | Schmidt PNG+JPG E2E 2026-08-04 + **070a v4.5 pasted PROD** + Mike operator-attested post-paste image rerun 2026-08-05 (Make→Lambda→Airtable writeback; reviewer OK; canonical private; one HC/XP; no second writer) | None for photo E2E; optional cleanup of controlled Schmidt rows | SC-019, SC-095, SC-101, SC-150 | One HC per assignment; Canonical stays private | `docs/testing/evidence/2026-08-04-sc-009-photo-homework/`; `docs/deploy-checklists/SC-009-photo-homework-prod.md` | — | P0 | 2026-08-05 |
| SC-010 | Homework | PDF / document homework submissions work end-to-end | Installed in PROD | Same file pipeline as photos | Re-test PDF path; quiz uses Option B (no PDF asset — SC-014) | SC-019 | Fillout mapping fragile | C-009 preferred path | — | P0 | 2026-07-24 |
| SC-011 | Homework | Video submissions as homework/learning assets | Installed in PROD | Video path via 013/070b/070c/114 historically live | Re-test video as homework vs daily video rules; confirm purpose routing | SC-133 | Do not double-credit video XP | LA routing `video`; C-013 | — | P0 | 2026-07-23 |
| SC-012 | Homework | Written / reflection responses work | Installed in PROD | Fillout questions + HC path historically used | Re-test written-only HC; coach review + 071 | SC-019 | No attachment required for written | LA `reflection` / `fillout_questions` | — | P1 | 2026-07-23 |
| SC-013 | Homework | Online quizzes create a reviewable completion | Live Tested in PROD | **067 v2.0** pasted; Schmidt quizzes `recxtTv0AD7G3XpGv` + `recFsN2KruSnerfns` → HC `recrBnHbLvDpFyIeO` (HW1, Fillout, 0 assets); coach review → XP `rec6xE4V1t0atiTIP` (35 pts, `HOMEWORK_XP\|recrBnHbLvDpFyIeO`); multi-attempt reuse of same HC; 067 created no XP | Optional: expand to non-Schmidt enrollment; keep 071 path smoke if needed | SC-014 | 067 must not award XP itself; no fake attachments; preserve quiz attempts | `docs/testing/evidence/2026-08-04-package-02-critical-pastes/`; `067-OPTION-B-PROD-INSTALL.md` | — | P0 | 2026-08-04 |
| SC-014 | Homework | Final Reflection quiz completion path (PDF vs attachment-less) | Live Tested in PROD | **Option B proven in PROD** — attachment-less; 0 Submission Assets; Enrollment+Week+Homework HC identity; attempts preserved separately | No further path decision; do not reopen Option A / Quiz Result PDF | SC-013 | Do not invent a second quiz XP path; do not mint placeholder assets | `067-HOMEWORK-XP-CONTINUATION.md`; `QUIZ-PATH-DECISION.md` | **DECIDED Option B** | P0 | 2026-08-04 |
| SC-015 | Homework | Multiple files per homework response | Installed in PROD | Submission Assets fan-out pattern; C-020 multi-file DEV tests | Re-test N files → N assets → one HC | SC-019 | One HC, many assets | LA-001; C-020b | — | P1 | 2026-07-23 |
| SC-016 | Homework | Exactly one Homework Completion per assignment per enrollment | Live Tested in PROD | **020 v3.2.0** repo: prefer Enrollment+Week+Homework+Slot (re-submits merge onto one HC); PROD duplicate audit found 3 groups / consolidated keepers + deleted 4 extras + orphan XP; post-cleanup **0** dupes on Enr/Week/HW/Slot and Submission lenses; offline identity test PASS | Paste **020 v3.2.0**; live Schmidt re-submit proof that second Submission attaches to same HC (no new row / no second XP) | SC-066, SC-014 | Competing writers create extras; quiz **067** remains Enr+Week+HW | `docs/testing/evidence/2026-08-05-agent1-homework/`; `tests/homework/automation-020-sc016-identity.test.js` | — | P0 | 2026-08-05 |
| SC-017 | Homework | Unified coach review → satisfactory → XP → parent email | Complete | **071 v3.5** PROD paste 2026-08-05 + operator-attested live path on HC `recH71jEgjxzLup6F` / asset `recaGfnTzKFnCDazA`: Reviewer File URL → Make → Gmail → Parent Feedback Sent?/Sent On by Make; no duplicate on rerun (gates already included Satisfactory + Awarded + XP) | None for unified review→XP→parent email; optional expand non-Schmidt | SC-009–SC-016 | Do not invent second credit path; do not require Google Drive when Reviewer File URL present | `docs/deploy-checklists/071-homework-feedback-email-closeout.md`; homework-flow.md; PR #77 | — | P0 | 2026-08-05 |
| SC-018 | Homework | Learning Activities table (catalog of activities) | Built in Repository | Agent 11: LA schema MD + JSON schema + fixtures/tests; LA-000 types remain | Mike-authorized Airtable schema; seed catalog; keep FBC Curriculum SYNC unless decided otherwise | SC-020 | No parallel XP model | `docs/next-wave/homework-pipeline/LEARNING-ACTIVITIES-SCHEMA.md` | Approve schema creation in PROD | P1 | 2026-07-24 |
| SC-019 | Homework | Learning Activity Responses table + Response→asset routing | Built in Repository | Agent 11 routing contract + helpers/tests (`countsAsHomework` gate; XP via 064/065 only) | Schema; automations; Fillout/web intake; route to Submission Assets / optional HC | SC-018 | `countsAsHomework` gate | `docs/next-wave/homework-pipeline/LEARNING-ACTIVITY-ROUTING-CONTRACT.md` | — | P1 | 2026-07-24 |
| SC-020 | Homework | Activities that count as homework vs stand-alone | Planned | Contract: HC only if Homework link **and** `countsAsHomework` | Implement flag + automation filters + coach views | SC-018, SC-019 | Stand-alone must not steal HW XP | LA-001 | Confirm product language for methods | P1 | 2026-07-23 |
| SC-021 | Config | Config-over-code audit (no hardcoded season numbers in scripts) | Installed in PROD | **054 v5.6** + **066 v3.3** in PROD; **057 v1.5** installed/running; **gated test timestamp** Same Day path for Schmidt fixtures only (not athlete-facing) | Run 057 on CASE-01 WAS; CASE-01…16 + verifier; migrate remaining hardcode consumers | SC-022 | Changing options breaks scripts; do not weaken Same Day for normal athletes | `docs/deploy-checklists/057-perfect-week-v1.5-live-verification.md`; `docs/testing/perfect-week/` | — | P0 | 2026-08-05 |
| SC-022 | Config | XP Reward Rules audit and cleanup | Installed in PROD | 31 active rules, 0 duplicate keys; source-by-source audit; **054 v5.6 Installed in PROD** (duplicate active streak-rule guard) | Resolve Video XP 1-vs-25; decide Zoom Recording / Manual Bonus rule records; supervised streak proof still open | SC-021, SC-023 | Source Key uniqueness | `docs/overnight/config-xp/XP-RULES-AUDIT.md`; `docs/next-wave/config-xp/MIKE-ACTIONS.md` | — | P0 | 2026-07-24 |
| SC-023 | Config | Grade Bands as linked source of truth | Live Tested in PROD | Active bands K-2…9-12 healthy; **066 v3.3** link-ID match; **002** live reassign Grade 3→**3-4** on `recCyFEPeATOVNlr9` (~6s); legacy inactive bands have no athlete-path links | Archive inactive legacy bands when ready; keep Min/Max match (no hard-coded band ID) | SC-021 | Renaming bands must not break XP; Grade 3 must Min/Max-match **3-4** (no hard-coded band ID) | `docs/overnight/config-xp/GRADE-BAND-AUDIT.md`; `docs/deploy-checklists/002-unloadData-runtime-fix.md`; `tests/enrollment-intake/automation-002-unload-compat.test.js` | — | P0 | 2026-08-05 |
| SC-024 | Config | Levels table reliable for progression | Installed in PROD | Levels table + 041/042 historically | Re-seed after wipe if needed; tune thresholds (SC-027) | SC-022 | Thresholds are config, not code | V2-007 | — | P1 | 2026-07-23 |
| SC-025 | Config | Level Gate Rules work and are tunable | **Complete** | **042 v3.3** installed and live-tested in PROD on Schmidt `recCyFEPeATOVNlr9`: 2026-2027 rule selection, Level 3 Gate `recrLcVfwPcWGflR2`, Gate Blocked `Submissions 13/15`, replay PASS, no link/status churn | Continue normal monitoring; tune only through approved config changes | SC-024, SC-116 | Recording credit must not write Attendees | `docs/prod-completion/2026-08-08/AUTOMATION-042-V3.3-SCHOOL-YEAR-LIVE-PROOF.md` | — | P1 | 2026-08-08 |
| SC-026 | Config | Achievements catalog + unlock rules | Installed in PROD | Achievements + 059/066 paths | Re-seed; re-test unlocks; dedupe keys | SC-066 | Fix audit not data | H-001; H-002 | — | P1 | 2026-07-23 |
| SC-027 | Config | Shot Milestones config + awards | **Live Tested in PROD** | 066 v3.5 controlled replay on `recCyFEPeATOVNlr9`: 8 eligible milestones, 8 existing unlocks skipped, 0 duplicates; prior v3.3 create-record failure is historical | Continue recurrence monitoring; no further 066 paste/replay unless source, trigger, schema, or milestone data changes | SC-096 | Week timezone America/Denver; preserve idempotent Source Keys | `docs/prod-completion/2026-08-08/AUTOMATION-066-V3.5-LIVE-PROOF.md` | — | P0 | 2026-08-08 |
| SC-028 | Config | Perfect Week rules configurable | Live Tested in PROD | CASE-01 award path proven (057→058→XP); PROD **057 v1.5**; **059 auto-fire blocked** until trigger drops Shot Milestone filter; multi-case fixtures still open | Mike 059 UI trigger fix; Batch A/B fixtures | SC-116 | Combined Zoom credit path; do not UTC-shift date keys; do not downgrade 057 to v1.4 | `059-perfect-week-trigger-coverage.md`; `docs/testing/evidence/2026-08-05-agent3-perfect-week/` | — | P1 | 2026-08-05 |
| SC-029 | Config | Streak values in config (not buried in code) | Live Tested in PROD | Streak XP via **053** + **054 v5.6**; Schmidt Current Streak **8**; 3 STREAK_XP events on `recCyFEPeATOVNlr9` | Mike decide repeat-after-break (SC-081); optional supervised break/rebuild test | SC-022 | Behavior may remain code | `docs/overnight/config-xp/STREAK-SYSTEM-AUDIT.md`; `docs/next-wave/config-xp/MIKE-ACTIONS.md` | Want behavior change or amounts only? | P2 | 2026-08-05 |

| SC-030 | Config | Zoom percentage / credit settings in config | Installed in PROD | Stage 17 config linkage work; effective fields | Re-verify config rows after wipe; document operator knobs | SC-116 | Never hardcode % in 117 | C-025 config linkage docs | — | P1 | 2026-07-23 |
| SC-031 | Config | Weekly schedule settings (build/send timing) | **Installed in PROD** | **118/119 v1.7 schedules ON**; production inputs restored; no-target fail-safe path passed with zero writes | Prove the normal `build_armed` and send-arm branches after a real eligible completed Week/package exists; keep 074 `sendMode=Live` where approved | SC-051 | Do not disable schedules; never Live+includeSchmidt | `docs/prod-completion/2026-08-08/PROD-STATE-RECONCILIATION-010-031-066-118-119-043.md` | **Authorized ON** | P0 | 2026-08-08 |
| SC-032 | Config | Season settings (dates, windows) | Built in Repository | **Season Launch Control System** + Challenge-Year engine + **Agent 4** [`NEXT-SEASON-RESET-STARTUP.md`](./deploy-checklists/NEXT-SEASON-RESET-STARTUP.md) executable checklist | Import Weeks in PROD; Mike UI attestations; authorize Launch Status fields; controlled activation | SC-065, SC-084 | 005 date mapping; fail closed on multiple active Configs; does not vendor RCC | `docs/challenge-year/SEASON-LAUNCH-CONTROL.md`; `lib/challenge-year/`; install packet; Agent 4 startup checklist | Authorize schema + Live flip | P0 | 2026-08-05 |
| SC-033 | Config | Enable/disable switches for major features | Planned | Various checkboxes / Active? patterns | Inventory switches; document operator map | SC-066 | Duplicate toggles confuse ops | V2-014 roadmap | — | P2 | 2026-07-23 |
| SC-034 | Config | Remove remaining hardcoded values from automations | Built in Repository | Partial modernization; **054 v5.6** + **066 v3.5** hardenings now in PROD; hardcode inventory | Finish V2-002 pass across 001–119; paste any remaining pending scripts | SC-021 | Prefer CONFIG block + tables | `docs/overnight/config-xp/CONFIG-HARDCODE-AUDIT.md`; V2-002 | — | P1 | 2026-08-08 |
| SC-035 | Weekly Summary | Guaranteed Weekly Athlete Summary for every enrollment × ended week | **Installed in PROD** | **118 v1.7 ON** with production inputs restored; no-target fail-safe PASS; 031 canonical resolution and 072 package ownership remain documented | Prove 118 `build_armed` with a real eligible completed Week; monitor WAS uniqueness and the downstream 072→119→074 handoff | SC-004, SC-082 | Schedule ON — do not revert OFF; bounded positive-path proof is still pending | `docs/prod-completion/2026-08-08/PROD-STATE-RECONCILIATION-010-031-066-118-119-043.md` | **DECIDED `send_short`**; schedules authorized | P0 | 2026-08-08 |
| SC-036 | Weekly Summary | Weekly summary calculations correct | Installed in PROD | **072** v3.8 manual path historically proven (final emails) | Re-test calc fields on Schmidt; Presentation columns (SC-054) | SC-054 | Don’t write rollup/formula totals from scripts incorrectly | 072; weekly-summary-flow.md | — | P0 | 2026-07-23 |
| SC-037 | Weekly Summary | Previous-week helpers reliable | Installed in PROD | Week linking patterns in 034 chain / 072 | Re-verify after Weeks rebuild | SC-084 | Denver date keys | 005/034 patterns | — | P1 | 2026-07-23 |
| SC-038 | Weekly Summary | Automatic package build (no Build checkbox) | Complete | **118 ON** arms Build; **072 v4.0 ON** short empty-week package (`built_short_empty_week`, `packageKind=short_no_activity`) | Keep `allow…1885 tokens truncated…l snapshots preserved | `docs/foundation-reset/PROD-SCHEMA-EXPORT-2026-07-23.md`; snapshot folders | — | P0 | 2026-07-23 |
| SC-056 | Data Integrity | Script input/output variables standardized | Built in Repository | Automation script standard; many scripts updated | Inventory Airtable automation I/O vs GitHub; fix drift | SC-057 | Missing outputs hide failures | AUTOMATION_SCRIPT_STANDARD; K-H2 | — | P1 | 2026-07-23 |
| SC-057 | Data Integrity | Automation trigger review (no duplicate triggers) | Planned | V2-014a classification; retirements approved for 112/043 | UI attest triggers; delete duplicates | SC-058 | Slot limits / double runs | V2-014a; REMAINING packages | — | P1 | 2026-07-23 |
| SC-058 | Data Integrity | Automation version inventory filled from live UI | Built in Repository | Agent 1 baseline + Agent 9 attestation packet; **PROD 117 attested email-only v1.1**; 117c absent | Mike paste complete PROD UI list where gaps remain | SC-059 | UI attestation mandatory before Complete | `docs/next-wave/automation-ownership/AUTOMATION-ATTESTATION-PACKET.md`; `CURRENT-PROD-BASELINE.md` | Confirm 112 OFF | P0 | 2026-08-05 |
| SC-059 | Data Integrity | Retire legacy automations 112 and 043 | **Installed in PROD / 043 not deployed** | No native 043 automation was found; stale governance inventory is not deployment proof. 112 remains OFF and 042 remains the preferred single progression writer | Confirm 112 OFF and retain the no-recreate-043 disposition; do not restore 043 or the stale orphan-XP bulk count from #100 | SC-001, SC-058 | Real progression defects #97/#98 remain open; #100 is recurrence prevention only | `docs/prod-completion/2026-08-08/PROD-STATE-RECONCILIATION-010-031-066-118-119-043.md` | Confirm 112 + retain 043 disposition | P0 | 2026-08-08 |
| SC-060 | Enrollment | Fillout enrollment validation is trustworthy | Live Tested in PROD | **001 v5.4** controlled Production registration for `RADON Schmidt` created canonical Enrollment `recqOR0A3RGjFjI3u`; Active, School Year `2026-2027`, Program Instance `Shooting Challenge \| 2026-2027`, and Grade Band `5-6` verified; welcome email received once. This is a bounded registration proof, not full intake-pipeline proof. | Live Fillout tighten when intake reopens; retain broader intake proof boundaries | SC-081 | Bad identity breaks whole season | `docs/deploy-checklists/PKG-014-immediate-initial-level-assignment-dev-deploy.md`; `tests/enrollment-intake/automation-001-unload-compat.test.js` | — | P1 | 2026-08-12 |
| SC-061 | Enrollment | New vs returning athletes handled correctly | Live Tested in PROD | **001 v5.4** new unique athlete path proven on `RADON Schmidt`; canonical active Enrollment created without duplicate registration or manual recalculation intervention. Returning-athlete and broader duplicate proof remain separately bounded. | Additional non-Schmidt returning case optional | SC-060 | Don’t create duplicate Athletes | `docs/deploy-checklists/PKG-014-immediate-initial-level-assignment-dev-deploy.md`; 001 v5.4 source | — | P1 | 2026-08-12 |
| SC-062 | Enrollment | Sibling handling works | Built in Repository | Sibling handling spec + fixtures/tests; no Family table | Live sibling parent-email routing test | SC-045 | Shared parent email edge cases | `docs/online-agents/enrollment-season/` | — | P2 | 2026-07-23 |
| SC-063 | Enrollment | Email validation (parent/athlete) | Built in Repository | Email validation rules in contract + validator FAIL paths | Fillout email rules ON; bounce SOP still open | SC-060 | Bad emails break Make | `docs/online-agents/enrollment-season/` | — | P1 | 2026-07-23 |
| SC-064 | Enrollment | Intake-open dates separate from challenge run dates | Built in Repository | Season date contract + Denver boundary tests | Wire intake-open into Fillout/web gate; Weeks flags if authorized | SC-032 | 005 must stay date-range based | `docs/online-agents/enrollment-season/`; C-018 | — | P1 | 2026-07-23 |
| SC-065 | Enrollment | Challenge dates / Weeks configuration rebuilt | Built in Repository | Weeks seed spec + **Challenge-Year week generator/validator** + **generate-week-package** (CSV, Week-code map, Week End Key map, Sunday email dates) | Manually import generated Weeks in PROD; verify Sunday–Saturday + Week 0 + Post-Challenge; link Program Instance (may need record IDs) | SC-032 | Denver timezone; Weeks remain manual import | `docs/challenge-year/`; `tools/challenge-year/cli.js generate-week-package`; enrollment-season seed | — | P0 | 2026-07-24 |
| SC-066 | Enrollment | Early-bird periods supported if desired | Decision Needed | Mentioned in season planning materials | Decide if 2026–27 uses early-bird; config if yes | SC-065 | — | season-configuration-design | Keep early-bird? | P3 | 2026-07-23 |
| SC-067 | Enrollment | Program Instance multi-year design | Deferred | V2-013 decided direction; investigation 2026-07-05; **Season Launch Control** is interim ops layer until Program Instance wave | Dedicated architecture wave later — do not block season launch on PI redesign | SC-032, SC-046 | Config changes must not rewrite history | V2-013; `docs/challenge-year/SEASON-LAUNCH-CONTROL.md` | When to schedule wave? | P3 | 2026-07-24 |
| SC-068 | Enrollment | Inactive / processing controls (`Active?` hardened) | Built in Repository | Partial guards; C-010 packets; Online Agent 7 Active? consumer audit + offline guard contract (**no script edits**) | PPE create/backfill; paste guards; resolve 072/118/119 Schmidt hard-exclude conflict vs “Schmidt visible” web direction | SC-004 | Gaps historically in 010/031/065/053/072/076 | `docs/online-agents/enrollment-season/`; C-010; KNOWN_ISSUES | Confirm PPE field + Schmidt exception | P0 | 2026-07-23 |
| SC-069 | Enrollment | Testing enrollment behavior documented and proven | Live Tested in PROD | Schmidt `recgP9qZYjAhE7NXm` Active?=true; included in Submissions/XP/WAS/levels path; public visibility direction confirmed; 115 allowlist | Email-path live proof still needed; standings web spot-check | SC-004, SC-068 | Do not exclude from public views | `prod-probe-latest.json`; `CURRENT-PROD-BASELINE.md` | — | P0 | 2026-07-24 |
| SC-070 | XP | Daily submission XP awards correctly | Live Tested in PROD | 010 path; live Submission `recuuTBgstSTGg2E3` → XP `recOodD23MQrP1O9F` = 20 (SHOOTING_BASE), exact one event | Rerun pack on additional submissions; keep Schmidt-only | SC-049 | One submission → one XP Event | `docs/overnight/config-xp/XP-RULES-AUDIT.md`; `prod-config-snapshot-2026-07-24.json` | — | P0 | 2026-07-24 |
| SC-071 | XP | Homework XP after satisfactory review | Installed in PROD | HW XP writers historically; C-020 gap = after-review | Live prove after coach satisfactory | SC-017 | — | K-M4 | — | P0 | 2026-07-23 |
| SC-072 | XP | Video XP awards correctly | Installed in PROD | **114** exact Source Key `VIDEO_SUBMISSION\|{Video Feedback ID}`; repository v6.1 preserves event ID through eligibility withdrawal/restoration | Mike verifies current trigger + one Schmidt lifecycle proof after upload writeback | SC-133 | Never delete or replace lifecycle event; no email proof implied | 113 v6.4; 114 v6.1; Stage H audit | — | P0 | 2026-08-12 |
| SC-073 | XP | Live Zoom XP awards correctly | Installed in PROD | **101** v5.5 Attendees-only path | Re-test live meeting attendance | SC-116 | Recording path must never write Attendees | 101; C-025 hard rule | — | P0 | 2026-07-23 |
| SC-074 | XP | Zoom recording XP / credit path | Built in Repository | Stage 17 orchestrator/117c are **design alternatives only** (not PROD Airtable slots). Live Zoom XP = **101**. Recording `ZOOM_CREDIT` has no deployed Airtable writer under slot 117 (slot used by approval email). | Decide whether to deploy a future dedicated recording-credit automation (new slot) or keep email-only 117 | SC-116 | Soft-void recording only; never Attendees | C-025 Stage 17 design-alts; `C-025-117-numbering.md` | — | P0 | 2026-08-05 |
| SC-075 | XP | Streak XP | Live Tested in PROD | **053/054** streak XP live on Schmidt 2026-27 (3 events; Current Streak 8) | Optional break/rebuild supervised test; SC-081 decision | SC-029, SC-068 | Active? gaps | 053; 054 v5.6; `docs/next-wave/config-xp/MIKE-ACTIONS.md` | — | P1 | 2026-08-05 |
| SC-076 | XP | Milestone XP (shot milestones) | **Live Tested in PROD** | 066 v3.5 existing-unlock replay detected 8 eligible milestones, skipped 8 existing unlocks, and created no duplicates; prior v3.3 failure is historical | Continue recurrence monitoring; no further paste/replay unless 066 source, trigger, schema, or milestone model changes | SC-027 | Preserve Source Keys and idempotency; distinguish replay proof from any future first-create proof | `docs/prod-completion/2026-08-08/AUTOMATION-066-V3.5-LIVE-PROOF.md` | — | P0 | 2026-08-08 |
| SC-077 | XP | Perfect Week XP | Live Tested in PROD | Unlock `recALZFQNL3XicEOX` → XP `recMdcI5lN8gJ6830` (100, bucket/source Perfect Week, Source Key `PERFECT_WEEK\|{enr}\|{week}`); idempotent; WAS XP 213→313; **059 UI trigger still needs Pending-only** for auto-fire | Mike removes Shot Milestone filter on 059; optional Test button soak | SC-028, SC-074 | — | `059-perfect-week-trigger-coverage.md`; Agent 3 evidence folder | — | P1 | 2026-08-05 |
| SC-078 | XP | Level progression updates correctly | Live Tested in PROD | **Initial assignment proof:** 001 v5.4 checked `Level Recalc Needed?` for Enrollment `recqOR0A3RGjFjI3u`; 042 v3.4 ran before the next scheduled 041 scan and assigned zero-XP `Beginner` → `Rookie Shooter`, Gate `Level 2 Gate`, Status `Assigned`; queue cleared. This does not prove level-up past Rookie or scheduled-041 replay idempotency. | Live level-up past Rookie and post-test scheduled-041 idempotency still need controlled proof | SC-024 | — | `docs/deploy-checklists/PKG-014-immediate-initial-level-assignment-dev-deploy.md`; `docs/overnight/config-xp/LEVEL-AUTOMATION-AUDIT.md` | — | P0 | 2026-08-12 |
| SC-079 | XP | Gate blocking when requirements unmet | Live Tested in PROD | 042 gate logic; Schmidt Level Status **Gate Blocked**; Gate Debug `Sub 9/10 | HW 2/0 | Vid 5/6 | Zoom 0/0 | Streak 7/0` | Clear gate after Sub 10 + Vid 6 (SC-080) | SC-025 | — | V2-005 | — | P0 | 2026-08-05 |
| SC-080 | XP | Gate clearing when requirements met | Installed in PROD | 042 + Zoom credit integration | Live prove clear after HW/Zoom credit | SC-074 | — | C-025 | — | P0 | 2026-07-23 |
| SC-081 | XP | Streak economics review | Decision Needed | Notes that amounts=config, repeat behavior=code | Decide whether to change repeat-after-break rules | SC-029 | — | C-014 notes | Change streak behavior? | P2 | 2026-07-23 |
| SC-082 | XP | Early level-gate tuning for next season | Planned | C-014 decision: one ladder; tune Q1 2027 | Load numbers when season config ready | SC-025 | Numbers in Airtable only | V2-005–007; season-configuration-design | Approve gate spreadsheet | P2 | 2026-07-23 |
| SC-083 | XP | Achievement unlock deduplication | **Live Tested in PROD** | 066 v3.5 replay skipped all 8 existing milestone unlocks with 0 duplicate creates; H-001 audit fix remains in place | Monitor recurrence; do not reintroduce stale orphan-XP bulk counts from #100 | SC-026 | Preserve Source Keys and one-source/one-event idempotency | `docs/prod-completion/2026-08-08/AUTOMATION-066-V3.5-LIVE-PROOF.md` | — | P1 | 2026-08-08 |
| SC-084 | Zoom | Live attendance capture works | Installed in PROD | Zoom Meetings + Attendees → 101 | Recreate meetings; Schmidt attend test | SC-073 | — | 101 | — | P0 | 2026-07-23 |
| SC-085 | Zoom | Live bonuses (if configured) work | Installed in PROD | XP Reward Rules / meeting bonuses historically | Confirm which bonuses still desired; test | SC-022 | — | XP rules | Confirm bonus set | P2 | 2026-07-23 |
| SC-086 | Zoom | Recording credit path works | Built in Repository | Orchestrator not live under PROD 117; credit path is design-alt / future work | Re-open only with a new attested automation plan that does not steal email slot 117 | SC-074 | Never Attendees write | `_design-alternatives/stage17-modular-reference/` | — | P0 | 2026-08-05 |
| SC-087 | Zoom | Live-versus-recording exclusivity | Installed in PROD | Conflict detection PASS historically | Re-prove Conflict=1 blocks double credit | SC-086 | Soft-void only | Stage 17 verification | — | P0 | 2026-07-23 |
| SC-088 | Zoom | Recording approval email to parent | Built in Repository | Canonical **117** email-to-Make v1.1; Make **117f**; historical controlled PASS; **Agent 4 offline 7/7 PASS** + go-live one-pager | Mike: create Recording Quiz Satisfactory fixture → Test 117 → expect sent/already_sent; no XP | SC-086 | Make must not write XP | `117-ZOOM-APPROVAL-GO-LIVE.md`; offline suite | Authorize live email | P1 | 2026-08-05 |
| SC-089 | Zoom | Total Zoom counts correct | Installed in PROD | Rollups/formulas Stage 17 | Re-verify formulas after schema export | SC-048 | Preconflict rollup formula critical | Stage 17 formula docs | — | P1 | 2026-07-23 |
| SC-090 | Zoom | Level gate integration for Zoom credit | Installed in PROD | 042 v3.1 | Live prove | SC-080 | — | C-025 | — | P0 | 2026-07-23 |
| SC-091 | Zoom | Perfect Week integration for Zoom credit | Installed in PROD | PROD 057 v1.5 installed; Zoom Met formula + live Attendees ∪ recording credit path | Fixture CASE-10…13 (not required / attended / missing / cross-enrollment) | SC-077 | — | C-025; `057-perfect-week-v1.5-live-verification.md` | — | P0 | 2026-08-05 |
| SC-092 | Zoom | Weekly summary shows Zoom correctly | Installed in PROD | 072 Zoom sections historically | Re-test Presentation labels | SC-036, SC-054 | — | V2-004 | — | P1 | 2026-07-23 |
| SC-093 | Zoom | Public website Zoom pages accurate | Installed in PROD | `/shoot` Zoom catalog UI live | Confirm Airtable publish filters after wipe | SC-146 | Read-only web | web Zoom views | — | P2 | 2026-07-23 |
| SC-094 | Assets | Video storage on program-owned S3 | Installed in PROD | Lambda upload-asset; 070b/070c PROD E2E historically; **SC-150 Complete** adds private reviewer viewer on same Lambda | Re-test writeback on Schmidt asset as needed | SC-150 | Auth secret hygiene; bucket stays private | C-013; SC-150 checklist | Optional secret rotate (separate P0) | P0 | 2026-08-04 |
| SC-095 | Assets | Homework storage on S3 (070a route) | Live Tested in PROD | Lambda `homework_completion` route live via 070a v4.5 in PROD; Schmidt photo E2E + Mike post-paste Make→Lambda writeback attestation 2026-08-05 | Keep 070a ON; monitor Make Module if routing drifts | SC-094 | One upload writer; Canonical stays private | SC-009 evidence; `SC-009-photo-homework-prod.md` | — | P0 | 2026-08-05 |
| SC-096 | Assets | Canonical HTTPS URLs on assets | Installed in PROD | Canonical URL fields + Lambda writeback; **Canonical File URL remains private S3 identity** (AccessDenied anonymous); clickable review uses **Reviewer File URL** (SC-150) | Re-verify after wipe; do not make Canonical public | SC-094, SC-150 | Dual-truth Drive/attachment deferred | C-013; C-023; SC-150 | — | P0 | 2026-08-04 |
| SC-097 | Assets | SHA-256 hashes recorded | Installed in PROD | Hash pipeline + **116** consequences historically ON | Re-test hash write + review queue | SC-094 | Never filename-only dedup | C-023 | — | P1 | 2026-07-23 |
| SC-098 | Assets | Duplicate file reuse decision (manual, safe) | Installed in PROD | Asset Reuse Decision + 116 | Re-test confirm/reversal; never auto-reuse another athlete’s object | SC-097 | Never auto-block upload incorrectly | C-023 Stage 5 | — | P1 | 2026-07-23 |
| SC-099 | Assets | Writeback verification (070c) | Installed in PROD | 070c v1.1 idempotent verify | Re-test Accepted→verify | SC-094 | Async handoff | C-013 | — | P0 | 2026-07-23 |
| SC-100 | Assets | Attachment / Drive retirement strategy | Deferred | Explicitly deferred after C-013 video | Plan retirement after S3 paths stable for HW+video | SC-095 | Don’t break historical links if any remain | C-023 retirement notes | When to retire Drive? | P3 | 2026-07-23 |
| SC-101 | Assets | Make and Lambda routing correct for video + homework | Complete | **Video:** C-013 PROD E2E (070b→Make→Lambda→writeback). **Homework:** SC-009 PNG/JPG + Mike operator-attested 2026-08-05 post-070a-v4.5 rerun (Make→Lambda→Airtable writeback; earlier Accepted-without-writeback did not remain) | None for routing correctness; credential rotation deferred to go-live | SC-095 | Never commit webhooks; no second writer | `docs/testing/evidence/2026-08-04-sc-009-photo-homework/`; C-013 prod closeout; Issue #70 | Credential rotation deferred to go-live (Mike 2026-08-05) | P1 | 2026-08-05 |
| SC-150 | Assets | Secure permanent reviewer file links (private S3) | Complete | PROD Lambda `127si-upload-asset` code deployed `2026-08-04T23:57:36Z`; Interface open of `Reviewer File URL` on `recaXBfjeeu3bcm0t` opened private S3 file immediately (no extra auth); Lambda owns final `Upload Status=Uploaded`; token preserved across retries; 78 unit tests OK | Optional: credential rotation (separate P0 — values exposed in terminal troubleshooting) | SC-094, SC-096 | Never publicize bucket; never log tokens; never set Processing after Lambda success | `docs/deploy-checklists/SC-150-prod-reviewer-file-links.md`; asset `recaXBfjeeu3bcm0t` | Rotate exposed secrets separately | P0 | 2026-08-04 |
| SC-102 | Website | Airtable-backed public pages work | Live Tested in PROD | Next.js `/shoot` on Vercel; **2026-07-25 smoke + browser QA PASS** (routes 200; API `tokenValid`; no client token leak) | Keep catalog content current; Presentation fields later (SC-054) | SC-055 | Server-side token only | `PUBLIC-SHOOT-SMOKE.md`; `BROWSER-QA-REPORT-2026-07-25.md` | — | P1 | 2026-07-25 |
| SC-103 | Website | Leaderboard | Live Tested in PROD | Leaderboard + public-display show **Testing Schmidt** (81 XP / 100 shots); Schmidt visibility honored | Fix Schmidt Grade/School Year (EXT-QA-005); season content hygiene | SC-068 | — | `BROWSER-QA-REPORT-2026-07-25.md` | — | P2 | 2026-07-25 |
| SC-104 | Website | Homework catalog | Installed in PROD | Catalog routes live; browser smoke PASS | Unpublish stale Week 10 prior-season rows (EXT-QA-006); Presentation fields later | SC-054 | Publish flag | homework catalog; browser QA | — | P2 | 2026-07-25 |
| SC-105 | Website | Tutorials | Installed in PROD | Tutorials grid/detail live; browser smoke PASS | Complete table merge SC-052; audit Article “Dribble” category (EXT-QA-003) | SC-052 | — | C-026; browser QA | — | P2 | 2026-07-25 |
| SC-106 | Website | Levels pages | Live Tested in PROD | Levels ladder/detail live — **12 active tiers** verified 2026-07-25 | Gate copy polish; cover 410 graceful fallback in web | SC-024 | — | levels views; browser QA | — | P2 | 2026-07-25 |
| SC-107 | Website | Achievements pages | Installed in PROD | Achievements grid live; browser shows **9 Streak** only | Re-seed / Active?+Visible? for Shot Milestones + Perfect Week (EXT-QA-002) | SC-026 | — | achievements views; browser QA | — | P2 | 2026-07-25 |
| SC-108 | Website | Zoom public pages | Live Tested in PROD | Zoom meetings views live; detail pages render; recording-credit empty state OK | Refresh expired Cover Media URLs (EXT-QA-004); web now hides 410 images | SC-093 | — | zoom views; browser QA | — | P2 | 2026-07-25 |
| SC-109 | Website | Game Manual from config | Installed in PROD | `/game-manual` renders live **XP Reward Rules** + **Levels** on PROD; Adobe PDF link env still empty (“Manual link not configured”) | Set `NEXT_PUBLIC_GAME_MANUAL_URL` (EXT-QA-001); editorial copy; Shot Milestones surface later | SC-032, SC-082 | Amounts from config only | `GAME-MANUAL-CONFIG-AUDIT.md`; browser QA | Approve public wording + set env | P2 | 2026-07-25 |
| SC-110 | Website | Public display page | Installed in PROD | Public display view + loading states; Schmidt visible in browser QA | Wire Presentation fields; real season year after School Year fix | SC-054 | — | public-display; browser QA | — | P2 | 2026-07-25 |
| SC-111 | Website | Athlete profiles (real data, not mocks) | Live Tested in PROD | PR #58 merged; Vercel prod READY; live `/athletes/testing-schmidt` + standings/leaderboard/public-display links; privacy + unknown-slug checks PASS | Optional: recreate `Web - Leaderboard` view (fallback OK) | SC-103 | No browser token; duplicate slugs fail closed; noindex unchanged | `docs/testing/evidence/athlete-profiles-2026-08-04/`; merge `ce7723a2e219f63539ba3db0685ecd20bc5d28e2`; deploy `dpl_wakFzRMAX2HJAyzX8eBoPxquVXEj` | — | P2 | 2026-08-04 |
| SC-112 | Website | Athlete auth + dashboard | Decision Needed | Decision matrix + safe scaffolding (`hasAthleteSession` always false); mock dashboard/profile remain labelled demo | Mike pick approach; then schema + session implementation | — | Out of scope: web writes for submissions; no fake login UI | `docs/overnight/web-integration/ATHLETE-AUTH-DECISION.md` | **Pick auth approach** (recommend parent magic-link) | P2 | 2026-07-23 |
| SC-113 | Website | Loading, empty, and error states | Live Tested in PROD | Shared UI states + recent loading routes; **2026-07-25** verified demo/empty/error labels (dashboard demo, game-manual missing PDF, admin auth placeholder, missing athlete states) | Keep states aligned when SC-112 lands | — | — | `BROWSER-QA-REPORT-2026-07-25.md` | — | P2 | 2026-07-25 |
| SC-114 | Website | Softr cutover | Superseded | Softr declared **Obsolete / Not Used**; `/shoot` is the active public UI | None — do not plan Softr activation or dual-run cutover | SC-102–SC-113 | Historical cutover docs remain Historical Reference Only | `docs/challenge-year/SOFTR-SEASON-ACTIVATION.md` | **Resolved: Softr not used** | — | 2026-07-24 |
| SC-115 | Website | noindex removal / search indexing | Decision Needed | Sitewide `noindex` still on; Playwright asserts it; overnight decision doc | Flip robots only after content + soft cutover + Mike written approval | SC-114 | SEO irreversible-ish; **no indexing change overnight** | `docs/overnight/web-integration/INDEXING-SEO-DECISION.md` | Approve indexing | P2 | 2026-07-23 |
| SC-116 | Website | Admin roadmap (gated read-only first) | Built in Repository | `/admin` placeholder + overnight admin roadmap inventory; staff path scaffolding only | Staff auth then read-only aggregates; no writes in first slice | SC-112 | Do not expose diagnostics behind SITE_ACCESS_TOKEN alone | `docs/overnight/web-integration/ADMIN-ROADMAP.md`; `web/docs/admin-roadmap.md` | Choose staff auth | P3 | 2026-07-23 |
| SC-117 | Website | Public Presentation fields consumed by web | Planned | Depends C-022 | Wire queries to Presentation fields only | SC-054 | — | C-022; V2-009 | — | P1 | 2026-07-23 |
| SC-118 | Website | Production readiness smoke package for public `/shoot` | Built in Repository — smoke suite successfully executed against current PROD | **Production smoke package** (`production-smoke.spec.ts` + `http-smoke.mjs` + runbook); prior `public-experience` / hardening / registration-gateway / `mobile-a11y` specs retained; **2026-08-04** local + prod Playwright + HTTP `tokenValid` PASS on `fairfieldbasketballclub.com/shoot` (read-only). Branch deploy of this package not yet Installed/Live Tested. | Optional CI wire for `test:smoke`; axe-core later; Mike final prod check after integration deploy | SC-102 | Read-only; no form submits; no Airtable writes | `docs/testing/PRODUCTION-SMOKE-RUNBOOK.md`; `docs/testing/evidence/PRODUCTION-SMOKE-2026-08-04.md`; `PLAYWRIGHT-COVERAGE.md` | Optional CI authorize | P2 | 2026-08-04 |

### Additional cross-cutting / historical items

| ID | Area | Mike’s Goal | Current Status | What Already Exists | What Is Still Needed | Dependencies | PROD Safety/Dependency Notes | Evidence | Mike Decision | Priority | Last Updated |
|----|------|-------------|----------------|---------------------|----------------------|--------------|------------------------------|----------|---------------|----------|--------------|
| SC-119 | Platform | Engineering constitution + automation standards active | Complete | ENGINEERING_CONSTITUTION; doc 06; SCRIPT+CONFIG | Keep docs aligned with PROD-direct rules (update later) | — | Operating rules in §1 supersede DEV-first where they conflict | V2-014c | — | P1 | 2026-07-23 |
| SC-120 | Platform | Automation modernization roadmap documented | Complete | V2-014 done (doc) | Execute remaining retirements via SC-059 | — | — | V2-014 | — | P2 | 2026-07-23 |
| SC-121 | Platform | Wave 2A classification decisions captured | Complete | Planning complete; Mike decisions recorded | Implementation of merges/rewrites still open | SC-059 | — | V2-014a | — | P2 | 2026-07-23 |
| SC-122 | Platform | Permanent DEV base exists (optional now) | Complete | `appTetnuCZlCZdTCT` ready | Optional use only under new rules | — | Not required for daily work | V2-015 | — | P3 | 2026-07-23 |
| SC-123 | Historical | 2025–26 close-out repairs (Lyle shots, final emails, Koen HW17, Fillout OFF) | Complete | Wave 0 closed | None for empty-base rebuild | — | Historical only | C-001–C-003, C-008 | — | — | 2026-07-23 |
| SC-124 | Historical | 090F achievement audit false-duplicate fix | Complete | H-001 done | Principles still apply going forward | SC-083 | — | H-001; C-006 | — | — | 2026-07-23 |
| SC-125 | Historical | Archive+clone season rollover | Superseded | Cutover doc kept | Use Program Instance (SC-067) instead | SC-067 | — | V2-001 | — | — | 2026-07-23 |
| SC-126 | Historical | Dual-track progression (shooter vs honors) | Not Needed | Analysis docs | Rejected for 2026–27 | — | — | xp-motivation-analysis; master direction | Revisit only after next season if needed | — | 2026-07-23 |
| SC-127 | Awards | Award Recipients scope metadata cleanup | Deferred | Accepted for 2025–26 | Optional if reports need it | — | Low risk | H-003; C-015 | — | P3 | 2026-07-23 |
| SC-128 | Awards | Awards catalog duplicate `thanks_for_playing` bucket | Deferred | Open low | Consolidate Class/bucket | — | — | H-004; C-016 | — | P3 | 2026-07-23 |
| SC-129 | Other | Conquered Goal Date lookup filter | Deferred | Queued low | Only if parent-facing field wrong | — | — | H-006 | — | P3 | 2026-07-23 |
| SC-130 | Media | 2025–26 newspaper/radio kits sent | Complete | Manual packets sent 2026-07-05 | Platform automation is separate (SC-131) | — | — | V2-028 manual | — | — | 2026-07-23 |
| SC-131 | Media | Generate Media Kits as platform feature | Deferred | Roadmap Phases B–D | Config tables + generator + UI later | SC-094, SC-054 | — | V2-028 platform; media ROADMAP | When to build platform kits? | P3 | 2026-07-23 |
| SC-132 | Media | Facebook kits | Deferred | Optional | Not started | SC-131 | — | media ROADMAP | Want Facebook kits? | P3 | 2026-07-23 |
| SC-133 | Platform | Pre-season parent comms from rules | Planned | Depends game manual | Write/send after SC-109 | SC-109 | — | V2-010 | — | P2 | 2026-07-23 |
| SC-134 | Platform | Full pre-season audit pack green | Planned | Stages A–J tooling exist | Extend audits; run on rebuilt PROD | SC-046–SC-058 | Dry-run first | V2-011 | — | P1 | 2026-07-23 |
| SC-135 | Platform | Dry-run full season on Schmidt before public intake | Planned | Depends testing + pipelines | Execute after phases 1–13 | SC-005 | Controlled emails only | V2-012 | — | P0 | 2026-07-23 |
| SC-136 | Zoom | Stage 16 Homework Completions Zoom design | Superseded | Old 117a/117b S16 scripts moved to `_superseded/` | Do not install S16 | SC-074 | Inventory/KNOWN_ISSUES may still mention S16 (stale) | C025_ARCHITECTURE_RECONCILIATION; `_superseded/` | — | — | 2026-07-23 |
| SC-137 | Testing | “Never install 115 in PROD” old rule | Superseded | Old DEV-only rule under DEV-first model | Replaced by SC-001 decision under empty PROD rules | SC-001 | If 115 enters PROD, isolate carefully | C-020 old guidance | Decide via SC-001 | — | 2026-07-23 |
| SC-138 | Platform | Close stale overnight GitHub issues/PRs for 070a | Planned | Issues #1/#8/#9/#11/#17; PRs still open despite claimed PASS | Close or update with current truth | SC-095 | — | gh issues/PRs | — | P2 | 2026-07-23 |
| SC-139 | Platform | Refresh stale status docs (KNOWN_ISSUES, inventory, E2E Zoom rows, brief) | Built in Repository | Completion master + homework Mike actions + prod-completion 2026-07-25 pack started; launch-certification already on master | Continue sweeping KNOWN_ISSUES / Zoom E2E stale rows / brief after each SC | — | Stale docs cause wrong installs | `docs/prod-completion/2026-07-25/`; K-M1 etc. | — | P1 | 2026-07-25 |
| SC-140 | Config | One ladder decision (no dual-track) | Complete | C-014 resolved | Tuning only via SC-082 | — | — | C-014 | — | — | 2026-07-23 |
| SC-141 | Assets | C-013-SEC DEV secret rotation | Complete | Done 2026-07-09 | Optional PROD rotate remains hygiene | SC-094 | — | C-013-SEC | — | — | 2026-07-23 |
| SC-142 | Historical | Monitoring-only close-out leftovers (C-004/C-005/C-007) | Not Needed | Season closed; data wiped | Drop unless Mike wants award history research | — | — | close-out-considerations | — | — | 2026-07-23 |
| SC-143 | Platform | Educational Athletics multi-challenge platform (Dribble, etc.) | Deferred | Long-term vision | Separate repos/bases recommended | — | Out of this repo | master direction § long-term | — | P3 | 2026-07-23 |
| SC-144 | Website | Rename Softr-named publish flag | Planned | Flag still Softr-named in schema | Rename in schema wave; update web queries | SC-054 | Breaking rename | K-M7 | — | P2 | 2026-07-23 |
| SC-145 | Platform | Repo health / security audit follow-ups | Planned | Audits dated 2026-07-21 on master | Triage findings into SC items as needed | — | Secrets discipline | REPOSITORY-HEALTH / SECURITY audits | — | P2 | 2026-07-23 |
| SC-146 | Enrollment | Re-open Fillout daily intake when season ready | Deferred | Form OFF since C-008 | Turn on only after SC-135 dry-run | SC-060, SC-135 | — | C-008 | When to reopen intake? | P2 | 2026-07-23 |
| SC-147 | Data Integrity | Reliability Command Center — workflow health visibility before prod failures | Built in Repository | RCC framework + MVP packet; **Agent 4** sanitized PROD export + CLI run exit 0; OMNI view-install prompt ready | Mike/OMNI create views 1–4; review first Sunday health; **no auto repairs** | SC-040, SC-046 | No auto bulk retry; views **not installed** | `RCC-OMNI-VIEW-INSTALL.md`; `rcc-prod-export.sanitized.json`; `rcc-report/` | Approve MVP view install | P0 | 2026-08-05 |
| SC-148 | Website | Mobile usability + accessibility for public `/shoot` | Built in Repository | Accessible mobile menu (open/close/Escape/focus return); skip link; 44px tap targets; overflow protection (narrow); stronger focus rings; registration CTAs in menu + gateway; footer/back text-link distinction; clearer loading/empty/error; heading hierarchy; Playwright coverage at 375/768/1440 | Merge integration PR; Vercel deploy; Mike production check; optional axe-core pass | SC-102, SC-113, SC-118 | No Airtable/XP/business-rule changes; do not use `overflow-x: clip` in ways that hide tables/leaderboards | `web/components/layout/product-nav.tsx`; `web/tests/mobile-a11y.spec.ts` | Approve merge/deploy | P1 | 2026-08-04 |
| SC-149 | Website | Official landing + branding links use Fairfield Basketball Club (not Hoop Challenges) | Built in Repository | Repo audit + code: logo/header/footer/`BackToHubLink` → `https://www.fairfieldbasketballclub.com`; `resolveLandingUrl`/`resolveSiteUrl` rewrite legacy Hoop hosts + safe defaults; env examples; `/shoot` path preserved; Vitest + Playwright coverage | Set Vercel `NEXT_PUBLIC_LANDING_URL` / `NEXT_PUBLIC_SITE_URL` to Fairfield if still legacy; deploy; live smoke logo/footer; do not treat historical `hoopchallenges.com` docs as active config | SC-102 | Do not redirect in-app `/shoot/*` nav to landing; keep basePath `/shoot` | `web/lib/app-config.ts`; `web/lib/app-config.test.ts`; `web/lib/site-chrome-links.test.ts`; `web/tests/public-hardening.spec.ts` | Confirm Vercel env values | P0 | 2026-08-04 |

---

## 5. Required Work Areas

### Testing

Primary SC items: **SC-001 … SC-008**, **SC-069**, **SC-135**, **SC-137**.

Must achieve: Schmidt enrollment, Testing views, scenario runner, E2E matrix, duplicate/rerun packs, and failure-path tests for email/Make/upload.

### Homework and Learning Activities

Primary SC items: **SC-009 … SC-020**.

Must achieve: photo/PDF/video/written/quiz paths, multi-file, one HC per assignment, unified review/XP/email, then Learning Activities tables and routing without a second XP pipeline.

### Configuration and XP

Primary SC items: **SC-021 … SC-034**, **SC-140**.

Must achieve: config-over-code, XP Reward Rules, Grade Bands links, Levels/Gates/Achievements/Milestones/Perfect Week/streaks/Zoom %/season switches.

### Weekly Summary and Communications

Primary SC items: **SC-035 … SC-045**, **SC-042**.

Must achieve: guaranteed WAS per enrollment/week, auto build/send, dedupe/retry, Presentation fields, major-event decision, and all email types.

### Data Integrity and Schema

Primary SC items: **SC-046 … SC-059**, **SC-055**, **SC-147**.

Must achieve: ownership matrix, one writer, computed-field review, keys, safe backfills, cleanup, schema export, I/O + trigger + version inventory, Reliability Command Center health visibility (repo audit + future views).

### Enrollment and Season Structure

Primary SC items: **SC-060 … SC-069**, **SC-146**.

Must achieve: Fillout validation, new/returning/siblings, calendars, Weeks, testing enrollment behavior, Active? rules. Program Instance remains deferred.

### XP, Levels, and Achievements

Primary SC items: **SC-070 … SC-083**.

Must achieve: every XP source, progression, gates, streak review decision, early-gate tuning, unlock dedupe.

### Zoom

Primary SC items: **SC-084 … SC-093**, **SC-136**.

Must achieve: live + recording exclusivity, approval email, totals, gate/Perfect Week/WAS/web integration. Stage 16 design is superseded.

### Assets and Storage

Primary SC items: **SC-094 … SC-101**, **SC-141**, **SC-150**.

Must achieve: video + homework S3, canonical URLs, hashes, reuse decisions, writeback, Make/Lambda routing, **private-bucket reviewer links**. Drive retirement deferred.

#### Reviewer-link architecture (SC-150) — 2026-08-04 — **Complete**

| Decision | Choice |
|----------|--------|
| Object privacy | S3 bucket `shooting-challenge-assets` remains private |
| Permanent coach click target | Airtable formula **`Reviewer File URL`** |
| Permanent S3 identity | **`Canonical File URL`** (not clickable anonymously) |
| Auth for open | Stable per-asset **`Reviewer Access Token`** (URL-safe, ≥32 random bytes; preserved on retry) |
| Viewer | PROD Function URL `GET /file/{recordId}?token=…` → 302 to ~15 min presigned `GetObject` |
| Final status owner | **Lambda** is authoritative for successful upload writeback; successful assets finish as **`Upload Status = Uploaded`** (not Processing / Pending Link) |
| Private access path | Coaches open private S3 objects only through the tokenized reviewer endpoint (`Reviewer File URL`) |
| Parent homework email (071) | **Complete** — parent-facing file links use **`Reviewer File URL` → Google Drive View URL → Google Drive File URL** (v3.5). PROD paste + operator-attested live send 2026-08-05 on `recH71jEgjxzLup6F`. Make marks Sent? after Gmail. |
| PROD proof | Submission Asset `recaXBfjeeu3bcm0t`; Lambda deploy `2026-08-04T23:57:36Z`; Interface click opened file immediately with no extra auth |
| Security follow-up | **P0 separate:** rotate credentials exposed during terminal troubleshooting (not in this package) |

Status: **Complete** (repo + PROD install + live Interface test). Checklist: `docs/deploy-checklists/SC-150-prod-reviewer-file-links.md`.

### Website and Public Experience

Primary SC items: **SC-102 … SC-118**, **SC-144**, **SC-148**, **SC-149**.

Must achieve: catalogs, game manual from config, real profiles/auth decision, Softr/noindex decisions, admin roadmap, Presentation wiring, Playwright growth.

---

## 6. Recommended Build Order

Optimized for **speed in the emptied PROD base**. Stop criteria are listed per phase.

| Phase | Focus | Exit criteria before moving on |
|------:|-------|--------------------------------|
| **1** | Schema and field ownership | Fresh schema export started; ownership matrix draft for core tables; no known dual writers on XP/email fields |
| **2** | Config and XP Reward Rules | Grade Bands + XP Reward Rules readable; critical hardcodes inventoried |
| **3** | Testing framework | Schmidt enrollment + Testing views + scenario approach decided (incl. 115-in-PROD decision) |
| **4** | Enrollment and Weeks | Athlete/Enrollment/Weeks seeded for test season; intake rules documented |
| **5** | Daily submissions and XP | Schmidt daily submission → XP Event idempotent |
| **6** | Homework and Learning Activities | File + written HC path live-tested; quiz decision made; LA schema only after HC stable |
| **7** | Video and storage | Video upload writeback re-proven; 070a enable decision executed or explicitly deferred |
| **8** | Streaks, milestones, achievements, Perfect Week | 053/066/059/057 live-tested on Schmidt |
| **9** | Levels and gates | Block + clear proven; Zoom credit participates correctly |
| **10** | Zoom | Live + recording exclusivity + approval email path decided/tested |
| **11** | Weekly summaries | Guaranteed WAS create + calc proven |
| **12** | Emails and communication center | Weekly WAS Live proven; **WELCOME Hub handoff (079) controlled-test proven**; participant welcome + approved Hub template pending; homework/video/Zoom paths per SC-045; EMC still deferred |
| **13** | Website integrations | Empty/error states OK; catalogs read live config; Presentation wiring as available |
| **14** | Full live end-to-end test | SC-005 matrix mostly green on Schmidt |
| **15** | Cleanup and final sign-off | Obsolete fields/tables, inventory filled, stale docs refreshed, intake reopen decision |

---

## 7. Mike Decisions

Only decisions that need Mike (not pure engineering choices):

| ID | Decision needed | Why it matters |
|----|-----------------|----------------|
| SC-044 | Major-event alerts: SMS vs email; parent vs athlete; opt-in rules? | Product/comms policy |
| SC-066 | Keep early-bird period for next season? | Calendar/config work |
| ~~SC-068~~ | ~~Schmidt Active? vs standings~~ | **Resolved in Foundation Reset:** Active?=true for processing; exclude standings via view filter (no new field) |
| SC-081 | Change streak repeat-after-break behavior, or only tune amounts? | Code vs config |
| SC-095 | When to turn **070a** homework S3 upload ON in PROD? | Currently intentionally OFF |
| SC-112 | Athlete auth approach for real dashboard/profiles? | Unlocks web Phase 3 |
| SC-115 | Public indexing (noindex removal)? (SC-114 Softr cutover is Superseded — Softr Obsolete) | Public traffic / SEO |
| SC-067 | When to schedule Program Instance multi-year wave? | Large architecture |
| SC-002 / SC-006 | Build Scenario Library + auto Expected-vs-Actual now or later? | Testing investment level |

**Resolved this pack**

| ID | Decision | Outcome |
|----|----------|---------|
| SC-001 | Testing Scenarios / 115 in PROD? | **Allowed and Live Tested** — dry + live + rerun PASS; orchestration only |
| SC-004 | Schmidt Active? | **Active?=true**; **keep Schmidt visible** on public standings (do not add exclusion filter) |
| SC-014 | Quiz path A (PDF) vs B (attachment-less)? | **Option B** — attachment-less; no Quiz Result PDF field; no fake attachment; use existing 067 path |
| SC-035 | Empty-week parent email policy? | **`send_short`** — short no-activity reminder; do not suppress; do not send full normal weekly summary |

---

## 8. Superseded and Duplicate Items

Map older IDs into SC items so they are not tracked as separate unfinished work.

| Older ID(s) | Maps to | Notes |
|-------------|---------|-------|
| C-020, C-020a, C-020b, K-M4 | SC-001, SC-006, SC-007 | ETF / scenarios |
| C-019 | SC-003, SC-004, SC-069 | Schmidt + Testing views |
| H-005, C-011, K-M2 | SC-035–SC-041, SC-045 | Automatic weekly email |
| C-009, V2-003 (partial) | SC-013, SC-014, SC-017 | Quiz / HW email presentation overlap with SC-054 |
| LA-000, LA-001, LA-002 | SC-018–SC-020 | Learning Activities |
| V2-002, C-021 | SC-021–SC-023, SC-034 | Config-over-code / grade bands |
| V2-005, V2-006, V2-007, C-014 | SC-024–SC-025, SC-082, SC-140 | Season number tuning |
| C-012, C-024, C-026 | SC-046–SC-053, SC-049 | Schema ownership / keys / tutorials |
| C-022, V2-003, V2-004 | SC-043, SC-054, SC-117 | Presentation fields |
| C-010 | SC-068, SC-069 | Active? hardening |
| C-017, C-018 | SC-060–SC-065 | Intake + calendars |
| C-013, C-013-SEC, C-070a informal, K-M3 | SC-094–SC-101, SC-141 | Storage |
| C-023 | SC-097, SC-098, SC-100 | Hash dedupe / retirement |
| C-025 Stage 17 | SC-074, SC-084–SC-091 | Recording credit |
| C-025 117f / webhook deferred | SC-088 | Approval email |
| S16 117a/117b, K-M1 (stale), old E2E J4–J6 | SC-136 → SC-074 | Superseded design |
| V2-014b | SC-042 | Email Message Center |
| C-027 | SC-044 | Major-event notifications |
| V2-008, V2-009, V2-010 | SC-109, SC-102+, SC-133 | Manual / hub / preseason comms |
| V2-011, V2-012 | SC-134, SC-135 | Audit pack + dry-run |
| V2-001 | SC-125 → SC-067 | Archive/clone superseded by Program Instance |
| V2-013 | SC-067 | Multi-year |
| V2-015 | SC-122 | DEV base (optional now) |
| H-001, C-006 | SC-124, SC-083 | Achievement dedupe |
| H-002, K-H1 | SC-027, SC-076 | 066 milestones |
| H-003/H-004/H-006, C-015/C-016 | SC-127–SC-129 | Low deferred |
| V2-028 | SC-130–SC-132 | Media kits |
| C-001–C-003, C-008 | SC-123 | Wave 0 historical complete |
| C-004/C-005/C-007 | SC-142 | Not needed after wipe |
| Softr cutover (Obsolete) / indexing / publish-flag rename | SC-114 Superseded; SC-115; SC-144 | Web cluster — Softr not a launch gate |

**Historical conflicts and their current disposition (do not re-open as separate work):**

| Topic | Newer truth | Stale sources |
|-------|-------------|---------------|
| Zoom recording | PROD **117** = approval email → Make **117f** (SC-088). Stage 17 credit scripts are design alternatives (SC-074 / SC-086). Live Zoom XP = **101**. | Older docs that call the orchestrator “Automation 117 ON” are stale — see §1A / §9L |
| C-013 video | PROD E2E done historically (SC-094) | Brief Wave 7 queued; some close-out “open” rows |
| H-002 / 066 | The v3.3 `createRecords` failure is historical; current controlled 066 evidence is recorded in the dated release evidence and must be verified against live Airtable state | Older “paste pending” / “checkbox didn’t fire” briefs |
| C-011 | Repo ready (SC-035+) | Backlog plain “queued” without repo-ready nuance |
| C-023 / 116 | Historical installation and DEV evidence remain evidence only; current live state belongs to Airtable and the named release package | Older install and paste queues |
| DEV-first workflow | Remains the repository guardrail; this reconciliation made no live-system change | Historical PROD-first operating-mode packet |
| Testing Scenarios / 115 | Controlled PROD proof for 115 v2.1 is recorded in §2A; one explicit checked request creates one Submission by design | Older “never paste 115” or v2.0 status text |

---

## 9. Work Packages

### 9A. Foundation Reset Pack (empty PROD) — **EXECUTED 2026-07-23** (docs/schema/Schmidt)

Still open from that pack: **115 paste**, remaining **Testing views**, leaderboard Schmidt exclusion view filter.

### 9B. DEV↔PROD Automation Reconciliation — **SUPERSEDED IN PART by overnight Agent 1 baseline (2026-07-23)**

**Prior deliverables (still useful history):** `docs/foundation-reset/DEV-PROD-AUTOMATION-RECONCILIATION-2026-07-23.md` + `.json`

**Overnight Agent 1 live baseline (controlling for current PROD facts):** `docs/overnight/testing-integrity/CURRENT-PROD-BASELINE.md`

| Prior recon claim | Overnight Agent 1 claim |
|-------------------|-------------------------|
| PROD 50/50; no 115 | **115 installed**; ~4 free slots |
| Delete 112 first to free 115 | 115 already live-tested (dry+live PASS) |
| Do not delete 032/033/063/111 for capacity | Baseline claims **032, 033, 063, 111 deleted** (plus **043**) |
| 013/020/030 upgrade open | Baseline claims **013, 020, 030** replaced with newer versions |

**Required Mike action:** UI-attest the Agent 1 delete/upgrade set before treating SC-058/SC-059 as Complete. Earlier “do not delete 032/033/063/111” guidance and the overnight baseline **conflict** — do not ignore.

**Historical next package (superseded for 118/119):** `docs/next-wave/data-model/MIKE-ACTIONS.md` — the old v1.5 paste instruction is retained as history. Current 118/119 v1.7 installation, restored production inputs, schedules, and no-target proofs are recorded in the 2026-08-08 reconciliation; positive arming still awaits an eligible completed Week/package.

### 9C. Overnight multi-agent run — **RECONCILED 2026-07-23** (Agent 6)

**Deliverables:** `docs/overnight/FINAL-OVERNIGHT-RECONCILIATION.md`, `docs/overnight/MIKE-ACTIONS-TOMORROW.md`, `docs/overnight/web-integration/*`

Confirmed direction preserved: PROD active; Schmidt visible; Weeks manual; website (`/shoot`) reads live config; Softr Obsolete / Not Used; athlete auth / noindex remain Mike decisions.

### 9D. Next-wave Agents 9–12 + Agent 13 final reconciliation — **2026-07-24**

**Deliverables:** `docs/next-wave/final-reconciliation/` · packages under `docs/next-wave/{automation-ownership,config-selection,homework-pipeline,was-email}/`

Key corrections applied: Config year registry (no collapse); 063/111 supersession classifications; 020 v3.0.0 canonical; weekly email `118→072→119→074→Make` verified; formula-only XP Dedupe Keys; WAS hybrid creators; dual-writer inventory.

### 9E. Repository completion packs — **2026-07-25** (PR #43 + PR #44)

**PR #43** (`cursor/sc-completion-threshold-date-311c`) — canonical automation code:

| Package | Status | Evidence |
|---------|--------|----------|
| **SC-049 / XP-D1 Weekly Threshold writer** | **Live Tested in PROD** | **035 v1.2** pasted; Schmidt first-award 3 created + duplicate rerun 0/3; automation **OFF** pending PR #50 merged-source reconciliation; evidence `2026-08-03-035-v1.2-schmidt-live-proof.md` |
| **SC-021 / 057 Denver date keys** | **Installed in PROD** | **057 v1.5** installed/running (includes v1.4 Denver Intl helper + unloadData guard); live Perfect Week fixtures still open — `057-perfect-week-v1.5-live-verification.md` |
| **SC-002 fixtures SCN-021–026** | Built in Repository | HW/Video/Zoom/Threshold fixtures; **not** Live Tested |

**PR #44** (`cursor/prod-completion-pack-cbb3`) — stacked on #43; unique ops pack (no duplicate 057 code):

| Package | Result |
|---------|--------|
| Public `/shoot` smoke (SC-102) | **Live Tested** — all routes 200 + health tokenValid |
| 067 Option B install packet (SC-013/014) | **Live Tested in PROD** (2026-08-04) — see Package 02 evidence |
| 057 v1.4 paste runbook | Points at PR #43 code + `057-PERFECT-WEEK-PROD-PASTE.md` |
| SCN-027/028 quiz fixtures | **Built** |
| Access blocker doc | Historical — PAT available for Package 02 |

**Not claimed Complete / season-enabled for 035:** Automation remains **OFF** until Mike enables.
**067:** Live Tested Option B (SC-013/014). **057 v1.4:** Still Ready for PROD Paste.
**Next:** Paste **057 v1.4** → Schmidt Denver Perfect Week boundary → enable 035 only when approved → SC-075/076 → SC-077.

### 9F. Landing domain / navigation branding audit — **2026-08-04** (SC-149)

| Field | Value |
|-------|--------|
| **Status** | **Built in Repository** (not Installed / Live Tested until Vercel deploy + env confirmed) |
| **Official landing** | `https://www.fairfieldbasketballclub.com` |
| **Shooting Challenge route** | `https://www.fairfieldbasketballclub.com/shoot` |
| **Retired primary destination** | `https://www.hoopchallenges.com` (and typo `hooopchallenges.com`) |

**What changed (active production code / config examples):**

| Area | Change |
|------|--------|
| Defaults | `PUBLIC_LANDING_ORIGIN` / `resolveLandingUrl` / `resolveSiteUrl` → Fairfield; never fall back to Hoop Challenges |
| Chrome | Header logo, wordmark, footer branding, `BackToHubLink` (“Home”) → Fairfield landing |
| Env examples | Root + `web/.env*.example` use Fairfield for `NEXT_PUBLIC_LANDING_URL` / `NEXT_PUBLIC_SITE_URL` |
| Active docs | `APP_CONTEXT.md`, `docs/deployment-notes.md`, `docs/PROJECT_STATE.md` URL table, selected `web/docs/*` |

**Tests added/updated:**

1. Logo → `https://www.fairfieldbasketballclub.com` (Playwright + chrome contract)
2. Header/footer landing links correct (Playwright + source contract)
3. No active code defaults to Hoop Challenges (`app-config` + chrome tests)
4. Env-variable normalization (legacy hosts, typo host, blank, malformed)
5. `/shoot` application path intact (`resolveSiteUrl`, `withBasePath`, Playwright URL)
6. Internal SC nav stays app-relative (not redirected to landing)

**Unresolved / Mike follow-ups:**

- Confirm Vercel production env vars are Fairfield (code rewrites legacy values, but env should match).
- Live smoke after deploy (logo + footer + `/shoot` routes).
- Historical docs/evidence that still mention `hoopchallenges.com` remain **archives** — do not treat as active config.
- Shared `BRAND_STANDARDS.md` still lists Hoop Challenges as public site (canonical copy lives in landing repo) — synchronize via approved cross-repo brand update when ready.

### 9G. Production `/shoot` smoke package — **2026-08-04** (SC-118)

**Deliverables:** `web/tests/production-smoke.spec.ts`, `web/scripts/http-smoke.mjs`, `docs/testing/PRODUCTION-SMOKE-RUNBOOK.md`, evidence under `docs/testing/evidence/PRODUCTION-SMOKE-2026-08-04.md`

| Check | Result |
|-------|--------|
| Production build | PASS (evidence date) |
| Vitest | PASS (evidence date) |
| Playwright local smoke | PASS (evidence date) |
| Playwright prod smoke (`fairfieldbasketballclub.com/shoot`) | PASS (evidence date; read-only against then-current PROD) |
| HTTP prod smoke | PASS — Fillout + landing URLs exact; assets 200; API `tokenValid` |
| Material console errors | None on smoked routes |
| Broken links / duplicated `/shoot/shoot` | None found |
| SC-118 | **Built in Repository — smoke suite successfully executed against current PROD** (not Installed/Live Tested for this integration branch until Mike deploys + checks) |

**Remaining launch risks (separate work packages):** SC-112 athlete auth (dashboard still demo); SC-115 noindex decision; SC-109 Game Manual PDF env if Adobe URL still unset; catalog Presentation fields (SC-054/SC-117); optional CI wiring for `npm run test:smoke`.

### 9M. Communications Hub WELCOME email integration — **2026-08-08**

| Field | Value |
|-------|--------|
| **Scope** | Shooting Challenge enrollment **WELCOME** and counted Submission **DAILY_SUBMISSION** handoffs to **Communications Hub** (not Make.com) |
| **PROD flow** | `Email Handoff Queue` → shared Automation **079** → Communications Hub → Resend → **Delivery** audit record |
| **Make.com** | **OFF** — must remain off for welcome delivery |
| **Controlled test** | **Live Tested in PROD** — end-to-end handoff, Hub dedupe (parent/athlete same email → one Delivery), replay protection (same Handoff Key → no duplicate send) |
| **Participant sends** | **Not authorized** — **Test Mode?** + allowlist only |
| **Hub content** | Hub **WELCOME** template renders subject/HTML from `templateKey: WELCOME` + Payload JSON (`athleteName`, `programName`, `message`) — final approved design pending |
| **079 contract** | Queue supplies Event Type, Template Key, Handoff Key, Source Table/ID, Recipients JSON, Payload JSON, **Test Mode?** — **not** subject, HTML, plain-text, or `sendMode`; v2.0 accepts WELCOME plus exact `DAILY_SUBMISSION|SUBMISSIONS|{Submission Record ID}` keys |
| **Accepted vs delivery** | Queue/Hub Event **Accepted** = intake only; success = one Hub **Delivery** in **`Sent`**, provider id, one attempt, no stale error/retry fields |
| **Source-table issue** | Earlier Hub Event missing source table = **Hub-side mapping omission** — **not** a 079 defect; no 079 change required |
| **Legacy build** | Automation **075** still builds welcome package on Enrollments — **does not send**; optional input to queue payload |
| **Repo source** | Automation **079 v2.0** is now authoritative in GitHub as the shared WELCOME/DAILY_SUBMISSION dispatcher; Production replacement remains pending |
| **SC-079 naming** | Completion item SC-079 (*gate blocking*) uses Automation **042** — unrelated to Automation slot **079** |
| **Docs** | `docs/communications-hub/WELCOME-EMAIL-INTEGRATION.md` · `docs/deploy-checklists/WELCOME-EMAIL-ACTIVATION-CHECKLIST.md` · `docs/deploy-checklists/WELCOME-EMAIL-CONTROLLED-TEST-RUNBOOK.md` |
| **Status** | **Installed in PROD + Live Tested (controlled only)** — participant activation blocked on checklist § activation doc |

**Proven live (controlled test only):**

1. 079 posts WELCOME handoff from Email Handoff Queue to Communications Hub.
2. Hub creates Hub Event, sends via Resend, writes Delivery audit.
3. Duplicate parent/athlete email → one Delivery.
4. Same Handoff Key replay → no second send.
5. DAILY_SUBMISSION forwarding is covered offline; no live Hub call or Production rerun is claimed by this repository change.

**Still required before participant welcome emails:**

1. Final approved welcome copy and branding.
2. Hub **WELCOME** template implementation and review (Hub-owned subject/HTML from `templateKey: WELCOME`).
3. Recipient / consent / authorization review.
4. New controlled test after template change.
5. Explicit Mike approval for non-test participant sends.
6. Post-send Delivery audit and opt-out/suppression verification.

**Do not claim:** participant-wide welcome sends enabled; Make.com welcome path active; **Accepted** alone equals delivered email; operator supplies subject/HTML/`sendMode` on the queue row.

### 9M.1. Communications Hub DAILY_SUBMISSION migration — **2026-08-12**

| Field | Value |
|-------|-------|
| **Scope** | Automation 076 creates one `DAILY_SUBMISSION` Email Handoff Queue row; Hub owns rendering and delivery |
| **Handoff key** | `DAILY_SUBMISSION|SUBMISSIONS|{Submission Record ID}` |
| **079** | Shared dispatcher v2.0; preserves WELCOME and now accepts exact DAILY_SUBMISSION keys |
| **077** | **Deleted from Production** (2026-08-13) | Retired Make/Gmail daily-submission path; automation slot recovered. GitHub source archived. Daily email uses Hub path (076 → 079). |
| **Payload** | Required: `athleteName`, `activityDate`, `weekName`, `shots`, `makes`; optional: `submissionXp`, `submissionXpStatus`, `programName`, `message`, `shootingPercentage`, `weeklyShots`, `weeklyGoal`, `weeklyGoalPercentage`, `weeklyXp`, `currentStreak`, `currentLevel`, `nextLevel`, `homeworkSubmitted`, `homeworkAssignments`, `homeworkReviewStatus` |
| **Trigger** | Recommended trigger requires `Build Daily Email Now?` checked plus `Count This Submission?` evaluating `1`; 031 validates `Simple Total`/`Detailed Shooting`, final summary linkage, eligible XP-link repair, and final validation; 076 applies the same guard and consumes/clears the signal |
| **Status** | **Repository-ready / controlled Production promotion blocked pending trigger-owner/timing verification** — 076 v8.5 single-select write correction complete; no Production paste performed |
| **Promotion** | [`docs/deploy-checklists/PKG-006-DAILY-SUBMISSION-HUB-HANDOFF.md`](./deploy-checklists/PKG-006-DAILY-SUBMISSION-HUB-HANDOFF.md) |

### 9N. GitHub Issue #116 full audit — **2026-08-08**

The dated audit packet [`docs/prod-completion/2026-08-08/ISSUE-116-FULL-AUDIT.md`](./prod-completion/2026-08-08/ISSUE-116-FULL-AUDIT.md) is the current repository-wide truth and execution handoff.

- Core submission chain: **023 Live Tested**; 031 and 010 repository repairs are **Built-Merged / Needs UI Proof**.
- Remaining high-risk defects: orphan/eligibility-loss XP (**#100/#102**), video source validation (**#101**), downstream homework/email source safety (**#104/#105**).
- Repository contract drift was repaired: tests now assert current **031 v3.5** and **118/119 v1.7** contracts where applicable.
- Repository evidence does not prove Airtable editor installation, trigger configuration, Make state, Vercel environment values, or live email delivery.
- The audit packet contains the ranked blockers, shortest execution path, exact UI-only actions, and stale queue removals.

### 9L. Automation 117 ownership reconcile — **2026-08-05**

| Field | Value |
|-------|--------|
| Root cause | Repository treated Stage 17 credit orchestrator (+ modular 117a/117c) as active Automation **117**; PROD slot **117** is the recording-approval email → Make handoff |
| PROD Automation 117 | `117 — Zoom — Send Recording Approval Email to Make` (**v1.1** / 2026-07-20) |
| Canonical repo file | `airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js` |
| Make identifier | `117f` (`automationNumber` / `templateKey=ZOOM_RECORDING_APPROVED`) — **not** an Airtable slot |
| Disposition | Orchestrator + 117a–e moved to `_design-alternatives/stage17-modular-reference/` (not deleted — Stage 17 offline evidence) |
| unloadData pack correction | §9K paste targets are **031, 035, 042, 057, 114, 118, 119** only — do **not** paste orchestrator over PROD 117 |
| Status | **Built in Repository** — no PROD paste required when Airtable already matches v1.1 |
| Offline tests | `node tests/zoom/automation-117-recording-approval-email.test.js` |
| Runbook | `docs/deploy-checklists/117-zoom-recording-approval-email.md` |

### 9K. Active automation unloadData runtime compatibility pack — **2026-08-05**

| Field | Value |
|-------|--------|
| Defect class | Bare `QueryResult.unloadData()` unsupported in current Airtable automation runtime |
| Prior live failures that established the defect | Automation **001** (`athletesQuery.unloadData`), Automation **002** (`gradeBandQuery.unloadData`) — already fixed (v5.2 / v8.2); not modified in this pack |
| Affected automations (this pack — PROD paste) | **031, 035, 042, 057, 114, 118, 119** |
| Correction (2026-08-05) | Earlier drafts incorrectly listed **117 / 117a / 117c**. Live PROD **117** is email-only (no unloadData). Orchestrator/117a/117c are design alternatives — **do not paste** over PROD 117. See §9L. |
| Repo fix | Each paste-target script gains `unloadQuerySafe()`; bare cleanup replaced; `finally` where the script owns the query lifecycle |
| Status | **Built in Repository** — Airtable paste still required for the seven paste targets; live PROD tests still required |
| Offline tests | `node tests/airtable-runtime/active-automation-unload-compat.test.js` + related version-pin suites |
| Paste runbook | `docs/deploy-checklists/active-automation-unloadData-compat.md` |
| Exclusions | PROD email Automation 117; `_design-alternatives/*`; `_superseded/*`; 001/002 already remediated |

### 9J. Automation 002 unloadData runtime fix — **2026-08-05** (SC-023 / enrollment Grade Band)

| Field | Value |
|-------|--------|
| Defect | PROD Automation 002 failed while assigning Grade Band for 2026–2027 Testing Schmidt enrollment |
| Enrollment | `recCyFEPeATOVNlr9` |
| Athlete | `recgqVstObQRzgXJF` |
| Error | `gradeBandQuery.unloadData is not a function` at debugStep `8 - Find Matching Grade Band` |
| Root cause | Bare `gradeBandQuery.unloadData()` is not available in this Airtable automation runtime (same class as Automation 001 v5.2) |
| Repo fix | **002 v8.2** — `unloadQuerySafe()`; optional typeof guard; `finally` cleanup that cannot abort successful Grade Band match/assign or mask a real match error |
| Status | **Built in Repository** — PROD paste + live rerun still required (do not mark Live Tested/Complete from repo alone) |
| Offline tests | `node tests/enrollment-intake/automation-002-unload-compat.test.js` |
| Canonical paste path | `airtable/automations/shooting-challenge/002-enrollment-intake-and-setup-assign-grade-band-initial.js` |
| Paste runbook | `docs/deploy-checklists/002-unloadData-runtime-fix.md` |
| Follow-up | ~~Additional bare `.unloadData()` in 031–119~~ → remediated in §9K (2026-08-05). Superseded archive copies remain excluded. |

### 9I. Automation 001 unloadData runtime fix — **2026-08-05** (SC-060 / SC-061)

| Field | Value |
|-------|--------|
| Defect | PROD Automation 001 failed on 2026–2027 Testing Schmidt enrollment |
| Enrollment | `recQP4N5acTdK40uZ` |
| Error | `athletesQuery.unloadData is not a function` at debugStep `10 - Update Existing Athlete` |
| Root cause | Bare `queryResult.unloadData()` is not available in this Airtable automation runtime |
| Repo fix | **001 v5.2** — `unloadQuerySafe()`; optional typeof guard; finally cleanup that cannot abort successful match/link |
| Status | **Built in Repository** — PROD paste + live rerun still required (do not mark Live Tested/Complete from repo alone) |
| Offline tests | `node tests/enrollment-intake/automation-001-unload-compat.test.js` |
| Canonical paste path | `airtable/automations/shooting-challenge/001-enrollment-intake-and-setup-find-or-create-athlete-and-link-enrollment.js` |
| Paste runbook | `docs/deploy-checklists/001-v5.2-unloadData-runtime-fix.md` |

### 9H. Mobile usability + accessibility package — **2026-08-04** (SC-148)

**Status:** **Built in Repository** (not Installed / Live Tested until Vercel deploy + Mike smoke)

| Area audited | Findings fixed | Remaining / notes |
|--------------|----------------|-------------------|
| Homepage hero | Full-width mobile CTAs; clearer hero muted contrast token | No redesign; brand structure preserved |
| Registration gateway | 44px CTAs; also pinned at top of mobile menu | Fillout remains external (`target=_blank`) |
| Header / mobile menu | Replaced horizontal-scroll nav with dialog menu; Escape + focus return; body scroll lock | Desktop/tablet keep primary + More dropdown |
| Logo / nav links | Logo hit area ≥44px; labelled logo/wordmark; More menu aria-label | Fairfield landing links from SC-149 |
| Buttons / CTAs | Default/sm/icon sizes raised to 44px+ | Dense `xs` left for non-primary chrome |
| Forms / inputs | Existing `.sc-input` already 44px; focus ring strengthened | Few public forms today |
| Cards / standings | Table header icons decorative; mobile card list unchanged structurally | Live leaderboard needs `AIRTABLE_API_TOKEN` in env |
| Athlete dashboard | Profile text link underlined + min height | Auth still SC-112 Decision Needed |
| Footer | Quick links use `.sc-text-link` (underlined, blue) | Fairfield home link |
| Loading / empty / error | Clearer copy hierarchy; `role=status` / `role=alert`; mobile-friendly action stacking | — |

**Viewports:** 375×812, 768×1024, 1440×900

**Unresolved follow-ups (non-blocking for this package):**
- Full axe-core audit not yet wired (tracked under SC-118)
- Contrast of decorative court-line overlays on hero remains a visual-design judgment call
- Athlete auth/dashboard real data blocked on SC-112
- Production install = merge + Vercel deploy (Root Directory `web`)
- Do not use page-wide `overflow-x: clip` in ways that hide tables/leaderboards

---

## 10. Post-app / backlog considerations

### Decouple Daily Submission email readiness from Automation 031

**Status:** **POST-APP consideration — not a blocker for Shooting Challenge
completion, Production promotion, or PKG-006 controlled proof.**

**Current design:** Automation 031 is the final proven processing checkpoint.
After validating the counted Submission's canonical Enrollment, Week, Program
Instance, Weekly Athlete Summary linkage, and eligible XP links, it checks
`Build Daily Email Now?`. Automation 076 consumes that signal and creates the
`DAILY_SUBMISSION` Communications Hub handoff.

**Reason for later review:** Although safe and practical, Automation 031 belongs
to Weekly Summary processing and now also owns the Daily Submission
email-readiness signal.

**Future options to evaluate:**

- A formula-backed `Daily Submission Processing Complete?` readiness field
- A dedicated workflow coordinator
- Another existing final-processing owner
- A durable source-status/writeback design that prevents premature sends and
  duplicate processing

**Acceptance criteria for any future change:**

- No new Airtable automation slot unless justified
- Email cannot trigger before canonical Submission processing finishes
- Pending XP remains supported
- Deterministic queue/replay protection remains intact
- 031 returns to Weekly Athlete Summary responsibilities only
- 076 and shared 079/Communications Hub architecture remains intact

This is technical-debt cleanup only. It must not block merging the v3.8
hotfix, installing 031/076, running the controlled Production Daily Submission
test, completing PKG-006, or finishing the app.

---

## Maintenance

When finishing an SC item:

1. Update **Current Status**, **What Is Still Needed**, **Last Updated**, and dashboard counts.
2. Add evidence links (deploy checklist, record IDs, commit SHA).
3. Mark Complete only when repo + PROD install + live PROD test are all true (where applicable).
4. Prefer editing this file over reopening parallel status in the old backlog.

---

*End of Shooting Challenge Completion Master*
