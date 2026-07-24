# Mike Actions — Config / XP / Levels / Achievements

Overnight Agent 2 · 2026-07-24  
Items Cursor could not complete unattended (UI paste, formula edit, or product decision).

---

### 1. ~~Collapse Config table to a single authoritative record~~ **SUPERSEDED 2026-07-24 (Agent 10 / Agent 13)**
> **Do not collapse or delete Config rows.** The four records are an intentional year registry (2025–2026 … 2028–2029) with year-specific Max Videos (4/6/5/4). Defect = ambiguous selection (`records[0]`), not multi-row existence. Adopt year-aware resolver: `docs/next-wave/config-selection/`. Keep all four rows.
- **Priority:** P0 *(selection contract — not destructive cleanup)*
- **System:** Airtable PROD · Config table
- **Exact table/records:** Config — 4 year rows (`recXwc19BtG1L2PzW`, `rechc1f9f4kVM1tHP`, `recq14M5hEv3TIGEj`, `rectmrnvo9a79wgq3`)
- **Exact action:** Keep all four; wire consumers to `lib/config-selection` hierarchy (explicit id → Program Instance year → Enrollment School Year). Do **not** archive/delete “extra” rows.
- **Expected outcome:** Deterministic year-keyed Config lookups for 042 recording-credit flags and related knobs
- **Why not completed:** Consumer migration + optional 042 guard paste still open
- **Verification:** Resolver tests in `tests/config-selection/`; OMNI year-link spot-check on Zoom Config links
- **Related SC:** SC-030, SC-033, SC-021 · Evidence: `docs/next-wave/config-selection/REPORT.md`

### 2. Paste 057 Denver date-key fix after repo change
- **Priority:** P1
- **System:** Airtable automation 057
- **Exact action:** After repo 057 date helper is aligned to America/Denver (005/034 pattern), paste script into PROD 057
- **Expected outcome:** Perfect Week week-window keys remain correct for evening dateTimes
- **Why not completed:** Requires Airtable UI paste; latent risk only today
- **Verification:** Offline test already pins UTC-slice disagreement; live Perfect Week after paste
- **Related SC:** SC-028, SC-077

### 3. Fix XP Date Resolved SWITCH case "Submission Base"
- **Priority:** P1
- **System:** Airtable · XP Events · formula field `XP Date Resolved`
- **Exact action:** Change SWITCH case from `"Submission Base"` to `"Shooting Base"` (matches XP Bucket choice)
- **Expected outcome:** Fallback date resolution works if explicit XP Activity Date is blank
- **Why not completed:** Formula UI edit only
- **Verification:** Create test event without explicit date; resolver uses submission lookup
- **Related SC:** SC-070, SC-048

### 4. Investigate Video Submission XP = 1 (rule = 25) + blank date
- **Priority:** P0
- **System:** XP Events `recYQ10pOoFlApmjZ` · Video Feedback writer (113/114 family)
- **Exact action:** Identify writer that awarded 1 XP with blank `XP Activity Date`; decide repair vs leave; do not mass-edit XP unattended
- **Expected outcome:** Video XP matches `VIDEO_SUBMISSION` rule (25) and carries activity date
- **Why not completed:** Risk of corrupting XP without writer confirmation
- **Verification:** New video award = 25; date present; dedupe key stable
- **Related SC:** SC-072, SC-022

### 5. Confirm Lifetime XP rollup excludes Zoom Recording Quiz intentionally
- **Priority:** P1
- **System:** Enrollments · Lifetime XP Earned (Schmidt = 61 = 60 submission + 1 video; excludes 30 Zoom quiz)
- **Exact action:** Confirm whether Zoom Recording Quiz should count toward Lifetime XP / levels
- **Expected outcome:** Documented rollup filter matching product intent
- **Why not completed:** Product decision
- **Verification:** After decision, Lifetime XP matches intended sources
- **Related SC:** SC-074, SC-078

### 6. ~~Paste 066 v3.3 (Grade Band link-ID matching)~~ **DONE 2026-07-24 — Installed in PROD**
- **Priority:** P0 *(paste complete; live proof still open)*
- **System:** Automation 066
- **Exact action:** ~~Paste GitHub `066-…js` v3.3 into PROD~~ **Completed — 066 v3.3 installed in PROD**
- **Expected outcome:** Milestone band match uses linked record IDs; rename-safe
- **Status:** **Installed in PROD** — not Live Tested until supervised Schmidt/OMNI run
- **Verification still needed:** Run Shot Milestone Check on Schmidt (still below 500 — expect skip_no_milestones, no error)
- **Related SC:** SC-023, SC-027, SC-076 · Next-wave note: `docs/next-wave/config-xp/MIKE-ACTIONS.md`

### 7. Decide submission formula XP economics vs SHOOTING_BASE=20
- **Priority:** P2
- **System:** Submissions formula fields `XP Base Points` / `XP Volume Bonus` vs XP Events pipeline
- **Exact action:** Keep XP Events (20) as operative; remove or hide stale formula economics, OR adopt them intentionally
- **Expected outcome:** One visible submission XP design
- **Why not completed:** Product decision
- **Related SC:** SC-070, SC-021

### 8. Archive inactive legacy Grade Bands
- **Priority:** P2
- **System:** Grade Bands `recg6zvMxWsFSn7sf` ("Grades 1–2"), `recOGisMZRWgk445o` ("Grades 9–10")
- **Exact action:** After confirming only inactive milestones reference them, archive/delete
- **Expected outcome:** Active band set = K-2, 3-4, 5-6, 7-8, 9-12 only
- **Why not completed:** Destructive UI + dependency confirmation
- **Related SC:** SC-023

### 9. Decide streak repeat-after-break + backdated double-award guard
- **Priority:** P1 (decision)
- **System:** 053 / 054 streak occurrences
- **Exact action:** Decide whether streaks may re-award the same threshold after a break; then authorize occurrence-level guard keyed on (enrollment, achievement) if repeats are forbidden
- **Expected outcome:** Documented policy; no silent double XP on backfill merges
- **Why not completed:** Explicitly forbidden overnight decision
- **Related SC:** SC-029, SC-081, SC-075

### 10. Supervised live streak / milestone boundary tests
- **Priority:** P1
- **System:** Schmidt enrollment `recgP9qZYjAhE7NXm`
- **Exact action:** Controlled 3-day streak chain and/or milestone approach (needs +425 K-2 shots to 500) with cleanup plan
- **Expected outcome:** One unlock + one XP Event each; rerun safe
- **Why not completed:** Multi-system cascade not cleanly reversible unattended
- **Related SC:** SC-075, SC-076, SC-027

### 11. ~~Paste 054 v5.6 (duplicate active XP rule detection)~~ **DONE 2026-07-24 — Installed in PROD**
- **Priority:** P1 *(paste complete; live proof still open)*
- **System:** Automation 054
- **Exact action:** ~~Paste GitHub 054 v5.6 into PROD~~ **Completed — 054 v5.6 installed in PROD**
- **Expected outcome:** Duplicate active `STREAK_nDAY` rules error clearly instead of first-match
- **Status:** **Installed in PROD** — not Live Tested until supervised streak proof
- **Related SC:** SC-022, SC-075 · Next-wave note: `docs/next-wave/config-xp/MIKE-ACTIONS.md`

### 12. Early gate tuning spreadsheet (do not apply overnight)
- **Priority:** P2
- **System:** Level Gate Rules ranks 7–12
- **Exact action:** Review whether early gated levels are too hard; approve numbers in Airtable only
- **Expected outcome:** Tuned gates for next season
- **Why not completed:** Explicitly forbidden product decision (SC-082)
- **Related SC:** SC-082, SC-025
