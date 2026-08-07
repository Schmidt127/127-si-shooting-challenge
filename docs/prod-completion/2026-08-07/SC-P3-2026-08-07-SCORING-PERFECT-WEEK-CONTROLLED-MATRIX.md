# SC-P3-2026-08-07 Scoring Package — Controlled Schmidt Matrix

Status: Repository preparation only. No Airtable records, schema, views, automations, Make scenarios, Fillout forms, or emails were changed by this package.

## Safety boundaries

- Work directly in the cleared Airtable PROD testing base.
- Use controlled Schmidt testing records only.
- Historical data preservation is not required for this cleared testing base.
- Do not enable Automation 053.
- Do not use `Perfect Week Test Override?`; the repository verifier treats that as a failed bypass.
- Create only the controlled Schmidt records listed below, then remove or reset test-only records according to the approved rollback packet.
- Stop on any duplicate canonical Weekly Athlete Summary, duplicate XP Source Key, unexpected writer, or ambiguous Enrollment/Week link.

## Automation order

### Asset homework path

`009 → 020 → 031 → 064 → 065`

1. Create a Fillout-shaped Submission with one HW1 asset and one HW2 asset for the Schmidt Enrollment and the target Week.
2. Allow 009 to create one Submission Asset per attachment.
3. Run 020 once per asset. Both assets must resolve to their own slot-specific Homework Completion; rerunning either asset must reuse the existing completion.
4. Run 031 only after one canonical Weekly Athlete Summary exists. It must not create a summary.
5. After coach review marks each eligible completion satisfactory and complete, run 064 then 065.

### Reflection quiz path

`067 → (deferred if no summary) → canonical WAS established by the applicable upstream flow → retry 067 → 064 → 065`

1. Create two Final Reflection Quiz Submissions for the same Schmidt Enrollment and HW17 Week, with no attachment.
2. Run 067 for both quiz rows.
3. Both quiz rows must link to one HW17 Homework Completion; no Submission Asset may be created.
4. 067 must link that completion to the one existing canonical Weekly Athlete Summary when available, but must create no XP.
5. If 067 reports `deferred_no_canonical_summary`, establish the canonical summary through the applicable upstream weekly-summary flow, then rerun 067. Do not make 067 create a summary.
6. After coach review, run 064 then 065 once; rerun both and require the same single homework XP event.

### Perfect Week path

`057 → 058 → 059`

1. Use one canonical Schmidt Weekly Athlete Summary and one official Sunday–Saturday Week.
2. Run 057 after all prerequisites are present.
3. If eligible, 058 creates one Perfect Week unlock and 059 creates one XP Event.
4. Rerun 057/058/059 and require no additional unlock or XP Event.

### Weekly Threshold path

`035`

1. Run only when `Threshold XP Ready? = 1` and the Weekly Athlete Summary has a valid Enrollment, Week, Grade Band, Goal Completion %, and linked reward rules.
2. Keep Automation 053 disabled and verify no other writer owns `WEEKLY_THRESHOLD|`.
3. Rerun 035 and require zero new events for the same tiers.

## Required test data

| Scenario | Records to create or prepare | Required links/values |
|---|---|---|
| HW asset slots | One Schmidt Submission with HW1 and HW2 attachments | Same Enrollment + Week; assets identify `HW1` and `HW2`; each asset has a distinct `Source Attachment ID` |
| HW multi-asset replay | A second attachment for the same slot plus a replay of the first asset | Same slot and Homework assignment; no second Homework Completion |
| HW17 reflection | Two Final Reflection Quiz Submissions | Same Schmidt Enrollment + HW17 Week; no PDF attachment; both eligible for 067 |
| Perfect Week pass | Seven submissions, one per official Denver calendar date | Each is same-day and countable; each meets `ceil(weekly goal / 7)` shots; exactly or more than three qualifying videos |
| Perfect Week partial | Six of seven dates, or seven dates with one below the daily minimum | Must not become eligible |
| Perfect Week concentration | Seven-day week with all shots on one date | Must not become eligible; distinct dates remain below seven |
| Perfect Week video gate | Seven qualifying dates with only two videos | Must not become eligible |
| Conditional Zoom | One pass with no Zoom Meeting; one fail with a meeting and no qualifying attendance; one pass with attendance | Zoom requirement is conditional on a meeting existing for that Week |
| Threshold tiers | One valid Weekly Athlete Summary at 100/125/150% in separate controlled runs | Active band-matched reward rules; threshold-ready flag true |

## Expected links and XP

| Result | Expected record/link | Expected XP Source Key | Expected XP |
|---|---|---|---:|
| Asset HW1/HW2 | One Homework Completion per `Enrollment + Week + Homework + Slot`; all same-slot assets merge | `HOMEWORK_XP|{homeworkCompletionId}` after 064/065 | Rule amount; exactly one event per completion |
| Reflection HW17 | One Homework Completion reused by both quiz rows; no fake Submission Assets | `HOMEWORK_XP|{homeworkCompletionId}` after 064/065 | Rule amount; exactly one event |
| Perfect Week pass | One unlock linked to the Weekly Athlete Summary, then one XP Event | `PERFECT_WEEK|{enrollmentId}|{weekId}` | **100** |
| Threshold 100/125/150 | One XP Event per met tier, linked to the Weekly Athlete Summary | `WEEKLY_THRESHOLD|{enrollmentId}|{weekId}|{percent}` | Active XP Reward Rule amount |

The following must remain untouched by 035: Submission Base, Homework, Perfect Week, Video, Zoom, milestone, and streak XP Events. The following must remain untouched by 057: XP Events and unlock creation; those belong to 058/059.

## Pass/fail criteria

Pass only if all of the following hold:

1. Every Homework Completion identity is unique for its intended slot and repeated assets/quiz attempts reuse it.
2. The reflection path creates zero Submission Assets without attachments and 067 creates zero XP Events.
3. Each Homework Completion has the one canonical Weekly Athlete Summary link when that summary exists; ambiguity fails closed.
4. Perfect Week requires seven distinct official dates, same-day countability, the daily minimum, three videos, all assigned homework, and conditional Zoom.
5. A qualifying Perfect Week produces exactly 100 XP and the canonical source key; replay produces no duplicate unlock or XP.
6. Weekly Threshold XP produces only met tier events with the canonical source keys; replay produces no duplicates.
7. Ownership harnesses report no competing writers or source-key collisions.
8. No test requires or enables Automation 053.

Any missing Airtable editor/run-history screenshot, record export, or competing-writer attestation is `NEEDS INFORMATION`, not a pass.

## Airtable evidence Mike must supply

- Automation editor screenshots showing the installed version, exact trigger, `recordId` input mapping, and ON/OFF state for 067, 057, 058, 059, and 035.
- PROD run-history screenshots for first run and replay for each path.
- Record exports showing Homework Completion links, Submission Asset links, unlock links, XP amounts, XP Source, and Source Keys.
- For 057: CASE-01 through CASE-16 results, including the still-blocked cases from the v1.5 verification packet.
- For 035: installed version confirmation and explicit confirmation that no competing Threshold XP writer is enabled.
