# C-025 Architecture Reconciliation — 117a–f vs 117a/b-only

**Date:** 2026-07-15  
**Branch / PR:** `feature/shooting-v2-release-readiness` · [#26](https://github.com/Schmidt127/127-si-shooting-challenge/pull/26)  
**Scope:** Repository evidence only — **no live Airtable, PROD, merge, or deploy**  
**Purpose:** Resolve the conflict between Worker A’s readiness audit (six automations 117a–f required) and the PR #26 package (117a/b only; 117c–f “not required”).

---

## 0. Executive verdict

| Question | Answer |
|----------|--------|
| Are Stage 17 automations 117c–117f “obsolete because 101 already does them”? | **No.** Live attendance **101** does not award recording XP, send recording approval email, or wire Perfect Week/gate for recording makeup. |
| Can product intent be delivered with only PR **117a** + **117b**? | **Conditionally yes** — only under the **S16 Homework Completions** architecture, **and only if** companion schema/formula/057/101 gaps below are closed. |
| Should Stage 17’s six Zoom Attendance scripts be restored as-is? | **Not without an intake-path decision.** They target a different primary table (`Zoom Attendance`) and Source Key family (`ZOOM_CREDIT\|…`) than S16 (`Homework Completions` + `ZOOM_RECORDING\|…`). |
| Is `C-025-117-numbering.md` accurate about Stage 17? | **No.** It mislabels Stage 17 117c–f. Corrected below and in the numbering note. |
| Final recommendation | **Keep S16 as product authority** (owner-approved Stage 12/16). Keep repo **117a** (XP + optional `Recording Attendees`) and **117b** (email). Treat Stage 17 117a–f as an **alternate overnight design**, not as “replaced by nothing.” **Do not paste either path to PROD** until Mike chooses intake path and gaps in §6 are closed. |

---

## 1. Old six-automation architecture (Stage 17 overnight)

**Authority:** `chatgpt-recovery-2026-07-14/docs/deploy-checklists/C-025-automation-packages-stage17.md`  
**Primary table:** `Zoom Attendance` (`Attendance Method = Recording Quiz`)  
**Credit key:** `ZOOM_CREDIT|{Enrollment RID}|{Zoom Meeting RID}` (formula layer already applied in DEV per S18)  
**Exclusivity:** Formula `Zoom Credit Conflict?` / `Zoom Credit Approved?`

| # | Stage 17 name | Intended responsibility |
|---|---------------|-------------------------|
| **117a** | Normalize Recording Quiz Submission | Dedupe one ZA row per Enrollment+Meeting; set Needs Review |
| **117b** | Coach Review / Needs Correction | Sync `Recording Quiz Satisfactory?` from review status; correction stamps |
| **117c** | Create Zoom XP Event | Create/update/soft-void XP Event from Approved formula outputs |
| **117d** | Apply Zoom Gate Credit | Add Enrollment to meeting roster for level-gate count |
| **117e** | Apply Perfect Week Credit | Add Enrollment to roster path consumed by **057** when Config PW toggle on |
| **117f** | Send Approval Email | Parent webhook after Satisfactory when Config enables |

**Worker A audit** correctly assessed *this* architecture as incomplete (scripts recovery-only / not pasted; 117c–f defects; PROD untouched).

---

## 2. Proposed current architecture (S16 / PR #26)

**Authority:** Owner-approved Stage 12 design + Stage 16 config catalog  
**Docs:** `docs/deploy-checklists/C-025-zoom-recording-design-stage12.md`, `C-025-C-027-configuration-catalog-stage16.md`, `docs/v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md`  
**Primary table:** `Homework Completions` (HW17-style **Zoom Recording Quiz**)  
**Credit key:** `ZOOM_RECORDING|{meetingId}|{enrollmentId}`  
**Live keys unchanged:** `ZOOM_ATTEND_BASE|…` (101) · future `ZOOM_LIVE|…`

| # | PR #26 name | Intended responsibility |
|---|-------------|-------------------------|
| **117a** | Award XP from Quiz Completion | On Satisfactory HC: award recording XP; skip if live exists; optionally link `Recording Attendees` for gate |
| **117b** | Send Approval Email Webhook | After Satisfactory + Config email enabled: Make webhook once |
| **117c–f** | Reserved / not implemented | See corrected numbering note — **not** “101 replacements” |

**101** remains live-attendee bulk XP only. Explicit hard stop: do not put recording watchers on live `Attendees` (would award full live XP via 101).

---

## 3. Responsibility matrix (Stage 17 → S16)

| Responsibility | Still required? | Stage 17 owner | S16 / PR #26 owner | Functional gap if Stage 17 removed? | Evidence |
|----------------|-----------------|----------------|--------------------|-------------------------------------|----------|
| Quiz normalize / dedupe credit identity | Yes (identity) | Stage17 **117a** | HC row + Enrollment+Meeting links (no separate normalize automation) | **No** *if* HC path is chosen; **Yes** if DEV stays on ZA formula path | Stage12 §1; Stage17 §1 / §1a Option B |
| Coach approval / Needs Correction | Yes | Stage17 **117b** | Coach marks HC `Completion Status` / `Satisfactory?` | **Partial** — no automated Needs Correction cycle on HC; ops = manual status | Stage12 rules 1,7; PR 117a trigger docs |
| Recording XP award | **Yes** | Stage17 **117c** | PR **117a** | **Yes** if PR 117a absent — **101 does not award recording XP** | 101 Source Keys `ZOOM_ATTEND_*`; PR 117a `ZOOM_RECORDING\|*` |
| Conflict / exclusivity at award | **Yes** | ZA formulas + Stage17 **117c** deactivate | PR 117a `skipped_live_exists` / `skipped_already_awarded` | **Partial** — award-time skip exists; **post-award** live-after-recording soft-void **not** automated; 101 does not dual-detect recording | Install packet §10 R3 UNKNOWN; `canAwardRecordingCredit` |
| Level-gate application | **Yes** (Config default on) | Stage17 **117d** → Attendees | PR 117a → `Recording Attendees` | **Yes until** `Enrollments.Total Zoom Attendances` unions live∪recording — **042 only reads Total Zoom Attendances** | 042 field `Total Zoom Attendances`; install §1.6 UNKNOWN |
| Perfect Week application | **Yes** (Config default on) | Stage17 **117e** → Attendees for **057** | Config toggle only; **057 unchanged** | **Yes — open gap.** **057 counts `Zoom Meetings.Attendees` only**, not `Recording Attendees` | 057 CONFIG `attendees: "Attendees"`; 117a docblock “not Perfect Week rewrite” |
| Parent / athlete email | **Yes** (Config gated) | Stage17 **117f** | PR **117b** | **Yes** if 117b absent | Stage12 §5; PR 117b |
| Correction / rollback | Yes (ops) | Stage17 **117b** + soft-void XP | Manual HC status + deactivate XP by Source Key | **Partial** — documented rollback, not automated conflict cascade | Install §12; Stage17 117c deactivate path |

---

## 4. Capability checklist (does 117a/b-only fully support…?)

| Capability | Fully supported by PR 117a/b alone? | Notes |
|------------|-------------------------------------|-------|
| Zoom recording XP | **Yes (repo)** | Requires DEV paste + Config + `ZOOM_ATTEND_BASE` rule |
| Level gates | **Not yet** | Roster write exists; counting formula / OMNI review still required |
| Perfect Week | **Not yet** | Config intent only; **057 must be extended** or a companion automation must write a roster **057** already counts |
| Dedup vs live attendance | **At award time yes** | Live-after-recording and recording-after-ops-mistake dual path still open |
| Approval conflicts | **Partial** | Skip when live XP present; no Stage17-style formula conflict soft-void on ZA |
| Corrections | **Partial** | Coach can un-satisfy HC; no Needs Correction automation; XP soft-void manual |
| Required email communications | **Yes (repo)** | 117b + Config safe defaults; DEV webhook only |

---

## 5. Corrected numbering map (fix `C-025-117-numbering.md`)

| Number | Stage 17 meaning (overnight) | PR #26 meaning | Disposition |
|--------|------------------------------|----------------|-------------|
| 117a | Normalize ZA quiz row | Award recording XP (+ optional gate roster) | **Different jobs** — same number reused |
| 117b | Coach review / Needs Correction | Approval approval email | **Different jobs** — same number reused |
| 117c | Create / soft-void XP Event | Reserved | Stage17 responsibility → **PR 117a** (not “deadline helper”) |
| 117d | Apply gate credit | Reserved | Stage17 responsibility → **PR 117a `Recording Attendees`** + formula gap (not “Claims table”) |
| 117e | Apply Perfect Week credit | Reserved | Stage17 responsibility → **still required as 057/formula companion** (not “reserved unused”) |
| 117f | Approval approval email | Reserved | Stage17 responsibility → **PR 117b** |

---

## 6. Unresolved live Airtable checks (Mike / OMNI — DEV only)

Do **not** guess. Confirm in DEV `appTetnuCZlCZdTCT`:

1. Does overnight **Zoom Attendance** credit formula layer (`Zoom Credit Key` / `ZOOM_CREDIT|…`, Approved?, Conflict?) still exist and is it authoritative?  
2. Are recording quizzes expected on **Homework Completions** (S16) or **Zoom Attendance** (Stage 17)?  
3. Does `Recording Attendees` exist on Zoom Meetings?  
4. What is the live formula for `Enrollments.Total Zoom Attendances`?  
5. Does **057** only read `Attendees`, and should Perfect Week use `Recording Attendees` when Config `Recording Makeup Counts for Perfect Week?` is on?  
6. Any live paste of Stage 17 117a–f or PR 117a/b already present?

Until (1)–(2) are answered, **do not paste** either automation set.

---

## 7. Final recommendation

1. **Product authority:** S16 Stage 12/16 owner approvals (Homework Completions quiz; Config %; `Recording Attendees`; exclusivity).  
2. **Automation surface:** Keep PR **117a** + **117b**; do **not** claim Stage 17 117c–f are obsolete because 101 replaces them.  
3. **Before DEV activation:** close Perfect Week + Total Zoom Attendances gaps (formula and/or 057 update — prefer schema/formula over new automations when possible).  
4. **Before PROD:** add or verify 101 dual-detect / soft-void when the opposite family already exists for the same meeting+enrollment.  
5. **Stage 17 scripts:** retain only as recovery/historical design unless Mike selects the ZA intake path; if selected, restore/correct Stage 17 117a–f with real DEV field names (do not invent).  
6. **Worker A audit:** remains valid for the Stage 17 path. For the S16 path, replace “must ship six automations” with “must ship 117a/b **plus** gate/PW/conflict companions documented here.”

---

## 8. Worker A audit amendment (S16 path)

| Worker A conclusion (Stage 17 lens) | Amendment under S16 |
|-------------------------------------|---------------------|
| 117a–f all launch-blocking | **117a + 117b** are the automation blockers; **Perfect Week wiring**, **Total Zoom union**, and **post-award conflict** remain launch-blocking *behaviors* even without Stage17 117c–f files |
| 117c–f defects block DEV paste of six-pack | Correct for Stage 17; N/A if Stage 17 not chosen |
| Recovery-only scripts | Stage 17 yes; S16 scripts are on this PR branch |
| PROD untouched | Still true |

---

## 9. Related files

| File | Role |
|------|------|
| `docs/v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md` | S16 DEV install packet |
| `docs/deploy-checklists/C-025-117-numbering.md` | Corrected numbering disposition |
| `docs/deploy-checklists/C-025-zoom-recording-design-stage12.md` | Owner-approved design |
| `chatgpt-recovery-2026-07-14/docs/deploy-checklists/C-025-automation-packages-stage17.md` | Stage 17 six-pack design |
| `airtable/automations/shooting-challenge/lib/c025-zoom-recording-credit.js` | Pure contracts + responsibility tests |
| `airtable/automations/shooting-challenge/117a-*.js` / `117b-*.js` | S16 automation sources |
| `101-*.js` / `057-*.js` / `042-*.js` | Live XP / Perfect Week / gates (unchanged) |

**Confirmation:** This reconciliation made **no PROD or live Airtable changes**.
