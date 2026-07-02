# June 29 Award Recipients Snapshot — Cross-Match Report

_Source: `Award Recipients-Grid view from June 29 FINAL.csv` (read-only audit)._

## Verdict

**The snapshot looks accurate and internally consistent**, with only **two real duplicate errors** and **one junk row**. No duplicate Conquered Goal rows. No unique-key vs field mismatches on real data rows.

| Check | Result |
| --- | --- |
| Total rows | 125 |
| Sent | 106 |
| Pending | 18 ($285.00) |
| Junk/blank rows | 1 (CSV line 125) |
| Duplicate unique keys | **2 groups** (2 extra rows) |
| Duplicate enrollment + award + week | **2 groups** (same as above) |
| Multiple Conquered Goal per athlete | **0** |
| Sent without Gift Card Sent Date | **0** |

---

## Issues to fix in Airtable (were already wrong on June 29)

### 1. Exact duplicate rows (cancel one of each pair)

| Athlete | Award | Week | CSV lines | Notes |
| --- | --- | --- | --- | --- |
| **Blake Hubers** | Homework - Submitted & Satisfactory | Week 8 | 73, 74 | Identical unique key, date, amount |
| **Riley Geraghty** | Homework - Submitted & Satisfactory | Week 8 | 75, 76 | Identical unique key, date, amount |

These are true data duplicates — not “won the same award in different weeks.” Cancel one row per athlete; keep whichever matches the card you sent (only one $10 card should have gone out).

### 2. Junk row (delete or ignore)

**CSV line 125** — empty enrollment, `Week = OVERALL`, blank award fields. Likely a stray formula/view artifact. Safe to delete if it still exists in Airtable.

---

## Riley Geraghty in this snapshot (9 rows)

| Week | Award | Status |
| --- | --- | --- |
| 2 | Homework - Submitted & Satisfactory | Sent |
| 3 | Level Leaders | Sent |
| 5 | Zoom - Attendance | Sent |
| 7 | Shots - Conquered Goal | Sent (6/9/2026) |
| 7 | Homework - Submitted & Satisfactory | Sent |
| 8 | Homework - Submitted & Satisfactory | Sent **×2 duplicate** |
| 8 | Video Submission - Submitted | Sent |
| 9 | Zoom - Attendance | Pending |

**Not in this snapshot** (added after June 29):

- Level Leader wins for weeks 2, 7, 8 (snapshot only has Level Leaders **Week 3**)
- Grade Band Third Place (weeks 5 & 9)
- Entire-challenge cart awards (Grade Band Champion, Daily Shot Submission)
- Riley’s Conquered Goal in live data is **Week 8**; snapshot shows **Week 7** — week link may have been corrected later

So the “same award many times” problem in Riley’s **current** email mostly came from **post–June 29 data entry** (extra Level Leader rows + homework duplicate), not from this snapshot being broadly wrong.

---

## What looks correct (no action)

- **Conquered Goal:** 11 athletes, one row each, all `Sent` except pending pipeline not applicable
- **Sibling / same-email families:** Hubers, Dahls, Heidemas, etc. — separate enrollments, expected
- **Random Incentive twice:** e.g. Lolo Judisch Week 7 and Week 8 — different weeks, valid
- **Grade Band Award - Overall Achievement** marked `Weekly` scope — matches how those were issued mid-season
- **Week 9 Zoom block:** 18 `Pending` rows ($285) — snapshot cutoff before those cards were sent

---

## Recommended use of this snapshot

Treat **106 `Sent` rows** as your fulfillment truth for everything issued through June 29. When comparing to live Airtable:

1. **New rows after 6/29** = expected (Week 9+ awards, end-of-challenge cart, etc.)
2. **Fix first:** Blake/Riley Homework Week 8 duplicates (in snapshot and likely still in base)
3. **Then diff:** anything that changed status on rows that exist in both

---

## Next step

When ready, I can diff this snapshot against live Airtable and produce: added / removed / status-changed / field-changed rows since June 29.
