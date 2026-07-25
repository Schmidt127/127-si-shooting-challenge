# Prioritized Master Backlog (Agent 5)

Complexity: Small / Medium / Large

## P0 — Launch blockers / data-loss risk

| ID | Problem | Evidence | System | Solution | Owner | Deps | Size | Proof |
|----|---------|----------|--------|----------|-------|------|------|-------|
| P0-1 | 074 sendMode may revert to Test | Live incident | 074/Make | Confirm Live | Mike | — | S | Input + Sent? row |
| P0-2 | Mass email if non-Schmidt enrollments + dryRun false | Go-live risk note | 118/119 | Confirm dryRun/includeSchmidt; first Sunday watch | Mike | — | S | Input values + run log |
| P0-3 | Dual Zoom XP writers | XOR docs | 117/117c | Exactly one ON | Mike | — | S | Attestation |
| P0-4 | 112 create risk | OW-D1 | VF | Keep OFF | Mike | — | S | UI OFF |
| P0-5 | HW→XP unproven post wipe | SC-009–017 | HW | Schmidt re-proof | Mike+Cursor | — | M | HC+XP IDs |
| P0-6 | Video path unproven post wipe | SC-072/094 | 070b/c/114 | Schmidt smoke | Mike | — | M | Asset+XP |
| P0-7 | Zoom exclusivity unproven post wipe | SC-087 | 101/117 | Conflict fixture | Mike | P0-3 | M | Conflict=1 |

## P1 — Reliability

| ID | Problem | Evidence | Solution | Owner | Size | Proof |
|----|---------|----------|----------|-------|------|-------|
| P1-1 | Weekly Threshold XP writer missing | Registry | Implement or Not Needed | Mike→Cursor | M | Writer+test or decision |
| P1-2 | Version attestation drift | Inventory vs repo | Fill attestation packet | Mike | M | Packet complete |
| P1-3 | WAS create race | 031/101/118 | Monitor; don’t disable 118 | Mike | M | No dup keys |
| P1-4 | Dual WAS timestamps | Agent 2 | Attest Make fields | Mike | S | Field list |
| P1-5 | 054/066 not Live Tested | Master | Supervised proofs | Mike | M | Unlock+XP |
| P1-6 | 067 Option B live | SC-013 | Schmidt quiz path | Mike | M | HC 0 assets→XP |
| P1-7 | Testing views | SC-003 | OMNI create | Mike/OMNI | M | Views exist |
| P1-8 | Email retry SOP | SC-041 | Document+drill | Cursor+Mike | S | Runbook |

## P2 — UX

| ID | Problem | Solution | Owner | Size |
|----|---------|----------|-------|------|
| P2-1 | Presentation fields | C-022 then consume | Cursor+Mike | L |
| P2-2 | Athlete auth undecided | Mike decision | Mike | L |
| P2-3 | Softr cutover | Soft cutover when ready | Mike | L |
| P2-4 | Major-event alerts | SC-044 decision | Mike | M |

## P3 — Cleanup / future

| ID | Problem | Solution | Owner | Size |
|----|---------|----------|-------|------|
| P3-1 | Stale inventory rows | Refresh after attest | Cursor | M |
| P3-2 | Tutorials orphan | After Softr proof | Mike | M |
| P3-3 | EMC / Program Instance | Deferred waves | Future | L |
| P3-4 | Agent 3 external audit gap | Bounded Make/Fillout/Softr audit | Next agent | M |

## Exclusions

Team Shot Tracker inactivity alerts · Config year collapse · Reinstall 063/111 · New Make WAS sender · Force 074 Test
