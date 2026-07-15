# Automation 117 — safest trigger design

**Status:** READY_FOR_MIKE_ACTIVATION (design only — **do not enable 117 yet**)  
**Date:** 2026-07-14 · Workstream 3 / S26  
**Script:** `117-zoom-recording-credit-orchestrator.js` **v1.0.1**  
**Table:** Zoom Attendance  
**Constraint:** No PROD · no real webhook · no Folder 07 / email send in this package

Companion: [AUTOMATION-117-mike-activation-sheet.md](./AUTOMATION-117-mike-activation-sheet.md) · [AUTOMATION-117-interaction-map.md](./AUTOMATION-117-interaction-map.md)

---

## Verdict (use this)

| Item | Choice |
|------|--------|
| **Trigger type** | **When record matches conditions** |
| **Table** | Zoom Attendance |
| **AND conditions** | (1) `Attendance Method` **is** `Recording Quiz`<br>(2) `Enrollment` **is not empty**<br>(3) `Zoom Meeting` **is not empty** |
| **Watched fields list** | **Do not require** a narrow “only these fields changed” list |
| **Do not use** | View-entry · Zoom Meetings table · Live rows · schedule · “when updated” with no conditions |

**Rationale:** Each orchestrator step self-gates. A broad **matches-conditions** trigger is the only option that reliably covers coach review writes, Needs Correction flips, formula recalcs (`Approved?` / `Conflict?` / Gate / PW / Effective email), and repeated edits — without six narrow automations.

---

## Option comparison

| Option | Fires when | Covers formula recalcs? | Covers Needs Correction → Satisfactory? | Recursive risk | Verdict |
|--------|------------|-------------------------|------------------------------------------|----------------|---------|
| **A. Matches conditions** (preferred) | Row enters matching set **or** is updated while still matching | **Yes** (formula field updates re-fire while Method stays Recording Quiz) | **Yes** | Moderate — self-writes can re-fire; steps are skip-safe | **USE** |
| **B. When record updated** (+ optional field list) | Any (or listed) field change | Only if formula fields are in the watch list (often awkward / incomplete) | Yes if Review Status / Satisfactory watched | High noise if all fields; gaps if formula fields omitted | Do not use for first activation |
| **C. When record enters a view** | First time row enters view filters | **No** — already-in-view formula changes do not re-enter | Partial — status changes may exit/re-enter inconsistently | Low noise, high miss | **Unsafe** for credit/XP/conflict |

### Why not view-entry

Views like `Zoom Recording Quiz - Past Deadline` are operational filters, not state machines. Approved/Conflict/Gate/PW are formulas; they change while the row often **already** matches the view. View-entry would miss conflict → deactivate, amount updates, and post-Satisfactory credit.

### Why not bare “when updated”

Live attendance noise, unrelated link edits, and coach notes would spam the queue. Matches-conditions already scopes to Recording Quiz + linked Enrollment/Meeting.

---

## Scenario coverage (preferred trigger)

| Scenario | How trigger sees it | Step behavior |
|----------|---------------------|---------------|
| New Recording Quiz row (empty Review Status) | Matches → run | A `normalized` → B unchanged → C–F soft skip until Satisfactory/Approved |
| Coach sets Review Status = Satisfactory | Update while matching | B `marked_satisfactory` → reload → C–F use fresh formulas |
| Coach sets Needs Correction after Satisfactory | Update while matching | B `marked_needs_correction` (+ Correction Count) → C may `deactivated_on_conflict` / `skipped_not_approved` when formulas clear Approved |
| Conflict formula flips on | Formula update while matching | C deactivates active `ZOOM_CREDIT|…` XP; D/E skip conflict; F skip not approved |
| Conflict clears + re-Satisfactory | Formula/update while matching | C `updated`/`created` (reactivate); D/E may link |
| Gate / PW Effective formulas become true | Formula update while matching | D/E apply once; later runs `skipped_already_applied` |
| Orchestrator writes Review Status / Satisfactory / Gate Applied / PW Applied / Send Key | Same-row update while matching | **Re-fire expected** — all steps skip when already applied |
| Repeated coach edits with no state change | Match + update | All steps `skipped_*` / `statusOut=skipped` |
| Email config disabled or webhook blank | Same | F `skipped_disabled` / `skipped_no_webhook` / `skipped_config_missing` — **no send** |
| Live Attendance Method row | Does **not** match condition 1 | Never fires (101 owns live XP) |

---

## Optional tighten (only after DEV noise review)

If Mike observes excessive runs, add an **OR** group of “interesting” fields **without removing** Method/Enrollment/Meeting:

- `Recording Quiz Review Status`
- `Recording Quiz Satisfactory?`
- `Zoom Credit Approved?`
- `Zoom Credit Conflict?`
- `Zoom Gate Credit Earned?`
- `Effective Recording Counts for Perfect Week?`
- `Recording Quiz Correction Count`

**Prove first** in DEV Run History that formula-only updates still re-fire under the broad preferred trigger before narrowing. Wrong narrow filters are worse than noisy skips.

---

## Recursive retrigger budget (expected, safe)

Self-writes that intentionally re-fire matches-conditions:

| Writer | Fields | Second-run expectation |
|--------|--------|------------------------|
| A | Review Status, Submitted At | A `skipped_already_normalized` |
| B | Satisfactory?, Reviewed At / Needs Correction At, Correction Count | B `skipped_unchanged`; C–F catch fresh formulas |
| D | Gate Credit Applied?, Meeting Attendees | D `skipped_already_applied` |
| E | Perfect Week Credit Applied?, Meeting Attendees | E `skipped_already_applied` |
| F | Send Key, Sent At | F `skipped_already_sent` (only if webhook was real + prior 2xx) |

**Safety rule for activation:** leave `webhookUrl` **blank** so F never stamps Send Key → no email-side retrigger chain.

---

## Anti-patterns (do not configure)

1. Six separate 117a–f automations (slot waste; orchestrator replaces them).
2. Trigger on **Zoom Meetings** (101 territory).
3. Condition `Attendance Method is Live`.
4. Production Make webhook in DEV input.
5. Folder 07 / parent email paths for this test wave.
6. View-entry on past-deadline view as the sole XP trigger.

---

## Activation note

Trigger wiring can be configured **while 117 remains OFF**. Turning ON is a separate Mike step after reading the activation sheet and running the offline smoke suite.
