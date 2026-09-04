# Workflow reliability inventory — 2026-09-04

**Status:** Authoritative for this attestation pass  
**Base:** Production `appn84sqPw03zEbTT`  
**Branch tip at attestation:** `8e662a38` (`origin/master`)  
**Live evidence:** Airtable MCP `list_automations` / `get_automation` — [`SC-057-058-LIVE-ATTESTATION-20260904.md`](./SC-057-058-LIVE-ATTESTATION-20260904.md)  
**Silent-failure ranked list:** [`WORKFLOW-SILENT-FAILURE-REMEDIATION-20260904.md`](./WORKFLOW-SILENT-FAILURE-REMEDIATION-20260904.md)

### Predecessors (do not treat as current authority)

| Doc | Role |
|-----|------|
| [`docs/AUTOMATION_VERSION_INVENTORY.md`](../AUTOMATION_VERSION_INVENTORY.md) | Living version table — keep updating; this inventory adds workflow reliability columns |
| [`SC-057-trigger-conflict-inventory.md`](./SC-057-trigger-conflict-inventory.md) | 2026-08-27 repo-only trigger conflict notes |
| [`SC-058-automation-inventory-supplement.md`](./SC-058-automation-inventory-supplement.md) | 2026-08-27 count supplement |
| [`docs/automation-index.md`](../automation-index.md) | Script index / ownership |
| [`PARTICIPATION-WORKFLOW-AUDIT-2026-08-11.md`](./PARTICIPATION-WORKFLOW-AUDIT-2026-08-11.md) | Historical participation audit |

### Field legend (every major workflow)

| Field | Meaning |
|-------|---------|
| **ID/name** | Automation number + live name |
| **Trigger** | Live UI trigger type + conditions (MCP) |
| **Eligibility** | Business gate before side effects |
| **Required inputs** | Usually dynamic `recordId` |
| **Output / side effect** | Primary writes |
| **Dedupe key** | Source Key / identity |
| **Success state** | Observable done condition |
| **Failure state** | Error/skip writeback |
| **Retry / recovery** | How to re-arm |
| **Reconciliation view/query** | Operator check |
| **Test evidence** | Repo/live proof |
| **Deployed version** | Live paste when attested; else GitHub |
| **Last verified** | This pass date unless noted |
| **Remaining risk** | Open silent-miss / drift |

---

## A. Enrollment

### WF-ENR-001 — Athlete link (001)

| Field | Value |
|-------|-------|
| ID/name | **001** Find or Create Athlete and Link Enrollment |
| Trigger | Enrollments · **recordEntersView** (view `viwNV87i8BwPBxYlq`) |
| Eligibility | New/unlinked enrollment entering intake view |
| Required inputs | `recordId` |
| Output / side effect | Link/create Athlete on Enrollment |
| Dedupe key | Athlete identity match (script) |
| Success state | Enrollment.Athlete linked |
| Failure state | Script error / incomplete athlete |
| Retry / recovery | Re-enter intake view or fix athlete fields and requeue |
| Reconciliation | Enrollments missing Athlete |
| Test evidence | automation-index; historical E2E |
| Deployed version | Live deployed (body version not deep-read this pass) · GitHub **v5.4** |
| Last verified | 2026-09-04 (trigger ON) |
| Remaining risk | View filter drift vs intake form |

### WF-ENR-002 — Grade band initial (002)

| Field | Value |
|-------|-------|
| ID/name | **002** Assign Grade Band - Initial |
| Trigger | Enrollments · recordEntersView |
| Eligibility | Grade set; Grade Band empty (view) |
| Required inputs | `recordId` |
| Output / side effect | Grade Band write |
| Dedupe key | n/a (idempotent assign) |
| Success state | Grade Band populated |
| Failure state | Skip if already set / error |
| Retry / recovery | Clear Grade Band carefully or use **003** refresh path |
| Reconciliation | Enrollments with Grade, no Grade Band |
| Test evidence | Repo header |
| Deployed version | Live · GitHub **v8.2** |
| Last verified | 2026-09-04 |
| Remaining risk | Low |

### WF-ENR-003 — Grade band refresh (003)

| Field | Value |
|-------|-------|
| ID/name | **003** Assign Grade Band - If Grade Changes |
| Trigger | Enrollments · recordEntersView (refresh view) |
| Eligibility | `Grade Band Refresh Needed = 1` |
| Required inputs | dynamic `recordId` |
| Output / side effect | Refresh Grade Band |
| Dedupe key | n/a |
| Success state | Grade Band matches Grade |
| Failure state | errorOut |
| Retry / recovery | Re-check refresh helper |
| Reconciliation | Grade Band Refresh Needed = 1 |
| Test evidence | PRODUCTION-VERIFIED 2026-09-03; offline test |
| Deployed version | **v2.0** Live · DO-NOT-TOUCH |
| Last verified | 2026-09-03 / 2026-09-04 ON |
| Remaining risk | None for this closeout wave |

### WF-ENR-078A — Welcome email handoff

| Field | Value |
|-------|-------|
| ID/name | **078A** Create WELCOME Email Handoff |
| Trigger | Enrollments · recordMatchesConditions |
| Eligibility | Athlete + cleaned parent + Program Instance |
| Required inputs | `recordId`, optional `testMode` |
| Output / side effect | Email Handoff Queue row → **079** → Hub → Resend |
| Dedupe key | Queue identity / handoff status |
| Success state | Queue Accepted / Hub sent |
| Failure state | Queue error / testMode hold |
| Retry / recovery | Re-arm Ready on queue; confirm Live inputs |
| Reconciliation | Enrollments without WELCOME handoff; Hub allowlist |
| Test evidence | Parent-email cutover checklist |
| Deployed version | GitHub **v1.5** · Live deployed |
| Last verified | 2026-09-04 ON |
| Remaining risk | testMode left true in UI |

---

## B. Submissions + assets

### WF-SUB-005 — Assign week

| Field | Value |
|-------|-------|
| ID/name | **005** Assign Week (homework-first) |
| Trigger | Submissions · recordMatchesConditions |
| Eligibility | Activity date / PHA path ready |
| Required inputs | `recordId` |
| Output / side effect | Week link |
| Dedupe key | n/a |
| Success state | Week linked |
| Failure state | Skip / error |
| Retry / recovery | Fix Activity Date; re-touch submission |
| Reconciliation | Submissions missing Week with countable date |
| Test evidence | GitHub **v5.5** |
| Deployed version | Live · confirm paste vs GitHub on next touch |
| Last verified | 2026-09-04 ON |
| Remaining risk | Medium — version not deep-read |

### WF-SUB-007a — Duplicate checker

| Field | Value |
|-------|-------|
| ID/name | **007a** Duplicate Checker |
| Trigger | Submissions · Duplicate Key not empty + review empty |
| Eligibility | Duplicate Key present |
| Required inputs | `recordId` |
| Output / side effect | Duplicate Review Status |
| Dedupe key | Duplicate Key |
| Success state | Status set |
| Failure state | Stuck empty status |
| Retry / recovery | Clear status to recalculate |
| Reconciliation | Duplicate Key set, status empty |
| Test evidence | Live conditions MCP |
| Deployed version | Live (slot **007a**, not repo `007`) |
| Last verified | 2026-09-04 |
| Remaining risk | Naming drift 007 vs 007a |

### WF-SUB-009 / 021 / 023 — Asset prep chain

| Field | Value |
|-------|-------|
| ID/name | **009** create assets · **021** upload status · **023** assign enrollment |
| Trigger | Submissions · recordMatchesConditions (each) |
| Eligibility | Attachments / enrollment linkage ready |
| Required inputs | `recordId` |
| Output / side effect | Submission Assets; upload status; Enrollment link |
| Dedupe key | Source Attachment ID (009) |
| Success state | Assets exist; enrollment set |
| Failure state | Partial assets |
| Retry / recovery | Re-fire 009 after attachment change |
| Reconciliation | Submissions with attachments and zero assets |
| Test evidence | Perfect Week asset proofs; 009 v1.2 |
| Deployed version | **009 v1.2** prior attestation · others Live |
| Last verified | 2026-09-04 ON |
| Remaining risk | **006** not live — video count may be formula-only |

### WF-SUB-010 — Submission XP

| Field | Value |
|-------|-------|
| ID/name | **010** Create XP Event from Submission |
| Trigger | Submissions · `Reconciliation Needed? = 1` (+ Enrollment/Week/etc.) |
| Eligibility | Countable submission + signature delta |
| Required inputs | dynamic `recordId` |
| Output / side effect | XP Event `SUBMISSION_XP|{submissionId}` |
| Dedupe key | `SUBMISSION_XP|{submissionId}` |
| Success state | Reconciliation Needed? clears after acknowledge |
| Failure state | error / owned-event conflict |
| Retry / recovery | Leave Needed?=1 or bump signature inputs |
| Reconciliation | Reconciliation Needed?=1 |
| Test evidence | Live body **v10.13** |
| Deployed version | **v10.13** MATCH GitHub |
| Last verified | 2026-09-04 |
| Remaining risk | Low (reconciliation pattern healthy) |

### WF-AST-013 / 020 / 022 / 070a–c / 116 — Assets downstream

| Field | Value |
|-------|-------|
| ID/name | **013** VF link · **020** HC from asset · **022** writeback · **070a/b/c** Make upload · **116** reuse |
| Trigger | Submission Assets · matches / updated |
| Eligibility | Slot VIDEO/HW; upload status; Send to Make; reuse decision |
| Required inputs | `recordId` |
| Output / side effect | VF/HC create; child URL writeback; Make payload; reuse consequences |
| Dedupe key | Provenance (013); HC assignment identity (020); Storage Key (070) |
| Success state | Child linked; Upload Status Uploaded; trigger cleared (070c) |
| Failure state | Upload Error; missing child |
| Retry / recovery | Re-check Send to Make; clear error; re-run 070c |
| Reconciliation | Assets Pending Link / Error; VF missing for video assets |
| Test evidence | 013 sole writer (112 absent); 020 v3.9 live prior |
| Deployed version | **013** Live · **020** v3.9 prior · **022** v2.2 · **070a–c** Live |
| Last verified | 2026-09-04 ON |
| Remaining risk | **070a** deployed — confirm intentional ON vs historical OFF decision |

---

## C. Homework + video review

### WF-HW-064 / 065 — Homework XP

| Field | Value |
|-------|-------|
| ID/name | **064** prepare · **065** create/reconcile XP |
| Trigger | HC matches · **065:** `Homework XP Reconciliation Needed? = 1` |
| Eligibility | Satisfactory + review complete + feedback; PHA rules |
| Required inputs | `recordId` (HC) |
| Output / side effect | Total XP prepare (064); `HOMEWORK_XP|{hcId}` (065) |
| Dedupe key | `HOMEWORK_XP|{hcId}` |
| Success state | Award Status Awarded; Needed?=0 |
| Failure state | Automation Error; ineligible deactivate |
| Retry / recovery | Change review fields so signature differs |
| Reconciliation | Homework XP Reconciliation Needed?=1 |
| Test evidence | Live **065 v10.6**; late-credit contracts |
| Deployed version | **065 v10.6** MATCH · 064 production-verified |
| Last verified | 2026-09-04 |
| Remaining risk | Low |

### WF-HW-067 / 078 / 071 — Reflection + parent homework email

| Field | Value |
|-------|-------|
| ID/name | **067** quiz→HC · **078** mark feedback ready · **071** Hub handoff |
| Trigger | Quiz / HC matches |
| Eligibility | Quiz ready; Satisfactory+feedback; Parent Feedback Ready |
| Required inputs | `recordId` |
| Output / side effect | HC link; ready checkbox; Hub queue |
| Dedupe key | Queue / send status |
| Success state | Hub sent |
| Failure state | Stuck Ready / send error |
| Retry / recovery | Re-check ready; 079 retry |
| Reconciliation | Satisfactory HC without parent email sent |
| Test evidence | 067 DO-NOT-TOUCH v3.5 |
| Deployed version | Live |
| Last verified | 2026-09-04 |
| Remaining risk | Medium email path |

### WF-VID-113 / 114 / 073 / 120 — Video XP + email + rename

| Field | Value |
|-------|-------|
| ID/name | **113** base XP · **114** XP Event · **073** parent email · **120** S3 rename |
| Trigger | Video Feedback · recordUpdated / matches |
| Eligibility | Feedback posted; award/withdraw; Confirm S3 Rename |
| Required inputs | `recordId` |
| Output / side effect | Base XP fields; `VIDEO_SUBMISSION|{vfId}`; Hub email; S3 rename |
| Dedupe key | `VIDEO_SUBMISSION|{vfId}` |
| Success state | XP Event active; email sent; rename confirmed |
| Failure state | Steal-guard error; rename fail |
| Retry / recovery | Re-touch VF; Confirm S3 Rename again |
| Reconciliation | Posted VF missing XP Event; Confirm Rename stuck |
| Test evidence | 114 steal-guard tests; 120 paste packet |
| Deployed version | Live · GitHub 114 **v6.2**, 113 **v6.4**, 120 **v1.0** |
| Last verified | 2026-09-04 ON |
| Remaining risk | Withdrawal depends on recordUpdated watch fields |

---

## D. Weekly summaries + Perfect Week

### WF-WAS-030–035 — WAS build chain

| Field | Value |
|-------|-------|
| ID/name | **031** find/create · **030** grade band · **032** goal · **033** homework · **034** previous week · **035** threshold XP |
| Trigger | Submissions enters view (031) · WAS matches/view |
| Eligibility | Countable submission / WAS links |
| Required inputs | `recordId` |
| Output / side effect | WAS row + helpers + threshold XP |
| Dedupe key | Enrollment+Week uniqueness (031) |
| Success state | One WAS per Enrollment+Week |
| Failure state | Duplicate WAS; missing goal |
| Retry / recovery | Fix links; re-enter 031 view |
| Reconciliation | Countable submissions without WAS; duplicate WAS |
| Test evidence | Season sim historical |
| Deployed version | Live |
| Last verified | 2026-09-04 |
| Remaining risk | Duplicate WAS still a high-impact silent miss |

### WF-PW-057 / 058 / 059 — Perfect Week

| Field | Value |
|-------|-------|
| ID/name | **057** eligibility · **058** unlock · **059** unlock→XP |
| Trigger | **057:** `Perfect Week Calculation Queue?=1` (formula = Pending OR Recalc Needed — **live**) · **058 live still:** Eligible=1 + Unlock empty + Status Ready · **058 intended:** lifecycle `recordUpdated` (SC-153) · **059:** Unlock Active? + XP Award Status Pending |
| Eligibility | Active enrollment; PW math; goal settlement |
| Required inputs | `recordId` |
| Output / side effect | Status/Eligible helpers; Unlock `PERFECT_WEEK|{enr}|{week}`; XP Event; **057 v2.4** clears Recalc Needed |
| Dedupe key | Milestone Source Key / XP Source Key |
| Success state | Unlock Active + XP Awarded **or** evaluated Fail/non-eligible with unlock deactivated |
| Failure state | Perfect Week Automation Error (visible) |
| Retry / recovery | Set Recalc Needed / Status→Pending; clear error; safe XP Source Key |
| Reconciliation | Queue?=1 stranded; Eligible/Ready without Unlock; Unlock without final XP; Recalc stuck |
| Test evidence | Live **057 2.4** SC-152 PASS; live **058 1.7** SC-153 withdraw/restore/idempotency PASS |
| Deployed version | **057 MATCH 2.4**; **058 MATCH 1.7** |
| Last verified | 2026-09-04 |
| Remaining risk | Low — monitor operator reconciliation view |

### WF-EMAIL-072 / 074 / 118 / 119 — Weekly email

| Field | Value |
|-------|-------|
| ID/name | **118** schedule build · **072** build package · **119** schedule send · **074** Hub handoff · **079** Hub send |
| Trigger | cron (118/119) · WAS matches · Email Handoff Queue |
| Eligibility | Build/Send armed; week completed |
| Required inputs | `recordId`, sendMode |
| Output / side effect | Package fields; Hub queue; Resend |
| Dedupe key | Handoff queue identity |
| Success state | Hub Accepted |
| Failure state | Send error; testMode |
| Retry / recovery | Re-arm Build/Send checkboxes; queue Ready |
| Reconciliation | Completed weeks without weekly handoff |
| Test evidence | E2E 2026-08-24 weekly |
| Deployed version | Live · GitHub 072 **v4.9.1**, 074 **v3.5**, 079 **v2.5** |
| Last verified | 2026-09-04 |
| Remaining risk | Cron miss / arm checkbox not set |

### WF-EMAIL-076 — Daily submission email

| Field | Value |
|-------|-------|
| ID/name | **076** Daily Hub handoff |
| Trigger | Submissions · matches (Enrollment/Week/etc.) |
| Eligibility | Daily package ready |
| Required inputs | `recordId` |
| Output / side effect | Email Handoff Queue |
| Dedupe key | Queue |
| Success state | Hub sent |
| Failure state | Stuck Ready |
| Retry / recovery | 079 retry |
| Reconciliation | Countable submissions without daily handoff (policy-dependent) |
| Test evidence | Parent-email cutover |
| Deployed version | GitHub **v8.12** · Live |
| Last verified | 2026-09-04 |
| Remaining risk | Medium |

---

## E. XP, levels, streaks, milestones

### WF-LVL-041 / 042 — Levels

| Field | Value |
|-------|-------|
| ID/name | **041** queue recalc · **042** assign levels |
| Trigger | **041 cron every 15 min** · **042** Enrollments enters Needs Level Assignment view |
| Eligibility | Signature changed; Active?; Level Recalc Needed? |
| Required inputs | optional `recordId` (041) |
| Output / side effect | Level Recalc Needed?; Current/Next Level; Gate |
| Dedupe key | Progression signatures |
| Success state | Level Status assigned; signatures match |
| Failure state | Gate blocked; stuck Needed? |
| Retry / recovery | Wait next cron; or controlled recordId run |
| Reconciliation | Level Recalc Needed?=1; signature mismatch |
| Test evidence | Live **041 v5.1** |
| Deployed version | **v5.1** MATCH |
| Last verified | 2026-09-04 |
| Remaining risk | Up to 15 min delay; blank recordId on scheduled path (by design) |

### WF-STR-053–056 — Streaks

| Field | Value |
|-------|-------|
| ID/name | **053** rebuild · **054** streak XP · **055** current streak · **056** daily refresh |
| Trigger | Submissions updated · Streak Occurrences updated · Submissions matches · cron |
| Eligibility | Source Status Ready for XP |
| Required inputs | `recordId` |
| Output / side effect | Streak Occurrences; `STREAK_XP|…` |
| Dedupe key | `STREAK_XP|{enrollment}|{achievement}|{endDate}` |
| Success state | XP Event exists |
| Failure state | Stuck Ready |
| Retry / recovery | Re-touch occurrence / submission |
| Reconciliation | Ready for XP without XP Event |
| Test evidence | Historical streak packs |
| Deployed version | Live |
| Last verified | 2026-09-04 |
| Remaining risk | Medium chain timing |

### WF-MS-066 — Shot milestones

| Field | Value |
|-------|-------|
| ID/name | **066** Create Shot Milestone Unlocks |
| Trigger | Enrollments · Run Shot Milestone Check? |
| Eligibility | Active; shot totals cross thresholds |
| Required inputs | `recordId` |
| Output / side effect | Unlock `SHOT_MILESTONE|{enr}|{milestone}` |
| Dedupe key | Milestone Source Key |
| Success state | Unlock + 059 XP |
| Failure state | Skip / error |
| Retry / recovery | Re-check Run Shot Milestone Check? |
| Reconciliation | Eligible totals without unlock |
| Test evidence | 2026-08-24 replay |
| Deployed version | **v3.9** prior live-tested · Live ON |
| Last verified | 2026-09-04 |
| Remaining risk | Low |

### WF-XP-059 — Achievement unlock XP

| Field | Value |
|-------|-------|
| ID/name | **059** Create XP Event from Achievement Unlock |
| Trigger | Unlocks · XP Award Status Pending + Active? |
| Eligibility | Pending award |
| Required inputs | `recordId` |
| Output / side effect | XP Event from unlock |
| Dedupe key | Per-achievement Source Key family |
| Success state | XP Award Status Awarded |
| Failure state | Stuck Pending |
| Retry / recovery | Reset Pending after fix |
| Reconciliation | Active Unlock Pending without XP Event |
| Test evidence | Live **v3.7** |
| Deployed version | **v3.7** MATCH |
| Last verified | 2026-09-04 |
| Remaining risk | Withdrawal path if Active cleared without status change |

---

## F. Zoom + recording email

### WF-ZOOM-101 — Meeting XP

| Field | Value |
|-------|-------|
| ID/name | **101** Award Meeting XP |
| Trigger | Zoom Meetings · reconciliation needed pattern |
| Eligibility | Attendees / recording credit rules (script) |
| Required inputs | `recordId` |
| Output / side effect | `ZOOM_ATTEND_*` / recording credit keys |
| Dedupe key | Source Key family |
| Success state | Needed? cleared; XP Events exist |
| Failure state | Safe skip / error |
| Retry / recovery | Re-arm reconciliation flag |
| Reconciliation | Zoom XP Reconciliation Needed?=1 |
| Test evidence | Live body read **v6.8**; GitHub **v6.7** |
| Deployed version | **Live v6.8 ≠ GitHub v6.7** — **Agent 1 / SC-147; do not paste from Agent 5** |
| Last verified | 2026-09-04 (read-only) |
| Remaining risk | Version drift + OMNI trigger review still open on SC-147 |

### WF-ZOOM-117 — Recording approval email

| Field | Value |
|-------|-------|
| ID/name | **117** Zoom Recording Approval Hub Handoff |
| Trigger | Zoom Attendance · satisfactory recording path |
| Eligibility | Recording Quiz Satisfactory? |
| Required inputs | dynamic ids |
| Output / side effect | Email Handoff Queue only (not XP) |
| Dedupe key | Queue |
| Success state | Hub sent |
| Failure state | Missing queue |
| Retry / recovery | Re-arm attendance send flags |
| Reconciliation | Satisfactory recording without handoff |
| Test evidence | v2.1 email-only |
| Deployed version | **v2.1** Live |
| Last verified | 2026-09-04 |
| Remaining risk | Low (email-only) |

---

## G. Authentication + dashboards (application)

| Field | Value |
|-------|-------|
| ID/name | **SC-112 / SC-151** Family Dashboard auth |
| Trigger | Parent magic-link request / verify |
| Eligibility | Exact parent email on Active enrollment |
| Required inputs | Email; token; session |
| Output / side effect | Session cookie; dashboard data |
| Dedupe key | Token store (Upstash) |
| Success state | Signed-in dashboard |
| Failure state | Generic sign-in error |
| Retry / recovery | Request new magic link |
| Reconciliation | n/a (app logs / Redis) |
| Test evidence | SC-112 / SC-151 audits CLOSED |
| Deployed version | Production Vercel |
| Last verified | 2026-09-04 (prior agents) |
| Remaining risk | Redis required in Production |

---

## H. External handoffs (Make / Hub / Lambda)

| Path | Automations | Success | Retry | Risk |
|------|-------------|---------|-------|------|
| Hub → Resend | 071/072/073/074/076/078A/117 → **079** | Queue Accepted | Set Status Ready | Allowlist / testMode |
| Make upload | **070a/b** → Make → **070c** verify | Writeback Complete | Re-check Send to Make | 070a ON unexpectedly |
| Lambda rename | **120** → FUT-009 | Confirm rename fields | Re-check Confirm | Lambda not deployed yet historically |

---

## Operator reconciliation cheat-sheet

| Check | Filter / query idea |
|-------|---------------------|
| Submission XP miss | Submissions where `Reconciliation Needed? = 1` |
| Homework XP miss | HC where `Homework XP Reconciliation Needed? = 1` |
| Perfect Week stuck | WAS where `Perfect Week Calculation Queue? = 1` OR Automation Error not empty |
| Perfect Week unlock miss | Eligible?=1 AND Unlock empty AND Status Ready (may still be silent if trigger already fired) |
| Level lag | `Level Recalc Needed? = 1` older than 30 minutes |
| Email stuck | Email Handoff Queue Status Ready / Error |
| VF without XP | Video Feedback Feedback Posted? + no XP Event |
| Duplicate WAS | Group Enrollment+Week count > 1 |

---

## Coverage checklist

| Domain | Covered |
|--------|---------|
| enrollment | Yes |
| submissions | Yes |
| assets | Yes |
| homework | Yes |
| video | Yes |
| Zoom | Yes (101 read-only) |
| streaks | Yes |
| milestones | Yes |
| Perfect Week | Yes |
| XP | Yes |
| levels | Yes |
| weekly summaries | Yes |
| emails | Yes |
| feedback | Yes |
| authentication | Yes (app) |
| dashboards | Yes (app) |
| external handoffs | Yes |
