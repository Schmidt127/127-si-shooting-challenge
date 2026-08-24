# 127 Sports Intensity — Master Future Work List

**Project:** 127 Sports Intensity Shooting Challenge and public website  
**Repository:** `Schmidt127/127-si-shooting-challenge`  
**Created:** 2026-08-24  
**Purpose:** One owner-approved list of future app, Airtable, AWS, email, payment, award, and website work. Each item is written so it can later become a focused Cursor or Airtable/OMNI prompt.

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
**Status:** Ready for prompt  
**Systems:** Airtable, homework intake, Homework Completions, XP, parent submission flow

Allow a parent or athlete to submit an assignment in either visible homework slot. The system must identify the assignment by its assignment/lesson identity and match it to the correct scheduled assignment. The HW number is not authoritative because slot numbering may change from year to year.

Parents may submit the assignment at any time before the assignment’s explicit **Due Date/Deadline**. For the upcoming challenge, Mike will set the Due Date to the final day of the challenge. Submissions after the Due Date receive no credit unless a separate approved exception is used.

The system must preserve checks for assignment identity, enrollment, challenge/season, and duplicate credit. Multiple uploads or repeat submissions are allowed, but only one Homework Completion and one XP award may be credited for the same athlete, assignment identity, and enrollment context.

**Acceptance criteria:** correct assignment matching across either slot; deadline enforced; late submission clearly marked ineligible; repeat uploads reviewable; XP deduplicated; no dependence on HW1/HW2 names.

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
**Status:** Ready for prompt  
**Systems:** Stripe, webhook/API integration, Airtable Enrollments or payment records

After Stripe accepts a registration payment, write the payment result back to Airtable. At minimum, capture the amount paid and whether a coupon or promotion code was used. The implementation prompt should determine the final field location and exact Stripe event contract.

The design should use verified webhook events as the payment source of truth, support idempotent retries, and distinguish successful, failed, pending, refunded, and unmatched payments.

**Acceptance criteria:** full-price and discounted test payments; amount paid; coupon/promotion evidence; duplicate webhook protection; enrollment linkage; clear failure state; no payment status based only on a browser return page.

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
**Status:** Ready for prompt  
**Systems:** Website athlete profile, Airtable level data, design system

On the athlete page, place the appropriate level graphic beside or near the athlete’s displayed shooter level, such as Beginner. Fix the current blue level label with black text so it has sufficient contrast and matches the other hero labels professionally.

### FUT-012 — Athlete page: professional Game Log presentation

**Priority:** P1  
**Status:** Ready for prompt  
**Systems:** Website XP activity table, XP Events, Airtable presentation fields

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
**Status:** Ready for prompt  
**Systems:** Website, Weekly Athlete Summary, Perfect Week fields

Create a panel styled consistently with Game Log/Recent Activity for Perfect Weeks. Show all current and past weeks, but do not show future weeks. For each week, display the week dates, shot submissions, homework submitted, videos submitted, Zoom attendance, and a clear status label such as `Perfect Week`, `Not Perfect`, or `In Progress`.

Place this panel where Weekly Performance currently appears and move the existing weekly-performance box below it. The design should motivate athletes to improve in the next week when they miss Perfect Week credit.

### FUT-014 — Homework page redesign and live Homework Library connection

**Priority:** P1  
**Status:** Ready for prompt  
**Systems:** Website Homework page, Airtable Homework Library/assignment table

Redesign the Homework page with a polished modern card/scrolling experience while preserving usability and accessibility. Display the active assignments present in the Homework assignment table—not a hardcoded count. Mike may add assignments before the challenge or during Week 1, and the page must update accordingly.

Sort newest week first. Each assignment should display its name, assigned week, brief explanation, and links to required documents/resources.

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

After Mike reviews this document, the following planning duplicates may be retired or replaced by a redirect/pointer:

1. `docs/v2-change-backlog.md`
2. `docs/CHATGPT-MASTER-PLAN-BRIEF.md`
3. `docs/chatgpt-sources/22-v2-change-backlog.md`
4. `docs/chatgpt-sources/23-master-plan-brief.md`
5. `docs/chatgpt-sources/02-master-direction.md` only if its governing rules are first preserved in the current direction/constitution documents
6. Obsolete pasted brainstorming copies that contain no unique evidence

Do not delete current-truth, completion, deployment, security, test, schema, or historical evidence documents merely because this list summarizes them.
