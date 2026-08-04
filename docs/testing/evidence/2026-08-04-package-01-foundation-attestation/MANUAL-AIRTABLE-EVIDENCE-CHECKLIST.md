# Manual Airtable Evidence Checklist — Package 1

**Base:** PROD `appn84sqPw03zEbTT`  
**Goal:** Shortest proof set. Omni labels are **not** evidence. Capture real screenshots or paste copied text into this folder / chat.

**Do not change:** 118/119 stay ON · 035 stay OFF · 070a stay OFF · do **not** enable 112 · do **not** disable 013 based on Omni.

Schmidt Enrollment: `recgP9qZYjAhE7NXm`

---

## A. Complete automation list (closes SC-058 gap)

1. Open base → **Automations** (left sidebar).
2. Expand so **every** automation is listed (scroll; no ellipsis).
3. Screenshot(s) showing **full name + ON/OFF toggle** for the entire list (multiple shots OK).
4. Paste a text list: `Number | Name | ON/OFF` for **all** rows.

**Must be visible:** no `...`; include numbers beyond Omni’s partial table (010, 054–066, 071–077, 113–115, 070b/c, etc. if present).

---

## B. Per-automation deep proof (same clicks each time)

For each automation below:

1. Automations → click the automation by **number/name**.
2. Screenshot **ON/OFF** at top.
3. Open **Trigger** → screenshot type + table + **full condition/schedule text**.
4. Open **Actions** list → screenshot action order (Run script / Update record / etc.).
5. Open the **Run a script** step → screenshot or copy the top **docblock / SCRIPT** lines showing `Version:` / `version:` / `scriptName`.
6. Open script **Input variables** → screenshot names (and Live vs Test values for 074/118 if shown).

### B1. 013 and 112

| # | Expected (repo) | Must show in shot |
|---|-----------------|-------------------|
| **013** | ON; Submission Assets → create/link VF; version **v2.0** | Trigger table **Submission Assets** (not Video Feedback XP); header v2.0 |
| **112** | OFF or **Absent** | If present: OFF; header ≈ create VF from asset (**not** “Video Feedback XP”); do not turn ON |

### B2. 020 and 067

| # | Expected (repo) | Must show in shot |
|---|-----------------|-------------------|
| **020** | ON; **Submission Assets**; HC link/create; **v3.0.0**; no XP create | Not “Homework Completions Submitted → XP” |
| **067** | Present/paste state; Final Reflection Quiz trigger; **v2.0** Option B if installed | Not same trigger as 020; not XP writer |

### B3. 117 and 117c

| # | Expected (repo) | Must show in shot |
|---|-----------------|-------------------|
| **117** | Exact script header / purpose | Copy `scriptName` + `version`. Note if email-to-Make vs recording orchestrator vs “Zoom XP Live” |
| **117c** | Absent **or** OFF | If present: version + whether it creates `ZOOM_CREDIT` XP |

**Also confirm separately:** **101** exists and is the live Zoom XP path (do not assume Omni’s 117=Live).

### B4. 031, 101, and 118

| # | Expected (repo) | Must show in shot |
|---|-----------------|-------------------|
| **031** | Should be **ON**; Submissions → find/create WAS; **v3.1** | If OFF, photograph OFF — that is a defect to decide, not “no conflict” |
| **101** | Should be **ON**; Zoom Meetings → Award Meeting XP; **v5.5** | Not “WAS Update” |
| **118** | **ON**; schedule Sun **5:00 AM** America/Denver; script **v1.5** | Header must not be confused with 031 v3.1; inputs `dryRun` / `sendMode` / `includeSchmidt` |

### B5. 035

| Expected | Must show |
|----------|-----------|
| **OFF**; script **v1.2** if paste held | OFF toggle + Version v1.2 (Omni’s v1.0 is contested) |

### B6. 070a

| Expected | Must show |
|----------|-----------|
| **OFF**; homework **asset → Make** script | Trigger **Submission Assets** (not Homework Completions parent feedback); version **v4.x**; name ≠ “Email Writeback” |

### B7. 074

| Expected | Must show |
|----------|-----------|
| **ON**; posts Make webhook | Trigger conditions (Ready?/Sent?/Send to Make?/package fields); **Input** `sendMode`/`sendModeInput` value **or** blank+WAS Live; script **v2.1**; do not leave fixed Test |

### B8. 119

| Expected | Must show |
|----------|-----------|
| **ON**; Sun **10:00 AM** Denver; arms send | Script **v1.5**; does **not** itself own final Sent? writeback |

---

## C. Testing views (SC-003)

1. Open each table’s **Views** left sidebar.
2. Screenshot sidebar showing the Testing view name.
3. Open the view → screenshot grid with filter chip/conditions visible.
4. Where rows exist, confirm Schmidt enrollment/athlete visible (Enrollment link or RID).

**Minimum views to capture**

| Table | Look for (Omni or spec name) |
|-------|------------------------------|
| Enrollments | `Testing - Schmidt Only` / `Testing - Schmidt Enrollment` |
| Submissions | `Testing - Schmidt Submissions` |
| XP Events | `Testing - Schmidt XP` / `…XP Events` — **count must not look like full-base ~2500 if filter is Schmidt-only** |
| Submission Assets | `Testing - Schmidt Assets` — **count must not look like ~280 if filter works** |
| Weekly Athlete Summary | `Testing - Schmidt Weekly Summary` / `…WAS` |
| Video Feedback | `Testing - Schmidt Video Feedback` |
| Homework Completions | Testing Schmidt HC view (0 rows OK) |
| Testing Scenarios | Prefer Schmidt-filtered; note if only `Testing - All Scenarios` |
| Weeks | Note if unfiltered `Testing - All Weeks` |

---

## D. Save evidence

Save files under:

`docs/testing/evidence/2026-08-04-package-01-foundation-attestation/screenshots/`

Suggested names: `A-automations-full.png`, `B-013.png`, `B-112.png`, … `C-xp-events.png`.

Then Package 1 can be re-scored in [`PACKAGE-01-STATUS.md`](./PACKAGE-01-STATUS.md).
