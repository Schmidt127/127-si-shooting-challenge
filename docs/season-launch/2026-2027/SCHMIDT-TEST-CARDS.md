# Schmidt executable test cards — residual cases

**Enrollment:** `recCyFEPeATOVNlr9` · **Athlete:** `recgqVstObQRzgXJF` · **PI:** `rec5mEM0YPqPqq0hZ`  
**Rule:** Schmidt/ops inboxes only · no mass parent email · record IDs in evidence folder

Each card is self-contained. Run in PROD only with Mike authorization.

---

## CARD-HW-PDF — PDF homework (SC-010)

| Field | Value |
|-------|-------|
| **Preconditions** | Week 1 PHA HW* with PDF-type assignment; 020/009 ON; Schmidt Active |
| **Fixture** | Enrollment `recCyFEPeATOVNlr9`, Week `recBrZ1sV8byWEHZU`, grade band `reclWDQZzKbVBtdhG` |
| **Action** | Submit Fillout or manual Submission with PDF attachment routed to homework |
| **Expected records** | 1 Submission → 1+ Submission Assets → 1 Homework Completion (identity `enrollment\|week\|curriculum`) |
| **Expected XP** | 1× `HOMEWORK_XP\|{hcId}` when Satisfactory |
| **Email** | None unless coach review triggers 071 |
| **Duplicate/replay** | Rerun same attachment → 020 links existing HC; 065 skips second XP |
| **Cleanup** | Leave HC; void errant XP only with Mike approval |
| **Evidence** | `docs/testing/evidence/YYYY-MM-DD-hw-pdf/` + JSON with record IDs |

---

## CARD-HW-WRITTEN — Written-only homework (SC-012)

| Field | Value |
|-------|-------|
| **Preconditions** | PHA slot with written response (no file); 020 ON |
| **Fixture** | Same as CARD-HW-PDF but assignment without attachment requirement |
| **Action** | Complete written fields only via intake path |
| **Expected records** | HC created without Submission Assets (or empty asset set) |
| **Expected XP** | `HOMEWORK_XP\|{hcId}` once when marked Satisfactory |
| **Email** | None |
| **Duplicate/replay** | Second submit same week/slot → skip or link existing |
| **Cleanup** | Standard |
| **Evidence** | Screenshot + Airtable record IDs |

---

## CARD-HW-VIDEO — Video routed as homework (not VF path)

| Field | Value |
|-------|-------|
| **Preconditions** | Asset Purpose = homework video slot; 112/114 must NOT double-award |
| **Fixture** | Week with video-as-HW PHA row |
| **Action** | Upload video to homework slot (070b path if applicable) |
| **Expected records** | Submission Asset → HC link; VF only if explicitly routed |
| **Expected XP** | Homework XP OR video XP — **never both** for same asset |
| **Email** | 073 only if VF created and Ready |
| **Duplicate/replay** | Asset dedupe by Source Attachment ID |
| **Cleanup** | Deactivate mistaken VF if created |
| **Evidence** | XP Event Source Keys list |

---

## CARD-HW-MULTI — Multi-file routing (SC-015)

| Field | Value |
|-------|-------|
| **Preconditions** | Assignment allows multiple files; 009 creates multiple assets |
| **Fixture** | HW slot with 2+ attachments |
| **Action** | Submit 2 files in one submission |
| **Expected records** | N assets; 1 HC; assets linked to same HC |
| **Expected XP** | Single HOMEWORK_XP |
| **Email** | None |
| **Duplicate/replay** | Re-upload same file → skipped_already_uploaded |
| **Cleanup** | Standard |
| **Evidence** | Asset count + HC id |

---

## CARD-HW17 — Reflection quiz / 067 season-safe

| Field | Value |
|-------|-------|
| **Preconditions** | **033 v4.2 + 067 v3.1 pasted**; PHA HW17 on Week 9 for Schmidt grade band |
| **Fixture** | WAS Week 9 `recfu3dpVJAnVBvCB`, PHA HW17 record per grade band table in PHA restoration doc |
| **Action** | Complete reflection quiz → trigger 067 |
| **Expected records** | HC for HW17; optional zero-asset path (Option B) |
| **Expected XP** | HOMEWORK_XP when Satisfactory |
| **Email** | None |
| **Duplicate/replay** | 067 already-linked quiz → skip |
| **Cleanup** | Keep HC for PW chain if needed |
| **Evidence** | Compare Week on HC = Week 9 PI row, not 2025–26 curriculum Week |

---

## CARD-PW-67 — Perfect Week 6/7 day edge

| Field | Value |
|-------|-------|
| **Preconditions** | 057 ON; PWTEST week **inactive**; thresholds met for test case |
| **Fixture** | WAS for target week with controlled submission count |
| **Action** | Manual 057 run with `recordId` = WAS id |
| **Expected records** | Perfect Week helper rows; unlock when eligible |
| **Expected XP** | PERFECT_WEEK Source Key once |
| **Email** | None |
| **Duplicate/replay** | Second 057 → no duplicate unlock |
| **Cleanup** | Document helper row ids |
| **Evidence** | `docs/testing/evidence/2026-08-05-perfect-week-gated/` pattern |

---

## CARD-PW-ZOOM — Perfect Week with Zoom optional

| Field | Value |
|-------|-------|
| **Preconditions** | Config recording makeup PW flag set per D7; live or recording credit present |
| **Fixture** | WAS with Zoom attendance or approved recording |
| **Action** | Run 057 after week complete |
| **Expected records** | PW eligibility includes/excludes Zoom per config |
| **Expected XP** | PW bonus only |
| **Email** | None |
| **Duplicate/replay** | Standard PW idempotency |
| **Cleanup** | Standard |
| **Evidence** | 057 output JSON |

---

## CARD-ZOOM-LIVE — Live attendance XP

| Field | Value |
|-------|-------|
| **Preconditions** | 101 ON; Zoom Meeting linked to 2026–27 Config; no recording credit for same meeting |
| **Fixture** | Schmidt enrollment + season Zoom Meeting row |
| **Action** | Mark attendance live path (Make/import per ops) |
| **Expected records** | Zoom Attendance; XP Event `ZOOM_ATTEND_*` |
| **Expected XP** | Per active rule set (base + bonuses) |
| **Email** | None |
| **Duplicate/replay** | No second live credit same meeting+enrollment |
| **Cleanup** | Leave audit trail |
| **Evidence** | ZA id + XP Source Key |

---

## CARD-ZOOM-REC — Recording credit + conflict

| Field | Value |
|-------|-------|
| **Preconditions** | 057/042 ON; Config recording fields populated (D7) |
| **Fixture** | HC Satisfactory + Zoom Meeting; **no** prior live attendance |
| **Action** | Approve recording quiz → credit path |
| **Expected records** | ZA or credit tag; XP `ZOOM_RECORDING\|…` |
| **Expected XP** | % of live per Config |
| **Email** | 117 → Make 117f if approval email enabled |
| **Duplicate/replay** | Second run → skipped_already_awarded |
| **Cleanup** | Do not write Meeting.Attendees |
| **Evidence** | C-025 conflict pattern |

---

## CARD-ZOOM-EMAIL — Recording approval email (117f live)

| Field | Value |
|-------|-------|
| **Preconditions** | Make 117f ON; 117 v1.1; Schmidt parent inbox |
| **Fixture** | ZA Recording Quiz Satisfactory per [`117-ZOOM-APPROVAL-GO-LIVE.md`](../../deploy-checklists/117-ZOOM-APPROVAL-GO-LIVE.md) |
| **Action** | Test automation 117 with enrollment + meeting + ZA RIDs |
| **Expected records** | No new XP; no Attendees write |
| **Expected XP** | None from 117 |
| **Email** | 1 Gmail to Schmidt; rerun → already_sent |
| **Duplicate/replay** | sendKey `ZOOM_REC_EMAIL\|…` |
| **Cleanup** | None |
| **Evidence** | Fill go-live checklist table |

---

## CARD-VID-073 — Video parent email

| Field | Value |
|-------|-------|
| **Preconditions** | VF row Ready, Sent?=false; 073 ON |
| **Fixture** | Create VF for Schmidt with Total Video XP > 0 |
| **Action** | Trigger 073 (manual Test) |
| **Expected records** | VF Sent? checked; webhook fired |
| **Expected XP** | Already awarded via 114 |
| **Email** | Parent summary to Schmidt inbox |
| **Duplicate/replay** | Sent? blocks resend |
| **Cleanup** | Reset Sent? only for next test |
| **Evidence** | EMAIL-READINESS-PROBE follow-up |

---

## CARD-WEEKLY — Weekly email season re-proof

| Field | Value |
|-------|-------|
| **Preconditions** | 118/119 ON; 074 sendMode=Live; WAS for ended week |
| **Fixture** | WAS `recMMeJENu6Pg8l58` or new WAS on canonical Week 1 end |
| **Action** | Manual 072 build → 119 → 074 Test/Live to Schmidt |
| **Expected records** | Sent? + Make Send Status=Sent + timestamp |
| **Expected XP** | N/A |
| **Email** | One bulk email; empty-week send_short if no activity |
| **Duplicate/replay** | Sent? blocks duplicate |
| **Cleanup** | Keep 074 Live |
| **Evidence** | C-011 pattern |

---

## CARD-WELCOME — Welcome 2026–27 controlled

| Field | Value |
|-------|-------|
| **Preconditions** | Hub WELCOME template updated (D9); 079 ON; Test Mode + allowlist |
| **Fixture** | Email Handoff Queue row Event=WELCOME, Handoff Key unique |
| **Action** | Arm queue row for Schmidt enrollment |
| **Expected records** | Queue Accepted; Hub Delivery Sent |
| **Expected XP** | None |
| **Email** | 1 welcome; subject shows **2026–2027** |
| **Duplicate/replay** | Same Handoff Key → no second Delivery |
| **Cleanup** | None |
| **Evidence** | [`WELCOME-FINAL-TEST.md`](./WELCOME-FINAL-TEST.md) |

---

## CARD-BACKDATE — Backdated submission (test 7)

| Field | Value |
|-------|-------|
| **Preconditions** | Canonical Early Bird week dates active (2027-04-25–05-01) |
| **Fixture** | Activity Date inside Early Bird |
| **Action** | 115 or Fillout submission with that Activity Date |
| **Expected records** | Submission.Week = Early Bird row |
| **Expected XP** | SUBMISSION_XP once |
| **Email** | None |
| **Duplicate/replay** | SC-007 policy |
| **Cleanup** | Standard |
| **Evidence** | 005 output fields |

---

## CARD-DRYRUN — Season-shaped dry run

| Field | Value |
|-------|-------|
| **Preconditions** | All D1–D7 decided; PWTEST off; Fillout OFF or Schmidt-only; Worker 1 pastes complete |
| **Fixture** | Fresh WAS Week 1 |
| **Action** | Enrollment confirm → submission → HW1 → optional VF → WAS build → optional weekly email test |
| **Expected records** | Full chain on `recCyFEPeATOVNlr9` only |
| **Expected XP** | Sum matches rule set; no cross-year Week |
| **Email** | Schmidt only |
| **Duplicate/replay** | Full idempotency pass on rerun |
| **Cleanup** | Mark test rows; do not delete Config/Weeks |
| **Evidence** | Single folder `docs/testing/evidence/YYYY-MM-DD-season-dryrun/` |

---

## CARD-ROLLBACK — Rollback preview (test 22)

| Field | Value |
|-------|-------|
| **Preconditions** | Fresh Airtable export JSON |
| **Fixture** | `node tools/challenge-year/cli.js rollback-preview --config rechc1f9f4kVM1tHP --input export.json` |
| **Action** | Run CLI; review output only |
| **Expected records** | None changed |
| **Expected XP** | N/A |
| **Email** | None |
| **Duplicate/replay** | N/A |
| **Cleanup** | None |
| **Evidence** | Save JSON+MD from CLI |

---

## CARD-THRESHOLD — Weekly threshold XP (coverage gap)

| Field | Value |
|-------|-------|
| **Preconditions** | 035 ON; threshold rules for grade band |
| **Fixture** | WAS with shot count crossing 100/125/150 threshold |
| **Action** | Trigger 035 via WAS Ready conditions |
| **Expected records** | XP Event WEEKLY_THRESHOLD_* |
| **Expected XP** | Grade-band specific amount |
| **Email** | None |
| **Duplicate/replay** | One per WAS/week/rule |
| **Cleanup** | Standard |
| **Evidence** | Agent 4 coverage matrix closeout |
