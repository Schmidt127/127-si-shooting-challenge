# Airtable view / Interface specification

**Status:** Designed (not installed)  
**MVP:** See [MVP-PRODUCTION-RELEASE.md](./MVP-PRODUCTION-RELEASE.md) — **existing fields only**  
**Base:** PROD `appn84sqPw03zEbTT`  
**Rule:** Do not create production fields for the first usable release.

Field names below are verified against PROD schema snapshot `prod-foundation-reset-20260723-post-ts` (2026-07-23) and WAS email architecture (2026-07-24).

## Real PROD field names used (Weekly Athlete Summary)

| Field | Type (PROD) | MVP views |
|-------|-------------|-----------|
| `Build Weekly Email Now?` | checkbox | Yes |
| `Weekly Email Ready?` | checkbox | Yes |
| `Send to Make?` | checkbox | Yes |
| `Weekly Email Sent?` | checkbox | Yes |
| `Weekly Email Subject` | text | Yes |
| `Weekly Email Recipients` | text | Yes |
| `Weekly Email HTML` | long text | Yes |
| `Weekly Email Text` | long text | Optional |
| `Weekly Email Payload JSON` | long text | Optional |
| `Weekly Email Error` | text | Yes |
| `Weekly Email Week Label` | text | Optional |
| `sendMode` | select/text | Yes |
| `Make Send Status` | select/text | Yes |
| `Weekly Summary Sent At` | date/time | Yes (preferred writeback timestamp) |
| `Weekly Email Sent At` | date/time | Yes (also present in PROD) |
| `Enrollment` | link | Yes |
| `Week` | link | Yes |

## Direct-create vs formula-required

| View goal | Can create directly with existing fields? | Notes |
|-----------|-------------------------------------------|-------|
| Weekly Email Health | **Yes** | OR of build/ready/send/sent checkboxes |
| Ready but blank subject/recipients/HTML | **Yes** | AND Ready + OR blanks |
| Send to Make? while not Ready | **Yes** | AND Send + NOT Ready |
| Sent? XOR Make Send Status / still armed | **Yes** | OR of mismatch clauses |
| XP Events grouped by Source Key | **Yes** | Grouping, not a formula |
| Single “any conflict” mega-filter | Optional formula later | Deferred — use multiple views |
| Current Level = Next Level | Optional formula later | Deferred |
| Cross-table retry queue | Needs Findings table or export | Deferred |

## MVP views (create these first)

Exact filters/sorts/fields: **[MVP-PRODUCTION-RELEASE.md](./MVP-PRODUCTION-RELEASE.md)**.

1. Weekly Email Health  
2. P0 — Ready package incomplete  
3. P0 — Send armed not Ready  
4. P0 — Sent / Make writeback mismatch  
5. (Optional) XP Events by Source Key  

## Future views (after MVP; still prefer existing fields)

| View | Table | Filter approach | New field? |
|------|-------|-----------------|------------|
| Missing Dependencies — Submissions | Submissions | `OR({Enrollment}="", {Activity Date}="", {Week}="")` | No |
| Stale Build flags | WAS | `{Build Weekly Email Now?}=1` + sort oldest modified | No |
| Level recalc stuck | Enrollments | `{Recalculate Level?}=1` (if field present) | No |
| Current Challenge-Year | Enrollments | `{Challenge Year}="2026-2027"` AND `{Active?}` | No |
| Recently Resolved | — | Needs findings log | Deferred table |

## Optional fields (explicitly deferred)

Do **not** create for MVP:

| Field | Table | Why deferred |
|-------|-------|--------------|
| `RCC Email Conflict?` | WAS | Multiple simple views replace it |
| `RCC Level Conflict?` | Enrollments | Not needed for email MVP |
| `RCC Findings` table | n/a | Export JSON is enough for first run |

## Interface

Name: **Reliability Command Center**  
Status: **Designed** only. Not required for MVP. Mark **Installed** only after Mike creates it in Airtable.

## Season Launch views (do not duplicate here)

Season-specific Config / Week / Enrollment / cross-season views live in
[`docs/challenge-year/SEASON-LAUNCH-DASHBOARD-VIEWS.md`](../challenge-year/SEASON-LAUNCH-DASHBOARD-VIEWS.md).
RCC owns weekly-email / XP / achievement / level integrity views. Season Launch owns year-boundary and activation checklist views.
Season findings integrate via `lib/challenge-year/season-findings.js` → RCC `buildIssue`.
