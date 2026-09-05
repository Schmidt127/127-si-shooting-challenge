# SC-164 — Levels progress UX simplification (2026-09-05)

**Backlog:** SC-164  
**Branch:** `wave/a5-nav-levels-messaging-20260905`  
**Owner:** Agent 5

## Redundancy findings

| Before | Issue |
|---|---|
| “How to read this ladder” terminology (4 terms) | Overlapped with orientation |
| “Current level, next level, and gates” (4 step cards) | Repeated the same current/next/gate story |
| Every ladder card footer: “Full gate checklist & details →” | Same CTA × 12; pushed families off-card for gates already summarized |

**Out of scope / unchanged:** XP thresholds, gate criteria source fields, Airtable mapping, level sort/compare helpers, detail-page checklist.

## Design

1. **Single section — Your Level Progress**  
   Concise intro + three points: Current level, Next level, Gates. Guides families to expand gate details for their current and next tiers.

2. **On-card gates**  
   - Short published gate text: fully visible in a bordered block.  
   - Long checklists (>160 chars): optional `<details>` disclosure.  
   - Empty gates: existing XP-only fallback copy.

3. **CTA cleanup**  
   Removed repeated “Full gate checklist & details →”. Kept a quiet “Level details →” link for cover/rich detail pages.

## Tests

- `web/components/levels/levels-orientation.test.ts`
- `web/components/levels/levels-ladder-view.test.ts`
