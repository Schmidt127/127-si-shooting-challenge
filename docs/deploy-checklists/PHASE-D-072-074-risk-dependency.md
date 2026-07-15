# Phase D — Risks & dependencies: 072 ∪ 074

**Date:** 2026-07-14  
**Verdict input for Lead:** See `docs/overnight-runs/results/S26-phase-d-decision.md`  
**Package status:** `READY_FOR_AUTHORIZATION`

---

## 1. Timing

| Risk | Detail | Mitigation |
|------|--------|------------|
| Same-run build+send races formulas | After build write, Ready must be true before send validation | Combined script sends **after** build writeback using in-memory package + forces Ready |
| OR trigger re-entry | Build clears Build Now; send clears Send — should not loop | Self-gates; Sent? blocks duplicate send |
| Sunday / week boundary | Submission date keys vs Week Start/End Keys | Preserve 072 `toLocalDateKey` / week key filter (America/Denver) — do not change timing math in Phase D |
| Make latency / timeout | Webhook fail mid-batch | Leave Send armed; stamp Error; retry later |

### Sunday / schedule assumptions

- Week bounds come from Weeks table keys (not “run on Sunday” inside 072/074).
- Current ops are **manual checkbox** arms, not a schedule.
- C-011 may later add Sunday (or other) schedule — **out of scope** for Phase D prep; combined script must keep checkbox gates until C-011 authorizes auto-arm / autoSendAfterBuild.

---

## 2. Duplicate-email

| Path | Guard |
|------|-------|
| Double 074 / double send arm | `Weekly Email Sent?` checked → skip/block |
| Webhook ACK but Gmail not yet marked Sent | Make must stamp Sent only after Gmail; Airtable must not set Sent on handoff |
| Rebuild after send | Build resets Sent→false — **ops risk** if staff rebuild a already-emailed week; treat as intentional re-prepare; Make should still idempotency-key if possible |
| Combined sendKey | Payload includes `WEEKLY_SUMMARY\|{enrollmentId}\|{weekId}\|{revision}` for Make-side dedupe |

---

## 3. Retry / partial failure

| Failure | Behavior |
|---------|----------|
| Build throws | No Ready package; no send |
| Send webhook fails | Error field set; **Send to Make? stays checked**; build package retained |
| Send skipped (blank webhook / disabled) | Build success still valid; sendActionOut = skipped_* |
| Missing recipient / HTML on send-only | Skip with skipped_missing_*; do not wipe package |

---

## 4. Orchestrator vs keep separate

| Option | Pros | Cons |
|--------|------|------|
| **Keep separate 072+074** | Clear review gate; smaller scripts | Burns 2 slots; Folder 07 still tight on capacity |
| **Single orchestrator (new number)** | Clean name | Uses a slot; worse for capacity goal |
| **Combine into surviving 072** (recommended) | +1 free slot; ordered BUILD→SEND; dual-arm trigger | Large script; UI must OR build/send conditions |

**Recommendation:** Combine into **072** with internal ordered steps. Not a new orchestrator number. Not EMC rewrite (V2-014b later).

---

## 5. Build + send ordered steps (one script)

Required contract:

1. Resolve route: build-only / send-only / build+send.
2. If build: compute package → write WAS fields.
3. Only then, if send armed (or `autoSendAfterBuild`) **and** webhook present **and** sendEnabled: POST Make.
4. Never send-before-build when Build Now was the arm that fired without an existing Ready package.
5. Default after build-only: leave `Send to Make?` unchecked (staff review) unless auto/armed.

---

## 6. Blank / disabled webhook = safe no-send

| Input | Behavior |
|-------|----------|
| `makeWebhookUrl` / `webhookUrl` blank | `skipped_no_webhook` — **no throw** |
| `sendEnabled=false` | `skipped_send_disabled` |
| DEV default | Blank webhook + Folder 07 OFF until Mike authorizes |

Legacy 074 **throws** on missing webhook — Phase D hardens this for DEV safety (aligned with 117f pattern).

---

## 7. Dependencies / non-touch list

| Dependency | Rule |
|------------|------|
| Make weekly scenario | Must accept combined payload aliases |
| C-011 schedule | Do not enable auto weekly sends in Phase D |
| C-010 Active? gate | Future; not required for combine gate |
| Folder 07 other autos (070a–078 except 072/074) | **Do not enable / edit** |
| Automation 117 | **Do not touch** |
| PROD | **Stop** — Mike approval only |
| Delete/retire 074 UI | Only after live smoke PASS + Mike |

---

## 8. Capacity impact

| Checkpoint | Occupied (est.) | Free (est.) |
|------------|----------------:|------------:|
| After C2 (111 delete) | 46 | 4 |
| After Phase D (074 retire) | **45** | **5** ✓ target |

Phase D prep does **not** change live occupancy until Mike pastes 072 and deletes 074.
