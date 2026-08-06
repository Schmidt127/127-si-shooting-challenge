# Program Homework Assignments — Operator Guide (Mike)

| Field | Value |
|-------|--------|
| Date | 2026-08-05 |
| PROD table | `Program Homework Assignments` (`tblhA3maf7xOa8EUS`) |
| Audience | Mike (season admin) |

## Mental model (keep this)

| Table | Role |
|-------|------|
| **FBC Curriculum - SYNC** | Reusable **library** of homework titles/content. Do **not** use library Week links as the season schedule of record going forward. |
| **Program Homework Assignments** | **Schedule** for this season: which library item is HW1/HW2 for which Program Instance + Week + Grade Band. |
| **Weekly Athlete Summary → Homework** | Assigned library list for that athlete-week (written by Automation **033**). |
| **Homework Completions** | One completion per Enrollment + Week + Homework + Slot (SC-016). Links library + optional PHA. |

```text
Library (reusable)
   ↑ linked by
Program Homework Assignments (season schedule)
   ↓ Automation 033
WAS.Homework (assigned list)
   ↓ athlete submits
Homework Completions (+ PHA link via 020)
```

## How to assign homework for a week

1. Open **Program Homework Assignments**.
2. Create **two rows** (HW1 and HW2) — or one if only one assignment that week.
3. Fill: **Homework Assignment** (library), **Program Instance**, **Week**, **Grade Band**, **Homework Slot**, check **Active?**.
4. Check **Operator Status** = `Active — will assign…`. If `Incomplete`, fill missing links.
5. Optional: **Operator Notes** for why this library was chosen.
6. When WAS records are created for that week, Automation **033** (after paste of v3.3) fills `WAS.Homework` from active PHA rows. Until paste, you can still assign manually or run `tools/testing/live_test_033_pha_assign.mjs --was <id> --write`.

## Rules that prevent pain

- **One Active row per** Program Instance + Week + Grade Band + Slot.
- Reuse the **same library** across weeks by creating **new PHA rows** — do not overwrite last year’s Week on the library.
- Uncheck **Active?** to retire; do not delete rows that already have Completions Count > 0 unless you intend cleanup.
- **Schedule Key** must be unique among Active rows (fingerprint includes the library id).

## What automations do

| Automation | Reads PHA? | Writes |
|------------|------------|--------|
| **033** | Yes (prefer) | `WAS.Homework` library links |
| **020** | Yes | `HC.Program Homework Assignment` when resolvable; HC create/link |
| **064 / 065** | No | Homework XP via HC.Homework library link |
| **057** | No | Perfect Week from WAS.Homework + Completions |

## Seed already in PROD (2026-08-05)

Agent 1 seeded **92** active PHA rows from curriculum Week links × active Grade Bands for Program Instance `rec5mEM0YPqPqq0hZ` (2026-2027). Perfect Week CASE-01 rows remain and are aligned.

Re-seed tool: `node tools/testing/seed_pha_from_curriculum.mjs [--all-bands] [--dry-run]`

## Paste still required

| Script | Repo version | Why |
|--------|--------------|-----|
| 033 | **v3.3** | PHA-first assign + unloadQuerySafe + matchSourceOut |
| 020 | **v3.2.0** | Enrollment+Week+Homework+Slot identity (SC-016) + PHA link |

Paste body from GitHub (skip GitHub header). Then live-test one Schmidt submission and one empty WAS assign.
