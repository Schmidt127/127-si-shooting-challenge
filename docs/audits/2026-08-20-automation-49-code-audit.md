# Automation 49-code audit — 2026-08-20

**Authority:** Production Airtable `Automations` table columns **`Name`**, **`Status`**, **`Automation Code`** only (Mike intentional refresh).
**Base:** `appn84sqPw03zEbTT` · table `tblfpqKqPEbkPnN8E`
**Repo comparison:** `airtable/automations/shooting-challenge/`
**Critical email rule:** Parent/athlete notification email must be `Airtable → Email Handoff Queue → Communications Hub → Resend`. Make/Gmail must not send those emails.

## Summary totals

| Metric | Count |
|--------|------:|
| Total automations audited | 49 |
| Live | 48 |
| Off | 1 |
| Code mismatches vs repo (after fixes) | 0 body mismatches (078 is intentional non-script) |
| Fixes applied in repo/docs | 4+ (078A restore, 070a/070b BOM, authority docs, index) |
| Parent-email Make/Gmail path violations | 0 |
| Security findings (hardcoded secrets) | 0 |
| Test failures (see Validation) | 0 expected for email contracts |

## Questions for Mike

1. **117** — Automations `Name` is `117 - Zoom Recording Credit - Orchestrator`, but `Automation Code` is the **v2.1 Hub recording-approval handoff** (exact match to repo). `Status` is **Off**. Should I treat the Name as stale and rename the table row to the Hub handoff title? Should 117 be turned **Live** when you want Zoom approval emails?
2. **078** — Code column says `NO SCRIPT - UPDATE RECORD is all.` and Status is Live. Confirm this native Update Record automation (no script) remains intentional.

## Per-automation results

| Automation name | Live status | Airtable code version | Repository code version | Code match status | Email path | Main result | Issues found | Fix applied | Test status | Remaining concern |
|---|---|---|---|---|---|---|---|---|---|---|
| 001 - Enrollment Intake and Setup - Find or Create Athlete and Link Enrollment | Live | v5.4 | v5.4 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 002 - Enrollment Intake and Setup - Assign Grade Band - Initial | Live | v8.2 | v8.2 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 003 - Enrollment Intake and Setup - Assign Grade Band - If Grade Changes | Live | v2.0 | v2.0 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 005 - Submission Intake and Asset Creation - Assign Week to Submission - Homework First | Live | v5.3 | v5.3 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 007 - Submission Intake and Asset Creation - Duplicate Checker for Submissions | Live | v2.0 | v2.0 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 009 - Submission Intake and Asset Creation - Create Submission Assets from Submission | Live | v1.2 | v1.2 | MATCH | N/A (non-email) | PASS | None | — | See validation section | — |
| 010 - Submission Intake and Asset Creation - Create XP Event from Submission | Live | v10.10 | v10.10 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 013 - Submission Intake - Create or Link Video Feedback | Live | v3.2.0 | v3.2.0 | MATCH | N/A (non-email) | PASS | None | — | See validation section | — |
| 020 - Submission Intake and Asset Creation - Link or Create Homework Completion from Submission Asset | Live | v3.7 | v3.7 | MATCH | N/A (non-email) | PASS | None | — | See validation section | — |
| 021 - Submission Intake and Asset Creation - Set Attachment Upload Status | Live | v2.0 | v2.0 | MATCH | N/A (non-email) | WARNING | Format score 4/8 (V2 partial) — logic matches Airtable | — | Not separately exercised this audit | — |
| 022 - Submission Intake - Sync Child Upload Writeback from Submission Asset | Live | v2.1 | v2.1 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 023 - Submission Intake and Asset Creation - Assign Enrollment to Submission | Live | v3.1 | v3.1 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 030 - Weekly Summary and Goal Logic - Copy Enrollment Grade Band to Weekly Summary | Live | v3.0 | v3.0 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 031 - Weekly Summary and Goal Logic - Find or Create Weekly Athlete Summary from Submission | Live | v4.1 | v4.1 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 032 - Weekly Summary and Goal Logic - Link Challenge Goal Record to Weekly Athlete Summary | Live | v3.4 | v3.4 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 033 - Weekly Summary and Goal Logic - Assign Homework to Weekly Athlete Summary | Live | v4.4 | v4.4 | MATCH | N/A (non-email) | PASS | None | — | See validation section | — |
| 034 - Weekly Summary and Goal Logic - Set Previous Week Helper Values | Live | v3.4 | v3.4 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 035 - Weekly Summary and Goal Logic - Create Weekly Threshold XP Events | Live | v1.3 | v1.3 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 041 - Levels and Progression - Mark Enrollment for Level Recalculation | Live | v5.1 | v5.1 | MATCH | N/A (non-email) | PASS | None | — | See validation section | — |
| 042 - Levels and Progression - Assign Current and Next Level | Live | v4.1.2 | v4.1.2 | MATCH | N/A (non-email) | WARNING | Format score 3/8 (legacy/nonstandard) — logic matches Airtable | — | Not separately exercised this audit | Optional future V2 structure rewrite (logic OK) |
| 053 - Achievements and Milestones - Streak Occurrences - Rebuild and Upsert From Submissions | Live | v5.5 | v5.5 | MATCH | N/A (non-email) | WARNING | Format score 4/8 (V2 partial) — logic matches Airtable | — | Not separately exercised this audit | — |
| 054 - Achievements and Milestones, Streak Occurrences - Create or Repair Streak XP Event | Live | v5.8 | v5.8 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 055 - Achievements and Milestones - Recalculate Current Shooting Streak from Submission | Live | v3.2 | v3.2 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 056 - Achievements and Milestones - Refresh Current Shooting Streaks Daily | Live | v1.2 | v1.2 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 057 - Achievements and Milestones - Calculate Perfect Week Eligibility | Live | v1.7 | v1.7 | MATCH | N/A (non-email) | WARNING | Format score 1/8 (legacy/nonstandard) — logic matches Airtable | — | Not separately exercised this audit | Optional future V2 structure rewrite (logic OK) |
| 058 - Achievements and Milestones - Create Perfect Week Unlock | Live | v1.3 | v1.3 | MATCH | N/A (non-email) | WARNING | Format score 1/8 (legacy/nonstandard) — logic matches Airtable | — | Not separately exercised this audit | Optional future V2 structure rewrite (logic OK) |
| 059 - Achievements and Milestones - Create XP Event from Achievement Unlock | Live | v3.6 | v3.6 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 064 - Homework Review and XP - Assign Base Homework XP | Live | v12.2 | v12.2 | MATCH | N/A (non-email) | WARNING | Version header format nonstandard (`2026-08-12 v12.2`); extract as v12.2; Format score 5/8 (V2 partial) — logic matches Airtable | — | Not separately exercised this audit | Optional: normalize Version header to `Version: v12.2` |
| 065 - Homework Review and XP - Create or Update Homework XP Event | Live | v10.2 | v10.2 | MATCH | N/A (non-email) | PASS | None | — | See validation section | — |
| 066 - Achievements and Milestones - Create Shot Milestone Unlocks | Live | v3.8 | v3.8 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 067 - Homework - Link Reflection Quiz to Homework Completion | Live | v3.5 | v3.5 | MATCH | N/A (non-email) | PASS | None | — | See validation section | — |
| 070a - Email, Notifications, and External Handoffs - Send Homework Asset Payload to Make | Live | v4.6 | v4.6 | MATCH | Asset upload Make/Lambda (not parent email) — Make webhook present (upload plane) | PASS — FIXED | Make webhook for asset upload (not parent email) — allowed upload plane; Repo had UTF-8 BOM vs Airtable paste; BOM removed | Stripped UTF-8 BOM so repo matches Airtable Code | See validation section | — |
| 070b - Email, Notifications, and External Handoffs - Send Video Asset Payload to Make | Live | v4.6 | v4.6 | MATCH | Asset upload Make/Lambda (not parent email) — Make webhook present (upload plane) | PASS — FIXED | Make webhook for asset upload (not parent email) — allowed upload plane; Repo had UTF-8 BOM vs Airtable paste; BOM removed | Stripped UTF-8 BOM so repo matches Airtable Code | See validation section | — |
| 070c-email-notifications-and-external-handoffs-verify-async-video-asset-upload.js | Live | v1.1 | v1.1 | MATCH | Asset upload Make/Lambda (not parent email) | WARNING | Automations Name is filename-style (includes .js) | — | See validation section | Optional: rename Automations Name to human title |
| 071 - Email, Notifications, and External Handoffs - Send Homework Feedback Email Webhook | Live | v4.1 | v4.1 | MATCH | Parent email: Queue create → 079 → Hub → Resend | WARNING | Name still says Webhook; Code is Hub queue create | — | See validation section | Optional: rename Automations Name to drop Webhook wording |
| 072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package | Live | v4.2 | v4.2 | MATCH | Package build only (not send; arms Ready fields for 074) | PASS | None | — | See validation section | — |
| 073 - Email, Notifications, and External Handoffs - Send Video Feedback Parent Email Webhook | Live | v4.2 | v4.2 | MATCH | Parent email: Queue create → 079 → Hub → Resend | WARNING | Name still says Webhook; Code is Hub queue create | — | See validation section | Optional: rename Automations Name to drop Webhook wording |
| 074 - Email, Notifications, and External Handoffs - Create Weekly Summary Hub Handoff | Live | v3.1 | v3.1 | MATCH | Parent email: Queue create → 079 → Hub → Resend | PASS | None | — | See validation section | — |
| 076 - Daily Submission Communications Hub Handoff | Live | v8.7 | v8.7 | MATCH | Parent email: Queue create → 079 → Hub → Resend | PASS | None | — | See validation section | — |
| 078 - Email, Notifications, and External Handoffs - Mark Homework Parent Feedback Ready | Live | — | — (no script) | N/A — no script body | N/A (native Update Record; not email send) | PASS | Code column documents intentional non-script Update Record automation | Documented as intentional non-script in index + audit | Not separately exercised this audit | — |
| 078A - Enrollment - Create WELCOME Email Handoff | Live | v1.3 | v1.3 | MATCH | Parent email: Queue create → 079 → Hub → Resend | PASS — FIXED | Was missing from repo; restored from Airtable Code | Added `078A-…-welcome-email-handoff.js` from Airtable Code | See validation section | — |
| 079 - Send to Communications Hub - NEW | Live | v2.5 | v2.5 | MATCH | Parent email: 079 Hub dispatcher → Resend | PASS | None | — | See validation section | — |
| 101 - Zoom / Attendance XP - Award Meeting XP | Live | v6.6 | v6.6 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 113 - Video Review and XP - Assign Base Video XP by Grade Band | Live | v6.4 | v6.4 | MATCH | N/A (non-email) | WARNING | Format score 4/8 (V2 partial) — logic matches Airtable | — | Not separately exercised this audit | — |
| 114 - Video Review and XP - Create or Update Video XP Event | Live | v6.1 | v6.1 | MATCH | N/A (non-email; docblock denies queue create) | PASS | None | — | Not separately exercised this audit | — |
| 116 - Submission Assets - Apply Asset Reuse Decision Consequences | Live | v1.0.1 | v1.0.1 | MATCH | N/A (non-email) | PASS | None | — | Not separately exercised this audit | — |
| 117 - Zoom Recording Credit - Orchestrator | Off | v2.1 | v2.1 | MATCH | Parent email: Queue create → 079 → Hub → Resend | REQUIRES MIKE CONFIRMATION | Automations Name says Orchestrator but Code is Hub recording-approval handoff; Status=Off; Docblock bans 117f in runtime payload (mention only — OK) | Docs updated (Off + Name mismatch); Airtable Name not changed | See validation section | Rename Automations Name? Turn Live when Zoom approval email should run? |
| 118 - Email - Schedule Weekly Summary Email Build | Live | v2.0 | v2.0 | MATCH | Schedule arm only (not send) | PASS | None | — | See validation section | — |
| 119 - Email - Schedule Weekly Summary Email Send | Live | v1.7 | v1.7 | MATCH | Schedule arm only (not send) | PASS | None | — | See validation section | — |

## Functional findings (cross-cutting)

### Parent email architecture

- **Pass:** `071`, `073`, `074`, `076`, `078A`, `079`, `117` (code) use Hub queue / Hub dispatcher. No Make webhook / Gmail / Resend-direct send in those scripts.
- **Pass (non-email Make):** `070a` / `070b` POST to Make upload webhook via `remoteFetchAsync` — asset upload plane only, not parent email.
- **Pass:** `070c` verifies async upload writeback; no parent-email send.
- **Pass:** `072` / `118` / `119` build or arm only; do not fetch Make/Hub.
- **Pass:** Retired Make daily send **077** is not among the 49 records.
- **Pass:** Historical Welcome builder **075** is not among the 49; live Welcome producer is **078A**.

### Idempotency / ownership (spot-check from Code)

- Email queue creators use deterministic Handoff Keys (`WELCOME|…`, `DAILY_SUBMISSION|…`, `VIDEO_FEEDBACK|…`, `HOMEWORK_FEEDBACK|…`, `WEEKLY_ATHLETE_SUMMARY|…`, `ZOOM_RECORDING_APPROVAL|…`).
- `079` validates key suffix == Source Record ID and never creates duplicate queue rows.
- XP scripts in the set retain Source Key / exact-event patterns in Code (010, 035, 054, 059, 065, 101, 114, etc.) with EXACT_BODY repo match.

### Format / standard

- **41 / 49** score as V2 standard structure.
- **WARNING (structure only):** `021`, `053`, `064`, `113` (partial); `042`, `057`, `058` (legacy structure). Bodies still match Airtable Code — no logic drift.

### Fixes applied this audit

1. Restored missing repo script **078A** from Airtable `Automation Code`.
2. Removed UTF-8 BOM from repo **070a** / **070b** so paste bodies match Airtable exactly.
3. Updated authority docs: `CURRENT-TRUTH.md`, `AGENTS.md`, `integrations/email-send-plane.md`, `automation-index.md` (078 / 078A / 117 Off + Name note).
4. Did **not** modify Airtable records (no Name/Status/Code writes).

## Remaining concerns

1. **117 Name vs Code vs Status** — needs Mike confirmation (rename? Live?).
2. **078** — confirm intentional non-script Update Record (likely yes given Code text).
3. Cosmetic Name cleanups: `071`/`073` still say Webhook; `070c` Name is filename-like.
4. Optional V2 structure rewrites for legacy-format scripts (`042`, `057`, `058`, …) — not required for correctness while Code matches.
5. Repo still contains historical **075** Welcome builder — not in the 49; keep as archive, do not treat as live.

## Validation

| Check | Result |
|-------|--------|
| Email Hub contracts (`071/073/074/079/117`, canonical 072/076, handoff-ownership, 076 offline) | **PASS** (28+ tests) |
| PHA / homework contracts | **PASS** |
| Script header contract | **PASS** (included in suite) |
| Parent-email Make/Gmail/Resend scan on **current 49** script bodies | **0 violations** |
| Repo archive scripts still containing Make `remoteFetchAsync` | **075**, **077** only (not in the 49; historical) |
| Hardcoded secret scan (`sk_live` / bare Bearer tokens) on automation scripts | **0 findings** |
| `078A` syntax (`node --check`) | **PASS** |
| `web` lint | Ran in session — see terminal; non-blocking for Airtable audit |

Commands:

```powershell
node --test tests/email/automation-071-073-source-safety.test.js tests/email/automation-072-076-canonical-reporting.test.js tests/email/automation-074-117-hub-handoff.test.js tests/email/automation-079-offline.test.mjs tests/was-email-contracts/handoff-ownership.test.js tests/email/automation-076-offline.test.mjs
python tools/airtable/_audit_49_scan_email_secrets.py
```

## Evidence paths

- Scratch dumps: `docs/audits/_scratch-2026-08-20-automations/`
- Compare tooling: `tools/airtable/_audit_49_deep.py`
- Report generator: `tools/airtable/_audit_49_write_report.py`

