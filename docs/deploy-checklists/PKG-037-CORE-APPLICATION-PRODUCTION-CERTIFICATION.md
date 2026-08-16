# PKG-037 — Core Application Production Certification Packet

**Status:** Repository-ready certification packet; **do not run live
certification until Mike executes preflight and prerequisite gates.** Prior
blockers PKG-006R and PKG-036 are complete as of 2026-08-15; PKG-034
live-attendee proof and PKG-038 streak/milestone paste remain separate gates.
**Authority:** This is the one executable core-certification packet after its
prerequisites are individually installed and proven. It does not replace their
packets or make a Production claim from repository text.
**Production operator:** Mike only. Agents must not access or alter Production
Airtable, automation state, configuration, email, or forms.
**Repository baseline:** record `git rev-parse origin/master` immediately
before execution.
**Scope:** Registration through canonical Enrollment, Submission, Week/WAS, XP
ledger, formula settlement, progression, and standings. Daily communications is
an observed secondary handoff only; no visual or delivery-design evaluation.

## 1. Evidence lanes and prerequisite order

Each lane has four independent proofs. Do not collapse them into “passed.”

| Proof lane | Meaning | Required capture |
|---|---|---|
| Repository proof | Committed source and offline contracts implement the claimed ownership. | SHA, file/version, offline command/output |
| Installed-version proof | Airtable has the exact committed version, trigger, inputs, and ON/OFF state. | automation screenshot/export and run history |
| Natural-trigger proof | A production-shaped field transition caused the automation to run. | triggering record, Automation run ID, outputs |
| Settlement/data proof | Formula/lookups/rollups settled and records have exact links, keys, totals, and lifecycle state. | before/after values, record IDs, audit JSON |

Run packages strictly in this order:

1. **PKG-006R:** install and prove 010 v10.8, including positive, replay,
   withdrawal/restoration, read-only audit, settled totals, and natural
   trigger. Its lock must be explicitly released.
2. **PKG-007:** retain its controlled Homework lifecycle evidence. Before this
   packet, reconfirm 020 v3.5, 064 v12.2, and 065 v10.1 state and prove any
   additional selected path; do not infer Video XP from Homework evidence.
3. **PKG-034:** retain the historical 101 v6.1 installation/empty-roster
   evidence, re-attest the current installed version against canonical source
   v6.3, and execute the pending live-attendee, same-event
   reversal/restoration, and downstream proof for the selected certification
   athlete.
4. **PKG-036:** the repository prerequisite is complete with canonical source
   041 v5.0 and 042 v4.1.2. Production installation/proof remains a Mike-owned
   controlled step after the PKG-006R lock release, using the queue/replay/
   downward/upward evidence in its operator packet. Automation 043 stays
   retired.
5. **PKG-037:** execute this packet as the consolidated cross-family
   certification. A passed child package is evidence consumed here, not a
   reason to skip a linked-record or settled-total check.

**First action once PKG-006R, PKG-007, PKG-034, and PKG-036 are individually
installed and proven:** open a new evidence worksheet, capture the
read-only baseline for the dedicated test athlete (including zero selected
source keys and every pre-existing total), then run the preflight in section 4
before changing the registration or source records.

## 2. Dependency and ownership map

```text
Registration → 001 → canonical active Enrollment → 041 queue → 042 assignment
Submission → 023 → 005 → 007 → 031 → canonical Week + one WAS
                                            ├→ 010 → Submission Base XP
                                            └→ 076 → Email Handoff Queue → 079 (secondary)
Submission Asset → 020 → Homework Completion → 064 → 065 → Homework XP
Submission Asset → 013 → Video Feedback → 113 → 114 → Video XP
Zoom Meeting attendee lifecycle → 101 → live Zoom XP
All active XP Events → WAS/lifetime formula-rollups → 041 → 042 → standings inputs
```

| Owner | Sole or canonical ownership | Must not be replaced by |
|---|---|---|
| 001 | Finds/creates Athlete, links canonical Enrollment, requests initial progression. | Manual Enrollment duplicate creation |
| 023 | Resolves Submission Enrollment. | Any email/Make writer |
| 005 | Resolves Submission Week and validates date/PHA context. | Manual Week assignment for proof |
| 007 | Flags duplicate Submission eligibility. | XP writer guessing duplicate state |
| 031 | Finds/creates the one canonical WAS for Enrollment + Week. | 068 or a manual second WAS |
| 010 v10.8 | Sole Submission Base XP family: `SUBMISSION_XP|{Submission ID}`; same-event correction. | 053/054/059/065/101/114 or a manual XP row |
| 076 | Creates/reuses exact daily Email Handoff Queue record. | 077 or direct Make/Gmail send |
| 079 | Sends Communications Hub queue handoff. | 077 or legacy Make/Gmail writer |
| 020 | Creates/links Homework Completion with PHA-first identity. | 063 |
| 064 | Prepares positive Homework XP eligibility/rule state. | 065 correction logic |
| 065 | Sole Homework XP family: `HOMEWORK_XP|{Homework Completion ID}`; same-event correction. | 063/068/manual XP |
| 013 | Creates/links Video Feedback. | 112 |
| 113 | Determines Video base XP eligibility/value. | 114 rule selection |
| 114 | Sole Video XP family: `VIDEO_SUBMISSION|{Video Feedback ID}`; same-event correction. | 112/manual XP |
| 101 | Sole deployed live Zoom XP writer: `ZOOM_ATTEND_BASE|{Meeting Key}|{Enrollment ID}` and applicable bonus keys. | Recording-credit designs/117 variants |
| 041 | Queue only: progression latch/signature. | 043 or direct level writes |
| 042 | Sole writer of Current Level, Next Level, Level Gate Rule, Level Status, and reconciled signature. | 043 |
| Formulas/rollups/views | WAS XP, Enrollment lifetime XP, standings inputs. | Automation writes to computed fields |

## 3. Retired/prohibited writer controls

Before the certification run, Mike attests that each prohibited writer is
absent or OFF; none may be installed, enabled, or substituted to make a test
pass.

| Writer/path | Required disposition | Reason |
|---|---|---|
| 043 | Retired/absent; do not recreate. | 042 is sole progression-output writer. |
| 063 | Retired/absent; do not reinstall. | 020/064/065 own the supported Homework path. |
| 068 | Retired/OFF; do not reinstall. | 033 owns deferred WAS reconciliation. |
| 077 | Deleted/absent; do not recreate. | Daily handoff is 076 → 079 Communications Hub. |
| 112 | OFF; do not enable. | 013 is the Video Feedback creator/linker. |
| 111 | Deleted/absent. | 013 owns Video Feedback grade-band preparation. |
| 117a–117e / Stage 17 designs | Design-only; do not paste. | Recording XP is outside this deployed core. |
| Legacy Make/Gmail daily sender | Disabled/not invoked. | It duplicates the Communications Hub route. |

Recording Zoom XP (`ZOOM_CREDIT`/`ZOOM_RECORDING`) is explicitly outside this
certification. A live-attendance run must neither create such an event nor
send a recording approval email.

## 4. Exact Production preflight — read only

Capture every result in the worksheet. Stop before test data changes if any
condition fails.

1. Record `origin/master` SHA and the local committed source versions:
   001 v5.4; current committed headers for 023, 005, 007, and 031; 010 v10.8;
   020 v3.5; 064 v12.2; 065 v10.1; 101 v6.3; 113 v6.4; 114 v6.1;
   041 v5.0; 042 v4.1.2; 076 v8.6; and 079 v2.0.
2. In Airtable, record installed script headers, ON/OFF state, trigger table,
   condition, dynamic `recordId`, and latest run ID for all rows above.
   “Repository version” is not an installed-version proof.
3. Confirm:
   - 023, 005, 007, and 031 have their installed version/trigger/input
     mappings captured before the Submission is created. If their current
     headers, trigger, or dynamic inputs differ from committed source, stop:
     their natural runs are required upstream certification evidence.
   - 010 trigger is `Submissions.Reconciliation Needed? = 1`, dynamic
     Submission `recordId`, and only enable it after the v10.8 requirement is
     met.
   - 041 is the preserved 15-minute schedule with blank optional `recordId`.
   - 042 is record-enters-view `042 - Needs Level Assignment`, whose filters
     are `Level Recalc Needed?` checked and `Active?` checked, with dynamic
     Enrollment `recordId`.
   - 065 uses `Homework XP Reconciliation Needed? = 1`; 101 uses `Zoom XP
     Reconciliation Needed? = 1`; 114 uses its Video Feedback lifecycle
     reconciliation trigger. All use dynamic record IDs.
4. Verify required fields and types without creating them:
   - Submission canonical Enrollment, Week, WAS, `Count This Submission?`,
     duplicate exclusion state, activity date, reconciliation formula,
     `Last Reconciled Signature` text, and `Reconciliation Needed?` formula.
   - WAS Enrollment + Week links and XP rollup/formula.
   - XP Events Source Key text, Active checkbox, Enrollment/Week/WAS/source
     links, points, source/bucket, and linked source record(s).
   - Enrollment Active, lifetime XP formula/rollup, Current/Next Level and
     Level Gate Rule links, Level Status select, queue/reconciled signatures,
     and standings-input fields.
   - Homework and Video reconciliation fields documented in their child
     packets, plus Zoom’s nine reconciliation fields.
5. Verify configuration:
   - one active Program Instance, exact School Year, one applicable Week for
     the selected activity date, and exactly one active canonical zero-XP
     Beginner Level;
   - a complete, unambiguous active mapping of every active Level to its
     applicable active School Year / Rule Set gate rule, including the test
     Enrollment’s next Level. 042 validates the complete mapping, so a
     next-level-only check is insufficient;
   - active exact reward rules for submission, homework, video, and
     `ZOOM_ATTEND_BASE` (60), `ZOOM_ATTEND_BONUS_2` (30), and
     `ZOOM_ATTEND_BONUS_3` (40), with no duplicate active exact keys;
   - exactly one Program Instance on the Enrollment.
6. Read-only baseline: no selected-source duplicate key; exactly zero or the
   documented expected pre-existing events for every chosen source record;
   one canonical WAS candidate per selected Enrollment + Week; capture
   before totals and standings values.
7. Confirm 043/063/068/077/112 and obsolete Make/Gmail daily writer
   dispositions from section 3.

## 5. Twelve-step end-to-end certification matrix

Use a dedicated Mike-owned test email and a new or otherwise clean test athlete
whose existing records are fully documented. Do not reuse a source record
unless its previous XP events are part of the explicit same-event test.

**Do not run this live certification until:** preflight §4 passes, PKG-009
registering PI attestation is recorded, and Mike explicitly starts the run.

| Step | Mike action | Expected Airtable record/field outcome | Expected website or email result | Pass/fail criteria | Safe rollback / cleanup | Evidence to save |
|---:|---|---|---|---|---|---|
| 1. Enrollment + identity | Submit one controlled registration; capture **001** run | One Athlete; exactly one active Enrollment (`Athlete` link, `Program Instance` link, `School Year` select) | Registration confirmation path completes without duplicate account | No second canonical Enrollment; 001 `statusOut=success` | Turn OFF 001 if unsafe; preserve records | Athlete RID, Enrollment RID, 001 run ID, before/after screenshots |
| 2. Submission intake | Create one valid counted Submission; capture **023, 005, 007, 009, 031** | Submission: one `Enrollment`, one `Week`, one `Weekly Athlete Summary`; assets created as expected | No public page change yet | Intake chain completes; no duplicate Submission for same identity/date | Turn OFF failing intake automation only | Submission RID, Week RID, WAS RID, run IDs |
| 3. Submission Base XP | Wait for **010** on `Reconciliation Needed? = 1` | One active XP Event: `Source Key = SUBMISSION_XP\|{Submission RID}`; links to Submission, Enrollment, Week, WAS | None | Exactly one active event; exact links; no duplicate key | Turn OFF 010; same-event deactivate only via 010 | XP Event RID, Source Key, 010 run ID |
| 4. Homework assign + complete | Coach review one eligible Homework Completion; capture **020, 064, 065** | HC linked to Enrollment, Week, WAS, PHA; one `HOMEWORK_XP\|{HC RID}` | Homework feedback email only if separately approved — not required for cert pass | One active Homework XP event with exact links | Turn OFF 065; preserve HC | HC RID, XP Event RID, 064/065 run IDs |
| 5. Video feedback | Complete Video Feedback lifecycle; capture **013, 113, 114** | One `VIDEO_SUBMISSION\|{VF RID}` linked to VF, Enrollment, Week, WAS | Parent video email only if separately approved | One active Video XP event; 112 remains OFF | Turn OFF 114 if unsafe | VF RID, XP Event RID, 113/114 run IDs |
| 6. Zoom attendance | One live Meeting with test Enrollment attendee; capture **101** | One `ZOOM_ATTEND_BASE\|{Meeting Key}\|{Enrollment RID}`; no recording-credit keys | No recording approval email | Live base event only; bonuses absent on first clean meeting | Turn OFF 101; preserve Meeting/Attendee rows | Meeting RID, Meeting Key, 101 run ID |
| 7. Streak + milestone | After PKG-038 paste approval only: streak + milestone natural runs; observe **053, 054, 066, 059, 041, 042** | Canonical streak topology + `STREAK_XP` / `SHOT_MILESTONE` keys; unlocks/events inactive-not-deleted on withdrawal | None | Same-event lifecycle; no duplicate keys; 041 queues only | Turn OFF 053/054/066/059; do not delete unlocks/XP | Unlock RIDs, XP Event RIDs, audit JSON |
| 8. Level calculation | Observe **041/042** after XP settlement | `Lifetime XP Total` settled; `Current Level`, `Next Level`, `Level Gate Rule`, `Level Status` assigned | None | 042 sole progression writer; queue clears | Never edit levels manually; turn OFF 042 only if unsafe | 041/042 run IDs, level links, signatures |
| 9. Leaderboard + public scope | Read `Web - Leaderboard` row + `/shoot/leaderboard` | Enrollment fields match settled totals; registering PI scope only | Test athlete appears once; no private fields in payload | Matches PKG-040 contract; no duplicate identity | No data repair in cert — stop and open PKG-040 if mismatch | View filter capture, URL screenshot, audit JSON |
| 10. Homework webpage | Open `/shoot/homework` for test athlete context | PHA rows scoped to registering Program Instance | Page loads; assignments match PI + week context | No cross-season homework leakage | None — read-only | URL screenshot, PI record id used by adapter |
| 11. Parent communication | Observe **031 → 076 → 079** daily handoff (and weekly only if separately in scope) | Queue key `DAILY_SUBMISSION\|SUBMISSIONS\|{Submission RID}`; Delivery record when Hub enabled | Hub/Delivery outcome recorded; no 077 / legacy Make daily path | At most one queue row per key; handoff succeeds or fails closed with visible status | Turn OFF 076/079; preserve queue rows | Queue RID, Event RID, Delivery RID, 079 run ID |
| 12. Correction / retry | Replay, withdraw, restore for Submission, Homework, Video, Zoom families | Same XP Event IDs reactivate; totals decrease and restore; no duplicate keys | No duplicate parent emails for same source key | All four families pass same-event table §6 | Turn OFF failing owner only; never delete XP Events | Before/after totals, event IDs, run IDs |

For the clean lifecycle before Step 7, expected cardinalities are: **1**
canonical Enrollment, **1** counted Submission, **1** canonical Week, **1**
canonical WAS, **1** Submission Base XP, **1** Homework XP, **1** Video XP,
and **1** Zoom Base XP. Step 7 is a separate gate requiring PKG-038
Production paste approval. Existing unrelated records are not silently counted
as failures; list them in the baseline and prove source-key disjointness.

## 6. Replay, withdrawal/restoration, and failures

| Family | Replay | Withdraw | Restore | Required invariant |
|---|---|---|---|---|
| Submission Base | Re-run/re-trigger same Submission. | Exclude or uncount the Submission. | Restore countability. | Same `SUBMISSION_XP` event ID, one Source Key, no double totals. |
| Homework | Re-run 064/065 with unchanged eligibility. | Remove Satisfactory/eligibility. | Restore eligibility. | Same `HOMEWORK_XP` event ID, never delete/replace. |
| Video | Re-run 113/114 with unchanged eligibility. | Remove Video eligibility. | Restore eligibility. | Same `VIDEO_SUBMISSION` event ID, never delete/replace. |
| Zoom live | Reconcile unchanged meeting. | Remove attendee or deactivate Enrollment. | Restore attendee/active Enrollment. | Same `ZOOM_ATTEND_BASE` event ID, never delete/replace. |
| All families | Attempt reuse of an XP Event ID only through its original source. | — | — | Source Key stays unique and the event never transfers owner/source family. |

Execute the following failure tests before declaring certification:

| Failure | Expected safe result |
|---|---|
| Duplicate Enrollment | 001 fails/skips duplicate creation; no second canonical active Enrollment. |
| Missing Week / future Submission | 005/010 fail closed; no active Submission XP. |
| Wrong Enrollment ownership | No event is reassigned or stolen. |
| Multiple canonical WAS records | Positive award/restoration blocks; no winner chosen. |
| Duplicate Source Key | Writer fails closed; no new/replacement event. |
| Inactive Enrollment | Existing owned event deactivates or new award blocks; no replacement. |
| Excluded duplicate Submission | Existing Submission event deactivates; restoration reuses it. |
| Partial downstream write | Preserve records/run output, leave latch available for deterministic retry, and never fabricate success. |
| Settlement timeout | At T+5m without two stable observations, stop; do not manually write a formula/rollup output. |

## 7. Stop conditions and rollback

Stop immediately, preserve screenshots/exports/run output, and record the
worksheet status as blocked for any duplicate key, wrong owner/link, zero or
multiple canonical WAS, unexpected inactive/future/excluded award, unexpected
email path, partial write, stale settlement, or discrepancy between ledger and
totals.

1. Stop further test writes. Turn OFF only the failing automation when the
   behavior is unsafe (duplicate/incorrect award, ownership loss, unexpected
   communication, partial write, or continuing harmful trigger); otherwise
   preserve the run and wait for Mike’s explicit incident decision. Do not
   blanket-disable the pipeline.
2. Preserve source records, XP Events, run IDs, queue/delivery rows, baseline,
   and audit JSON.
3. Do not delete an XP Event. Correct only by the owner’s same-event
   deactivate/reactivate behavior after diagnosis.
4. Do not enable/recreate a retired writer, send email, or silently alter
   Program Instance, Weeks, Levels, gate rules, or reward rules.
5. Restore the failing automation’s captured prior script/trigger only if Mike
   approves the rollback. Re-run the relevant read-only audit and record final
   ON/OFF state.

## 8. Evidence worksheet

Copy this block once per certification run.

```text
Repository SHA:
Production base / date / operator:
Test athlete email / Athlete RID:
School Year / Program Instance RID:

PRE-FLIGHT
Automation | installed version | ON/OFF | trigger | dynamic recordId | run ID:
001:
023 / 005 / 007 / 031:
010:
020 / 064 / 065:
101:
113 / 114:
041 / 042:
076 / 079:
Retired attestations (043, 063, 068, 077, 112):
Reward rule IDs / exact values:
Levels / Gate Rule IDs:

BASELINE
Enrollment RID / active / count:
Week RID:
WAS RID / candidate count:
Before WAS XP / Lifetime XP / standings values:
Existing source keys / XP Event RIDs:

SOURCE LIFECYCLE
Submission RID / Week / WAS / 010 run / Source Key / XP Event RID:
Homework Completion RID / 064+065 runs / Source Key / XP Event RID:
Video Feedback RID / 113+114 runs / Source Key / XP Event RID:
Zoom Meeting RID / Meeting Key / 101 run / Source Key(s) / XP Event RID(s):
Daily queue key / Queue RID / Event RID / Delivery RID / 079 run:

REPLAY / WITHDRAW / RESTORE
Family | run IDs | same Event RID | active before/after | total before/after:
Submission:
Homework:
Video:
Zoom:

SETTLEMENT
T+0 / T+30s / T+2m / T+5m WAS XP:
T+0 / T+30s / T+2m / T+5m Lifetime XP:
041 run ID / queued signature:
042 run ID / reconciled signature:
Current Level / Next Level / Gate Rule / Level Status:
Standings input/readback:
Final audit JSON path / issue count:
Stop condition encountered? / rollback action:
```

## 9. Offline checks and remaining blockers

Run before Production execution:

```bash
git fetch origin master && git rev-parse origin/master
git diff --check
node --test tests/pipeline/core-certification-orchestration.test.mjs
node --test tests/pipeline/counted-submission-xp-standings-orchestration.test.mjs
node --test tests/pipeline/counted-submission-xp-reversal-lifecycle.test.mjs
node --test tests/pipeline/010-submission-base-multi-family.test.mjs
node --test tests/email/automation-076-offline.test.mjs
node --test tests/email/automation-079-offline.test.mjs
node tests/progression/immediate-initial-level-assignment.test.js
node airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js
```

These are repository/in-memory checks only. They do not prove installed
versions, Airtable trigger behavior, record-entry timing, formula/rollup
settlement, email delivery, or Production data correctness.

Current blockers:

1. PKG-009 registering Program Instance + School Year attestation must be
   recorded before certification starts.
2. PKG-034 live-attendee lifecycle and downstream proof remain pending;
   re-attest installed **101 v6.3** against canonical source.
3. PKG-038 streak/milestone paste remains a separate gate for Step 7.
4. Video XP 113/114 installed-version and controlled lifecycle proof remain
   pending if not already captured in PKG-007 follow-up.
5. Mike must supply all Production UI/run/audit evidence. No repository test
   can convert any item above into Production certification.

## 10. Acceptance decision

**READY FOR CONTROLLED PRODUCTION CERTIFICATION** only when every preflight
attestation passes, the four prerequisite packages have their stated
individual evidence, every certification row has its four proof lanes, the
four selected base XP events have exact unique keys and relationships, all
replays and same-event reversals pass, formula settlement stabilizes, and the
final audit reports no applicable ownership/duplicate/lifecycle issue.

Until then the correct decision is **BLOCKED** with the exact unmet
prerequisite recorded in the worksheet.
