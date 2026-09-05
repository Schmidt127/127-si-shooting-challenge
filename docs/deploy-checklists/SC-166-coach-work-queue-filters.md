# SC-166 — Mike checklist: Coach Active + Completed/History filters

**Status:** **Mike-owned/manual** — Interfaces published; filter/layout fine-tuning remains Mike UI. **Not a core application blocker.** Checklist below is optional operator polish until boxes are checked.  
**Repo docs only** — agents cannot set Interface page filters via MCP.  
**Do not delete** Homework Completions or Video Feedback records.

**Authority:** [`../audits/SC-166-COACH-WORK-QUEUE-RULES-20260905.md`](../audits/SC-166-COACH-WORK-QUEUE-RULES-20260905.md)

**Base:** Production `appn84sqPw03zEbTT`

| Surface | Link |
|---|---|
| Homework Grading Queue (Interface) | https://airtable.com/appn84sqPw03zEbTT/pag1ohNraczU0PgjM |
| Video Feedback Grading (Interface) | https://airtable.com/appn84sqPw03zEbTT/pagK6dWwNon0Vv6MQ |
| HC table | https://airtable.com/appn84sqPw03zEbTT/tblv58ppTFDBXb3nv |
| VF table | https://airtable.com/appn84sqPw03zEbTT/tblOV6pJDxQFBSQ3q |

---

## Current evidence (why this checklist exists)

Captured **2026-09-05** via Airtable MCP `list_records_for_page` (no agent-writable Interface filter API):

1. **Homework Grading Queue** returned HC rows that are already reviewed/awarded (and mix of Sent?/not Sent?) — queue is **not** Active-only today.  
2. **Video Feedback Grading** returned rows with `Award Status=Awarded` + `Parent Feedback Sent?=true` + `Delivery Status=Delivered` alongside incomplete stubs — completed work still appears on the grading surface.  
3. Several finished VF rows still show `Video Feedback Workflow Status=Ready for XP` (not `Completed`) — **do not** use Workflow Status alone for History until those values are corrected or composite filters are used.

---

## A) Homework Completions — Active queue

**Preferred place:** Interface `Homework Grading Queue` filter (same conditions on grid view `HOMEWORK GRADING QUEUE - FINAL` if you use the data table).

Build an **OR** filter = “still needs action” (match the audit ACTIVE table). Practical Airtable filter groups:

### Active — include if ANY group matches

**Group 1 — Evaluation incomplete**

- `Review Complete` is unchecked

**Group 2 — Feedback incomplete**

- `Review Complete` is checked  
- **AND** `Coach Feedback` is empty

**Group 3 — Award unsettled / error**

- `Award Status` is any of: `Pending`, `Processing`, `Error`  
  *(after you expect award — rows with Review Complete unchecked are already covered by Group 1)*

**Group 4 — Parent send pending**

- `Parent Feedback Ready?` is checked  
- **AND** `Parent Feedback Sent?` is unchecked

**Group 5 — Parent not armed after review**

- `Review Complete` is checked  
- **AND** `Parent Feedback Ready?` is unchecked  
- **AND** `Parent Feedback Sent?` is unchecked

**Group 6 — Delivery / send / upload errors (stay visible)**

- `Parent Feedback Send Error` is not empty  
- **OR** `Parent Feedback Delivery Error` is not empty  
- **OR** `Parent Feedback Delivery Status` is any of: `Failed`, `Bounced`, `Needs Review`, `Complained`  
- **OR** `Upload Status` is `Error`  
- **OR** `Automation Error` is not empty

### Field IDs (for verification)

| Field | ID |
|---|---|
| Review Complete | `fldNi16ZUb3ldONNW` |
| Coach Feedback | `fldARDQ1SSYLElstx` |
| Satisfactory? | `fldh4ohAiEdp8oejg` |
| Award Status | `flddYu02VLUrk4qtg` |
| Parent Feedback Ready? | `fldEqqLhLQINkbzdR` |
| Parent Feedback Sent? | `fldYmNDVqhFtmI8Ov` |
| Parent Feedback Send Error | `fldUTn2YoCWeXsT5I` |
| Parent Feedback Delivery Status | `fldC5GNeGUlXiMZ5b` |
| Parent Feedback Delivery Error | `fldGWLMbn3ijSoIgY` |
| Upload Status | `fldA4eP22MSQRBGrm` |
| Automation Error | `fldBrKRbV9qs6rQTZ` |

### Mike — HC Active

- [ ] Open [Homework Grading Queue](https://airtable.com/appn84sqPw03zEbTT/pag1ohNraczU0PgjM)  
- [ ] Apply Active OR-filter groups above (Interface filter UI)  
- [ ] Confirm `recioBIj9w0K7rMOf` (Rene Train Rough, no review) **remains**  
- [ ] Confirm no fully History-qualified row remains (Review Complete + Coach Feedback + Awarded/Do Not Award + Ready? + Sent? + Delivery Sent/Delivered + no errors)  
- [ ] Confirm error/failed delivery rows (if any) **remain** visible  
- [ ] Screenshot or note record count after filter  

---

## B) Homework Completions — Completed / History

Create a **second** Interface page (or grid view) named e.g. `Homework Grading — Completed / History`.

**AND** filter (all required):

- `Review Complete` is checked  
- `Coach Feedback` is not empty  
- `Award Status` is any of: `Awarded`, `Do Not Award`  
- `Parent Feedback Ready?` is checked  
- `Parent Feedback Sent?` is checked  
- `Parent Feedback Delivery Status` is any of: `Sent`, `Delivered`  
- `Parent Feedback Send Error` is empty  
- `Parent Feedback Delivery Error` is empty  
- `Award Status` is none of: `Error`  
- `Upload Status` is none of: `Error`

### Mike — HC History

- [ ] Create Completed/History page or view  
- [ ] Apply AND filter above  
- [ ] Spot-check one known finished Schmidt HC (when one qualifies) appears **only** here, not Active  
- [ ] Confirm records were **not** deleted  

---

## C) Video Feedback — Active queue

**Preferred place:** Interface `Video Feedback Grading`.

Because Workflow Status is often stale at `Ready for XP` after delivery, use the **composite ACTIVE OR** (do not rely on Workflow Status alone).

### Active — include if ANY group matches

**Group 1 — Evaluation incomplete**

- `Feedback Posted?` is unchecked  
- **OR** `Video Feedback Workflow Status` is empty  
- **OR** `Video Feedback Workflow Status` is `Needs Review`

**Group 2 — Feedback / parent arm incomplete**

- `Coach Feedback` is empty  
- **OR** (`Feedback Posted?` checked **AND** `Parent Feedback Ready?` unchecked **AND** `Parent Feedback Sent?` unchecked)

**Group 3 — Award unsettled**

- `Award Status` is `Pending`

**Group 4 — Send pending**

- `Parent Feedback Ready?` checked  
- **AND** `Parent Feedback Sent?` unchecked

**Group 5 — Errors / retry (stay visible)**

- `Upload Status` is `Error`  
- **OR** `Upload Error` is not empty  
- **OR** `Parent Feedback Send Error` is not empty  
- **OR** `Parent Feedback Delivery Error` is not empty  
- **OR** `Parent Feedback Delivery Status` is any of: `Failed`, `Bounced`, `Needs Review`, `Complained`

### Field IDs

| Field | ID |
|---|---|
| Video Feedback Workflow Status | `fldDyFRAykPxujAjN` |
| Feedback Posted? | `fldHkvzRIoLANvpAQ` |
| Coach Feedback | `fldyXVwvXuk1SYnpg` |
| Award Status | `fldKwZPrVTxGGc9Wf` |
| Parent Feedback Ready? | `fld8DOjFEpfaaRIrb` |
| Parent Feedback Sent? | `fldrrXO7wS5f0RPV5` |
| Parent Feedback Send Error | `flduORgXj4l3fuTV0` |
| Parent Feedback Delivery Status | `fldBJNpxW8ey5WQvJ` |
| Parent Feedback Delivery Error | `fldRSXPqJ0o5UG2py` |
| Upload Status | `fld1QFG4TX1fdN2h9` |
| Upload Error | `fld1uXAvx9N8oqp5K` |
| Do Not Award XP? | `fldJPT8GQhwHzOcmG` |

### Mike — VF Active

- [ ] Open [Video Feedback Grading](https://airtable.com/appn84sqPw03zEbTT/pagK6dWwNon0Vv6MQ)  
- [ ] Apply Active OR-filter groups  
- [ ] Confirm Awarded+Delivered rows (`rec3m9qgmk8INccNn`, `receGw5xHJXo0jn5t`, `recTHQVTrP4gWq8j1`) **leave** Active  
- [ ] Confirm incomplete stubs / Pending award rows **remain**  
- [ ] Confirm failed delivery (if any) **remain**  
- [ ] Optional hygiene: set `Video Feedback Workflow Status` = `Completed` on History-qualified rows so a future single-field filter can work  

---

## D) Video Feedback — Completed / History

Create Interface page or grid view `Video Feedback — Completed / History`.

**AND** filter:

- `Feedback Posted?` checked  
- `Coach Feedback` not empty  
- `Award Status` is any of: `Awarded`, `Do Not Award`  
- `Parent Feedback Ready?` checked  
- `Parent Feedback Sent?` checked  
- `Parent Feedback Delivery Status` is any of: `Sent`, `Delivered`  
- Send/Delivery error fields empty  
- `Upload Status` is none of: `Error`  
- **Preferred add-on:** `Video Feedback Workflow Status` is `Completed` *(only after you backfill Completed on finished rows; until then omit this clause or History will be empty)*

### Mike — VF History

- [ ] Create Completed/History page or view  
- [ ] Apply AND filter (composite first; Workflow Status optional until backfilled)  
- [ ] Confirm the three Awarded+Delivered Early Bird rows appear in History  
- [ ] Confirm no deletion  

---

## E) Acceptance (SC-166 done)

- [ ] HC Active shows only incomplete / pending-send / error rows  
- [ ] VF Active shows only incomplete / pending-send / error rows  
- [ ] Completed work appears only on History surfaces  
- [ ] Failed/retry rows remain on Active  
- [ ] No HC/VF records deleted to clear queues  
- [ ] Paste a short note + counts back into the wave closeout (Agent 1 / Mike)

**Until the boxes above are checked, SC-166 remains open** even though GitHub docs have shipped.
