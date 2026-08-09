# Automation Governance Inventory Reconciliation

Date: 2026-08-08  
PROD base: `appn84sqPw03zEbTT`  
Governance table: `Automations` (`tblfpqKqPEbkPnN8E`)

## Purpose

Reconcile the Airtable governance table with current, already-proven PROD/repository truth without pretending the governance table is a native Airtable Automation Editor export.

**Important:** a governance row marked `Live` is documentation, not proof that the native automation slot contains the named repository version or trigger configuration. Native editor proof remains authoritative where required.

## Inventory snapshot

The governance table returned **51 rows** on 2026-08-08.

The audit found four classes of state:

1. **Current and supported by direct evidence** — safe to update governance notes.
2. **Known retired/off** — retain as historical governance; do not recreate.
3. **Known defect / active repair** — preserve warning until repaired and live-proven.
4. **Inventory ambiguity** — governance trigger/view metadata cannot be trusted without native UI attestation.

## Rows corrected from current evidence

The following governance rows were updated directly in PROD on 2026-08-08.

| Automation | Governance record | Current truth recorded |
|---|---|---|
| 010 | `recfxxUD50a5rbIRr` | v10.6 confirmed in PROD; controlled existing-event replay PASS; no duplicate; first-create not overclaimed |
| 023 | `recFTk9CJM6J8sMrB` | v3.1 installed/live-tested; Program Instance-scoped Enrollment assignment and replay PASS |
| 031 | `recuXhBl6WGImtwo8` | v3.5 confirmed; canonical empty-link/malformed-candidate live proof PASS; stale-linked repair remains offline-only |
| 033 | `recvBjw910MFTsPgT` | v3.3 operator-attested; PHA-first season scheduling architecture; 2026–2027 PHA schedule restored |
| 041 | `recM0EuOxc9ydtM5S` | v4.0 installed; deterministic signature queue; partial #98 live matrix recorded accurately |
| 066 | `rec0qiy0iXVqrU3c2` | v3.5 live existing-unlock replay PASS; 8 eligible / 8 skipped / 0 duplicate creates |
| 079 | `recS5d1Jfola5BufG` | controlled PROD Communications Hub WELCOME handoff proved; row changed from stale `Off/not pasted` language to controlled-live truth |

Automation 042 had already been reconciled to v3.3 live proof earlier on 2026-08-08.

## Retired / do-not-recreate rows

### Automation 043

Governance record: `recZWrVJTi2ovc3uM`

- Native Automation 043 was not found in the actual PROD Automations UI.
- Governance row is historical only.
- Status `Off` is appropriate.
- Do not recreate.
- Automation 042 v3.3 remains the sole progression-output writer.
- GitHub issue #95 is closed Not Planned.

### Automation 061

Governance record: `recG5HO86DbCPjr8T`

- Native automation was deleted/retired.
- Formula-based review status and existing downstream homework writers supersede it.
- Do not recreate.

### Automation 112

Governance record: `recNUvkyi3dABPX9f`

- Retired legacy duplicate Video Feedback writer.
- Automation 013 is the canonical Submission Asset → Video Feedback writer.
- Do not recreate 112.

## Known active defects / active agent work

The following rows should not be declared current merely because governance status says `Live`:

| Automation(s) | Reason |
|---|---|
| 009 / 013 / 020 | Source attachment/slot provenance and canonical downstream identity are under issue #103 |
| 041 | v4.0 installed, but #98 A–N PROD proof matrix is incomplete |
| 071 / 073 | Parent-feedback source/safety hardening under issue #105 |
| 072 / 076 | Canonical PHA + active-XP reporting repair under issue #104 |
| 113 / 114 | Future/non-countable video source validation under issue #101 |

Issues #100/#102 address XP lifecycle/eligibility-loss reconciliation and may change downstream governance notes after implementation.

## New homework-season findings

### PHA schedule restored

`Program Homework Assignments` was found with only two valid Early Bird rows plus six blank junk rows. The full regular-season schedule was rebuilt:

- 90 active rows = 9 weeks × 5 grade bands × HW1/HW2
- two protected Early Bird fixtures preserved
- six blank junk records deleted

Evidence:
`docs/prod-completion/2026-08-08/PROGRAM-HOMEWORK-ASSIGNMENTS-2026-2027-RESTORATION.md`

### Automation 067 missing from governance inventory

No governance row containing `067` was returned.

Repository Automation 067 v2.0 still resolves HW17 Week from the reusable curriculum record, whose link is legacy Week 10. GitHub issue #120 tracks the PHA-first repair.

A missing governance row must **not** be interpreted as proof that no native 067 automation exists. Native UI attestation is required before adding or changing governance deployment status.

### Automation 068 missing from governance inventory

No governance row containing `068` was returned.

Repository Automation 068 was repaired to v1.1 on 2026-08-08 so it uses each Homework Completion's own Week rather than the reusable HW17 curriculum Week.

Commits:
- `6eab13bc017ef11f9f97fe30c676862775b80eac`
- `8c8dd07cf5e7b16ab13dde6f602e25df8cbe476a`

This is repository truth only. Do **not** create a governance row claiming 068 is deployed until the native Airtable automation slot is attested.

## Trigger/view metadata discrepancy requiring UI attestation

The governance rows for Automations 001 and 002 appear cross-wired:

### Row named 001

Governance record `recmT8Ye7TIhmmn7X` currently lists:

- Trigger view: `Automation - 002 - Needs Grade Band`
- Conditions: Grade Band empty, Grade present, Athlete present

Those conditions describe the Grade Band assignment stage rather than the named `001 - Find or Create Athlete and Link Enrollment` stage.

### Row named 002

Governance record `recVGJmHDLAFfsEHc` currently lists:

- Trigger view: `Automation - 001 - Needs Athlete Link`
- Conditions: Athlete empty, first/last/parent email present, match Pending

Those conditions describe the athlete-link stage rather than the named `002 - Assign Grade Band` stage.

This may be governance metadata copied onto the wrong rows, or the native automation names may have been swapped historically. **Do not rewrite the trigger/view metadata by inference.** Attest the native 001 and 002 automation names, trigger views, and `recordId` mappings before correcting these fields.

Repository/live functional evidence for v5.2/v8.2 is separate from this governance naming discrepancy.

## Other rows still carrying stale-version language

Automation 053's governance notes still describe a stored v5.0 snapshot versus repository v5.3. Current Completion Master reconciliation says prior verified PROD status is retained, but this audit did not independently re-attest the native editor version. Leave the warning until direct editor/version evidence is captured.

Do the same for any row whose only evidence is an old governance `Live` label: update documentation only after a native editor check or an already-established controlled proof.

## Season calendar defect isolated

The 2026–2027 Week readback proves:

- Weeks 1–9 are valid Sunday 00:00 → Saturday 23:30 Denver intervals.
- Week 10 is partial: Sunday 2027-06-27 → Wednesday 2027-06-30.
- Post-Challenge starts 2027-07-01 00:00 but ends 2027-06-30 23:30 (end before start).

This conflicts with the canonical challenge-year generator's Sunday–Saturday Week 1..N + Post-Challenge contract. GitHub issue #121 tracks the required product-calendar decision and repair.

Do not mutate Config Challenge Week Count or Program Instance dates by inference.

## Recommended next governance actions

1. Finish #98 live proof, then finalize 041 row as fully proven.
2. When #100–105 agents land, update only affected rows after repository + PROD installation/proof.
3. Attest native 001/002 trigger names/views and correct the cross-wired governance metadata.
4. Attest whether native 067 and 068 automation slots exist before creating governance deployment claims.
5. Retain 043/061/112 historical rows as Off / do-not-recreate rather than deleting the audit trail.
6. Periodically compare governance `Live` rows to actual native editor versions; do not use the governance table as the deployment source of truth.
