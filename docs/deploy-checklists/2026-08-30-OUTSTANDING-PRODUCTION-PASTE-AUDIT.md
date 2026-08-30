# Outstanding Production paste audit — 2026-08-30

> **SUPERSEDED (2026-08-30 evening):** Live Automation **057** script (`get_automation` / MCP) uses CONFIG **`Perfect Week Video Minimum`** (correct). **Do not repaste.** The Automations **Code** tracker column may still show the stale typo — optional hygiene refresh only. See [`MASTER_REMAINING_WORK_LIST.md`](../../MASTER_REMAINING_WORK_LIST.md) MRW-C05c **COMPLETE (live script)** and [`RELEASE_BASELINE.md`](../../RELEASE_BASELINE.md).

**Base:** `appn84sqPw03zEbTT`  
**Git tip at audit branch:** `b312af92` (`origin/master`)  
**Authority:** Automations table columns **Name / Status / Automation Code** only (post-2026-08-20 refresh). Other Automations columns are stale and ignored.  
**MCP re-read:** 2026-08-30 (this packet) · **Live script re-verify:** 2026-08-30 (Agent 4 release-readiness)

## Verdict

| # | Repo version | Prod Automations Code | Live script body | Paste still required? | Operator packet |
|---|--------------|----------------------|------------------|----------------------|-----------------|
| **057** | **2.2** (correct field name) | **2.2** tracker may still show typo `MInimum` | **correct** `Perfect Week Video Minimum` | **No — do not repaste** | [`057-v2.2-perfect-week-video-minimum-paste.md`](./057-v2.2-perfect-week-video-minimum-paste.md) (historical) |
| **010** | v10.12 | v10.12 Live | aligned | **No** | [`010-v10.12-operator-packet.md`](./010-v10.12-operator-packet.md) |
| **022** | v2.2 | v2.2 Live | aligned | **No** | [`022-v2.2-operator-packet.md`](./022-v2.2-operator-packet.md) |
| **072** | v4.8 | v4.8 Live | aligned | **No** | [`072-v4.8-operator-packet.md`](./072-v4.8-operator-packet.md) |
| **073** | v4.4 | v4.4 Live | aligned | **No** | [`073-v4.4-operator-packet.md`](./073-v4.4-operator-packet.md) |
| **020** (FUT-001) | v3.8 | v3.8 Live | aligned | **No** | [`020-v3.8-fut-001-operator-packet.md`](./020-v3.8-fut-001-operator-packet.md) |
| **065** (FUT-001) | v10.4 | v10.4 Live | aligned | **No** | [`065-v10.4-fut-001-operator-packet.md`](./065-v10.4-fut-001-operator-packet.md) |

**Outstanding priority pastes: none.**

Config schema (Production): field **`Perfect Week Video Minimum`** id `fldqRxjWGXcbUZUg3` on Config. Typo name is gone from schema; live automation script matches.

## What Mike must do next

1. **Do not** paste 057 / 010 / 020 / 022 / 065 / 072 / 073.
2. Optional: refresh Automations table **Automation Code** text for 057 if the tracker still shows `MInimum` (docs hygiene only).
3. Continue non-paste queue: archive WSTEST/PWTEST Weeks before season sim; FUT-010 only if eligible rows appear; RCC — see [`2026-08-29-PRODUCTION-OPERATOR-QUEUE.md`](./2026-08-29-PRODUCTION-OPERATOR-QUEUE.md).

## Doc lag corrected by this audit

- Historical rows below previously claimed 057 still needed repaste based on Automations Code tracker alone — **superseded** by live script body authority.
- Perfect Week award for WAS `recl3DmBh22ADPWWe` remains **COMPLETE** — do not re-`--apply`.

---

### Historical audit body (morning 2026-08-30 — tracker-only; superseded)

The morning packet treated Automations Code typo as requiring a script repaste. Evening live-script MCP showed the deployed automation already correct. Keep morning evidence for audit trail only; do not act on the “YES — repaste” row.
