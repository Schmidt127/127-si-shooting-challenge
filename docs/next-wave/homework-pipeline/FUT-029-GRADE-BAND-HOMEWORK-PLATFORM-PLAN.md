# FUT-029 — Grade-Band Homework Platform and Homework Intake Adapter

**Canonical ID:** **FUT-029**  
**Master Remaining Work:** **MRW-H12**  
**Status:** **Deferred / implementation-ready design**  
**Priority:** P2 (long-term)  
**Last updated:** 2026-09-05  

**Scope lock (binding):** FUT-029 is deferred. It is **not required** to finish the current Shooting Challenge app and **must not be implemented** until Mike separately authorizes it.

**Authoritative plan path:** `docs/next-wave/homework-pipeline/FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md`  
**Historical brief (superseded):** [`FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md`](./FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md) — Fillout-centered direction retained for history only.

**This documentation package authorizes documentation only.** It does not authorize Airtable schema changes, automation edits, Vercel routes, storage-provider activation, Production mutations, Season Simulation, or SC-160 interference.

---

## 1. Goal

Build a **grade-band homework player** inside the existing Next.js/Vercel Shooting Challenge application. Its defining integration component is the **Homework Intake Adapter**.

The adapter replaces **only** the athlete-facing homework intake method. It must feed the established Homework Completion, coach-review, feedback, XP, Weekly Athlete Summary, level, and Perfect Week pipeline.

The platform strengthens Educational Athletics: real assignments, developmentally appropriate questions, real coach review, feedback, and reliable XP/progress integration — without replacing GitHub, Vercel, Airtable, Family Dashboard auth, or the current homework spine.

---

## 2. Controlling integration contract

> The Homework Intake Adapter is successful only when it creates exactly one validated, canonical Homework Completion that is indistinguishable to downstream workflows from a correctly produced completion under the existing system.

The intake adapter **must not**:

- award XP directly;
- mark work Satisfactory;
- send parent feedback through a new pathway;
- replace established homework automations;
- bypass Program Homework Assignment or Week identity;
- weaken early/on-time/late rules;
- weaken Perfect Week rules;
- create duplicate Homework Completions;
- expose Airtable record IDs, secrets, or permanent public child-upload links.

---

## 3. Mike’s confirmed decisions (binding product requirements)

### 3.1 Existing workflow

- Preserve the current homework-assignment and scheduling method.
- Inspect and document the exact current Program Homework Assignment / Week activation method before implementation (Phase 1 truth audit).
- Do **not** add a second publishing process unless technically necessary and later approved.
- Preserve the current Homework Completion, coach-review, feedback, XP, Weekly Athlete Summary, level, and Perfect Week pipeline.
- Preserve the current photo, paper, and video intake paths until a future migration is separately authorized and proven.

### 3.2 Assignment availability

- Athletes may see an assignment as soon as it is published or activated through the **current** method.
- Assignments are reusable in future weeks and seasons through separate scheduled occurrences.
- Historical work must retain the **exact** content and questions originally presented (immutable versions).

### 3.3 Grade-band behavior

- The server automatically selects questions using the athlete’s **current Enrollment grade band**.
- Never trust a grade-band value submitted by the browser.
- An assignment may support any selected grade bands; it does not need all five.
- If an assigned athlete’s grade band has no valid question set:
  - show a safe athlete-facing error;
  - alert the administrator;
  - do **not** silently substitute another grade band.

### 3.4 Assignment authoring

- Mike creates and edits assignments and grade-band question sets in an **Airtable Interface**.
- Preserve the existing reusable Homework Library and seasonal Program Homework Assignment distinction.
- Future authoring must support:
  - in-app readings or stories;
  - embedded videos;
  - durable PDFs or document links;
  - images and illustrations;
  - typed-response questions;
  - multiple-choice questions;
  - required photo or document uploads;
  - required video uploads or links.

### 3.5 Athlete completion experience

- Homework is completed in **one session**.
- Do **not** create a user-facing saved-draft workflow.
- Technical recovery may protect against a transient refresh or dropped connection, but it must not become a cross-session Draft feature without approval.
- Every required question and required upload must be complete before Submit is available.
- After submission, the attempt is **immutable**.
- Athletes cannot edit submitted answers.
- The submission screen should confirm success and show `Submitted`.
- Completed homework history should eventually show: the assignment; the athlete’s submitted answers; the evaluation result; coach feedback.

### 3.6 Coach review and redo

- The coach evaluates an attempt as `Satisfactory` or `Needs Revision`.
- Coach feedback is supported.
- `Needs Revision` earns **no XP**.
- The original attempt remains immutable.
- The athlete **cannot** independently start another attempt.
- The coach must **explicitly authorize** a brand-new redo attempt.
- Preserve every previous attempt and its feedback as history.

### 3.7 XP and feedback

- Homework XP is awarded only after the authoritative coach action marks the work Satisfactory.
- Use the existing XP Reward Rules and established Homework XP automation.
- Exactly one eligible Homework XP Event may exist for the canonical completion.
- Do **not** create a new XP writer.
- Preserve the current feedback and sending pipeline rather than creating a separate notification system.

---

## 4. Enterprise architecture (existing stack)

Practical enterprise-grade design using the **current** technology stack. Do **not** migrate the entire platform to a new database as a prerequisite. A future PostgreSQL migration may be noted as a possible scale option, but it is **not** part of FUT-029’s required initial implementation.

| Layer | Role |
|---|---|
| GitHub | Source control for app, APIs, contracts, docs |
| Next.js / Vercel | Protected athlete homework player and server APIs |
| Existing authentication | Family/athlete authorization (Family Dashboard session model) |
| Airtable | Assignments, scheduling, completion workflow, coach review, operational status |
| Durable object storage | Protected athlete uploads (exact provider decided later) |
| Existing automations | Downstream homework / XP / feedback / WAS / Perfect Week |
| Monitoring & audit | Alerts, append-only audit events, reconciliation |

---

## 5. Logical data model (document only — do not create now)

1. **Homework Assignment** — Reusable lesson identity and curriculum metadata (aligns with Homework Library).
2. **Assignment Version** — Immutable snapshot of the content and instructions delivered.
3. **Grade-Band Question Set Version** — Immutable ordered question set for one grade band.
4. **Program Homework Assignment / Scheduled Occurrence** — Existing seasonal scheduling authority linking the reusable assignment/version to a Week or slot.
5. **Homework Attempt** — Immutable individual submission attempt, including redo lineage.
6. **Homework Response** — One normalized response linked to its frozen question and attempt. Avoid fragile `Answer 1`…`Answer N` fields.
7. **Submission Asset** — Metadata and protected durable-object reference for photos, documents, or videos.
8. **Homework Completion** — Canonical downstream workflow record consumed by coach review, feedback, XP, Weekly Summary, and Perfect Week logic.
9. **Audit Event** — Append-only evidence of important state transitions and repairs.

Final table/field names require a live dependency audit before any schema creation.

---

## 6. Attempt-versus-completion decision (preferred direction)

The current system has historically treated **one Homework Completion per Enrollment + Program Homework Assignment** as canonical. Mike’s redo rule requires **multiple immutable attempts**.

**Preferred design (subject to live schema verification):**

- Preserve **one** canonical, award-bearing Homework Completion per Enrollment + PHA.
- Represent individual submissions and authorized redos as **immutable child attempts**.
- Link all responses and assets to the applicable attempt.
- Permit only **one** final Satisfactory outcome to trigger the **single** Homework XP award.

Do **not** create multiple award-bearing Homework Completions unless a future live-contract investigation proves that every downstream consumer can be safely migrated.

---

## 7. Protected intake API

The browser submits to a **protected server endpoint**. The browser must not write directly to Airtable or determine authoritative workflow values.

The server must derive and validate:

1. Authenticated user and family/athlete authorization.
2. Active Enrollment and Program Instance.
3. Assigned PHA / scheduled occurrence and Week.
4. Current Enrollment grade band.
5. Published immutable assignment and question-set version.
6. Completion of every required answer and upload.
7. Whether an earlier attempt exists.
8. Whether the coach authorized a redo.
9. Official submission timestamp.
10. Existing early/on-time/late classification.
11. Existing Perfect Week eligibility.
12. Stable attempt and idempotency keys.

The browser must **not** be trusted to declare athlete identity, grade band, Week, due status, Satisfactory status, XP, or Perfect Week eligibility.

Public URLs must use opaque identifiers — never raw Airtable record IDs.

---

## 8. Safe Airtable write sequence (readiness-gated)

Because Airtable does not provide normal multi-table transactions, use a readiness-gated intake sequence:

1. Resolve or reserve the canonical Enrollment + PHA completion identity.
2. Create a unique immutable attempt in `Intake Processing`.
3. Create normalized response records.
4. Link validated durable assets.
5. Verify expected response and asset counts.
6. Verify assignment/question versions.
7. Stamp the official submission time and timing classification.
8. Move the attempt/completion to `Ready for Coach Review`.
9. Only then release downstream processing.

Partial or failed writes must remain quarantined as `Intake Error`. They must not enter the coach queue or XP pipeline prematurely.

---

## 9. Idempotency and state control

Protect against: double-click Submit; browser refresh; network timeout; repeated API delivery; concurrent requests; reconciliation retries.

Require a **stable attempt key** and a **request-level idempotency key**.

Controlled state model (illustrative; exact Airtable option names verified at implementation):

| State | Meaning |
|---|---|
| `Available` | Assigned and open for first attempt (or after redo authorization) |
| `Submitting` / `Intake Processing` | Server write sequence in progress |
| `Intake Error` | Quarantined partial/failed intake |
| `Ready for Coach Review` | Validated attempt ready for coach queue |
| `Under Review` | Coach actively evaluating |
| `Satisfactory` | Coach accepted; XP path may proceed |
| `Needs Revision` | Coach rejected; no XP; attempt immutable |
| `Redo Authorized` | Coach explicitly authorized a new attempt |
| `XP Processed` | Exactly one eligible Homework XP Event exists for the canonical completion |

Only the coach/admin may authorize a redo. **No** state transition may create duplicate XP.

---

## 10. Timing and Perfect Week (preserve established rules)

All timing decisions use **server** timestamps, the official PHA week/due date, and the program timezone. Client-device time is not authoritative.

| Classification | Completion / XP (after Satisfactory) | Perfect Week |
|---|---|---|
| Early | Eligible under established early rules | Count in assigned official week per established policy |
| On time | Eligible | Eligible per established policy |
| Late | Eligible for normal completion credit and XP | Not eligible for Perfect Week for the original assigned week |
| Coach graded late | Athlete timing unchanged | Coach delay must not penalize an on-time athlete |

Exact deadline boundary and timezone are verified from live Program Instance / Week configuration during Phase 1 — not reinvented by this plan.

---

## 11. Durable file handling

- Do not use temporary Airtable attachment URLs as permanent links.
- Store files using stable internal object keys in durable storage.
- Use authenticated, short-lived viewing URLs.
- Define allowed file types, maximum sizes, and upload counts (pre-implementation decisions).
- Validate supported video-link providers.
- Add malware/content-safety checks where practical.
- Never expose secrets, Airtable IDs, signed URLs in logs, or permanently public child-upload URLs.
- Exact provider and retention policy are **pre-implementation decisions** (see §17).

---

## 12. Existing pipeline inspection requirement

Before future implementation, agents must inspect **live** versions and triggers for every relevant workflow, including:

- **020**, **033**, **064**, **065**, **071**, **078** (and feedback/Hub successors)
- any replacements or successors introduced after this documentation date

The plan must **not** assume old version numbers remain authoritative. (Example context at documentation time: SC-160 has advanced **020** / **065** / **057** versions — always re-verify.)

The future adapter must preserve:

- canonical Homework Completion identity;
- coach Satisfactory / Needs Revision decision;
- XP Reward Rules;
- Homework XP deduplication (`HOMEWORK_XP|{homeworkCompletionId}` pattern);
- early/on-time/late rules;
- Perfect Week rules;
- Weekly Athlete Summary linkage;
- parent-feedback workflow;
- coach action and error queues;
- traditional paper/photo/video paths during migration.

---

## 13. Security, privacy, and auditing

Require:

- server-side family-to-athlete authorization;
- coach/admin role separation;
- opaque public identifiers;
- no Airtable record IDs in URLs;
- rate limiting;
- safe structured diagnostics;
- correlation IDs;
- no student answers or signed URLs in logs;
- append-only audit events for submission, validation, review, redo authorization, XP, feedback, and reconciliation;
- documented retention and deletion rules;
- no use of student work with third-party AI without a separate explicit privacy/product decision.

---

## 14. Monitoring and reconciliation

Administrator alerts and reconciliation for:

- missing grade-band question set;
- intake stuck in Processing;
- incomplete response/asset set;
- duplicate attempt or idempotency key;
- missing or ambiguous Enrollment / PHA / Week identity;
- Satisfactory completion missing XP;
- duplicate Homework XP;
- failed parent-feedback work;
- duplicate or ambiguous Weekly Athlete Summary;
- reconciliation repair failure.

Alerts must identify the workflow safely **without** exposing student content.

---

## 15. Athlete and coach experience (summary)

### Athlete

1. Sign into Family Dashboard; server resolves Enrollment, Program Instance, Grade Band.
2. Homework list shows assigned items (current activation method) with status and due context.
3. Detail/player shows shared materials + server-selected grade-band questions + required uploads.
4. Complete all required items in one session; Submit when ready.
5. Success screen shows `Submitted`; attempt immutable.
6. History eventually shows assignment, answers, evaluation, coach feedback.

### Coach

1. Review queue shows work needing evaluation.
2. Coach sees frozen assignment/question versions, responses, assets, timing, prior attempts.
3. Marks `Satisfactory` or `Needs Revision` with feedback.
4. Existing feedback delivery and XP reconciliation proceed only on Satisfactory.
5. Explicitly authorizes redo when a new attempt is allowed.
6. History/audit retains all attempts.

---

## 16. Future implementation phases (gated)

| Phase | Work | Exit criteria |
|---|---|---|
| **1 — Truth and design lock** | Inspect current schema, automations, authoring, authentication, assignment activation, open Mike decisions. **No Production mutations.** | Evidence-backed architecture lock |
| **2 — Data and API foundation** | Versioning, attempt/response model, adapter API, idempotency, auditing, reconciliation in a **development** environment | Contracts + tests; no live regression |
| **3 — Airtable authoring Interface** | Mike builds reusable assignments, grade-band question sets, media, requirements, schedules | Authoring usable for pilot |
| **4 — One-assignment athlete pilot** | Selected grade bands; disposable test athletes; every required response type | Pilot UX + intake proof |
| **5 — Existing-pipeline proof** | Coach review, Satisfactory, Needs Revision, redo authorization, feedback, XP, Weekly Summary, Perfect Week | One HC / one XP; rules intact |
| **6 — Limited Production rollout** | Small cohort, monitoring, rollback, reconciliation | Smoke + rollback proof |
| **7 — Scale and closeout** | Expand assignments and grade bands only after pilot acceptance | Content QA + docs reconciled |

---

## 17. Remaining Mike decisions (future — not current blockers)

Do **not** ask Mike to decide these now:

1. Exact administrator-alert destination
2. File provider
3. File size / type / count limits
4. File retention / deletion period
5. Supported video-link providers
6. Whether the current assignment activation method needs a readiness-validation gate
7. Exact technical-recovery behavior during a one-session attempt
8. Whether automatic multiple-choice scoring assists the coach (must **not** independently award XP)
9. Pilot assignment and pilot grade bands

---

## 18. Required test matrix

At minimum:

- every supported grade band;
- missing-grade-band safe error and administrator alert;
- typed response; multiple choice; photo/document upload; video upload; video link;
- required-answer and required-upload enforcement;
- unauthorized athlete / Enrollment / PHA access;
- double-click, refresh, timeout, retry, and concurrent submission;
- early, exact-deadline, on-time, and late submission;
- athlete submitted on time but coach reviewed late;
- Perfect Week eligibility and non-eligibility;
- Satisfactory creates exactly one XP Event;
- Needs Revision creates no XP;
- unauthorized redo blocked; coach-authorized redo allowed;
- historical assignment/question content unchanged after later edits;
- durable-file access; expired or invalid file authorization;
- partial Airtable write and reconciliation;
- missing or duplicate Weekly Athlete Summary;
- existing paper/photo/video workflow regression;
- mobile layout; keyboard navigation; screen-reader behavior;
- loading, empty, validation, and failure states;
- security/privacy proof that no IDs, secrets, signed URLs, or another athlete’s work are exposed.

---

## 19. Explicit holds

Until Mike explicitly authorizes implementation:

- Do not implement FUT-029 application code or APIs.
- Do not create or change Airtable tables, fields, views, Interfaces, formulas, or automations.
- Do not choose or activate a file-storage provider for this project.
- Do not deploy application code for FUT-029.
- Do not alter current Homework Completions, PHA rows, XP, or Perfect Week logic for this project.
- Do not retire Fillout or current submission paths.
- Do not run Season Simulation for FUT-029.
- Do not interfere with SC-160.
- Do not include FUT-029 in current app-completion acceptance criteria.

---

## 20. Documentation reconciliation

Active references must identify:

- **FUT-029 — Grade-Band Homework Platform and Homework Intake Adapter**
- Status: **Deferred / implementation-ready design**
- Not part of current app completion
- Separate authorization required before implementation
- Older Fillout-centered brief superseded but retained for history
- Canonical plan: this file

---

## 21. Starting instruction for a future implementation orchestrator

When Mike starts FUT-029:

1. Re-run Phase 1 live/repo truth audit (schema, automation versions, activation method, auth).
2. Confirm attempt-versus-completion design against live downstream consumers.
3. Implement only behind development / feature-flag boundaries.
4. Prove one-assignment pilot + existing-pipeline matrix before any Production cohort.
5. Update living docs and promotion checklists; keep Fillout/paper/photo/video paths until separately authorized migration.
