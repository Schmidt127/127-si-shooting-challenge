# 127 Sports Intensity — Master Future Work List

**Project:** 127 Sports Intensity Shooting Challenge and public website  
**Repository:** `Schmidt127/127-si-shooting-challenge`  
**Created:** 2026-08-24  
**Purpose:** One owner-approved list of future app, Airtable, AWS, email, payment, award, and website work. Each item is written so it can later become a focused Cursor or Airtable/OMNI prompt.

## Governance

**Canonical future-work source:** this document.

**Operating mode:** [CHATGPT-PROJECT-OPERATING-MODE.md](./CHATGPT-PROJECT-OPERATING-MODE.md) · [AGENTS.md](../AGENTS.md)

**Work-list policy:** Items already listed here may proceed without a separate backlog-ID approval. New work must be added to this list and assigned an identifier before implementation.

**Historical evidence:** [SHOOTING_CHALLENGE_COMPLETION_MASTER.md](./SHOOTING_CHALLENGE_COMPLETION_MASTER.md) · retired [v2-change-backlog.md](./v2-change-backlog.md) (git: `2f243d8`) · retired [CHATGPT-MASTER-PLAN-BRIEF.md](./CHATGPT-MASTER-PLAN-BRIEF.md) (git: `a081b76`)

---

## How to use this document

- This is the single planning list for future work.
- Each item is intentionally separate so it can be implemented, tested, and closed independently.
- Do not begin implementation from a vague note. Convert the item into a Phase 2 implementation brief first.
- Production Airtable changes, live sends, payment activation, and destructive cleanup remain Mike-approved actions.
- Technical evidence, deployment checklists, test reports, current-truth records, and historical closeout evidence are not replaced by this list.

## Status and priority vocabulary

| Status | Meaning |
|---|---|
| Brainstormed | Idea captured; requirements still need refinement. |
| Planned | Product direction is clear enough to write an implementation prompt. |
| Ready for prompt | Requirements and acceptance criteria are sufficiently defined. |
| In progress | Work has started. |
| Deferred | Intentionally postponed. |
| Complete | Future request is fully implemented and verified. |
| Not approved | Explicitly rejected or replaced. |

Priority: **P0** launch/security blocker · **P1** important parent/athlete experience or reliability · **P2** valuable improvement · **P3** low priority/future experiment.

---

## A. Airtable and application behavior

### FUT-001 — Match homework by assignment identity, not HW1/HW2 slot

**Priority:** P1  
**Status:** Complete (GitHub + tests — Production paste pending Mike approval)  
**Systems:** Airtable, homework intake, Homework Completions, XP, parent submission flow

Allow a parent or athlete to submit an assignment in either visible homework slot. The system must identify the assignment by its assignment/lesson identity and match it to the correct scheduled assignment. The HW number is not authoritative because slot numbering may change from year to year.

Parents may submit the assignment at any time before the assignment’s explicit **Due Date/Deadline**. For the upcoming challenge, Mike will set the Due Date to the final day of the challenge. Submissions after the Due Date receive no credit unless a separate approved exception is used.

The system must preserve checks for assignment identity, enrollment, challenge/season, and duplicate credit. Multiple uploads or repeat submissions are allowed, but only one Homework Completion and one XP award may be credited for the same athlete, assignment identity, and enrollment context.

**Acceptance criteria:** correct assignment matching across either slot; deadline enforced; late submission clearly marked ineligible; repeat uploads reviewable; XP deduplicated; no dependence on HW1/HW2 names.

**Implementation (2026-08-25):** GitHub **020 v3.8** + **065 v10.4**; contracts in `lib/homework-contracts/assignment-identity.js`. Promotion doc: [FUT-001-homework-assignment-identity-deadline.md](./deploy-checklists/FUT-001-homework-assignment-identity-deadline.md).

### FUT-002 — Audit and remove unused Airtable fields

**Priority:** P2  
**Status:** Ready for prompt  
**Systems:** Airtable schema, automations, email payloads, website/data contracts

Inventory every Airtable table and identify fields that are unused, obsolete, duplicated, or no longer part of the current app. This includes legacy Google Drive URL, Google Drive ID, Google Drive folder ID, and similarly named fields. Check formulas, automations, scripts, emails, views, interfaces, website/data contracts, and documentation before deleting anything.

Because all current records are test data that will be deleted before the next challenge, no historical-value preservation is required. The cleanup must still distinguish truly unused fields from fields needed by current production or future-approved workflows.

After confirming no active dependency remains, delete the obsolete fields and update documentation, schema snapshots, field maps, tests, and any remaining references.

**Acceptance criteria:** complete field/dependency inventory; unused and obsolete fields classified; fields removed only after audit; tests and documentation updated; no active S3/Lambda or future-approved fields removed accidentally.

### FUT-003 — Stripe payment writeback to Airtable

**Priority:** P1  
**Status:** In progress — **paid path verified** (2026-08-26); **free path and retry cleanup remaining**  
**Systems:** Fillout webhook, Make.com, Stripe API, Airtable `Payment Transactions` + `Enrollments`  
**Make scenario:** `FUT-003 - Fillout Stripe Payment to Airtable Payment Transactions` — **inactive** (no production activation)

After Stripe accepts a registration payment, write the payment result back to Airtable. At minimum, capture the amount paid and whether a coupon or promotion code was used.

**Verified (2026-08-26 — controlled Production Make test, scenario inactive):**

| Check | Result |
|-------|--------|
| Fillout webhook → Submission ID + real Stripe Payment ID (`pi_…`) | Pass |
| Module 4 — normalize webhook values | Pass |
| Module 16 — find Enrollment by Fillout Submission ID | Pass |
| Module 6 — retrieve Stripe PaymentIntent | Pass |
| Stripe cents → dollars conversion | Pass ($2.00 test) |
| Payment Transactions create | Pass |
| Payment Status = Paid | Pass |
| Duplicate protection (same Stripe Payment ID) | Pass — no duplicate rows |
| Confirmed downstream modules | Modules 4, 6, 7, 8, 12, 16 |

**Remaining limitations (not complete):**

| Limitation | Status |
|------------|--------|
| Make repeater runs paid route multiple times per webhook | **Open** — retries must apply to Enrollment lookup only; paid route must execute once per Fillout Submission ID |
| 100%-coupon / zero-dollar route | **Not implemented** — requires Stripe Checkout Session completion signal (`status=complete`, `payment_status=no_payment_required`, `amount_total=0`) and reliable Enrollment correlation |
| Coupon Code capture | **Known limitation** — current Fillout webhook does not supply coupon code; field remains blank |
| Stripe Checkout Session correlation for free registrations | **Unresolved** — Fillout webhook does not provide Checkout Session ID |

**Acceptance criteria (partial):** paid test payment with amount + duplicate protection + enrollment linkage — **verified**; coupon/promotion evidence — **not met** (webhook gap); discounted/zero-dollar test — **not met** (free route not built); idempotent retries without redundant downstream work — **not met** (repeater cleanup open).

**Promotion doc:** [FUT-003-fillout-stripe-payment-writeback.md](./deploy-checklists/FUT-003-fillout-stripe-payment-writeback.md)

### FUT-004 — Automated award emailer to replace Tremendous

**Priority:** P3  
**Status:** Deferred  
**Systems:** Airtable awards, email/communications system, future reward provider if needed

Do not continue the Tremendous integration for awards. Later, design and implement an automated award emailer as its replacement. Keep the first version simple and defer provider selection and advanced requirements until the app’s remaining automation capacity is known.

The future prompt should define which award types are included, who receives the email, how duplicate sends are prevented, and how delivery status is recorded.

### FUT-005 — Automated accomplishment emails

**Priority:** P3  
**Status:** Deferred  
**Systems:** Airtable XP/achievement events, communications system

Future automated emails may notify families about meaningful accomplishments:

- Streak occurrence
- Shot milestone reached
- Challenge shot goal met

This is intentionally separate from the award emailer and should not be started until the current automation inventory and remaining capacity are reviewed.

### FUT-006 — Parent-facing email workflows available for the upcoming challenge

**Priority:** P1  
**Status:** Complete  
**Systems:** Daily Submission, Welcome, Weekly Summary, Zoom Attendance, Video/Homework Feedback emails

The current parent-facing email workflows are functional and can be used for the upcoming challenge:

- Daily Submission email
- Welcome email
- Weekly Summary email
- Zoom Attendance email, which is not yet in Production

Optional future work may improve visual presentation or wording, but email functionality is not a blocker for the upcoming challenge.

---

## B. AWS storage and secure media

### FUT-007 — Simplify future AWS media naming and support future media types

**Priority:** P2  
**Status:** Ready for prompt  
**Systems:** Upload Lambda, S3, Airtable storage-key/writeback fields

Change the naming convention for future uploads only. Existing test uploads will be deleted before the next challenge, so no migration is required. Supported future upload categories should include:

- `HW` for homework
- `VIDEO` for video feedback
- `HEADSHOT` for future athlete headshot uploads; this is not currently in use but should be supported by the naming design

Proposed pattern:

`YYYYMMDD_HW-or-VIDEO-or-HEADSHOT_LastName_FirstName_CustomVideoName`

Examples:

- `20260817_HW_Boltz_Drew_ShotChallenge`
- `20260817_VIDEO_Boltz_Drew_OffTheDribble`
- `20260817_HEADSHOT_Boltz_Drew_Profile`

Do not include the Airtable record ID in the filename. Use the **Custom Video File Name** in the final filename position. The Airtable record ID remains system metadata and is not part of the human-facing filename.

The prompt must define sanitization, collision handling, missing-name behavior, and preservation of the Airtable record ID elsewhere as system metadata.

### FUT-008 — Custom Video File Name field and parent-facing usage

**Priority:** P1  
**Status:** Complete — field created; future workflow remains in FUT-009  
**Systems:** Airtable Video Feedback, correction interface, S3 upload naming, parent emails, website

The Airtable field **Custom Video File Name** has already been created and is ready for use in the Video Feedback correction interface. Mike should be able to enter names such as `OffTheDribble`, `FreeThrows`, or `ShootingInTheRain`.

Use the Custom Video File Name everywhere a parent-facing or coach-facing descriptive video name is appropriate, including the future S3 filename, Video Feedback display, email copy, and website display. Preserve the original upload metadata separately when needed for audit/debugging.

### FUT-009 — AWS storage structure and corrected-video naming workflow

**Priority:** P2  
**Status:** Planned  
**Systems:** Video Feedback correction interface, Lambda/S3, Airtable links

Combine the AWS bucket-structure review and corrected-video naming workflow into one future project. Review the current bucket structure, folder/key organization, naming rules, retention expectations, and separation of homework, video, and future headshot assets.

When Mike corrects a video and supplies a Custom Video File Name, provide a safe workflow to apply that name to the stored object or create a clearly named replacement object. The secure Lambda Reviewer URL must remain valid or be regenerated safely. The workflow must not create duplicate XP, duplicate Video Feedback records, or broken parent links.

Keep the S3 bucket private and preserve the Lambda viewer architecture.

---

## C. Website and athlete experience

Each page is a separate future item so it can receive its own focused Cursor prompt, tests, and review.

### FUT-011 — Athlete page: level graphic and hero-label polish

**Priority:** P1  
**Status:** Complete — 2026-08-25 · implementation `901812e` · production verified `900e61c`  
**Systems:** Website athlete profile, Airtable level data, design system

**Summary:** Public profile hero uses `AthleteLevelDisplay` with large level graphic and high-contrast hero badge; at-a-glance panel surfaces level for parents.

**Tests:** 349 Vitest · typecheck · lint · build pass.

**Production verification (2026-08-25):** Vercel Production deploy `900e61c` success · slug `perfect-week-testing` · hero + glance + Game Log pass · mobile overflow 0px.

**Limitation:** Level still appears in hero, snapshot, and progression (intentional emphasis).

On the athlete page, place the appropriate level graphic beside or near the athlete’s displayed shooter level, such as Beginner. Fix the current blue level label with black text so it has sufficient contrast and matches the other hero labels professionally.

### FUT-012 — Athlete page: professional Game Log presentation

**Priority:** P1  
**Status:** Complete — 2026-08-25 · implementation `901812e` · production verified `900e61c`  
**Systems:** Website XP activity table, XP Events, Airtable presentation fields

**Summary:** Game Log short labels and contextual details; server-side pagination via `GET /api/athletes/[slug]/game-log` with cursor (`activityDate` + XP Event record id), opaque row keys, Load more with loading/retry, enrollment-scoped isolation.

**Tests:** `game-log-pagination.test.ts`, `public-game-log.test.ts`, 349 Vitest total.

**Production verification (2026-08-25):** API page 1/2 return 12 rows, no key overlap; Load more 12→24 on `perfect-week-testing`; invalid slug API 404.

**Limitation:** Full ledger capped at `GAME_LOG_MAX_FETCH=2000` per enrollment (deferred — see closeout note below).

Improve the Game Log/Recent Activity display:

- Shorten activity labels; for example, use `Shot Submission` instead of `Shooting Submission Completed`.
- Remove the redundant small `+20 XP` beside the date.
- Use that space for the reason or result:
  - Shot submission: shots taken that day
  - Threshold/milestone: `75% of Target Goal`
  - Streak: `3 Day Shooting Streak`
  - Zoom: `Attended in Person` or `Attended via Recording`
  - Homework: assignment name, such as `Shot Challenge Tracker`
- Keep the larger XP award on the far right.

Use the most maintainable professional design. Prefer configurable presentation labels when that improves long-term editing, while retaining safe automatic defaults.

### FUT-013 — Athlete page: Perfect Week activity panel

**Priority:** P1  
**Status:** Complete — 2026-08-25 · implementation `901812e` · production verified `900e61c`  
**Systems:** Website, Weekly Athlete Summary, Perfect Week fields

**Summary:** `PerfectWeekPanel` shows week-by-week requirements and status labels; weekly performance stats moved below with clarifying copy.

**Tests:** Production profile section order verified on `charlie-schmidt` and `perfect-week-testing`.

**Production closeout — athlete profile reliability (2026-08-25)**

| Item | Status |
|------|--------|
| Vercel Production deploy | **Success** — `207a2c1` on `www.fairfieldbasketballclub.com/shoot` (2026-08-25) |
| Smoke stabilization commits | `0adcb8d` (Fairfield retry, image/footer hydration) · `fce037f` (profile freshness) on ancestry |
| Production smoke slug | `perfect-week-testing` (also `charlie-schmidt`, `curtis-schmidt`; `testing-schmidt` is DEV-only) |
| PHA Due Date | **Verified** — catalog + athlete homework assignments show readable due dates; commit `207a2c1` adds prod Playwright + Vitest coverage |
| Game Log pagination | API-backed; Load more verified 12→24 |
| Freshness notice | **Fixed** — hidden on clean prod loads; only when homework source fails (`mayBeStale`); “Last checked” renders client-side to avoid hydration mismatch on prod smoke |
| Homework image | `withBasePath` fix deployed `a71cbef`; static asset HTTP 200 |
| Mobile nav smoke | **Fixed** — `cross-env` for Windows; `openMobileNavPanel()` retries until post-hydration menu opens |
| `npm run test:smoke:prod` | **50/50** pass (2026-08-25); cross-platform via `cross-env`; serial `--workers=1` against live prod |
| Vitest | **369** pass (2026-08-25) |
| `homework-due-date.spec.ts` | **3/3** pass on prod (2026-08-25) |
| SEO production | `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` on Vercel; `search-indexing.spec.ts` pass on prod |
| Local PAT 403 | Documented — read on Program Instance - Sync, Program Homework Assignments, Homework Library, Weeks, Homework Completions |
| `GAME_LOG_MAX_FETCH=2000` | **Deferred** — safe at current scale; no athlete near cap |

### FUT-014 — Homework page redesign and live Homework Library connection

**Priority:** P1  
**Status:** Completed (2026-08-26)  
**Systems:** Website Homework page, Airtable Homework Library / Program Homework Assignments

Redesigned `/shoot/homework` with PHA-backed live catalog cards (no hardcoded assignment count). Sort newest assigned week first. Brief Description verified from Homework Library field **`Brief Description - Display`** → `HomeworkAssignment.briefDescription` / card `instructionsPreview` (fallback: `Instructions coming soon.`). Catalog cards show title, week, due date, brief preview, and resource links (`URL`, `URL Additional`, `Docs`) when present. Detail route unchanged.

**Deploy checklist:** [docs/deploy-checklists/FUT-014-homework-page-redesign.md](../deploy-checklists/FUT-014-homework-page-redesign.md)

**Validation (2026-08-26):** lint ✓ · typecheck ✓ · vitest ✓ · build ✓ · prod smoke (pending post-push)

### FUT-015 — Levels page redesign

**Priority:** P2  
**Status:** Planned  
**Systems:** Website Levels page, Airtable Levels and Gate Rules

Redesign the Levels page with a modern visual system, including a faint ladder-style background behind the hero section. Sort levels from 1 through 12 in ascending order. Replace or clarify the current confusing blue `LV` element so its meaning is immediately understandable.

### FUT-016 — Tutorials page redesign

**Priority:** P2  
**Status:** Planned  
**Systems:** Website Tutorials page, canonical Tutorials & Assets data

Create a new portfolio-style Tutorials page using the approved design tools while preserving the existing links and content relationships. Do not reintroduce the retired duplicate Tutorials table.

### FUT-017 — Zoom Meeting page redesign

**Priority:** P2  
**Status:** Planned  
**Systems:** Website Zoom page, Airtable Zoom Meetings

Create a new portfolio-style Zoom Meeting page using the approved design tools while preserving current links and meeting information.

### FUT-018 — Landing Page and Shooting Challenge page improvements

**Priority:** P1  
**Status:** Planned  
**Systems:** Website public pages, SEO metadata, existing content/data contracts

Review and improve the Landing Page and Shooting Challenge page without duplicating existing pages. Adapt existing pages when they already serve the required purpose. Separate prompts should be used for each page.

### FUT-019 — Website footer consistency

**Priority:** P2  
**Status:** Brainstormed  
**Systems:** Website layout and all public pages

Create and apply one professional, accessible footer across all public website pages. Preserve required navigation, contact, program, and legal/consent information.

---

## D. Website SEO and national discoverability

### FUT-020 — National-first SEO foundation with legitimate local context

**Priority:** P1  
**Status:** Ready for prompt  
**Systems:** Website metadata, content, structured data, sitemap, internal links

Optimize the website so families nationwide can discover the program when searching for youth basketball training, basketball shooting challenges, skill development, progress tracking, and related terms. Fairfield, Montana should be represented accurately but should not be the only SEO strategy or the dominant focus.

Do not claim in-person services in locations where the program does not operate. Use Fairfield and nearby communities where accurate, and explain online/remote or nationally accessible aspects where supported.

### FUT-021 — Homepage SEO and messaging

Rewrite the homepage title, main heading, description, internal links, and image alt text so the page clearly communicates:

- Youth basketball training and shooting challenges
- Boys and girls in grades 1–8
- Educational Athletics
- Skill development, daily submissions, goals, progress tracking, and feedback
- Accurate Fairfield, Montana context without limiting national discovery

### FUT-022 — Adapt existing pages for SEO before creating duplicates

Audit the existing website before adding pages. Adapt an existing page when it already covers the subject. Create a new page only when the content has no appropriate home.

Potential content areas include youth basketball program, shooting challenge, youth basketball training, Team Shot Tracker, About, Activities and Events, Contact, and FAQ. The implementation prompt must identify the existing route map first and prevent duplicate or competing pages.

### FUT-023 — Page-specific titles, descriptions, links, and image text

Give every important public page unique metadata and descriptive internal links. Replace vague links such as `Learn More` with descriptive link text. Improve image alt text without keyword stuffing.

### FUT-024 — FAQ and structured organization information

Add an appropriate FAQ and organization information where supported by the current website. Cover grades served, boys and girls, Educational Athletics, shooting challenge, XP/progress, video feedback, Team Shot Tracker, location, and registration. Add organization/local information only where accurate and privacy-safe.

### FUT-025 — Sitemap, indexing, and public athlete profiles

Create or verify a sitemap and indexability rules for public pages. Public athlete profiles may be indexable using the athlete’s full name because registration consent covers name, image, and likeness promotion. The public profile may display:

- Full athlete name
- School
- Grade
- Approved progress information

Do not expose parent contact information, email addresses, private submission metadata, or sensitive information. The prompt must verify consent assumptions, route stability, metadata uniqueness, and search-engine behavior.

### FUT-026 — Final Player Manual before challenge launch

**Priority:** P1  
**Status:** Deferred until final pre-launch phase  
**Systems:** Player Manual, Airtable configuration, website/app behavior

Keep the Player Manual on the future-work list, but complete it last—immediately before the challenge begins. The final manual must reflect the finished rules, homework deadline behavior, levels, XP, Perfect Week requirements, video feedback, Zoom options, website experience, and parent/athlete workflows.

Do not finalize or publish the manual while material app rules or page behavior are still changing.

---

## E. Items intentionally excluded or preserved elsewhere

These are not deleted or re-created as future-work items in this document:

- Current-state and security reports
- Deployment checklists and paste bundles
- Test fixtures and test results
- Historical closeout evidence
- Game Manual and Player Handbook source documents
- Current automation/version inventory used for production truth
- AWS/Lambda implementation and secure URL evidence
- Technical data-model, ownership, and deduplication contracts
- Media kits and completed 2025–26 publicity packets

### Superseded or rejected directions

- Public S3 bucket: rejected. S3 remains private; Lambda viewer URLs remain the parent-facing path.
- Tremendous awards integration: rejected as the future award solution; replace with FUT-004.
- Separate duplicate SEO pages when an existing page can be adapted: rejected.
- One large website redesign prompt: rejected in favor of separate page/component prompts.
- HW1/HW2 slot as the homework identity: rejected; assignment name/identity is authoritative.

---

## Source reconciliation inventory

The consolidation was based on a read-only review of:

- Repository `docs/v2-change-backlog.md`
- Repository `docs/CHATGPT-MASTER-PLAN-BRIEF.md`
- Repository `docs/shooting-challenge-v2-master-direction.md`
- Repository `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`
- Repository `docs/next-wave/**` planning and Mike-action documents
- Repository `docs/overnight/web-integration/ADMIN-ROADMAP.md`
- Repository `docs/overnight/web-integration/INDEXING-SEO-DECISION.md`
- Repository `web/docs/admin-roadmap.md`, `web/docs/page-plan.md`, and `web/docs/project-roadmap.md`
- Repository `docs/audits/google-drive-field-removal-prep-2026-08-17.md`
- Repository `docs/next-wave/homework-pipeline/FLEXIBLE-HW1-HW2-SLOT-FOLLOWUP.md`
- Repository email redesign and Zoom deployment documents
- Library brainstorming note `Pasted markdown(20260824-200747).md`
- Library post-launch roadmap `Airtable_Post_Launch_Enablement_Roadmap.docx`

Where sources conflicted, this document uses the newest owner decisions supplied by Mike on 2026-08-24. Historical documents remain evidence, not current instructions.

## Proposed cleanup after Mike review

Historical planning documents were retired to pointer stubs on 2026-08-24:

1. `docs/v2-change-backlog.md` — **historical stub** (full content: `git show 2f243d8:docs/v2-change-backlog.md`)
2. `docs/CHATGPT-MASTER-PLAN-BRIEF.md` — **historical stub** (full content: `git show a081b76:docs/CHATGPT-MASTER-PLAN-BRIEF.md`)
3. `docs/chatgpt-sources/22-v2-change-backlog.md` and `23-master-plan-brief.md` — synced historical stubs
4. Section F below — reconciled legacy **C-/V2-/SC-** inventory for traceability

Do not delete current-truth, completion, deployment, security, test, schema, or historical evidence documents merely because this list summarizes them.

---

## F. Legacy C-/SC- inventory (reconciled 2026-08-24)

The owner-facing **FUT-** items above are the active future-work queue. The tables below preserve migrated **C-/V2-/SC-** IDs from historical planning documents with duplicate reconciliation applied. Use them for traceability and evidence lookup — not as a second active queue.

### Duplicate reconciliation summary

| Overlap | Canonical | Other status |
|---------|-----------|--------------|
| C-010 / SC-068 | **C-010** | SC-068 → Tracked under C-010 |
| V2-013 / SC-067 | **V2-013** | SC-067 → Tracked under V2-013 |
| C-026 / SC-105 | **C-026** | SC-105 → Tracked under C-026 |
| C-022 / SC-117 | **C-022** | SC-117 → Tracked under C-022 |
| V2-002 / SC-034 | **V2-002** | SC-034 → Tracked under V2-002 |
| V2-011 / SC-134 | **V2-011** | SC-134 → Tracked under V2-011 |
| V2-012 / SC-135 | **V2-012** | SC-135 → Tracked under V2-012 |
| C-023 / SC-097 / SC-098 | **C-023** | SC-097/098 → Tracked under C-023 |
| C-018 / SC-064 | **C-018** | SC-064 → Tracked under C-018 |
| C-025-EMAIL / SC-088 | **C-025-EMAIL** | SC-088 → Tracked under C-025-EMAIL |
| V2-010 / SC-133 | **V2-010** | SC-133 → Tracked under V2-010 |
| SC-027 / SC-076 | **SC-027** | SC-076 → Tracked under SC-027 |
| SC-074 / SC-086 | **SC-074** | SC-086 → Tracked under SC-074 |
| C-011 / SC-031 / SC-035 | **C-011** | SC-031/035 stay open (proof slices) |
| C-017 / SC-060 | **Both open** | Related; cross-reference only |

**Monitoring** (Live Tested with optional follow-up only): SC-004, SC-006, SC-008, SC-014, SC-023, SC-061, SC-083, SC-095, SC-027.

Removed corrupted migration row **SC-079**.

## Section A ΓÇö Backlog waves (C- / V2- / PKG- / SCV2-)

| ID | Title | Status | Dependencies | Notes |
|----|-------|--------|--------------|-------|
| **V2-065-066-SCRIPT-INPUT-001** | Fix Production **065** / **066** hardcoded `recordId` script inputs | `repository-ready` | [`065-066-v10.3-v3.9-dynamic-trigger-record.md`](./deploy-checklists/065-066-v10.3-v3.9-dynamic-trigger-record.md) | Migrated from v2-change-backlog |
| **V2-013** | **Multi-Year Architecture ΓÇö Program Instance Integration** | queued | Wave 1 hygiene, C-012 partial | Canonical for Program Instance architecture; merged SC-067. |
| **V2-014b** | Email Message Center (EMC) | queued | V2-014, C-011 | Migrated from v2-change-backlog |
| **C-012** | Stage K ΓÇö every field has one writer | queued | V2-013 | Migrated from v2-change-backlog |
| **C-026** | Merge **Tutorials** vs **Tutorials & Assets** ΓÇö keep one, delete duplicate | in progress | C-012 | Canonical for Tutorials table merge; merged SC-105 (web cutover proof, Dribble category audit EXT-QA-003). |
| **C-024** | Rock-solid dedupe keys + safe backfill reruns | queued | C-012 | Migrated from v2-change-backlog |
| **C-021** | Grade bands propagate automatically | queued | C-012 (field map) | Migrated from v2-change-backlog |
| **V2-002** | Config-over-scripts audit | queued | C-021 | Canonical for config-over-scripts audit; merged SC-034 implementation pass. |
| **C-022** | Public display fields ΓÇö not primary/formula | queued | C-012 | Canonical for Presentation-field policy; SC-117 web wiring tracked here; email slices V2-003/V2-004. |
| **V2-003** | Homework email column fix (**071**) | queued | C-022 | Migrated from v2-change-backlog |
| **V2-004** | Weekly email homework table (**072**) | queued | C-022 | Migrated from v2-change-backlog |
| **C-010** | Harden `Active?` on Enrollments | queued | V2-013 partial | Canonical for Active? hardening; merged SC-068 (PPE backfill, automation guards, 072/118/119 Schmidt visibility conflict). |
| **C-011** | Fully automatic weekly parent emails | queued | C-010, C-022 | Related proof slices: SC-031 and SC-035 — not duplicate deliverables. |
| **C-019** | Schmidt test enrollment | queued | C-010 partial | Migrated from v2-change-backlog |
| **C-023** | File dedup by **content hash**, not title/filename | in progress | C-013, C-024 | Canonical for content-hash dedup; merged SC-097/SC-098 proof slices. |
| **C-017** | Fillout ΓåÆ Athletes validation | queued | C-012 | Related to SC-060; keep both — SC-060 covers intake-reopen validation. |
| **C-018** | Intake open vs challenge run | queued | V2-013 | Canonical for intake-open vs challenge-run calendars; merged SC-064 wiring. |
| **C-009** | Redo HW17 Fillout quiz intake (no attachment today) | queued | C-013, C-024 | Migrated from v2-change-backlog |
| **V2-005** | Tune Level Gate Rules | queued | C-021, V2-013 | Migrated from v2-change-backlog |
| **V2-006** | Tune XP Reward Rules | queued | C-021 | Migrated from v2-change-backlog |
| **V2-007** | Tune Levels table | queued | V2-005 | Migrated from v2-change-backlog |
| **V2-008** | Game manual | queued | Wave 9 | Migrated from v2-change-backlog |
| **V2-009** | `/shoot` rules + progress hub | queued | Wave 9, C-022 | Migrated from v2-change-backlog |
| **V2-010** | Pre-season parent comms | queued | V2-008 | Canonical for pre-season parent comms; merged SC-133. |
| **C-027** | **Major-event** notifications ΓÇö level up, milestones (not daily XP) | queued | C-010, C-024, V2-008 | Migrated from v2-change-backlog |
| **C-028** | First Tremendous award send via Make.com sandbox | in-progress | Gift-card Award Recipients row | Migrated from v2-change-backlog |
| **V2-011** | Full pre-season audit pack | queued | All above | Canonical for pre-season audit pack; merged SC-134. |
| **V2-012** | Dry-run season on Schmidt test | queued | C-020, Wave 7ΓÇô9 | Canonical for Schmidt dry-run season; merged SC-135. |
| **C-025-EMAIL** | C-025 Stage 17 ΓÇö wire Zoom recording approval email webhook (117 blank) | queued | C-025 Stage 17 complete | Canonical for Zoom recording approval email; merged SC-088 live proof. |

---

## Section B ΓÇö Completion master (SC-)

Open SC items with remaining work (status not Complete / Superseded / Not Needed). Sorted by priority then ID.

| ID | Area | Title | Priority | Status | Dependencies | Remaining work |
|----|------|-------|----------|--------|--------------|----------------|
| **SC-001** | Testing | Universal Testing Scenarios framework so Mike can run Fillout-shaped tests without Fillout | P0 | Live Tested in PROD | SC-004, SC-059 | Broader season matrix, Homework XP after review, Make/S3, and email remain separate release work |
| **SC-004** | Testing | Permanent Schmidt testing enrollment for live PROD tests | P0 | Monitoring | ΓÇö | Keep emails Schmidt-only; **Schmidt remains visible on public standings**; optional refresh when foundation WAS IDs change |
| **SC-005** | Testing | Full end-to-end live PROD matrix (all major paths) | P0 | Live Tested in PROD | SC-001ΓÇôSC-004, core pipelines | Unblock B3 policy / B5 backdate week; streak+milestone when unlocks exist; email/failure inject ΓåÆ SC-008 |
| **SC-007** | Testing | Duplicate and rerun testing (idempotency proof) | P0 | Live Tested in PROD | SC-066, SC-096+ | Optional: 010 UI re-trigger attest; milestone/PW/Zoom-attend live fixtures when present |
| **SC-010** | Homework | PDF / document homework submissions work end-to-end | P0 | Installed in PROD | SC-019 | Re-test PDF path; quiz uses Option B (no PDF asset ΓÇö SC-014) |
| **SC-011** | Homework | Video submissions as homework/learning assets | P0 | Installed in PROD | SC-133 | Re-test video as homework vs daily video rules; confirm purpose routing |
| **SC-013** | Homework | Online quizzes create a reviewable completion | P0 | Live Tested in PROD | SC-014 | Optional: expand to non-Schmidt enrollment; keep 071 path smoke if needed |
| **SC-014** | Homework | Final Reflection quiz completion path (PDF vs attachment-less) | P0 | Monitoring | SC-013 | No further path decision; do not reopen Option A / Quiz Result PDF |
| **SC-016** | Homework | Exactly one Homework Completion per assignment per enrollment | P0 | Live Tested in PROD | SC-066, SC-014 | Paste **020 v3.2.0**; live Schmidt re-submit proof that second Submission attaches to same HC (no new row / no second XP) |
| **SC-021** | Config | Config-over-code audit (no hardcoded season numbers in scripts) | P0 | Installed in PROD | SC-022 | Run 057 on CASE-01 WAS; CASE-01ΓÇª16 + verifier; migrate remaining hardcode consumers |
| **SC-022** | Config | XP Reward Rules audit and cleanup | P0 | Installed in PROD | SC-021, SC-023 | Resolve Video XP 1-vs-25; decide Zoom Recording / Manual Bonus rule records; supervised streak proof still open |
| **SC-023** | Config | Grade Bands as linked source of truth | P0 | Monitoring | SC-021 | Archive inactive legacy bands when ready; keep Min/Max match (no hard-coded band ID) |
| **SC-027** | Config | Shot Milestones config + awards | P0 | Monitoring | SC-096 | Continue recurrence monitoring; no further 066 paste/replay unless source, trigger, schema, or milestone data changes |
| **SC-031** | Config | Weekly schedule settings (build/send timing) | P0 | Installed in PROD | SC-051 | Proof slice for C-011 weekly email automation — keep open. Prove the normal `build_armed` and send-arm branches after a real eligible completed Week/package exists; keep 074 `sendMode=Live` where app |
| **SC-032** | Config | Season settings (dates, windows) | P0 | Built in Repository | SC-065, SC-084 | Import Weeks in PROD; Mike UI attestations; authorize Launch Status fields; controlled activation |
| **SC-035** | Weekly Summary | Guaranteed Weekly Athlete Summary for every enrollment ├ù ended week | P0 | Installed in PROD | SC-004, SC-082 | Proof slice for C-011 WAS build path — keep open. Prove 118 `build_armed` with a real eligible completed Week; monitor WAS uniqueness and the downstream 072ΓåÆ119ΓåÆ074 handoff |
| **SC-036** | Weekly Summary | Weekly summary calculations correct | P0 | Installed in PROD | SC-054 | Re-test calc fields on Schmidt; Presentation columns (SC-054) |
| **SC-058** | Data Integrity | Automation version inventory filled from live UI | P0 | Built in Repository | SC-059 | Mike paste complete PROD UI list where gaps remain |
| **SC-059** | Data Integrity | Retire legacy automations 112 and 043 | P0 | Installed in PROD / 043 not deployed | SC-001, SC-058 | Confirm 112 OFF and retain the no-recreate-043 disposition; do not restore 043 or the stale orphan-XP bulk count from #100 |
| **SC-065** | Enrollment | Challenge dates / Weeks configuration rebuilt | P0 | Built in Repository | SC-032 | Manually import generated Weeks in PROD; verify SundayΓÇôSaturday + Week 0 + Post-Challenge; link Program Instance (may need record IDs) |
| **SC-068** | Enrollment | Inactive / processing controls (`Active?` hardened) | P0 | Tracked under C-010 | SC-004 | PPE create/backfill; paste guards; resolve 072/118/119 Schmidt hard-exclude conflict vs ΓÇ£Schmidt visibleΓÇ¥ web direction |
| **SC-069** | Enrollment | Testing enrollment behavior documented and proven | P0 | Live Tested in PROD | SC-004, SC-068 | Email-path live proof still needed; standings web spot-check |
| **SC-070** | XP | Daily submission XP awards correctly | P0 | Live Tested in PROD | SC-049 | Rerun pack on additional submissions; keep Schmidt-only |
| **SC-071** | XP | Homework XP after satisfactory review | P0 | Installed in PROD | SC-017 | Live prove after coach satisfactory |
| **SC-072** | XP | Video XP awards correctly | P0 | Installed in PROD | SC-133 | Mike verifies current trigger + one Schmidt lifecycle proof after upload writeback |
| **SC-073** | XP | Live Zoom XP awards correctly | P0 | Installed in PROD | SC-116 | Re-test live meeting attendance |
| **SC-074** | XP | Zoom recording XP / credit path | P0 | Built in Repository | SC-116 | Decide whether to deploy a future dedicated recording-credit automation (new slot) or keep email-only 117 |
| **SC-076** | XP | Milestone XP (shot milestones) | P0 | Tracked under SC-027 | SC-027 | Continue recurrence monitoring; no further paste/replay unless 066 source, trigger, schema, or milestone model changes |
| **SC-078** | XP | Level progression updates correctly | P0 | Live Tested in PROD | SC-024 | Live level-up past Rookie and post-test scheduled-041 idempotency still need controlled proof |
| **SC-080** | XP | Gate clearing when requirements met | P0 | Installed in PROD | SC-074 | Live prove clear after HW/Zoom credit |
| **SC-084** | Zoom | Live attendance capture works | P0 | Installed in PROD | SC-073 | Recreate meetings; Schmidt attend test |
| **SC-086** | Zoom | Recording credit path works | P0 | Tracked under SC-074 | SC-074 | Re-open only with a new attested automation plan that does not steal email slot 117 |
| **SC-087** | Zoom | Live-versus-recording exclusivity | P0 | Installed in PROD | SC-086 | Re-prove Conflict=1 blocks double credit |
| **SC-090** | Zoom | Level gate integration for Zoom credit | P0 | Installed in PROD | SC-080 | Live prove |
| **SC-091** | Zoom | Perfect Week integration for Zoom credit | P0 | Installed in PROD | SC-077 | Fixture CASE-10ΓÇª13 (not required / attended / missing / cross-enrollment) |
| **SC-094** | Assets | Video storage on program-owned S3 | P0 | Installed in PROD | SC-150 | Re-test writeback on Schmidt asset as needed |
| **SC-095** | Assets | Homework storage on S3 (070a route) | P0 | Monitoring | SC-094 | Keep 070a ON; monitor Make Module if routing drifts |
| **SC-096** | Assets | Canonical HTTPS URLs on assets | P0 | Installed in PROD | SC-094, SC-150 | Re-verify after wipe; do not make Canonical public |
| **SC-099** | Assets | Writeback verification (070c) | P0 | Installed in PROD | SC-094 | Re-test AcceptedΓåÆverify |
| **SC-135** | Platform | Dry-run full season on Schmidt before public intake | P0 | Tracked under V2-012 | SC-005 | Execute after phases 1ΓÇô13 |
| **SC-147** | Data Integrity | Reliability Command Center ΓÇö workflow health visibility before prod failures | P0 | Built in Repository | SC-040, SC-046 | Mike/OMNI create views 1ΓÇô4; review first Sunday health; **no auto repairs** |
| **SC-149** | Website | Official landing + branding links use Fairfield Basketball Club (not Hoop Challenges) | P0 | Built in Repository | SC-102 | Set Vercel `NEXT_PUBLIC_LANDING_URL` / `NEXT_PUBLIC_SITE_URL` to Fairfield if still legacy; deploy; live smoke logo/footer; do not treat his |
| **SC-002** | Testing | Test scenario library / templates for repeatable suites | P1 | Installed in PROD | SC-001 | Install/execute SCN-021ΓÇô043 on Schmidt; expand matrix; optional Airtable fields/UI only if approved |
| **SC-008** | Testing | Email, Make, upload, and failure-path testing | P1 | Monitoring | SC-131+, SC-051+, SC-150 | Optional Mike-authorized live 074 invalid-webhook inject (SCN-029) ΓÇö offline+SOP already cover keep-Send-to-Make? |
| **SC-012** | Homework | Written / reflection responses work | P1 | Installed in PROD | SC-019 | Re-test written-only HC; coach review + 071 |
| **SC-015** | Homework | Multiple files per homework response | P1 | Installed in PROD | SC-019 | Re-test N files ΓåÆ N assets ΓåÆ one HC |
| **SC-018** | Homework | Learning Activities table (catalog of activities) | P1 | Built in Repository | SC-020 | Mike-authorized Airtable schema; seed catalog; keep FBC Curriculum SYNC unless decided otherwise |
| **SC-019** | Homework | Learning Activity Responses table + ResponseΓåÆasset routing | P1 | Built in Repository | SC-018 | Schema; automations; Fillout/web intake; route to Submission Assets / optional HC |
| **SC-020** | Homework | Activities that count as homework vs stand-alone | P1 | Planned | SC-018, SC-019 | Implement flag + automation filters + coach views |
| **SC-024** | Config | Levels table reliable for progression | P1 | Installed in PROD | SC-022 | Re-seed after wipe if needed; tune thresholds (SC-027) |
| **SC-026** | Config | Achievements catalog + unlock rules | P1 | Installed in PROD | SC-066 | Re-seed; re-test unlocks; dedupe keys |
| **SC-028** | Config | Perfect Week rules configurable | P1 | Live Tested in PROD | SC-116 | Mike 059 UI trigger fix; Batch A/B fixtures |
| **SC-030** | Config | Zoom percentage / credit settings in config | P1 | Installed in PROD | SC-116 | Re-verify config rows after wipe; document operator knobs |
| **SC-034** | Config | Remove remaining hardcoded values from automations | P1 | Tracked under V2-002 | SC-021 | Finish V2-002 pass across 001ΓÇô119; paste any remaining pending scripts |
| **SC-037** | Weekly Summary | Previous-week helpers reliable | P1 | Installed in PROD | SC-084 | Re-verify after Weeks rebuild |
| **SC-056** | Data Integrity | Script input/output variables standardized | P1 | Built in Repository | SC-057 | Inventory Airtable automation I/O vs GitHub; fix drift |
| **SC-057** | Data Integrity | Automation trigger review (no duplicate triggers) | P1 | Planned | SC-058 | UI attest triggers; delete duplicates |
| **SC-060** | Enrollment | Fillout enrollment validation is trustworthy | P1 | Live Tested in PROD | SC-081 | Related to C-017; keep open for intake-reopen validation work. Live Fillout tighten when intake reopens; retain broader intake proof boundaries |
| **SC-061** | Enrollment | New vs returning athletes handled correctly | P1 | Monitoring | SC-060 | Additional non-Schmidt returning case optional |
| **SC-063** | Enrollment | Email validation (parent/athlete) | P1 | Built in Repository | SC-060 | Fillout email rules ON; bounce SOP still open |
| **SC-064** | Enrollment | Intake-open dates separate from challenge run dates | P1 | Tracked under C-018 | SC-032 | Wire intake-open into Fillout/web gate; Weeks flags if authorized |
| **SC-075** | XP | Streak XP | P1 | Live Tested in PROD | SC-029, SC-068 | Optional break/rebuild supervised test; SC-081 decision |
| **SC-077** | XP | Perfect Week XP | P1 | Live Tested in PROD | SC-028, SC-074 | Mike removes Shot Milestone filter on 059; optional Test button soak |
| **SC-083** | XP | Achievement unlock deduplication | P1 | Monitoring | SC-026 | Monitor recurrence; do not reintroduce stale orphan-XP bulk counts from #100 |
| **SC-088** | Zoom | Recording approval email to parent | P1 | Tracked under C-025-EMAIL | SC-086 | Mike: create Recording Quiz Satisfactory fixture ΓåÆ Test 117 ΓåÆ expect sent/already_sent; no XP |
| **SC-089** | Zoom | Total Zoom counts correct | P1 | Installed in PROD | SC-048 | Re-verify formulas after schema export |
| **SC-092** | Zoom | Weekly summary shows Zoom correctly | P1 | Installed in PROD | SC-036, SC-054 | Re-test Presentation labels |
| **SC-097** | Assets | SHA-256 hashes recorded | P1 | Tracked under C-023 | SC-094 | Re-test hash write + review queue |
| **SC-098** | Assets | Duplicate file reuse decision (manual, safe) | P1 | Tracked under C-023 | SC-097 | Re-test confirm/reversal; never auto-reuse another athleteΓÇÖs object |
| **SC-102** | Website | Airtable-backed public pages work | P1 | Live Tested in PROD | SC-055 | Keep catalog content current; Presentation fields later (SC-054) |
| **SC-117** | Website | Public Presentation fields consumed by web | P1 | Tracked under C-022 | SC-054 | Wire queries to Presentation fields only |
| **SC-134** | Platform | Full pre-season audit pack green | P1 | Tracked under V2-011 | SC-046ΓÇôSC-058 | Extend audits; run on rebuilt PROD |
| **SC-139** | Platform | Refresh stale status docs (KNOWN_ISSUES, inventory, E2E Zoom rows, brief) | P1 | Built in Repository | ΓÇö | Continue sweeping KNOWN_ISSUES / Zoom E2E stale rows / brief after each SC |
| **SC-148** | Website | Mobile usability + accessibility for public `/shoot` | P1 | Built in Repository | SC-102, SC-113, SC-118 | Merge integration PR; Vercel deploy; Mike production check; optional axe-core pass |
| **SC-006** | Testing | Automatic Expected-versus-Actual results on scenarios | P2 | Monitoring | SC-001, SC-002 | Keep read-only unless Mike designates one Pass/Fail writer; optional wire CLI report into scenario UI manually |
| **SC-029** | Config | Streak values in config (not buried in code) | P2 | Live Tested in PROD | SC-022 | Mike decide repeat-after-break (SC-081); optional supervised break/rebuild test |
| **SC-033** | Config | Enable/disable switches for major features | P2 | Planned | SC-066 | Inventory switches; document operator map |
| **SC-062** | Enrollment | Sibling handling works | P2 | Built in Repository | SC-045 | Live sibling parent-email routing test |
| **SC-081** | XP | Streak economics review | P2 | Decision Needed | SC-029 | Decide whether to change repeat-after-break rules |
| **SC-082** | XP | Early level-gate tuning for next season | P2 | Planned | SC-025 | Load numbers when season config ready |
| **SC-085** | Zoom | Live bonuses (if configured) work | P2 | Installed in PROD | SC-022 | Confirm which bonuses still desired; test |
| **SC-093** | Zoom | Public website Zoom pages accurate | P2 | Installed in PROD | SC-146 | Confirm Airtable publish filters after wipe |
| **SC-103** | Website | Leaderboard | P2 | Live Tested in PROD | SC-068 | Fix Schmidt Grade/School Year (EXT-QA-005); season content hygiene |
| **SC-104** | Website | Homework catalog | P2 | Installed in PROD | SC-054 | Unpublish stale Week 10 prior-season rows (EXT-QA-006); Presentation fields later |
| **SC-105** | Website | Tutorials | P2 | Tracked under C-026 | SC-052 | Complete table merge SC-052; audit Article ΓÇ£DribbleΓÇ¥ category (EXT-QA-003) |
| **SC-106** | Website | Levels pages | P2 | Live Tested in PROD | SC-024 | Gate copy polish; cover 410 graceful fallback in web |
| **SC-107** | Website | Achievements pages | P2 | Installed in PROD | SC-026 | Re-seed / Active?+Visible? for Shot Milestones + Perfect Week (EXT-QA-002) |
| **SC-108** | Website | Zoom public pages | P2 | Live Tested in PROD | SC-093 | Refresh expired Cover Media URLs (EXT-QA-004); web now hides 410 images |
| **SC-109** | Website | Game Manual from config | P2 | Installed in PROD | SC-032, SC-082 | Set `NEXT_PUBLIC_GAME_MANUAL_URL` (EXT-QA-001); editorial copy; Shot Milestones surface later |
| **SC-110** | Website | Public display page | P2 | Installed in PROD | SC-054 | Wire Presentation fields; real season year after School Year fix |
| **SC-111** | Website | Athlete profiles (real data, not mocks) | P2 | Live Tested in PROD | SC-103 | Optional: recreate `Web - Leaderboard` view (fallback OK) |
| **SC-112** | Website | Athlete auth + dashboard | P2 | Decision Needed | ΓÇö | Mike pick approach; then schema + session implementation |
| **SC-113** | Website | Loading, empty, and error states | P2 | Live Tested in PROD | ΓÇö | Keep states aligned when SC-112 lands |
| **SC-115** | Website | noindex removal / search indexing | P2 | **Complete** (2026-08-25, `647d465`; prod verified) | SC-114 | **Prod cutover verified** — Vercel Production `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true`; public pages indexable; athlete profiles + private routes `noindex`; sitemap excludes athletes/public-display; `npm run test:smoke:prod` 50/50 after cross-env fix. Checklist: `docs/deploy-checklists/2026-08-25-web-search-indexing-cutover.md`. |
| **SC-118** | Website | Production readiness smoke package for public `/shoot` | P2 | **Complete** (2026-08-25, deploy `207a2c1`) | SC-102 | `npm run test:smoke:prod` **50/50**; cross-platform (`cross-env`); prod athlete slug `perfect-week-testing`; mobile nav + SEO smoke pass; Vitest **369**; `homework-due-date.spec.ts` **3/3** on prod. |
| **SC-133** | Platform | Pre-season parent comms from rules | P2 | Tracked under V2-010 | SC-109 | Write/send after SC-109 |
| **SC-138** | Platform | Close stale overnight GitHub issues/PRs for 070a | P2 | Planned | SC-095 | Close or update with current truth |
| **SC-144** | Website | Rename Softr-named publish flag | P2 | Planned | SC-054 | Rename in schema wave; update web queries |
| **SC-145** | Platform | Repo health / security audit follow-ups | P2 | Planned | ΓÇö | Triage findings into SC items as needed |
| **SC-146** | Enrollment | Re-open Fillout daily intake when season ready | P2 | Deferred | SC-060, SC-135 | Turn on only after SC-135 dry-run |
| **SC-066** | Enrollment | Early-bird periods supported if desired | P3 | Decision Needed | SC-065 | Decide if 2026ΓÇô27 uses early-bird; config if yes |
| **SC-067** | Enrollment | Program Instance multi-year design | P3 | Tracked under V2-013 | SC-032, SC-046 | Dedicated architecture wave later ΓÇö do not block season launch on PI redesign |
| **SC-100** | Assets | Attachment / Drive retirement strategy | P3 | Deferred | SC-095 | Plan retirement after S3 paths stable for HW+video |
| **SC-116** | Website | Admin roadmap (gated read-only first) | P3 | Built in Repository | SC-112 | Staff auth then read-only aggregates; no writes in first slice |
| **SC-127** | Awards | Award Recipients scope metadata cleanup | P3 | Deferred | ΓÇö | Optional if reports need it |
| **SC-128** | Awards | Awards catalog duplicate `thanks_for_playing` bucket | P3 | Deferred | ΓÇö | Consolidate Class/bucket |
| **SC-129** | Other | Conquered Goal Date lookup filter | P3 | Deferred | ΓÇö | Only if parent-facing field wrong |
| **SC-131** | Media | Generate Media Kits as platform feature | P3 | Deferred | SC-094, SC-054 | Config tables + generator + UI later |
| **SC-132** | Media | Facebook kits | P3 | Deferred | SC-131 | Not started |
| **SC-143** | Platform | Educational Athletics multi-challenge platform (Dribble, etc.) | P3 | Deferred | ΓÇö | Separate repos/bases recommended |
---
