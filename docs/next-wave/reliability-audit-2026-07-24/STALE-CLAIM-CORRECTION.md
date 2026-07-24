# Stale claim correction — 2026-07-24 go-live integration

**Status:** Active correction over the reliability audit package (`fab2bb7`).

The Agent 1+2 reliability audit was written when 118/119 schedules were still **OFF**. Mike has since verified PROD activation.

**Follow-up (same day):** Repo **118 v1.5** removes the v1.4 hard-stop that refused `sendMode=Live` when `dryRun=false`, and writes WAS `sendMode` from input. Paste + season inputs: [`../go-live/MIKE-ACTIONS.md`](../go-live/MIKE-ACTIONS.md).

| Claim in audit package | Current verified PROD | Action |
|------------------------|----------------------|--------|
| Keep 118/119 schedules OFF (P0) | **118 ON** Sun 5:00 AM Denver; **119 ON** Sun 10:00 AM Denver | **Superseded** — do not disable |
| Activation is accidental P0 risk | Activation authorized + Live email/writeback proven | Treat as **verified_prod** |
| 074 must not remain Test | **sendMode=Live**; Live writeback PASS | Keep Live |
| Make Live writeback unproven | **PASS** (Sent?, Make Send Status=Sent, timestamp) | Keep documented |

Files in this folder that still say “schedules OFF” are **historical relative to this correction** unless edited. Prefer:

- `docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`
- `docs/PROJECT_STATE.md`
- `docs/automation-index.md`
- `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`
