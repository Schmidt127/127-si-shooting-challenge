# Live remaining-work audit — 2026-09-01

> **Historical snapshot:** This audit captured live state on 2026-09-01 morning. **071 v4.3** and **076 v8.12** were listed as still open at audit time; **Mike updated both in Production later the same day (2026-09-01).** Current paste-queue authority: [`docs/deploy-checklists/EMAIL-PASTE-QUEUE-2026-09.md`](../deploy-checklists/EMAIL-PASTE-QUEUE-2026-09.md). Current truth: [`docs/CURRENT-TRUTH.md`](../CURRENT-TRUTH.md).

**Scope:** Master Future Work List § H (FUT-033–047) + related paste/ops claims  
**Evidence:** Live `fairfieldbasketballclub.com` (Playwright + HTML), Production Airtable Meta (`appn84sqPw03zEbTT`), Hub `communications` email templates, SC `web/` source  
**Schema live:** **35 tables / 1367 fields**

## Verdict

The brainstorm list status labels are **stale**. Several items are already live; several still need real work. Automation paste queue remains **empty**.

### Already done (mark Complete in Master List)

| ID | Evidence |
|----|----------|
| **FUT-037** | Program images live at `/images/programs/*.jpg` (HTTP 200). Youth Programs + Coach Tools media use photos (deployed this morning). |
| **FUT-039** | Mike attested Fillout CSS complete (2026-09-01). |
| **FUT-031** | Live athlete profile Game Log shows `Extra credit +N XP` taglines (Athlete1 Schmidt). |
| **FUT-032** | HC fields Parent Feedback Sent?/Sent On/Delivery* present in live schema; writeback verified 2026-08-31. |
| **FUT-044** (web) | Athlete homework shows **View Submitted Homework**; **Submitted Work** card absent on live athlete page. |
| **Paste queue** | 010/020/022/057/065/072/073 aligned; **065 v10.5** Live — do not re-paste. |

### Still open — landing (`hoopchallenges-landing`)

| ID | Live finding | Do? |
|----|--------------|-----|
| **FUT-033** | “What the club offers” still says youth offerings + **Jr. Ref.** and “Coach tools sit separately…”. Missing approved sentence: *Youth programs include Shooting Challenge, Dribbling Challenge, and Jr. Referee Clinic. Coach tools…* | **Yes — copy fix** |
| **FUT-034** | **0** hits for “Jr. Referee Clinic”. Live titles use **Jr. Ref** / **Jr. Ref Clinic**. | **Yes — naming pass** |
| **FUT-035** | Club/#About section `background-color: rgb(6, 26, 67)` (`#061a43` navy). Footer already royal `rgb(0, 52, 183)`. | **Yes — replace navy club treatment** (footer OK) |
| **FUT-036** | Upcoming = **3** youth cards only (Dribbling / Jr. Ref / Shooting). Not six differentiated Youth+Coach cards. | **Yes — redesign** |

### Still open — SC web + Hub emails

| ID | Live / code finding | Do? |
|----|---------------------|-----|
| **FUT-041** | Daily submission Hub email has streak/XP metrics, **not** horizontal **XP Earned \| Extra Credit** columns. | **Yes** |
| **FUT-042** | Coach feedback is plain InfoCard / plain web text — not quotation (italic, orange border, etc.). | **Yes** |
| **FUT-043** | Card system standardization not done as a dedicated pass. | **Yes (optional after 042)** |
| **FUT-045** | Web resolver still prefers `Assignment Full Name - Display` / `Assignment Full Name` over `Assignment Title`. Schema has both. | **Yes** |
| **FUT-046** | Hub subject still `Homework Feedback for {Name}` — not `Homework Feedback – Name – Assignment Name`. | **Yes** |
| **FUT-047** | Hub homework templates have **no** “unmonitored reply” instruction today; also no `schmidt@fairfieldbasketballclub.com` contact line. | **Add monitored contact line** (not a paste) |

### Brief-first / not started (schema confirms gaps)

| ID | Live schema note | Do? |
|----|------------------|-----|
| **FUT-038** | Config has some enable flags (Submission XP, HW/Video review, Zoom recording) but **no** global category on/off architecture for GOAT-safe disable. | Brief first |
| **FUT-040** | Headshot attachment + Writeback fields exist; no automatic migrate→verify→delete pipeline. FUT-010 dry-run was 0 eligible. | Brief first |
| **FUT-029** | Design deferred — Grade-Band Homework Platform + Homework Intake Adapter; do not implement; not required for current app completion. Plan: [`next-wave/homework-pipeline/FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md`](../next-wave/homework-pipeline/FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md) | Defer |

### Ops (not Master design items, still Mike)

- Push landing `master` to GitHub after `gh auth login` (local ahead of origin from image deploy).
- SC-149 / SC-109 Vercel env attestations if not checked.
- FUT-003 Make activation when registration opens.

## Recommended next prompts (actual remaining)

1. Landing: **FUT-033 + FUT-034 + FUT-035** (copy/naming/navy) in `hoopchallenges-landing`
2. Landing: **FUT-036** Upcoming Programs six-card redesign
3. SC + Hub: **FUT-045 → FUT-046 → FUT-047 → FUT-041 → FUT-042**
4. Close Master List statuses for **037 / 039 / 031 / 032 / 044(web)**
