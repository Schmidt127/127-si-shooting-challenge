# How to fix your Award Recipients table

_Compared your **June 29 snapshot** (what you actually sent) to **live Airtable today**. Generated 2026-07-02 17:32._

## The big picture (no jargon)

Your table is mostly fine. The main problem is **not missing gift cards** — it is that when award names were cleaned up, many old rows had the **Award** field pointed at the **wrong award type**.

Each row is still the same athlete, same week, same date. You mostly need to **change which award is linked** on that row — **do not delete** rows for cards you already sent.

| | Count |
| --- | ---: |
| Rows in June 29 snapshot | 124 |
| Rows live now | 192 |
| Rows with wrong award linked (clear fix) | **0** |
| Rows needing you to pick the right match | **0** |
| New rows since snapshot (expected) | **70** |
| Duplicate athlete+award+week still in live | **0** |

---

## Step-by-step: what to do in Airtable

### 1. Duplicates — you already fixed these

No duplicate athlete + award + week groups found. Good.

### 2. Fix wrong award links (~99 rows) — **most important**

Open each row below. Change only the **Award** linked field to the **Fix award link to** value. Leave athlete, week, date, and **Sent** status alone.

**Old name cheat sheet** (June 29 export → pick this in Awards today):

- `Grade Band Award - Overall Achievement` → **Grade Band Achievement Award**
- `Homework - Submitted & Satisfactory` → **Homework Recognition Award**
- `Level Leaders` → **Level Leader Award**
- `Shots - Conquered Goal` → **Conquered Goal Award**
- `Special Award - Random for Incentive` → **Random Drawing Incentive Award**
- `Special Awards - Dedication` → **Dedication Award**
- `Video Submission - Make the Shout out Page` → **Shout-Out Video Award**
- `Video Submission - Submitted` → **Video Submission Recognition Award**
- `Zoom - Attendance` → **Zoom Attendance/Participation Award**
- `Zoom - Random Drawing Runner Up` → **Zoom Drawing — Runner-Up**
- `Zoom - Random Drawing Third Place` → **Zoom Drawing — Third Place**
- `Zoom - Random Drawing Winner` → **Zoom Drawing — Winner**

| Athlete | Week | Date sent | Card you sent | Row says now | Fix award link to | Open row |
| --- | --- | --- | --- | --- | --- | --- |

### 3. Manual review — same athlete + week + date, multiple rows

These are places where **more than one award** was sent the same day, or rows got scrambled. Match each row to what you actually emailed. Change the **Award** link; delete only if you are sure it is a duplicate.

_None._

### 4. New rows since June 29 — usually leave alone

These were added for end-of-season awards, Week 9 cards, Amazon cart, etc. **Do not delete** just because they were not in the Monday export.

**In Amazon Cart** — 70 rows

| Athlete | Award | Week | Amount |
| --- | --- | --- | --- |
| Alec  Helvik | Random Drawing Incentive Award | Post Challenge | $0 |
| Allie Heidema | Grade Band Third Place Award | Post Challenge | $0 |
| Alyna Keyser | Keep Shooting Incentive Award | Post Challenge | $0 |
| Andrew Brady | Random Drawing Incentive Award | Post Challenge | $0 |
| Aspyn Bogart | Thanks for Playing - Every Bit Counts | Post Challenge | $0 |
| Benny Brady | Grade Band Champion Award | Post Challenge | $0 |
| Blake Hubers | Grade Band Third Place Award | Post Challenge | $0 |
| Brayden  Elders | Random Drawing Incentive Award | Post Challenge | $0 |
| Camden Clark | Grade Band Runner-Up Award | Post Challenge | $0 |
| Carson Hubers | Random Drawing Incentive Award | Post Challenge | $0 |
| Cash Wieler | Keep Shooting Incentive Award | Post Challenge | $0 |
| Charlotte Davison | Keep Shooting Incentive Award | Post Challenge | $0 |
| Clara Hardy | Thanks for Playing - Every Bit Counts | Post Challenge | $0 |
| Colbie Schwenk | Random Drawing Incentive Award | Post Challenge | $0 |
| Colton  Dahl | Grade Band Runner-Up Award | Post Challenge | $0 |
| Conley Dahl | Random Drawing Incentive Award | Post Challenge | $0 |
| Connor Judisch | Thanks for Playing - Every Bit Counts | Post Challenge | $0 |
| Daniel Costa | Thanks for Playing - Every Bit Counts | Post Challenge | $0 |
| Dawson Schutter | Random Drawing Incentive Award | Post Challenge | $0 |
| Dayton Fox | Daily Shot Submission Award | Post Challenge | $0 |
| Dayton Fox | Grade Band Champion Award | Post Challenge | $0 |
| Easton Hill | Keep Shooting Incentive Award | Post Challenge | $0 |
| Eli Cowgill | Random Drawing Incentive Award | Post Challenge | $0 |
| Eli Cowgill | Conquered Goal Award | Week 10 | $0 |
| Emmet  Gustafson | Random Drawing Incentive Award | Post Challenge | $0 |
| Hadley Hill | Keep Shooting Incentive Award | Post Challenge | $0 |
| Hartlie  Ehrlich | Keep Shooting Incentive Award | Post Challenge | $0 |
| Jack  Nelson | Random Drawing Incentive Award | Post Challenge | $0 |
| Jackson  Elders | Daily Shot Submission Award | Post Challenge | $0 |
| Jackson  Elders | Grade Band Runner-Up Award | Post Challenge | $0 |
| Jackson  Elders | Conquered Goal Award | Week 10 | $0 |
| Jackson Newcomer | Random Drawing Incentive Award | Post Challenge | $0 |
| Jacob Schwenk | Random Drawing Incentive Award | Post Challenge | $0 |
| Jamesy Helvik | Grade Band Third Place Award | Post Challenge | $0 |
| Jensen Klimkiewicz | Thanks for Playing - Every Bit Counts | Post Challenge | $0 |
| Jolie Helvik | Keep Shooting Incentive Award | Post Challenge | $0 |
| Jordyn Nelson | Random Drawing Incentive Award | Post Challenge | $0 |
| Josalin Helvik | Thanks for Playing - Every Bit Counts | Post Challenge | $0 |
| KayDe VandenBos | Keep Shooting Incentive Award | Post Challenge | $0 |
| Kenady Bogart | Random Drawing Incentive Award | Post Challenge | $0 |
| Kinsley  Heidema | Grade Band Runner-Up Award | Post Challenge | $0 |
| Kinsley Heggen | Keep Shooting Incentive Award | Post Challenge | $0 |
| Koen Kimm | Grade Band Third Place Award | Post Challenge | $0 |
| Leiko Judisch | Thanks for Playing - Every Bit Counts | Post Challenge | $0 |
| Lewis Talbitzer | Thanks for Playing - Every Bit Counts | Post Challenge | $0 |
| Leyton  Bakken | Conquered Goal Award | Week 10 | $0 |
| Liam Kimm | Thanks for Playing - Every Bit Counts | Post Challenge | $0 |
| Lincoln Newcomer | Random Drawing Incentive Award | Post Challenge | $0 |
| Lolo Judisch | Thanks for Playing - Every Bit Counts | Post Challenge | $0 |
| Lyle Kimm | Grade Band Champion Award | Post Challenge | $0 |
| Maizee Mitchell | Random Drawing Incentive Award | Post Challenge | $0 |
| Matthew Brady | Random Drawing Incentive Award | Post Challenge | $0 |
| McKinley Clark | Random Drawing Incentive Award | Post Challenge | $0 |
| Mckinley Hubers | Random Drawing Incentive Award | Post Challenge | $0 |
| Milton Costa | Random Drawing Incentive Award | Post Challenge | $0 |
| Monroe Mailey | Grade Band Third Place Award | Post Challenge | $0 |
| Myla Mailey | Keep Shooting Incentive Award | Post Challenge | $0 |
| Nora Davison | Keep Shooting Incentive Award | Post Challenge | $0 |
| Raya Keyser | Keep Shooting Incentive Award | Post Challenge | $0 |
| Remington (Remi) Hill | Keep Shooting Incentive Award | Post Challenge | $0 |
| … | 10 more | | |

---

## What you do **not** need to fix

- **Award name wording changed** on rows you already fixed in step 2 — that is the whole point of step 2.
- **Scope** showing Weekly on an old row while the catalog says Overall — leave historical weekly rows alone.
- **Goal Met?** on Enrollment disagreeing with Conquered Goal — separate cleanup (see `goal-conquer-reconciliation.md`).

## Suggested order of work

1. Fix the **wrong award link** table (step 2) — work week by week in Airtable.
2. Work through **manual review** (step 3) — mostly Week 5 Zoom batch and Week 8/9 overlap.
3. Leave **new end-of-season rows** (step 4) unless something is obviously wrong.
4. Re-run this script when done to confirm wrong links are down to zero.
