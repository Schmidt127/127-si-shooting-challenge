# SC-112 / SC-023 — Remaining App Work Audit

**Date:** 2026-09-03  
**Branch:** `audit/sc-112-sc-023-remaining-app-work`  
**Authority:** Read-only audit from `origin/master` @ `41c77a236b264b1309ed3b26735f968701cd003f`  
**Mode:** No Airtable writes/deletes · no formula changes · no automation edits · no emails · no season-sim execute · no product code changes · no merge/deploy  

**Related backlog:** SC-112 (athlete auth + private dashboard), SC-023 (Grade Bands monitoring), plus Mike-identified focus areas A–F below.  
**Companion season-sim truth (docs-only, not re-run here):** [`SC-SEASON-SIM-002-FINAL-LIVE-STATUS-RECONCILIATION.md`](./SC-SEASON-SIM-002-FINAL-LIVE-STATUS-RECONCILIATION.md) (may be untracked on main checkout).

Status labels: `COMPLETE` · `PARTIAL` · `GAP` · `DESIGN-ONLY` · `DO-NOT-TOUCH` · `NO-GO`

---

## Task Classification (audit)

| Field | Value |
|-------|--------|
| Type | Read-only remaining-work audit + report |
| Priority | P1 (product polish + policy alignment) |
| Difficulty | Medium |
| Owner | Cursor (audit) → Mike / ChatGPT / Hub for follow-on |
| Dependencies | Hub templates repo; Production UI attestations |
| Backlog ID | SC-112 / SC-023 (plus A–F operational items) |
| Phase | Phase 5 Close / Phase 3 planning inputs only |
| Correct tool | Cursor (repo audit) |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Review findings; authorize separate PRs / OMNI / Hub work |

---

## Executive summary

Six focus areas remain in different maturity states:

| Area | Verdict | Priority |
|------|---------|----------|
| **A. Recorded Zoom approval email** | Workflow code path is Live (117→079→Hub); **visual redesign lagging** vs Daily/Welcome/Video/Homework | **P1** styling (Hub PR) |
| **B. Game Log XP filter** | Private dashboard has coarse filters; public Game Log has none; categories need redesign | **P2** design → web PR |
| **C. Automation 067** | **Still needed** (HW17 reflection quiz → HC). Do **not** retire without proof | **P3** attestation only |
| **D. Homework timing policy** | **Material policy gaps** vs 020/065/web/057 | **P0** policy + code/automation PRs |
| **E. Award Recipients visibility** | Private dashboard **implemented**; public surface **missing** | **P2** web PR + docs |
| **F. Season Simulation readiness** | Prior execute COMPLETE; **next execute NO-GO** until formula re-paste + cleanup | **P0** ops (not code) |

---

## A. Recorded Zoom approval email

### Current state

- **Queue producer (this repo):** `airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js` **v2.1** — creates Email Handoff Queue only.
  - Event Type: `ZOOM_RECORDING_APPROVAL`
  - Template Key: `ZOOM_RECORDING_APPROVED`
  - Handoff Key: `ZOOM_RECORDING_APPROVAL|ZOOM_ATTENDANCE|{ZA}`
  - Does **not** call Make/Gmail/Resend; does **not** award XP.
- **Dispatcher:** Automation **079** → Communications Hub → Resend ([`docs/integrations/email-send-plane.md`](../integrations/email-send-plane.md)).
- **Production:** CURRENT-TRUTH + automation-index: **117 v2.1 Live**; parent-email cutover packet lists ZOOM path with `testMode` UI steps still operator-owned ([`parent-email-live-cutover-2026-09-02.md`](../deploy-checklists/parent-email-live-cutover-2026-09-02.md)).
- **Sept 1 redesign scope** ([`sc-parent-athlete-email-redesign-2026-09-01.md`](../deploy-checklists/sc-parent-athlete-email-redesign-2026-09-01.md)) covered **Daily, Video Feedback, Homework Feedback, Weekly** only — **Zoom Recording Approval was not included**.
- **Welcome** has its own Hub path (`WELCOME` via 078A). Zoom remains the outlier vs the redesigned sibling templates.
- **Hub Templates catalog** still missing a metadata stub for `zoom_recording_approval` ([`TEMPLATES-REGISTRY-AUDIT-2026-08-17.md`](../communications-hub/TEMPLATES-REGISTRY-AUDIT-2026-08-17.md)) — registry gap only; not a send-path failure.

### Correct template / source file

| Layer | Location | Role |
|-------|----------|------|
| SC payload / trigger | `airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js` | Queue row + payload fields only — **do not change trigger/recipient logic for styling** |
| Hub render (authoritative HTML/subject) | **`Schmidt127/communications`** (`127si-communications-hub`) — template key `ZOOM_RECORDING_APPROVED` (renderer / React Email templates; card tokens at `communications/emails/lib/card-tokens.js` per FUT-043 docs) | **Styling / layout PR belongs here** |
| Historical Make | Make 117f / Gmail | Retired for email — ignore for visual work |

### Visual structure comparison (docs/code)

| Template | Hub key | Redesign status (2026-09-01) |
|----------|---------|------------------------------|
| Daily Submission | `DAILY_SUBMISSION` | Redesigned (SC_CARD / SectionCard system) |
| Welcome | `WELCOME` | Hub-owned; separate activation path |
| Video Feedback | `VIDEO_FEEDBACK` | Redesigned |
| Homework Feedback | `HOMEWORK_FEEDBACK` | Redesigned |
| Zoom Recording Approval | `ZOOM_RECORDING_APPROVED` | **Not in redesign packet** — expect older / thinner layout vs siblings |

### Gaps

1. Zoom email not aligned to shared Hub design system (brand header gradient, SectionCard, footer copy pattern).
2. Controlled Live `testMode=false` proof for 117 path may still be pending Mike cutover UI (docs say GitHub ready; Live inputs operator).
3. Catalog stub for Zoom in Hub Templates table optional hygiene.

### Recommendation (styling ONLY)

In **Communications Hub** repo, restyle `ZOOM_RECORDING_APPROVED` to match Daily / Homework / Video:

- Shared `EmailHeader` / `EmailFooter` / `SectionCard` / `SC_CARD` tokens (`#0034B7`, `#FF8B00`, `#262626`).
- One blue activity card: meeting name, meeting date/time, attendance method (Recording Quiz), XP amount if present in payload.
- One orange “what’s next” card: short parent-facing next step (watch recording / keep streak) — no internal IDs.
- Footer first line consistent with Video Feedback pattern.
- **Do not** change 117/079 trigger conditions, recipients, Event Type, Template Key, or Handoff Key.

### Priority · Separate PR?

- **P1** visual polish  
- **Yes — separate PR in `communications` Hub repo** (not this SC repo). Optional tiny SC docs PR to note Zoom included in redesign.

---

## B. Game Log XP filter

### Current state

**Private dashboard** (`web/components/dashboard/dashboard-xp-section.tsx`):

| Current chip | Match heuristic |
|--------------|-----------------|
| All | everything |
| Submissions | `/submission\|shooting base/i` |
| Homework | `/homework/i` |
| Video | `/video/i` |
| Zoom | `/zoom/i` |
| Streaks | `/streak/i` |
| Milestones | `/milestone\|threshold\|weekly threshold/i` |
| Awards | `/perfect week\|manual bonus\|achievement/i` |

**Public Game Log** (`web/components/athlete/recent-activity-log.tsx`): pagination only — **no category filters**.

**Loader** (`web/lib/data/xp-activity-loader.ts`): enrollment-scoped Active XP Events; excludes inactive + `Duplicate - Remove`; uses `XP Reason Public` / `XP Source` for display. Source Keys stay server-side (not surfaced in presentation helpers).

### Desired category model (design)

| UI category | Maps from XP Source / bucket (approx) | Notes |
|-------------|----------------------------------------|-------|
| Shooting Submission | `Submission Base` | Public: only when linked submission counts / Active |
| Homework | `Homework Completion` | |
| Video Feedback | `Video Submission` | |
| Zoom | `Zoom Attendance:*`, `Zoom Recording` | Collapse live + recording for parents |
| Streak | Streak sources | |
| Weekly Threshold | `Weekly Threshold *` | Split from Shot Milestone |
| Shot Milestone | `Shot Milestone` | |
| Perfect Week | `Perfect Week` | Split from current “Awards” bucket |
| Manual Award | `Manual Bonus` / manual | Private-first; public only if Reason Public approved |

### Public vs private behavior (proposed)

| Surface | Rows shown | Filters |
|---------|------------|---------|
| **Public** profile Game Log | Active XP Events with parent-safe copy only (`XP Reason Public` / public presentation). No Source Keys, Airtable IDs, coach-private notes, or inactive/duplicate events. Prefer “publicly approved activity” = Active + public reason path already used. | Optional same category chips; default All |
| **Private** dashboard | Authorized enrollment XP (same Active filter today; may later include authorized private-only Manual rows if product wants — still no Source Keys in UI) | Full category set |

### Gaps

1. Current chips merge Weekly Threshold + Shot Milestone; Perfect Week + Manual + Achievement.
2. Labels do not match Mike’s category list.
3. Public surface lacks filters entirely.
4. No shared category taxonomy module (private chips are ad hoc regex).

### Recommendation

1. Add `web/lib/data/xp-category.ts` (or similar) with canonical category IDs + `match(row)` from `sourceLabel` / bucket — **no Source Key exposure**.
2. Reuse on private dashboard + public Game Log.
3. Keep filtering client-side on already-loaded rows for v1; server `?category=` later if needed.
4. Design-only until product signs taxonomy — then one focused web PR.

### Priority · Separate PR?

- **P2**  
- **Yes — separate web PR** after short design sign-off (ChatGPT/Mike).

---

## C. Automation 067

### Current state

| Item | Value |
|------|--------|
| File | `airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js` |
| Version (repo) | **v3.5** (2026-08-20) — V2 structure; business logic from v3.4 |
| Purpose | Final Reflection Quiz Submission → link/create **Homework Completion** for **HW17** (PHA-first); optional attachment bridge; Option B zero-asset allowed |
| Trigger | Final Reflection Quiz Submissions (ready) + `recordId` |
| Writes | HC (Enrollment, Homework, PHA, Week, quiz link, statuses, WAS link); quiz Processing Status; optional Submission/Assets |
| Does **not** | Award XP (064/065), standard asset→HC (020), Make upload (070a) |
| Index | automation-index: **repo v3.4**; Production paste of v3.5 **not confirmed** in CURRENT-TRUTH |
| History | PROD Option B live-tested 2026-08-04 (v2.0 evidence under `docs/testing/evidence/2026-08-04-package-02-critical-pastes/`) |

### Active / obsolete / duplicated?

| Question | Answer |
|----------|--------|
| Obsolete? | **No** — HW17 reflection-quiz bridge is a distinct product path |
| Duplicate of 020? | **No** — 020 = Submission Assets homework path; 067 = Final Reflection Quiz |
| Still needed? | **Yes**, while HW17 / Final Reflection Quiz remains in curriculum |
| Safe to retire? | **Only after proof:** HW17 retired **or** replaced by another HC creator **and** live Automations UI shows 067 unused with zero recent runs / no open quiz rows |

### Recommendation

- **Do not disable or modify 067** in this workstream.
- Optional P3: OMNI attestation of Production script version vs GitHub v3.5; update automation-index if Live.
- Retirement proposal requires written proof packet — not available from repo alone.

### Priority · Separate PR?

- **P3** (attestation / docs only)  
- **No product PR** unless version drift paste is authorized. **Do not open a “retire 067” PR.**

### Automation 067 verdict

**KEEP — still needed.** Not obsolete. Not a duplicate of 020. Retirement **not** safe without HW17 sunset proof.

---

## D. Homework workflow timing policy

### Policy (target) vs current implementation

| Policy rule | Current implementation | Gap? |
|-------------|------------------------|------|
| Homework selectable when visible/assigned through PHA | PHA `Active?` + grade-band match on web; 020/067 PHA-first schedule | Mostly OK |
| Complete before / during / after official week | 020 creates/links HC regardless of late; writes late note | Create path OK |
| Late homework = **full credit + normal XP** once satisfactory | **065** blocks XP when `evaluateHomeworkSubmissionDeadline` → `late_ineligible` (`creditEligible: false`) | **GAP — contradicts policy** |
| Grading delay must not punish student | XP Activity Date uses submission activity date (overnight XP-date tests) | Aligned for date stamp |
| Submission Date = when student submitted | HC `Submission Date` / activity date from submission path | Aligned if writers set correctly |
| Grading date must not control weekly eligibility | 064/065 gate on Satisfactory?, not graded-at | Mostly OK for XP create |
| Unsatisfactory = Needs Revision; no HW XP until satisfactory | 064 requires `Satisfactory?`; planHomeworkMultiAssetCompletion sets `unsatisfactory_no_xp` | Aligned (status label may vary) |
| Revisions update existing completion (no duplicates) | 020/067 identity match Enrollment+Week+Library+PHA; multi-match fail-closed | Aligned |
| Late HW counts toward total history, total XP, level gates, private dashboard | Blocked by 065 late gate → missing XP Event | **GAP** |
| Late HW does **not** count toward Perfect Week for original week | **057** counts any linked satisfactory HC for assigned homework — **no submission-date vs week-end check** | **GAP — late can currently help Perfect Week** |
| No double-counting | Source Key `HOMEWORK_XP\|{HC}`; one HC per assignment identity | Aligned |
| Official PHA week + actual submission date coexist in reporting | Web `lateSubmission` flag + due date; public creditEligible false on late without XP | Reporting partially OK; credit semantics wrong vs policy |

### Key code references

- Deadline helper (late → ineligible): `lib/v2-engine-contracts.js` `evaluateHomeworkSubmissionDeadline`; duplicated in **020** and **065**.
- **065** eligibility hard-stop on late (~lines 600–607).
- **020** still creates HC + late note (does not refuse create).
- Web display: `web/lib/data/public-athlete-homework.ts` `resolveHomeworkCreditEligibility` — late without satisfactory/XP → `creditEligible: false`.
- Perfect Week homework: **057** `isHomeworkSatisfactory` only — no late exclusion.

### Required changes (do not implement here)

| Layer | Change | Separate PR? |
|-------|--------|--------------|
| Policy doc | Canonical homework timing + Perfect Week late rules in `docs/v2/03-business-rules.md` (or dedicated policy doc) | Docs PR |
| Contracts | Flip `evaluateHomeworkSubmissionDeadline` late → `creditEligible: true` + timingStatus `late` (or `late_credit_eligible`); update note text | Shared contract + tests PR |
| Automation **065** | Stop blocking XP on late; keep Satisfactory? gate | Automation PR + paste packet |
| Automation **020** | Keep late note; reword note (credit eligible; PW separate) | Same PR as 065 or follow-on |
| Automation **057** | Exclude late HW from Perfect Week for that WAS week (Submission Date / Activity Date after week end or after PHA due — product pick) | Separate PW PR (high risk) |
| Web | Align `resolveHomeworkCreditEligibility` with full-credit-on-satisfactory-including-late; show “Late” badge without denying credit once XP exists | Web PR |
| Tests | Update homework deadline + PW timing contracts that currently assert `late_ineligible` | Same PRs |

### Priority · Separate PR?

- **P0** policy alignment (blocks correct season behavior)  
- **Yes — at least two PRs:** (1) credit/XP late eligibility (contracts + 020/065 + web), (2) Perfect Week late exclusion (057 + tests). Production paste only after DEV/disposable proof.

---

## E. Award Recipients

### Current state — private dashboard

- Loader: `web/lib/data/private-dashboard-loader.ts` → `mapAwardRecords`.
- Shows: award name, date, amount, reason (coach feedback / description), recipient status, delivery status, scope, week label.
- Filters out `Tremendous Test Record?`.
- `publiclyVisible` badge when status ∈ `Approved` | `Sent` | `Delivered` (UI badge only — **all non-test awards still listed privately**).
- UI: `web/components/dashboard/athlete-dashboard-view.tsx` Awards section.

### Current state — public pages

- Enrollment type includes `"Award Recipients"` link field, but **public profile query path does not load or render Award Recipients**.
- No public awards section / no “Published” gate implementation on `/shoot/athletes/[slug]`.
- Catalog Awards table exists in `public-tables.ts`; recipients not exposed publicly.

### Gaps

1. **Missing public implementation** for explicitly Public/Published awards.
2. Docs do not clearly state public award publication field/option (status heuristic used privately may not equal “Published”).
3. SC-127 (scope metadata cleanup) remains Deferred — unrelated but adjacent.

### Recommendation

1. Document publication rule: e.g. only `Award Status` in {Sent, Delivered} **and** an explicit Public/Published flag if/when schema has one — confirm in OMNI before coding.
2. Public profile: optional awards strip for published rows only (name + optional amount/date; no delivery internals).
3. Keep private dashboard as full ledger (current behavior OK).

### Priority · Separate PR?

- **P2**  
- **Yes — web PR** after schema/publication field confirmation (OMNI). Docs can ship with same PR.

---

## F. Season Simulation readiness

### Current state (docs; **not re-run**)

From Master Future Work List + FINAL live-status reconciliation (2026-09-03 afternoon):

| Item | Status |
|------|--------|
| SC-SEASON-SIM-002 Athlete 1 execute T213135Z | **COMPLETE** (claimed) |
| Temporary Season Sim formulas | **Not active** — Production formulas are `NOW()` / `TODAY()` paths; Season Sim **fields** remain |
| Next execute | **NO-GO** until Mike **re-pastes** temporary gated formulas from `tools/season_simulation/FORMULAS-TO-PASTE.txt` / operator checklist |
| Automations 010 / 072 / 073 / 114 | Live versions attested in FINAL recon (010 v10.13, 072 v4.9.1 dynamic, 073 v4.6, 114 v6.2) |
| Prior “072 hardcoded” blocker | **STALE** per FINAL recon |
| Recipient allowlist | Documented / code path intact (CODE-ONLY) |
| Dry-run / offline tests | Documented PASS historically |
| Leftover disposable data | VERIFY athletes on public leaderboard; orphan ACTIVE `SEASON-SIM` XP — **SAFE-TO-CLEAN-AFTER-APPROVAL** |
| Do not restore NOW()-only further | Confirmed — leave Production formulas as-is until next sim prep |

### Remaining blockers (execute only)

1. Re-paste temporary Season Sim formulas (dual-gate).  
2. Authorized disposable cleanup (VERIFY public pollution + orphan SEASON-SIM XP) **or** explicit accept.  
3. New run ID (never reuse cleaned IDs).  
4. Confirm Hub allowlist for any email-on execute policy.  
5. Do **not** modify 003 / 101 / 117 / SC-147 / create 121.

### Priority · Separate PR?

- **P0** ops for next sim  
- **Docs/cleanup helpers PR optional**; formula paste + deletes are Mike/OMNI — **not** a product code PR from this audit.

---

## Repository cleanup status

| Item | Status |
|------|--------|
| Untracked `tools/season_simulation/_*.py` helpers | **Present on main workspace** (~34 underscore helper scripts: audit, cleanup, probe, hub allowlist). **Preserved — do not delete** |
| Untracked season-sim audit markdown under `docs/audits/` | Present on main checkout (COMPLETE / FINAL / MASTER-LIST patch) — preserve until committed via dedicated docs PR |
| This audit worktree | Clean focused branch; report only |

---

## Disposable Airtable cleanup status (docs-only)

| Item | Status |
|------|--------|
| Deletes authorized this session? | **No** — not authorized; none performed |
| Docs say cleanup still needed? | **Yes** — FINAL recon: VERIFY/Athlete1 public leaderboard pollution; leftover ACTIVE SEASON-SIM XP Events; inventory ready for approval |
| Weeks | **Excluded** from disposable cleanup |
| Recommendation | Mike-approved `--apply` / OMNI delete packet only after inventory sign-off |

---

## Items that need separate PRs

| # | Item | Repo | Priority |
|---|------|------|----------|
| 1 | Zoom approval email visual alignment | `communications` Hub | P1 |
| 2 | Homework late = full XP (contracts + 065/020 + web) | SC | P0 |
| 3 | Perfect Week exclude late homework (057) | SC | P0 |
| 4 | Game Log category filter redesign | SC `web/` | P2 |
| 5 | Public Award Recipients (published only) | SC `web/` | P2 |
| 6 | Optional: commit season-sim audit docs + helper hygiene notes | SC docs | P3 |
| 7 | Optional: Hub Templates catalog stub for Zoom | Hub / OMNI | P3 |

## Items complete / must not reopen

| Item | Note |
|------|------|
| SC-SEASON-SIM-002 T213135Z execute | COMPLETE — do not re-execute same run ID |
| Email plane Hub → Resend | COMPLETE — do not restore Make/Gmail parent email |
| Automation **077** Make daily | Retired — do not restore |
| Automation **075** welcome builder | LEGACY RETIRED — live path 078A→079 |
| PROD **117** = approval email (not Stage 17 orchestrator) | Settled — do not paste orchestrator into slot 117 |
| FUT-012 Game Log presentation / FUT-031 Extra Credit tagline | COMPLETE |
| SC-023 Grade Bands linked source of truth | **Monitoring** — optional archive of inactive bands only; do not hard-code band IDs |
| SC-014 Option B / 067 HW17 bridge | Live-tested historically — keep until HW17 sunset |
| Do not modify | **003, 101, 117, SC-147**; do not create **121** |
| Temporary formulas | Do **not** “restore” further to NOW()-only; re-paste gates only when preparing next sim |

---

## Suggested next actions for Mike

1. **P0:** Approve homework timing policy rewrite → authorize contracts/065/057 work on feature branches (DEV/disposable proof before Production paste).  
2. **P0 ops:** Before another season sim — re-paste temporary formulas; approve disposable cleanup inventory.  
3. **P1:** Hub PR to restyle `ZOOM_RECORDING_APPROVED`; optional controlled Live zoom email proof after cutover inputs.  
4. **P2:** Sign Game Log category taxonomy → web PR; confirm Award publication field → public awards PR.  
5. **P3:** OMNI confirm 067 Production version; leave enabled.

---

## Worktree mapping (this audit)

```text
C:/Users/mschmidt_fairfield/Documents/GitHub/127-si-shooting-challenge
  -> REPO_ROOT same
  -> WORKTREE_PATH C:\Users\mschmidt_fairfield\.cursor\worktrees\remaining-app-audit-8f170ade
WORKTREE_ID=remaining-app-audit-8f170ade
WORKTREE_START_REF=origin/master
HEAD at branch create: 41c77a236b264b1309ed3b26735f968701cd003f
```

Merge-back: `/apply-worktree` · Cleanup: `/delete-worktree`
