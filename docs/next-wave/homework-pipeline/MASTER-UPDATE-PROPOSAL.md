# Master update proposal — Agent 11 (for Agent 14 / Lead)

**Do not apply during concurrent exclusive ownership.** This is a proposal only.

## Status transitions to propose

| SC / topic | From (approx) | To | Evidence |
|---|---|---|---|
| 020 vs 063 replacement | Unproven / conflicting | **Partial** — documented | `020-PROD-VS-REPO-COMPARISON.md` |
| 111 retirement | Conflicting guidance | **Superseded by 013 v2.0** | Confirmed finding + 013 GB repair |
| HW17 quiz design (SC-013/014 cluster) | Open | **Decision packet ready** — awaiting Mike A/B | `QUIZ-PATH-DECISION.md` |
| Learning Activities | Stub | **Contract-ready / schema not installed** | LA schema + routing + tests |
| Repo 020 SoT | v2.3 stale | **v3.0.0 PROD-aligned** | commit `444046e` |

## Wording snippets (safe)

- Replace “063 still required” with “063 deleted; Grade Band blank repair on asset-driven path is owned by 020 v3.0.0; orphan HC blank GB may need one-time repair.”
- Replace “Run 111 for Grade Band” with “Run 013 repair path; 111 retired.”
- Add quiz: “Mike chooses Option A (PDF) or B (attachment-less); recommend B on current PROD schema.”

## Files Agent 14 should touch

Listed exactly in `STALE-063-111-PATCH-MANIFEST.md`.

## Files Agent 14 should not rewrite from this proposal

- Live automation script bodies for 020/013/067 (already classified).  
- Website Learning Activities TS (mirror exists; Node contracts are Agent 11 SoT for next-wave).
