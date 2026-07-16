# C-009 / C-010 / C-011 — Migration Safety & Review Notes (PR #35)

**Date:** 2026-07-16  
**Branch:** `cursor/remaining-airtable-dev-packages-2565`  
**PROD:** Untouched — DEV paste only after Mike approval  

---

## 1. Defects found and fixed (this pass)

| Defect | Fix |
|--------|-----|
| Docs used malformed eventId `WEEKLY_EMAIL\|{enrollmentId}\|{}weekId}` | Corrected to `WEEKLY_EMAIL\|{enrollmentId}\|{weekId}` |
| 072 payload lacked `eventId` | **072** now embeds `eventId` in payload JSON |
| 118/119 used naive `now - 24h` for week end | Replaced with **`priorSaturdayKeyDenver()`** (Sunday + Mon–Sat rerun safe; Sat → previous Sat) |
| PPE “missing = enabled” risk undocumented | Documented create→backfill→paste order below |
| HW2 ambiguity for 067 | Confirmed **HW17 = HW1 only** (single curriculum slot); tests assert not HW2 |

---

## 2. Safe defaults

| Topic | Default | Rationale |
|-------|---------|-----------|
| PPE field **missing** | Treat as **enabled** (progress runs) | Avoids blocking entire DEV/PROD before field exists |
| PPE field **present + unchecked** | Progress **skipped** | Withdrawn / progress-off athletes |
| PPE field **present + checked** | Progress runs | Normal + Schmidt sandbox |
| 072 Active? missing | Treat as **active** (comms allowed) | Transition; field already exists in DEV |
| 072 Active? false / Schmidt ID | **Skip** build; clear Build Now? | Comms + test exclusion |
| 118/119 `dryRun` | **true** | No writes until operator sets false |
| 118 `sendMode` | Force **Test** on arm; refuse Live when !dryRun | No live parent sends from this package |
| 067 Send to Make Trigger | **false** | 070a arms later; never auto-send from quiz intake |
| Week target | Prior completed **Saturday** America/Denver | Matches Sun 5 AM / 10 AM schedule |

---

## 3. Exact dedupe keys

| Domain | Key |
|--------|-----|
| HW17 Homework Completion | `{enrollmentId}\|{weekId}\|{homeworkCurriculumId}` |
| Submission Asset | `Source Attachment ID` = Airtable attachment file id |
| Weekly email (Make) | `WEEKLY_EMAIL\|{enrollmentId}\|{weekId}` |
| Submission XP (010) | `SUBMISSION_XP\|{submissionId}` |
| Homework XP (065) | `HOMEWORK_XP\|{homeworkCompletionId}` |

---

## 4. 067 slot coverage (final)

| Rule | Decision |
|------|----------|
| HW17 Fillout quiz | **HW1 only** (`Asset Purpose` = `Homework 1`, `Asset Slot` / `Item Slot` = `HW1`) |
| HW2 | **Not used** for HW17 — HW2 is the second daily homework slot on Submissions, not the reflection quiz |
| Multi-file | Multiple PDFs → multiple assets, all HW1 labels `HW1-1`, `HW1-2`, … |
| Parent Submission | Required; linked via `Homework Name 1` = HW17 curriculum |

---

## 5. PPE missing-field behavior (final)

**Runtime:** `field missing → enabled` (do not skip).

**Migration risk:** Airtable new checkboxes default **unchecked** on existing rows. If progress-guard scripts are pasted **before** backfill, every enrollment looks PPE=false → mass XP skip.

### Required field-creation and rollout order

1. **Create** Enrollments.`Progress Processing Enabled?` (checkbox).  
2. **Backfill** all non-withdrawn enrollments (including Schmidt) to **checked/true**.  
3. Set **false** only for intentionally withdrawn athletes.  
4. **Then** paste 010/031/053/065 PPE guards.  
5. Paste **072 v3.8** anytime (uses existing `Active?` only).  
6. Smoke: Schmidt Active?=false + PPE=true → XP runs, 072 skips.

---

## 6. Migration / paste order (DEV)

| Step | Action | Gate |
|------|--------|------|
| A | Create `Quiz Result PDF` on quiz table + Fillout map | Mike/OMNI |
| B | Create PPE + backfill true | Mike/OMNI |
| C | Paste **067 v2.0** (OFF → ON after fixture) | Mike auth |
| D | Paste **072 v3.8** | Mike auth |
| E | Paste 010/031/053/065 PPE guards | After B |
| F | Paste **118/119** — leave schedule **OFF**; `dryRun=true` | Mike auth |
| G | Create C-019 Testing views | Mike UI |
| H | Attest 059 trigger / 112 OFF / 042 gate | Mike UI |
| I | Optional: one Test-mode 118→072→119→074 with DEV webhook | Mike auth |

**Do not enable Sunday schedules until dryRun false + Test webhook proven.**

---

## 7. Rollback order

1. Disable 118/119 schedules (if ever enabled).  
2. Re-paste prior **072** (v3.7) if email skips are wrong.  
3. Re-paste prior **067** (v1.0) if asset creates misbehave.  
4. Turn OFF newly pasted PPE guards on 010/031/053/065 (or re-paste prior).  
5. Leave PPE / Quiz Result PDF fields in place (do not delete without Mike).  
6. Clear stuck `Build Weekly Email Now?` / `Send to Make?` on test WAS rows manually.

---

## 8. Unresolved live-only checks

| Check | Status |
|-------|--------|
| Live automation ON/OFF versions | live-blocked (no PAT) |
| Live 059 trigger filters | live-blocked |
| Make writeback of Sent? / eventId filter | live-blocked |
| DEV Make weekly webhook URL | live-blocked |
| Fillout → `Quiz Result PDF` wiring | requires Mike |
| C-019 view filters | UI only |

---

## 9. 072 vs 118 compatibility

| 118 writes | 072 behavior |
|------------|--------------|
| `Build Weekly Email Now?` = true | Trigger fires |
| `sendMode` = Test | 072 reads sendMode for package |
| Skips Schmidt / inactive at arm time | 072 also skips Schmidt / Active?=false (defense in depth) |
| Skips Sent? | 072 skips already Sent? (no clear) |
| Does not call Make | 072 does not call Make |

Valid Active?=true enrollments are **not** skipped by 072.
