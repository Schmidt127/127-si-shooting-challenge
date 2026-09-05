# Transactional purge — Phase 1 dry-run **v2** (2026-09-05)

**Status:** AWAITING Mike approval — **no deletions performed**  
**Base:** Production `appn84sqPw03zEbTT`  
**Revision:** **v2** (Countries/State preserve locked; disposable VERIFY/PELC Zoom Meetings added)  
**origin/master SHA:** `57831fe7892755a471d0f1934dbe1f52b289aaff`  
**Inventory/backup stamp:** `20260905_211033`  
**Approval gate (exact reply required):** `APPROVE TRANSACTIONAL PURGE`

---

## Final proposed deletion count

# **200 records**

| Segment | Count |
|---------|------:|
| Prior athlete/workflow transactional (v1) | 193 |
| Disposable Zoom Meetings (selected) | +7 |
| **Total** | **200** |

Backup validation: **PASS** — export total **200** = live planned-delete total **200**.

---

## Countries / State

| Table | Count | Classification |
|-------|------:|----------------|
| Countries | 194 | **PRESERVE REUSABLE CONTENT / CONFIGURATION** |
| State | 50 | **PRESERVE REUSABLE CONTENT / CONFIGURATION** |

Not in the deletion manifest. Geo reference data for forms/config.

---

## Zoom Meetings — proof table (all 9)

### Disposable → **added to purge** (7)

| RID | Meeting Name | Proof |
|-----|--------------|-------|
| `recGJEtN9oWGTqcFZ` | SC-147 VERIFY Live Zoom | VERIFY + SC-147 tokens; no brief/full/agenda/cover; linked to test enrollment Attendee1; automation live-proof fixture |
| `recLZmVTQveRkRpC4` | VERIFY\|PELC\|paths\|…\|ZOOM | VERIFY + PELC pipe harness; no curriculum body; 0 attendees |
| `recLf72BcLyvbJQZR` | PELC\|zoom\|…\|ZOOM | PELC pipe harness (sibling of VERIFY\|PELC); no VERIFY token but same disposable class; no curriculum body |
| `recMJE0t5aR6ia8vl` | VERIFY\|2026-09-02T0040\|ZOOM-LIVE-101 | VERIFY pipe harness duplicate set; no curriculum; start 2026-05-15 (proof date) |
| `recjEXvSb6yT7EMQW` | VERIFY\|2026-09-02T0040\|ZOOM-LIVE-101 | Same harness name family; empty body |
| `recqLd4T7Wh6aOUj1` | VERIFY\|2026-09-02T0040\|ZOOM-LIVE-101 | Same harness name family; empty body |
| `recrKQTHboRp5vhhE` | VERIFY\|2026-09-02T0040\|ZOOM-LIVE-101 | Same harness name family; empty body |

**Note:** Six names contain `VERIFY`; the seventh (`PELC|zoom|…`) is the Phase-1 seventh test fixture — PELC harness without the VERIFY token, classified disposable by the same criteria (pipe harness, no catalog content).

### Preserve reusable (2)

| RID | Meeting Name | Why preserved |
|-----|--------------|---------------|
| `recMFP2x5LDqea9ax` | **Introduction** | Seasonal catalog title; host Mike Schmidt; brief + full description + agenda + cover media; display `Introduction #1 \| Week 1`; created 2026-08-05 as program content (not VERIFY/PELC) |
| `recb9EjQIJVzaRpZa` | **Motivation** | Seasonal catalog title; host Mike Schmidt; brief + full + agenda + cover; display `Motivation #2 \| Week 7`; Scheduled for 2027-06-14; created 2026-08-05 as program content |

Ambiguous Zoom Meetings: **none**.

Evidence: `11-zoom-meeting-classification-20260905_211033.json` · selected export `tables/Zoom_Meetings_DISPOSABLE_SELECTED.json`

---

## Full deletion breakdown (200)

| Table | Mode | Delete |
|-------|------|-------:|
| Email Handoff Queue | PURGE ALL | 24 |
| Award Recipients | PURGE ALL | 1 |
| XP Events | PURGE ALL | 83 |
| Athlete Achievement Unlocks | PURGE ALL | 12 |
| Streak Occurrences | PURGE ALL | 35 |
| Video Feedback | PURGE ALL | 7 |
| Zoom Attendance | PURGE ALL | 3 |
| Zoom Meetings | PURGE SELECTED (7 RIDs above) | 7 |
| Homework Completions | PURGE ALL | 2 |
| Submission Assets | PURGE ALL | 5 |
| Submissions | PURGE ALL | 6 |
| Weekly Athlete Summary | PURGE ALL | 8 |
| Enrollments | PURGE ALL | 4 |
| Athletes | PURGE ALL | 3 |
| **Total** | | **200** |

Empty transactional (no-op): Payment Transactions, Final Reflection Quiz Submissions.

---

## Child → parent deletion order

1. Email Handoff Queue  
2. Award Recipients  
3. XP Events  
4. Athlete Achievement Unlocks  
5. Streak Occurrences  
6. Video Feedback  
7. Zoom Attendance  
8. **Zoom Meetings (7 disposable IDs only)**  
9. Homework Completions  
10. Submission Assets  
11. Submissions  
12. Weekly Athlete Summary  
13. Enrollments  
14. Athletes  

---

## Protected — confirmed NOT in manifest

| Check | Live count | In delete? |
|-------|----------:|:----------:|
| Program Homework Assignments | 18 | No |
| Weeks | 11 | No |
| Homework Library | 121 | No |
| Countries | 194 | No |
| State | 50 | No |
| Config / rules / levels / milestones / achievements / awards / tutorials / automations / schools | (unchanged) | No |
| Zoom Meetings Introduction + Motivation | 2 | No |

---

## Backup (v2 revalidated)

Folder: `docs/testing/evidence/transactional-purge-2026-09-05/`

| Artifact | File |
|----------|------|
| Gate | `00-PHASE1-GATE.json` |
| Full snapshot | `02-full-delete-snapshot-20260905_211033.json` |
| Backup index | `04-backup-index-20260905_211033.json` |
| Deletion order | `05-deletion-order-manifest-20260905_211033.json` |
| Zoom classification | `11-zoom-meeting-classification-20260905_211033.json` |
| Summary | `12-revised-manifest-summary-20260905_211033.json` |
| Per-table exports | `tables/*.json` + `tables/Zoom_Meetings_DISPOSABLE_SELECTED.*` |

`all_exports_match_live: true` · `export_record_total: 200`

---

## Expected post-purge (selected)

- Athlete transactional tables → **0**  
- Zoom Meetings → **2** (Introduction, Motivation)  
- Countries **194**, State **50**, PHA **18**, Weeks **11**, Homework Library **121** unchanged  

---

## STOP — approval gate

Phase 1 **v2** complete. **No deletion until Mike replies exactly:**

```text
APPROVE TRANSACTIONAL PURGE
```

That authorizes irreversible deletion of exactly **200** records in this revised manifest (including the 7 disposable Zoom Meetings; excluding Countries, State, Introduction, Motivation, PHA, Weeks, curriculum, rules, and configuration).
