# SC-166 — Coach work-queue completion rules (2026-09-05)

**Status:** Rules defined · **Interface filters NOT applied** (UI-only; Mike checklist required)  
**Base:** Production `appn84sqPw03zEbTT`  
**Agent:** Agent 6 (`wave/a6-coach-queues-qa-20260905`)  
**Out of scope:** Record deletion, schema changes, Season Sim, FUT-029, Game Manual, restoring retired automations

## Surfaces inspected (live MCP)

| Surface | ID | Notes |
|---|---|---|
| Homework Completions | `tblv58ppTFDBXb3nv` | 86 fields; no single workflow-status field |
| Video Feedback | `tblOV6pJDxQFBSQ3q` | Has `Video Feedback Workflow Status` (`fldDyFRAykPxujAjN`) |
| Interface — Homework Grading Queue | `pbdR1bQlyAiRrKNJq` / page `pag1ohNraczU0PgjM` | List page on HC |
| Interface — Video Feedback Grading | `pbdAqKBx1VQWt4TSu` / page `pagK6dWwNon0Vv6MQ` | List page on VF |
| HC grid view | `viwbxi5La9rX8YQsS` — `HOMEWORK GRADING QUEUE - FINAL` | Filter not readable via MCP |
| VF grid view | `viwx3YtYb9vcxOtlk` — `Grading Video. In Order of Checkboxes` | Filter not readable via MCP |

Open: [Homework Grading Queue](https://airtable.com/appn84sqPw03zEbTT/pag1ohNraczU0PgjM) · [Video Feedback Grading](https://airtable.com/appn84sqPw03zEbTT/pagK6dWwNon0Vv6MQ)

---

## Authoritative completion rules

### Homework Completions (HC)

HC has **no** workflow-status single-select. Authoritative completion is a **composite** of review + award + parent-delivery fields.

**ACTIVE (still requires action)** when **any** of the following is true:

| Bucket | Condition |
|---|---|
| Evaluation incomplete | `Review Complete` (`fldNi16ZUb3ldONNW`) is unchecked |
| Feedback incomplete | `Review Complete` checked **and** `Coach Feedback` (`fldARDQ1SSYLElstx`) is empty |
| Award unsettled | After review: `Award Status` (`flddYu02VLUrk4qtg`) is `Pending`, `Processing`, or empty when `Satisfactory?` is checked |
| Send pending | `Parent Feedback Ready?` (`fldEqqLhLQINkbzdR`) = checked **and** `Parent Feedback Sent?` (`fldYmNDVqhFtmI8Ov`) = unchecked |
| Error / retry | `Award Status` = `Error` **or** `Parent Feedback Send Error` (`fldUTn2YoCWeXsT5I`) not empty **or** `Parent Feedback Delivery Status` (`fldC5GNeGUlXiMZ5b`) ∈ {`Failed`, `Bounced`, `Needs Review`, `Complained`} **or** `Parent Feedback Delivery Error` (`fldGWLMbn3ijSoIgY`) not empty **or** `Upload Status` (`fldA4eP22MSQRBGrm`) = `Error` **or** `Automation Error` (`fldBrKRbV9qs6rQTZ`) not empty |
| Parent email not armed after review | `Review Complete` checked **and** `Parent Feedback Ready?` unchecked **and** `Parent Feedback Sent?` unchecked (coach still owes Ready? for the parent path) |

**COMPLETED / History** only when **all** of the following are true (failed/retry states never qualify):

1. `Review Complete` = checked  
2. `Coach Feedback` is non-empty  
3. `Award Status` ∈ {`Awarded`, `Do Not Award`}  
4. `Parent Feedback Ready?` = checked  
5. `Parent Feedback Sent?` = checked  
6. `Parent Feedback Delivery Status` ∈ {`Sent`, `Delivered`}  
7. `Parent Feedback Send Error` empty  
8. `Parent Feedback Delivery Error` empty  
9. `Award Status` ≠ `Error`  
10. `Upload Status` ≠ `Error`

**Do not delete** HC records when complete — move them out of Active via filter only.

**Notes**

- `Completion Status` / `Review Status` are secondary display fields; do **not** use them as the sole active-queue gate (live rows often stay `Submitted` even after award).  
- Hub owns `Parent Feedback Sent?` / delivery writeback (FUT-032); 071 must not write Sent?.  
- Retry signal on HC is delivery/send error fields (not a Retry Count on HC). Email Handoff Queue may carry retry counters separately — out of coach-queue filter scope.

---

### Video Feedback (VF)

Prefer `Video Feedback Workflow Status` (`fldDyFRAykPxujAjN`) **when it is kept current**. Live evidence shows completed sends still left at `Ready for XP`, so **authoritative completion for SC-166 is the composite below**. Optionally set Workflow Status → `Completed` after the composite passes (manual or future automation — not part of this docs-only PR).

**Workflow Status choices (live):** `Needs Review` · `Feedback Given` · `Ready for XP` · `Completed` · `Review Complete`

**ACTIVE** when **any** of the following is true:

| Bucket | Condition |
|---|---|
| Evaluation incomplete | `Feedback Posted?` (`fldHkvzRIoLANvpAQ`) unchecked **or** Workflow Status ∈ {empty, `Needs Review`} |
| Feedback incomplete | `Coach Feedback` (`fldyXVwvXuk1SYnpg`) empty **or** Workflow Status ∈ {`Feedback Given`, `Review Complete`} without parent Ready? |
| Award unsettled | `Award Status` (`fldKwZPrVTxGGc9Wf`) = `Pending` (and not `Do Not Award`) while review is underway / posted |
| Send pending | `Parent Feedback Ready?` (`fld8DOjFEpfaaRIrb`) checked **and** `Parent Feedback Sent?` (`fldrrXO7wS5f0RPV5`) unchecked |
| Error / retry | `Upload Status` (`fld1QFG4TX1fdN2h9`) = `Error` **or** `Upload Error` (`fld1uXAvx9N8oqp5K`) not empty **or** `Parent Feedback Send Error` (`flduORgXj4l3fuTV0`) not empty **or** `Parent Feedback Delivery Status` (`fldBJNpxW8ey5WQvJ`) ∈ {`Failed`, `Bounced`, `Needs Review`, `Complained`} **or** `Parent Feedback Delivery Error` (`fldRSXPqJ0o5UG2py`) not empty |
| Parent email not armed after post | `Feedback Posted?` checked **and** Ready?/Sent? both unchecked |

**COMPLETED / History** only when **all** are true:

1. `Feedback Posted?` = checked  
2. `Coach Feedback` non-empty  
3. `Award Status` ∈ {`Awarded`, `Do Not Award`}  
4. `Parent Feedback Ready?` = checked  
5. `Parent Feedback Sent?` = checked  
6. `Parent Feedback Delivery Status` ∈ {`Sent`, `Delivered`}  
7. Send/Delivery error fields empty  
8. `Upload Status` ≠ `Error`  
9. **Preferred:** `Video Feedback Workflow Status` = `Completed` (set when 1–8 are true)

Failed delivery / upload / send-error rows **remain ACTIVE**.

**Do not delete** VF records when complete.

---

## Current-filter evidence (2026-09-05 MCP)

### Homework Grading Queue interface

`list_records_for_page` on `pag1ohNraczU0PgjM` returned **all 4** HC records in the base sample, including rows that already fail the ACTIVE definition (or partially complete):

| Record | Review Complete | Satisfactory? | Award Status | Ready? | Sent? | Delivery | Verdict vs SC-166 |
|---|---|---|---|---|---|---|---|
| `recioBIj9w0K7rMOf` | no | no | Pending | no | no | — | **ACTIVE** (legit) |
| `recIuZQ6f2tk3bnIr` | yes | yes | Pending | yes | yes | Delivered | Award unsettled → **ACTIVE**; still visible (OK) |
| `recsAXG7i0ZruWwKY` | yes | yes | Awarded | yes | no | — | Send pending / not Sent → **ACTIVE** |
| `reccy4JRFbRh7lqPl` | yes | yes | Awarded | yes | no | — | Send pending → **ACTIVE** |

**Finding:** Interface is **not** restricted to incomplete work only — it currently behaves like an unfiltered (or weakly filtered) list of submitted HC rows. Completed/history separation is **not** implemented in the Interface today.

### Video Feedback Grading interface

`list_records_for_page` on `pagK6dWwNon0Vv6MQ` returned **10** VF rows mixing incomplete and fully delivered:

| Record | Posted? | Award | Ready? | Sent? | Delivery | Workflow Status | Verdict |
|---|---|---|---|---|---|---|---|
| `rec3m9qgmk8INccNn` | yes | Awarded | yes | yes | Delivered | Ready for XP | Should be **History** (Workflow Status stale) |
| `receGw5xHJXo0jn5t` | yes | Awarded | yes | yes | Delivered | Ready for XP | Should be **History** |
| `recTHQVTrP4gWq8j1` | yes | Awarded | yes | yes | Delivered | Ready for XP | Should be **History** |
| `recfHth6ek4ekr8bA` | yes | Pending | no | no | — | Review Complete | **ACTIVE** |
| `reccooMwcidAeNker` / `recIJgqP5geas64Ra` | no | Pending | no | no | — | empty | **ACTIVE** |
| Rene Week-1 stubs (`reci8mb…`, `rec8ml…`, `recLAc…`) | no | — | no | no | — | empty | **ACTIVE** |

**Finding:** Fully delivered/awarded VF rows remain on the grading Interface. `Video Feedback Workflow Status` alone is **not** a reliable Active filter until ops set `Completed` on finished rows.

---

## Implementation stance

- SC-166 is **Interface / view filter work (UI-only)**. Repo ships rules + Mike checklist only.  
- **Do not claim SC-166 complete** until Mike applies Active + Completed/History filters and re-verifies counts.  
- Prefer existing fields listed above; **do not** add schema fields for this item.  
- Never delete transactional HC/VF rows to “clear” a queue.

## Related

- Mike checklist: [`../deploy-checklists/SC-166-coach-work-queue-filters.md`](../deploy-checklists/SC-166-coach-work-queue-filters.md)  
- Wave QA: [`SC-WAVE-20260905-QA-CHECKLIST-20260905.md`](./SC-WAVE-20260905-QA-CHECKLIST-20260905.md)  
- Hub writeback: [`../deploy-checklists/FUT-032-homework-hub-resend-writeback.md`](../deploy-checklists/FUT-032-homework-hub-resend-writeback.md) · [`../deploy-checklists/VIDEO-FEEDBACK-HUB-RESEND-WRITEBACK.md`](../deploy-checklists/VIDEO-FEEDBACK-HUB-RESEND-WRITEBACK.md)
