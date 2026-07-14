# Unattended run status

## Milestone — S19 C-025 DEV 117 activation closeout (2026-07-14)

| Field | Value |
|-------|-------|
| Package | `C-025-dev-activation-117-closeout` |
| Agents | A deploy verify · B schema/E2E · Lead integrate |
| Scripts | 117b/c/f → **v1.0.1** (Recording Quiz-only XP; email Approved/Conflict; correctionCount) |
| Deliverables | DEV deployment sheet + Mike action sheet (stop at create/paste **117a** OFF) |
| Untouched | PROD, real email, prod webhook, C-027 |
| Docs | `S19-AUTHORIZED.md`, `C-025-dev-airtable-117-deployment-sheet.md`, `C-025-mike-action-sheet-117-dev-activation.md` |

## Milestone — S18 C-025 recording credit DEV DoD (2026-07-14)

| Field | Value |
|-------|-------|
| Feature | APPROVED brief — cleanup + 117a–f + DEV E2E without Fillout |
| Scripts | `117a`–`117f` on GitHub |
| E2E / Effectives / contracts | **6/6** · **13/13** · **15/15** offline |
| Temp fields | Meta DELETE 404 → renamed `ZZZ C025 Archive — *` (40) |
| Untouched | PROD, archive, real email, Make prod, Fillout public, Vercel/AWS prod, C-027 |
| Remaining | Paste 117a–f in DEV Airtable; then Mike PROD promotion decision |
| Docs | `S18-AUTHORIZED.md`, `S18-lead-integration-result.md`, `C-025-prod-promotion-package.md` |

## Milestone — DEV execution model documented (2026-07-14)

| Field | Value |
|-------|-------|
| Doc | `docs/development/DEV-EXECUTION-AND-PROMOTION-MODEL.md` |
| Agent updates | `AGENTS.md`, workflow-guardrails, monorepo, overnight hard-blocks, doc 04, APPROVAL-PROFILE |
| Intent | Feature-once Mike approval; autonomous low-risk DEV; PROD/archive/real-send stops unchanged |
| Next | Await Mike confirm next feature brief (recommended: C-025 path DEV DoD) |

## Milestone — C-025 Effective→Formula convert + postverify (2026-07-14)

| Field | Value |
|-------|-------|
| Mike UI | Converted all 10 Effective Recording* fields to Formula (same IDs) |
| Formatting forced | Checkbox Effectives → formula **number** (1/0); selects → **singleLineText** |
| Schema | IDs unchanged; formulas match approved set; ZA lookups OK |
| Precedence | **13/13 PASS** on live Effectives (override/program/global/fallback + checkbox cases) |
| Restore / Schmidt / Deadline | **OK** / **4/4** / **date OK** |
| Untouched | PROD, 117a–f, C-027, XP creates, email, Make, Vercel, AWS |
| Next | Cleanup temp/legacy fields; then 117a–f DEV |
| Docs | `C-025-effective-to-formula-conversion.md`, `C-025-effective-postconversion-result.md` |

## Milestone — C-025 checkbox blank-safe repair (2026-07-14)

| Field | Value |
|-------|-------|
| Issue | Meta API cannot store rollup COUNTA/OR formula |
| Fix | Config `* YN` formulas + Program/Global Lookups of YN; checkbox draft formulas Yes/No |
| Checkbox matrix | **7/7 PASS** |
| Restore / Schmidt / Deadline | **OK** / **4/4** / **date OK** |
| Effectives | still editable |
| Next | UI Effective→formula convert (all kinds now evidence-ready) |
| Doc | `docs/deploy-checklists/C-025-checkbox-rollup-repair.md` |

## Milestone — C-025 live precedence verify (2026-07-14)

| Field | Value |
|-------|-------|
| Command | `live --confirm-write` with snapshot+finally restore |
| Result | **11 pass / 1 fail** — number/select tiers PASS; checkbox-unchecked FAIL (rollup missing aggregation formula) |
| Restore | **OK** (Config + meeting pretest values) |
| Schmidt | **4/4** after restore |
| Deadline | date OK |
| Effectives | still editable (not converted) |
| Next | Repair checkbox Config rollup formulas, then re-assert; UI Effective convert still gated |
| Doc | `docs/deploy-checklists/C-025-config-linkage-live-verify-result.md` |

## Milestone — C-025 DEV deadline repair APPLIED (2026-07-14)

| Field | Value |
|-------|-------|
| Time | 2026-07-14 ~05:40 MDT |
| DEV changes | Created Zoom Meetings `Week End Date` (`fldmeNbIm6UVQZI9Y`); patched `Calculated Recording Quiz Deadline` (`fldbmg5yT9O2TSqwn`) to true **date**; ZA lookup now date-typed |
| Formula adaptations | `DATETIME_PARSE(ARRAYJOIN({Week End Date}))` + `DATETIME_DIFF` for Later/Earlier (bare lookup / MAX/MIN blanked) |
| View | `Zoom Recording Quiz - Past Deadline` (`viwO4iOrQtWXpAnQY`) present — confirm filters/sort in UI |
| Schmidt credits | **4/4** |
| Untouched | PROD, XP creates, emails, Make, Vercel, AWS, Config linkage, 117a–f |
| Stop | Config linkage / automations **not** started |
| Doc | `docs/deploy-checklists/C-025-deadline-repair-design.md` §8 |

## Morning report — Overnight S17 (2026-07-13/14)

| # | Item | Value |
|---|------|-------|
| 1 | Starting Lead SHA | `4530780` |
| 2 | Ending Lead SHA | `7302b08` |
| 3 | Agent A work | Config linkage design; deadline repair design; submission page verification; precedence/deadline offline tests. Live Meta scan: Config missing C-025 fields; Meeting Effective* are editable; deadline lookup not a true date. |
| 4 | Agent B work | C-025 automation packages 117a–f design; C-027 MEN impl prep; automation + MEN offline contracts. Coordinated by Lead (same deliverables landed on Lead). |
| 5 | Files created/changed | `C-025-config-linkage-design.md`, `C-025-deadline-repair-design.md`, `C-025-submission-page-verification.md`, `C-025-automation-packages-stage17.md`, `C-027-implementation-prep-stage17.md`, catalog gap note, `S17-AUTHORIZED.md`, tests `test_c025_config_precedence.py`, `test_c025_deadline_modes.py`, `test_c025_automation_contracts.py`, `test_c027_men_contracts.py`, CONTROL, this status |
| 6 | Airtable DEV changes tonight | **None** (schema writes deferred — Config fields absent; deadline paste deferred). Prior C-025 formula apply remains. |
| 7 | Tests | Lambda **66/66** · Offline **97/97** · Targeted C-025/C-027 contracts **61/61** · prior Schmidt credit **4/4** |
| 8 | C-025 status | Formulas/conflict **complete**. Config linkage **designed, blocked on Config schema**. Deadline **designed**. Automations **designed, not pasted**. |
| 9 | C-027 status | Impl prep **complete (repo)**. Schema fields missing on DEV. No automations pasted. |
| 10 | Blockers | (1) Config lacks C-025/C-027 fields (2) Achievements/Shot Milestones lack `Parent Notification Enabled?` (3) True deadline date not installed (4) View API cannot create filters (5) 117d gate writable target needs inventory before code |
| 11 | Mike manual Airtable steps | Delete `C025 Schema Write Probe` on Zoom Meetings. Create view `Zoom Recording Quiz - Past Deadline` (hyphen) with filters: Method=Recording Quiz; true deadline date before today (after deadline repair); Approved empty/false. Create Config fields per linkage + C-027 prep docs when ready. |
| 12 | Next safe package | DEV Config field create (C-025+C-027 catalog) + deadline date formula paste — requires Airtable write session; **or** inventory writable gate targets for 117d. No PROD. |
| 13 | PROD untouched | **Confirmed** |
| 14 | Local equals remote | **Confirmed after push** |

## Milestone — Overnight S17 started

| Field | Value |
|-------|-------|
| Starting Lead | `4530780` |
| Packages | C-025 config/deadline/submission + automation packages + C-027 impl prep |
| Agents | A schema/config · B automations/tests (Lead-integrated) |

## Milestone — C-025 DEV formula repair APPLIED

| Field | Value |
|-------|-------|
| Time | 2026-07-13 ~22:15 MDT |
| Live Schmidt tests | 4/4 pass |
| Offline C-025 | 14/14 |
| Remaining (post-S17) | Probe delete; hyphen view; Config linkage; deadline date; award automations |
| PROD | untouched |
