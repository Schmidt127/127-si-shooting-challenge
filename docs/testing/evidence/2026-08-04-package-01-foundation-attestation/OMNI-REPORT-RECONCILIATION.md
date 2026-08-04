# Omni Package 1 Report — Repository Reconciliation

| Field | Value |
|-------|--------|
| Date | 2026-08-04 |
| Omni posture | Unverified inspection report |
| PROD base | `appn84sqPw03zEbTT` |
| Omni source | Mike-pasted Omni Package 1 response (this session) |

**Classification legend**

| Tag | Meaning |
|-----|---------|
| Confirmed by repository | Matches committed scripts/docs (still may need UI proof for *live* install) |
| Contradicted by repository | Conflicts with canonical scripts or controlling docs |
| Plausible but requires Airtable UI evidence | Possible in live UI; repo cannot confirm |
| Unsupported | No repo support; screenshots/labels only |
| Incorrect terminology | Wrong names/roles for known automations |
| Requires Mike decision | Product/ops choice; do not auto-resolve |

---

## Meta claims

| Omni claim | Classification | Repository evidence |
|------------|----------------|---------------------|
| Response based on actual PROD schema/config | Plausible but requires Airtable UI evidence | Cursor cannot see live Automations UI; treat as claim only |
| “Screenshots … included where possible” / Screenshot 1–31 | Unsupported | Labels only — no image files attached to Omni response or this evidence folder |
| “All automations in the base are included” | Contradicted by repository | Inventory ends with ellipsis (`...`); many known PROD automations omitted (e.g. 005–010, 054–066, 071–077, 113–115, 070b/c) vs `docs/automation-index.md` and `docs/foundation-reset/PROD-AUTOMATION-VERSION-INVENTORY-2026-07-23.md` |
| “All automation ON/OFF states match documentation” | Contradicted by repository | Multiple role/ON-OFF mismatches below (031/101 expected writers; 013/112 roles; 070a purpose) |
| “All field-writer assignments match repository claims” | Contradicted by repository | See Part 4 vs `FIELD-WRITER-AUDIT.md` |
| “013 ON but repo claims only 112 should be used” | Contradicted by repository | Repo: **013 ON**, **112 OFF/absent** (`AUTOMATION_112_OFF_STATE_VERIFICATION.md`, attestation packet, automation-index) |
| Decision: “disable 013 and enable 112” | Contradicted by repository / Requires Mike decision | **Do not follow Omni.** Canonical path is 013 create VF + **114** XP. Enabling 112 is forbidden without reversing OW-D1 |

---

## Part 1 — Testing views

| Omni claim | Classification | Notes / repo paths |
|------------|----------------|--------------------|
| Dedicated Testing views now exist for listed tables | Plausible but requires Airtable UI evidence | Creation is UI-only (`TESTING-VIEWS-MIKE-ACTIONS.md`); Omni claims Created/Existed |
| Views named as Omni listed (e.g. `Testing - Schmidt Only`, `Testing - All Weeks`) | Plausible but requires Airtable UI evidence | Spec names differ in places (spec: `Testing - Schmidt Enrollment`, `Testing - Seeded Weeks`, `Testing - Schmidt WAS`, etc.) |
| Record counts (Assets 280, XP 2547, Scenarios 21, …) | Unsupported / suspect | Matches orphan/legacy scale in `CURRENT-PROD-BASELINE.md` (XP ~2543, Assets ~280) — suggests Enrollment filter may **not** be limiting to Schmidt |
| Schmidt Present = Yes (including empty HC/Unlocks “if present”) | Incorrect terminology / Unsupported | Empty views cannot show Schmidt rows; “Yes (if present)” is not evidence |
| Weeks / Zoom Meetings / Testing Scenarios unfiltered “All …” views | Plausible but requires Airtable UI evidence | Spec prefers Schmidt-linked or seeded filters; unfiltered views are weaker attestations |
| No dedicated weekly-email queue tables beyond WAS / XP | Plausible but requires Airtable UI evidence | Weekly email path is WAS fields + Make (`WAS-WEEKLY-EMAIL-ARCHITECTURE.md`); no separate queue table required |
| Screenshot 1–12 prove views | Unsupported | Labels only |

Full provisional table: [`TESTING-VIEWS-PROVISIONAL-INVENTORY.md`](./TESTING-VIEWS-PROVISIONAL-INVENTORY.md).

---

## Part 2 / 3 — Automation inventory & explicit states

### Standing schedule / OFF expectations (repo)

| Item | Repo expected | Omni reported | Classification |
|------|---------------|---------------|----------------|
| 118 schedule ON Sun 5:00 AM Denver | ON | ON, correct schedule | Confirmed by repository *(state claim)*; **version below conflicts** |
| 119 schedule ON Sun 10:00 AM Denver | ON | ON, correct schedule | Confirmed by repository *(state claim)*; **version/purpose below conflict** |
| 035 OFF pending enable decision | OFF | OFF | Confirmed by repository *(OFF posture)* |
| 070a OFF pending SC-095 | OFF | OFF | Confirmed by repository *(OFF posture)* |
| 112 OFF / absent | OFF or absent | OFF | Plausible but requires Airtable UI evidence *(Agent 9: Absent 2026-07-24)* |
| Preserve 118/119 ON; do not enable 035/070a here | Operating rule | Matches OFF/ON for these four | Confirmed by repository |

### Per-automation Omni rows

#### 112 — Omni: “Video Feedback XP”, OFF, VF Award Status Pending

| Aspect | Classification | Repository |
|--------|----------------|------------|
| Name / purpose as “Video Feedback XP” | Incorrect terminology | `112-…create-video-feedback-from-submission-asset.js` **creates/links Video Feedback** from Submission Assets — **not** XP. Video XP = **114** (`VIDEO_SUBMISSION\|`) |
| Trigger on Video Feedback / Award Status | Contradicted by repository | Legacy 112 triggers on **Submission Assets** (Upload Destination = Video Feedback, VF empty) — see script + attestation packet |
| Version v1.2 / 2026-06-01 | Contradicted by repository | Repo SCRIPT header **v2.1** |
| OFF | Plausible but requires Airtable UI evidence | Required OFF/absent (`docs/v2/AUTOMATION_112_OFF_STATE_VERIFICATION.md`) |
| Overlap “with 013” framed as XP dual-writer | Incorrect terminology | Dual-writer risk is **VF create** (013 vs 112), not XP; XP writer is 114 |

#### 013 — Omni: “Video Feedback XP (Legacy)”, ON; “repo says 112 only”

| Aspect | Classification | Repository |
|--------|----------------|------------|
| Role as XP awarder / “Legacy” | Incorrect terminology | `013-…create-or-link-video-feedback.js` **v2.0** — VF create/link + Pending Link / Make arm. XP = **114** |
| Trigger on Video Feedback Award Status | Contradicted by repository | Triggers on **Submission Assets** ready for VF prep |
| Version v1.0 / 2026-05-01 | Contradicted by repository | Repo **v2.0** |
| “Repo Match: No (repo says 112 only)” | Contradicted by repository | Opposite: repo **requires 013**, forbids relying on 112 |
| Recommended Mike action: disable 013 / enable 112 | Contradicted by repository | **Reject.** Keep 013 path; keep 112 OFF |

#### 117 — Omni: “Zoom XP (Live)”, ON

| Aspect | Classification | Repository |
|--------|----------------|------------|
| Role as live Zoom XP | Contradicted by repository | Live Zoom XP = **101** (`ZOOM_ATTEND_BASE\|…`). Stage 17 **117** orchestrator is **recording** credit; PROD Agent 9: Automation **117** = **approval email to Make** (v1.1), **not** XP |
| Version v2.0 / 2026-06-01 | Contradicted by repository | Repo orchestrator **v1.1.1**; PROD email handoff attested **v1.1** |
| Mutually exclusive with 117c (as Live vs Recording XP) | Incorrect terminology / Requires Mike decision | XOR in docs is for **`ZOOM_CREDIT` XP writers** (orchestrator vs modular 117c), **not** Live vs Recording. Live = 101; Recording credit ≠ Omni’s framing. Agent 9: PROD 117c **absent**; PROD 117 email-only — XOR warning **does not apply** to that PROD 117 |
| ON | Plausible but requires Airtable UI evidence | Re-attest identity of live “117” script header |

#### 117c — Omni: “Zoom XP (Recording)”, OFF

| Aspect | Classification | Repository |
|--------|----------------|------------|
| Exists as OFF recording XP | Plausible but requires Airtable UI evidence | Repo `117c-…create-zoom-xp-event.js` **v1.1.0**; Agent 9 (2026-07-24): **Absent** from PROD — Omni “OFF” may mean disabled row or inventing presence |
| Version v2.0 | Contradicted by repository | Repo **v1.1.0** |
| XOR with Omni-117 as Live/Recording | Incorrect terminology | See 117 row; also `C-025-117-numbering.md` |

#### 118 — Omni: “Weekly Athlete Summary”, ON, v3.1

| Aspect | Classification | Repository |
|--------|----------------|------------|
| Schedule Sun 5:00 AM Denver ON | Confirmed by repository | Completion master / operating mode / go-live |
| Script “Weekly Summary Builder” v3.1 awarding XP Events | Contradicted by repository | `118-…schedule-weekly-summary-email-build.js` **v1.5** — schedule ensure WAS + arm Build / write `sendMode` from **input**. Does **not** mint threshold/submission XP. **v3.1** is **031**’s version |
| Overlap with 031, 101 as active conflict when 031/101 OFF | Partially incorrect | Hybrid WAS **create** is intentional (`WAS-CREATOR-RESOLUTION.md`); Omni’s OFF for 031/101 conflicts with expected primary/side writers |

#### 119 — Omni: “Weekly Summary Email”, ON, v1.0, sends via Make

| Aspect | Classification | Repository |
|--------|----------------|------------|
| Schedule Sun 10:00 AM ON | Confirmed by repository | Completion master SC-039 |
| Sends email / Make webhook itself | Contradicted by repository | `119-…schedule-weekly-summary-email-send.js` **v1.5** arms Send; **074** posts Make webhook; Make writeback owns Sent? |
| Version v1.0 | Contradicted by repository | Repo **v1.5** |

#### 035 — Omni: Threshold XP, OFF, v1.0

| Aspect | Classification | Repository |
|--------|----------------|------------|
| OFF | Confirmed by repository | SC-049 / next-actions: keep OFF until Mike enables |
| Version v1.0 | Contradicted by repository | Repo + deploy checklist + Schmidt proof = **v1.2** (`035-…js`, `docs/deploy-checklists/035-weekly-threshold-xp-v1.2.md`, `docs/testing/evidence/2026-08-03-035-v1.2-schmidt-live-proof.md`) |
| Overlap with 118 on threshold XP | Contradicted by repository | Threshold XP writer is **035**; 118 is email build/WAS ensure — not threshold XP |

#### 070a — Omni: “Email Writeback”, Parent Feedback on Homework Completions

| Aspect | Classification | Repository |
|--------|----------------|------------|
| Purpose as parent-feedback email writeback | Contradicted by repository / Incorrect terminology | `070a-…send-homework-asset-payload-to-make.js` **v4.4** — **homework Submission Asset → Make/Lambda/S3**. Parent feedback email ≈ **071**. Decision: `docs/v2/AUTOMATION_070A_LAUNCH_DECISION.md` |
| Trigger table Homework Completions / Parent Feedback Ready? | Contradicted by repository | Trigger: **Submission Assets** + Send to Make Trigger / homework ready |
| OFF | Confirmed by repository | Intentional OFF (SC-095) |
| Version v1.0 | Contradicted by repository | Repo **v4.4** (inventory historically cited v4.1) |

#### 074 — Omni: Weekly Email Send ON, sendMode=Live in trigger, v1.0

| Aspect | Classification | Repository |
|--------|----------------|------------|
| ON | Confirmed by repository | Completion master weekly-email path |
| Live send mode required for season | Confirmed by repository | Never force Test for season |
| `sendMode = Live` as **trigger condition** | Incorrect terminology / Plausible but requires Airtable UI evidence | Script resolves sendMode: **input `sendMode`/`sendModeInput` → WAS.`sendMode` → payloadJson → default test** (`074-…js` docblock). Trigger docs: Ready?/Sent?/Send to Make?/package fields — not “sendMode=Live” as condition |
| Script updates Weekly Summary Sent At / Email Status | Contradicted by repository | 074 must **not** clear/own final Sent?; Make owns writeback (`SENT-FIELD-OWNERSHIP.md`) |
| Version v1.0 | Contradicted by repository | Repo **v2.1** |

#### 020 — Omni: HC create + XP, trigger on Homework Completions Submitted

| Aspect | Classification | Repository |
|--------|----------------|------------|
| Creates HC from assets | Partially correct purpose | `020-…homework-completion.js` **v3.0.0** — link/create HC from **Submission Assets** |
| Awards XP / writes Award Status+XP Events | Contradicted by repository | Homework XP = **064/065**; 020 must not award XP |
| Trigger on Homework Completions | Contradicted by repository | Trigger table = **Submission Assets** |
| Version v1.0 | Contradicted by repository | Live-attested **v3.0.0** (Agent 9); repo **v3.0.0** |
| Overlap with 067 | Confirmed by repository | Dual HC identity risk (`FIELD-WRITER-AUDIT.md` FW-D2) — **attestation still required** |

#### 067 — Omni: Alt HC create, OFF, v1.0, same HC Submitted trigger

| Aspect | Classification | Repository |
|--------|----------------|------------|
| Quiz/reflection HC bridge | Partially correct family | `067-…reflection-quiz.js` **v2.0** Option B — Final Reflection Quiz → HC (no assets) |
| OFF / v1.0 | Plausible but requires Airtable UI evidence | Option B **v2.0** install packet still Built / paste pending (`067-OPTION-B-PROD-INSTALL.md`); live may be missing, OFF, or stale v1.x |
| Trigger on Homework Completions Submitted | Contradicted by repository | Trigger: **Final Reflection Quiz Submissions** |
| Awards XP | Contradicted by repository | 067 must **never** create XP |

#### 031 — Omni: WAS Create, OFF, v1.0

| Aspect | Classification | Repository |
|--------|----------------|------------|
| Primary WAS create from Submission | Confirmed by repository *(role)* | `031-…from-submission.js` **v3.1**; `WAS-CREATOR-RESOLUTION.md` |
| OFF | Contradicted by repository *(expected)* / Requires Mike decision | Expected **ON** as authoritative activity path; Omni OFF would be a **PROD defect** if true — UI re-proof required |
| Version v1.0 | Contradicted by repository | Repo **v3.1** |
| Trigger on WAS Pending | Contradicted by repository | Trigger: **Submissions** (counted, WAS empty) |

#### 101 — Omni: “Weekly Athlete Summary Update”, OFF

| Aspect | Classification | Repository |
|--------|----------------|------------|
| Role as WAS Update | Incorrect terminology / Contradicted by repository | `101-…award-meeting-xp.js` **v5.5** — **live Zoom meeting XP**; may side-create WAS |
| OFF | Contradicted by repository *(expected)* / Requires Mike decision | Expected **ON** for live Zoom XP; Omni OFF would block SC-073 path if true |
| Version v1.0 | Contradicted by repository | Repo **v5.5** |

---

## Part 4 — Field-writer conflict audit (Omni matrix)

| Omni matrix claim | Classification | Repository |
|-------------------|----------------|------------|
| “No active conflict” while listing dual writers | Incorrect terminology | Dual-writer **risk** remains until exclusivity attested; OFF claims are UI-dependent |
| 013 vs 112 as XP Award Status writers | Incorrect terminology | VF **create** dual-writer; XP = **114** |
| 117 vs 117c as Live vs Recording XP | Incorrect terminology | See Zoom section; live = **101** |
| 031/101/118 — only 118 ON ⇒ no conflict | Contradicted by repository | Hybrid creators documented; turning 031/101 OFF is not “resolution” |
| 035 vs 118 threshold XP | Contradicted by repository | 118 is not threshold XP writer |
| Perfect Week / Achievements owned by 118 | Contradicted by repository | Perfect Week ≈ **057/058**; milestones ≈ **066**; streaks ≈ **053/054**; unlock XP ≈ **059** |
| 070a vs 074 on Parent Feedback Sent? | Contradicted by repository | 070a ≠ parent feedback; 074 ≠ homework parent feedback |
| Submission XP “formula only, no automation” | Contradicted by repository | **010** creates Submission XP Events |
| Asset URL only Make/upload script | Plausible but requires Airtable UI evidence | 070a/b/c + Lambda writeback paths documented |

---

## Canonical answers to investigation questions

### Video Feedback XP — intended writer

| Layer | Canonical automation | Repo path |
|-------|----------------------|-----------|
| Create/link Video Feedback | **013** (112 legacy OFF) | `013-…js` v2.0; `112-…js` v2.1 OFF |
| Assign base video XP amount | **113** | `113-…js` |
| Create/update Video XP Event | **114** | `114-…js` v5.8; Source Key `VIDEO_SUBMISSION\|` |

Omni’s “repo requires 112” is **false**.

### 117 vs 117c — alternatives or both required?

| Path | Role |
|------|------|
| Live attendance XP | **101** (separate) |
| Recording credit XP (repo Stage 17) | Exactly one of **117 orchestrator** *or* **117c** if those XP scripts are installed (`ZOOM_CREDIT\|`) |
| PROD Agent 9 (2026-07-24) | Live Automation **117** = approval-email Make handoff; **117c absent** — XOR does **not** apply to that email automation |

Omni’s Live/Recording split on 117/117c is **not** the controlling architecture. **Requires Mike decision** only after UI proves which script body is actually pasted into “117”.

### 074 Live sendMode source

Resolution order in `074-…js`:

1. Automation **input** `sendMode` / `sendModeInput`
2. Else WAS field **`sendMode`** (often set by **118** from 118’s input when dryRun=false)
3. Else `payloadJson.sendMode`
4. Else default **test**

Not a script constant. Not solely a trigger-condition field.

---

## What Omni got approximately right (narrow)

| Claim | Caveat |
|-------|--------|
| 118/119 schedules ON at Sun 5:00 / 10:00 Denver | Version/purpose details still wrong |
| 035 OFF | Version likely wrong (expect v1.2 if paste held) |
| 070a OFF | Purpose mislabeled |
| 112 OFF | Purpose mislabeled; may be absent not merely OFF |
| Testing views were created for many pipeline tables | Names/filters/counts unverified; Schmidt filter efficacy suspect |

---

## Bottom line

Omni Package 1 is **not** trustworthy as production attestation. It mixes plausible ON/OFF schedule notes with **systematic misidentification** of 013/112, 070a, 074 ownership, 031/101, 117/117c, and script versions — and cites **screenshots that were not provided**. Package 1 remains open pending Mike’s manual checklist.
