# Awards Catalog & Connections Audit

_Generated 2026-07-02 09:15 — read-only, no Airtable writes._

## Executive summary

- **Awards catalog records:** 31
- **Award Recipient records:** 194
- **Total findings:** 74

### Findings by code

| Code | Count |
| --- | --- |
| recipient_scope_vs_catalog_scope | 46 |
| conquered_award_without_goal_met | 6 |
| goal_met_no_conquered_award_row | 6 |
| goal_met_date_lookup_polluted | 6 |
| award_unclassified_with_recipients | 3 |
| award_gift_card_zero_value | 2 |
| recipient_duplicate_unique_key | 2 |
| recipient_duplicate_enrollment_award_week | 2 |
| award_duplicate_class_bucket | 1 |


### Goal Met summary (active enrollments)

- Active enrollments: **91**
- Computed goal met (shots ≥ target): **14**
- Goal Met? field truthy: **14**
- Goal Met? vs computed mismatch: **0**
- Goal met but no Conquered Goal recipient: **6**
- Conquered Goal recipient but not goal met: **6**
- Goal Met Date polluted by non-Conquered awards: **6**
- Active enrollments missing target goal: **0**

> **Goal Met?** is a formula: `Total Shots Counted >= Target Goal Shots`.
> **Goal Met Date** is a lookup from **all** linked Award Recipients → Date Awarded (not Conquered Goal only).

## Awards catalog inventory

| Award Name | Email Display | Scope | Prize | Prize Type | Active | Challenge Eligible | Recipients | Award ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coach Feedback Improvement Award | Coach Feedback Improvement | Weekly | $10 | Amazon Gift Card | Y | Y | 2 | recAVeLrL82B |
| Conquered Goal Award | Conquered Goal | Overall | $5 | Amazon Gift Card | Y | Y | 14 | recu3bkI7iO6 |
| Daily Shot Submission Award | Daily Shot Submission | Overall | $12 | Amazon Gift Card | Y | Y | 5 | recG0dNYjMl0 |
| Dedication Award | Dedication Award | Both | $12 | Amazon Gift Card | Y | Y | 0 | rec0YtPIwXhG |
| Embrace the Grind Award | Embrace the Grind | Weekly | $5 | Amazon Gift Card | Y | Y | 0 | recGzmRvD8WC |
| Grade Band Achievement Award | Grade Band Weekly Achievement | Weekly | $10 | Amazon Gift Card | Y | Y | 8 | recOVUgn7TxF |
| Grade Band Champion Award | Grade Band Champion | Overall | $20 | Amazon Gift Card | Y | Y | 5 | recpNKoPthKr |
| Grade Band Runner-Up Award | Grade Band Runner-Up | Overall | $15 | Amazon Gift Card | Y | Y | 6 | recXfMUy1kxI |
| Grade Band Third Place Award | Grade Band Third Place | Overall | $10 | Amazon Gift Card | Y | Y | 29 | recYWoZCWnlT |
| Homework Recognition Award | Homework Recognition | Weekly | $5 | Amazon Gift Card | Y | Y | 11 | recDxLwKdsqe |
| Keep Shooting Incentive Award | Keep Shooting Incentive | Overall | $7 | Amazon Gift Card | Y | Y | 15 | recDFovDZn1z |
| Level Leader Award | Level Leader | Weekly | $10 | Amazon Gift Card | Y | Y | 20 | recrf2nNRhID |
| Overall Amazon Gift Card Winner | Amazon Gift Card Winner | Overall | — | Amazon Gift Card | N | N | 0 | recTlSJMa5jb |
| Overall Consistency Award | Consistency Award | Overall | — | Recognition Only | N | N | 0 | recF9PA4Whj4 |
| Overall Homework Champion | Homework Champion | Overall | — | Recognition Only | N | N | 0 | recJupkVnhMM |
| Overall Shot Champion | Shot Champion | Overall | — | Recognition Only | N | N | 0 | recxDL9VYI2N |
| Overall XP Champion | XP Champion | Overall | — | Recognition Only | N | N | 0 | recWlwll4YP5 |
| Overall Zoom Champion | Zoom Champion | Overall | — | Recognition Only | N | N | 0 | recVm928w1Bf |
| Participation Award | Participation Award | Overall | $5 | Amazon Gift Card | Y | Y | 2 | recITxe6rgmD |
| Random Drawing Incentive Award | Random Drawing Incentive | Overall | $7 | Amazon Gift Card | Y | Y | 25 | rec2D0ZkOQcl |
| Shout-Out Video Award | Shout-Out Video | Weekly | $10 | Amazon Gift Card | Y | Y | 33 | rectc72bCu6i |
| Thanks for Playing - Every Bit Counts | Participation Award | Overall | $5 | Amazon Gift Card | Y | Y | 14 | recuf8ucY0uh |
| Video Submission Recognition Award | Video Submission Recognition | Weekly | $10 | Amazon Gift Card | Y | Y | 7 | recKa8vFxoZK |
| Weekly Amazon Gift Card Winner | Weekly Amazon Gift Card Winner | Weekly | — | Amazon Gift Card | N | Y | 0 | recuwfZTUzWq |
| Weekly Consistency Award | Weekly Consistency Award | Weekly | — | Recognition Only | N | Y | 0 | reckiiuqAUVb |
| Weekly Shot Leader | Weekly Shot Leader | Weekly | — | Recognition Only | N | Y | 0 | recdcNLqA3mi |
| Weekly XP Leader | Weekly XP Leader | Weekly | — | Recognition Only | N | Y | 0 | recwM0u6Pl9D |
| Zoom Attendance/Participation Award | Zoom Participation | Weekly | $7 | Amazon Gift Card | Y | Y | 0 | recEahm8HY7G |
| Zoom Drawing — Runner-Up | Zoom Drawing Runner-Up | Weekly | $15 | Amazon Gift Card | Y | Y | 0 | recnjH1SOyp6 |
| Zoom Drawing — Third Place | Zoom Drawing Third Place | Weekly | $20 | Amazon Gift Card | Y | Y | 0 | rect2Uzw9Ul3 |
| Zoom Drawing — Winner | Zoom Drawing Winner | Weekly | $10 | Amazon Gift Card | Y | Y | 0 | recWQ8ylrU6m |


## Award class buckets (catalog)

| Class | Count | Award Names |
| --- | --- | --- |
| conquered_goal | 1 | Conquered Goal Award |
| daily_shot | 1 | Daily Shot Submission Award |
| grade_band_champion | 1 | Grade Band Champion Award |
| grade_band_runner_up | 1 | Grade Band Runner-Up Award |
| grade_band_third | 1 | Grade Band Third Place Award |
| homework_recognition | 1 | Homework Recognition Award |
| keep_shooting | 1 | Keep Shooting Incentive Award |
| level_leader | 1 | Level Leader Award |
| random_drawing | 1 | Random Drawing Incentive Award |
| thanks_for_playing | 3 | Participation Award; Thanks for Playing - Every Bit Counts; Zoom Attendance/Participation Award |
| video_submission | 1 | Video Submission Recognition Award |


## Duplicate award class buckets

| Record | Detail |
| --- | --- |
| recITxe6rgmDyjRWl, recuf8ucY0uhIqdWG, recEahm8HY7GnNoRl | Multiple awards in class `thanks_for_playing`: Participation Award (recITxe6rgmD); Thanks for Playing - Every Bit Counts (recuf8ucY0uh); Zoom Attendance/Participation Award (recEahm8HY7G) |


## Unclassified awards with recipients

| Record | Detail |
| --- | --- |
| recAVeLrL82B4ApZh | Could not classify `Coach Feedback Improvement Award` (2 recipients) |
| recOVUgn7TxFXTk1E | Could not classify `Grade Band Achievement Award` (8 recipients) |
| rectc72bCu6ioK7vT | Could not classify `Shout-Out Video Award` (33 recipients) |


## Recipient scope / week inconsistencies

| Record | Detail |
| --- | --- |
| rec1AM2Yc5yprMweg | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Lyle Kimm \| Week 9 |
| rec1Q4B5IABI1v6AI | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Camden Clark \| Week 9 |
| rec23PVuWnct3bLTD | Conquered Goal Award: catalog=Overall recipient=Weekly \| Leyton  Bakken \| Week 10 |
| rec2UAJS92Uw47ryT | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Jackson  Elders \| Week 9 |
| rec6IX1x2FfuWzLwr | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Emmet  Gustafson \| Week 9 |
| rec7EjkTpULoFCLwu | Conquered Goal Award: catalog=Overall recipient=Weekly \| Eli Cowgill \| Week 10 |
| rec7GWX0RY8JkckJf | Random Drawing Incentive Award: catalog=Overall recipient=Weekly \| Jackson  Elders \| Week 9 |
| rec7N75PHyO0gplxc | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Colbie Schwenk \| Week 5 |
| rec7hW9h31gC6fdVG | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Emmet  Gustafson \| Week 5 |
| rec81EPGknpgVqPG4 | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Kinsley  Heidema \| Week 9 |
| rec9FbhpFMkvwvq2a | Conquered Goal Award: catalog=Overall recipient=Weekly \| Dayton Fox \| Week 8 |
| recDQrypgGENbAxCC | Grade Band Runner-Up Award: catalog=Overall recipient=Weekly \| Tracen  Heidema \| Week 8 |
| recGLd5w4ZP6fubAp | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Hartlie  Ehrlich \| Week 9 |
| recIzAN6NKdtgYWCD | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Riley Geraghty \| Week 5 |
| recLEi8ruyWLq8XCg | Random Drawing Incentive Award: catalog=Overall recipient=Weekly \| Koen Kimm \| Week 9 |
| recLuHQ9XjGV7Hwwx | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Blake Hubers \| Week 5 |
| recMAbXQRg7TfQczj | Conquered Goal Award: catalog=Overall recipient=Weekly \| William  Buresh \| Week 8 |
| recMekZRQJdu250hH | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Conley Dahl \| Week 5 |
| recOgBrLbWciGaAQR | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Hartlie  Ehrlich \| Week 5 |
| recRYqHCUAfgt3He1 | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Seyler  Ehrlich \| Week 5 |
| recRdTc6tOmhpWN6w | Conquered Goal Award: catalog=Overall recipient=Weekly \| Kinsley  Heidema \| Week 8 |
| recRyJfeg2yk3RNfX | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Colton  Dahl \| Week 5 |
| recSGmo3xwF83lIAl | Conquered Goal Award: catalog=Overall recipient=Weekly \| Sophia Ricker \| Week 2 |
| recV1cgbKf4TeON5b | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Brayden  Elders \| Week 9 |
| recVZEiS2kOz45E3W | Conquered Goal Award: catalog=Overall recipient=Weekly \| Hartlie  Ehrlich \| Week 2 |
| recVrNnNWdCXvpI64 | Conquered Goal Award: catalog=Overall recipient=Weekly \| Blake Hubers \| Week 8 |
| recWN7bIib9asjpOV | Conquered Goal Award: catalog=Overall recipient=Weekly \| Allie Heidema \| Week 8 |
| recXSTd8bbeSX9Ab0 | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Koen Kimm \| Week 9 |
| recXmgpu5bPgDMIrz | Conquered Goal Award: catalog=Overall recipient=Weekly \| Jackson  Elders \| Week 10 |
| recYFn5HQSN2qKNIo | Participation Award: catalog=Overall recipient=Weekly \| Conley Dahl \| Week 5 |
| recYezMN8HSk7JFuw | Random Drawing Incentive Award: catalog=Overall recipient=Weekly \| Seyler  Ehrlich \| Week 5 |
| recarEIxfcIrKOZnA | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Carson Hubers \| Week 5 |
| reccfcQjDAHbiWMWS | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| McKinley Clark \| Week 9 |
| recfQUnqDFwUpDVub | Conquered Goal Award: catalog=Overall recipient=Weekly \| Lincoln Newcomer \| Week 2 |
| recg8lEgeb5RhWSu9 | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Mckinley Hubers \| Week 5 |
| recjGbQ3JE3H73oR2 | Daily Shot Submission Award: catalog=Overall recipient=Weekly \| Colbie Schwenk \| Week 5 |
| recnJ3zd8JK4Udtfj | Participation Award: catalog=Overall recipient=Weekly \| Koen Kimm \| Week 9 |
| recqc3Jpxs8xEaI3L | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Seyler  Ehrlich \| Week 9 |
| recqnbFVyzHFl1yxZ | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Tracen  Heidema \| Week 9 |
| recrMheXTzeuLww0J | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Riley Geraghty \| Week 9 |
| rectz0WAjgx8J5cp6 | Conquered Goal Award: catalog=Overall recipient=Weekly \| Emmet  Gustafson \| Week 2 |
| recwIoBuA3Wh51Ro4 | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Allie Heidema \| Week 9 |
| recxCNij6uBcopy5D | Daily Shot Submission Award: catalog=Overall recipient=Weekly \| Seyler  Ehrlich \| Week 9 |
| recyKE13RvXIBIBkj | Conquered Goal Award: catalog=Overall recipient=Weekly \| Riley Geraghty \| Week 8 |
| recycIwEAUy8HfrRR | Conquered Goal Award: catalog=Overall recipient=Weekly \| Camden Clark \| Week 2 |
| recyyERV4gX4OZbI9 | Grade Band Third Place Award: catalog=Overall recipient=Weekly \| Liam Kimm \| Week 9 |


## Duplicate recipient rows (same enrollment + award + week)

| Record | Detail |
| --- | --- |
| rec4ygR88LOqEVww2, recRBocDVApKFX9sa | Riley Geraghty \| Level Leader Award \| Week 8 (2 rows) |
| recnJTOCeFMzcTVV1, recwIzgjrN0Z1swzW | Blake Hubers \| Level Leader Award \| Week 8 (2 rows) |


## Goal met without Conquered Goal recipient

| Record | Detail |
| --- | --- |
| rec70Gpi5PSfvpIl9 | Jacob Schwenk: shots 8280/8000 but no Conquered Goal recipient |
| rec83ku1pTHmPNwRo | Lyle Kimm: shots 10736/8000 but no Conquered Goal recipient |
| recKlYEzTwrMaau6B | Tracen  Heidema: shots 3338/2000 but no Conquered Goal recipient |
| recQiRUbTKZ5Wiz7B | Andrew Brady: shots 5232/5000 but no Conquered Goal recipient |
| rechgOSWWFsOivzhX | Benny Brady: shots 8801/2000 but no Conquered Goal recipient |
| recj7jNMunEfS5qm1 | McKinley Clark: shots 13633/8000 but no Conquered Goal recipient |


## Conquered Goal recipient without goal met

| Record | Detail |
| --- | --- |
| rec0Mop60efVsJ5sV | Hartlie  Ehrlich: has Conquered Goal recipient but shots 1758/10000 |
| rec8Z5KzsNif6mtpG | Lincoln Newcomer: has Conquered Goal recipient but shots 4815/5000 |
| recOSUwW9lXQx6nWL | Allie Heidema: has Conquered Goal recipient but shots 7848/8000 |
| recUeFkUrOC5JRuNn | Emmet  Gustafson: has Conquered Goal recipient but shots 3958/5000 |
| reciYiOQh8ytqaKKh | Sophia Ricker: has Conquered Goal recipient but shots 860/12000 |
| recvY4UwL5udPp0CW | Blake Hubers: has Conquered Goal recipient but shots 7169/10000 |


## Goal Met Date lookup polluted

| Record | Detail |
| --- | --- |
| recLt8puScXPL3sjF | Kinsley  Heidema: Goal Met Date pulls all award dates (goal_met_dates=['2026-06-21'], conquered_dates=['2026-06-21'], other_award_dates=['2026-06-17', '2026-06-21', '2026-06-25', '2026-07-01']) |
| recNe84xp4corSBmm | Riley Geraghty: Goal Met Date pulls all award dates (goal_met_dates=['2026-06-21'], conquered_dates=['2026-06-21'], other_award_dates=['2026-05-10', '2026-05-20', '2026-05-24', '2026-06-09', '2026-06-17']) |
| recOSUwW9lXQx6nWL | Allie Heidema: Goal Met Date pulls all award dates (goal_met_dates=['2026-06-21'], conquered_dates=['2026-06-21'], other_award_dates=['2026-05-20', '2026-06-21', '2026-07-01']) |
| recRMktT2fGDup8sm | Camden Clark: Goal Met Date pulls all award dates (goal_met_dates=['2026-05-10'], conquered_dates=['2026-05-10'], other_award_dates=['2026-05-10', '2026-05-20', '2026-06-11', '2026-06-21', '2026-07-01']) |
| recnu4CWGYrotdywM | William  Buresh: Goal Met Date pulls all award dates (goal_met_dates=['2026-06-21'], conquered_dates=['2026-06-21'], other_award_dates=['2026-06-21', '2026-07-01']) |
| recvY4UwL5udPp0CW | Blake Hubers: Goal Met Date pulls all award dates (goal_met_dates=['2026-06-21'], conquered_dates=['2026-06-21'], other_award_dates=['2026-05-24', '2026-06-17', '2026-06-21', '2026-07-01']) |


## Goal Met detail (active enrollments with goal met or Conquered Goal award)

| Athlete | Goal Met? | Computed | Shots | Target | Conquered Rows | Conquered Dates | Goal Met Date lookup |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hartlie  Ehrlich | N | N | 1758 | 10000 | 1 | 2026-05-10 | 2026-05-10 |
| Jacob Schwenk | Y | Y | 8280 | 8000 | 0 | — | — |
| Lyle Kimm | Y | Y | 10736 | 8000 | 0 | — | — |
| Eli Cowgill | Y | Y | 10010 | 10000 | 1 | 2026-06-29 | 2026-06-29 |
| Lincoln Newcomer | N | N | 4815 | 5000 | 1 | 2026-05-10 | 2026-05-10 |
| Dayton Fox | Y | Y | 14618 | 5000 | 1 | 2026-06-21 | 2026-06-21 |
| Tracen  Heidema | Y | Y | 3338 | 2000 | 0 | — | — |
| Kinsley  Heidema | Y | Y | 8423 | 8000 | 1 | 2026-06-21 | 2026-06-21 |
| Riley Geraghty | Y | Y | 15404 | 10000 | 1 | 2026-06-21 | 2026-06-21 |
| Allie Heidema | N | N | 7848 | 8000 | 1 | 2026-06-21 | 2026-06-21 |
| Andrew Brady | Y | Y | 5232 | 5000 | 0 | — | — |
| Camden Clark | Y | Y | 16850 | 10000 | 1 | 2026-05-10 | 2026-05-10 |
| Emmet  Gustafson | N | N | 3958 | 5000 | 1 | 2026-05-10 | 2026-05-10 |
| Leyton  Bakken | Y | Y | 18110 | 12000 | 1 | 2026-06-30 | 2026-06-30 |
| Jackson  Elders | Y | Y | 5100 | 5000 | 1 | 2026-06-28 | 2026-06-28 |
| Benny Brady | Y | Y | 8801 | 2000 | 0 | — | — |
| Sophia Ricker | N | N | 860 | 12000 | 1 | 2026-05-10 | 2026-05-10 |
| McKinley Clark | Y | Y | 13633 | 8000 | 0 | — | — |
| William  Buresh | Y | Y | 12000 | 12000 | 1 | 2026-06-21 | 2026-06-21 |
| Blake Hubers | N | N | 7169 | 10000 | 1 | 2026-06-21 | 2026-06-21 |


## Award Recipient status inventory

| Status | Count |
| --- | --- |
| sent | 124 |
| in amazon cart | 70 |


## Notes

- This audit is intended to diagnose **award naming**, **catalog duplication**, **recipient linkage**, and **Goal Met** consistency before close-out emails or cart fulfillment.
- `Participation Award` in the catalog maps to the family-facing **Thanks for Playing** award in email tooling.
- `In Amazon Cart` is treated as a valid production status even if absent from older schema snapshots.
- Review duplicate class buckets first — they usually explain 'messed up' award names.
