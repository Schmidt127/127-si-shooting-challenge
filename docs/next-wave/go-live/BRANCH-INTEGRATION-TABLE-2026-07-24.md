# Branch integration table — 2026-07-24

**Starting master:** `a8f3b00`  
**Integration branch:** `integration/go-live-promotion-2026-07-24`

| Branch | Tip | Ahead | Decision | Notes |
|--------|-----|------:|----------|-------|
| `audit/agent1-2-reliability-2026-07-24` | `fab2bb7` | 1 | **Merged** + corrected | Stale 118/119 OFF claims superseded |
| `agent2/airtable-data-model-cleanup` | `63b6cd8` | 1 | **Merged** | Schema pointer conflicts resolved |
| `agent11/homework-complete` | `3db4b19` | 2 | **Merged (ours)** | Content already present; kept Option B |
| `agent12/was-email` | `fecd945` | 2 | **ours merge** | Rejected v1.3 script downgrade |
| `agent9/automation-ownership-contract` | `c0c0ca9` | 3 | **Merged (-X ours)** | Kept Live writeback updates |
| `agent10/config-selection` | `55b33c9` | 5 | **Merged** | Year-aware Config resolver |
| `agent13/final-reconciliation` | `441ea5e` | 0 | Already on master lineage | No unique commits |
| `audit-followup/*` | various | 0 | Already integrated | No unique commits vs master |
| `cursor/challenge-year-rollover-engine-ef9e` | `3bdc071` | 4 | Pending after commit | DRAFT PR #39 — repo tooling |
| `agent4/testing-qc-prod-safety` | `a8f3b00` | 0 | No unique tip | WIP may exist in worktree only |
| Overnight / old cursor drafts | various | — | **Not merged** | Superseded or DRAFT cloud envs |

## Overlaps resolved

- `airtable/schema/current/{table,field}-map.md` — Agent 2 pointers win + weekly email ON note  
- `QUIZ-PATH-DECISION.md` — keep Option B approved  
- Single-writer / PROJECT_STATE / automation-index — corrected for schedules ON  
