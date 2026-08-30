# Outstanding Production paste audit — 2026-08-30

**Base:** `appn84sqPw03zEbTT`  
**Git tip at audit branch:** `b312af92` (`origin/master`)  
**Authority:** Automations table columns **Name / Status / Automation Code** only (post-2026-08-20 refresh). Other Automations columns are stale and ignored.  
**MCP re-read:** 2026-08-30 (this packet)

## Verdict

| # | Repo version | Prod Automations Code | Paste still required? | Operator packet |
|---|--------------|----------------------|----------------------|-----------------|
| **057** | **2.2** (correct field name) | **2.2** but CONFIG still `"Perfect Week Video MInimum"` (typo) | **YES — repaste** | [`057-v2.2-perfect-week-video-minimum-paste.md`](./057-v2.2-perfect-week-video-minimum-paste.md) |
| **010** | v10.12 | v10.12 Live | **No** | [`010-v10.12-operator-packet.md`](./010-v10.12-operator-packet.md) |
| **022** | v2.2 | v2.2 Live | **No** | [`022-v2.2-operator-packet.md`](./022-v2.2-operator-packet.md) |
| **072** | v4.8 | v4.8 Live | **No** | [`072-v4.8-operator-packet.md`](./072-v4.8-operator-packet.md) |
| **073** | v4.4 | v4.4 Live | **No** | [`073-v4.4-operator-packet.md`](./073-v4.4-operator-packet.md) |
| **020** (FUT-001) | v3.8 | v3.8 Live | **No** | [`020-v3.8-fut-001-operator-packet.md`](./020-v3.8-fut-001-operator-packet.md) |
| **065** (FUT-001) | v10.4 | v10.4 Live | **No** | [`065-v10.4-fut-001-operator-packet.md`](./065-v10.4-fut-001-operator-packet.md) |

**Only outstanding documented production paste in this priority set: Automation 057.**

Config schema (Production): field **`Perfect Week Video Minimum`** id `fldqRxjWGXcbUZUg3` on table `tblRB6sh77NxjS568` (Config). Typo name is gone from schema; live Automations Code for 057 still references it.

## What Mike must do next

1. **Paste 057 only** per [`057-v2.2-perfect-week-video-minimum-paste.md`](./057-v2.2-perfect-week-video-minimum-paste.md) (Mike approval required).
2. Refresh Automations table **Automation Code** for 057 after paste (or confirm UI script already matches and sync Code).
3. Do **not** re-paste 010 / 020 / 022 / 065 / 072 / 073.
4. Continue non-paste queue: FUT-010 supervised apply (after attestation), Weeks import, RCC — see [`2026-08-29-PRODUCTION-OPERATOR-QUEUE.md`](./2026-08-29-PRODUCTION-OPERATOR-QUEUE.md).

## Doc lag corrected by this audit

- `CURRENT-TRUTH.md` §8 still claimed 010/072 paste pending and 020/065 older minors — superseded by Automations Code MCP (2026-08-29 + reconfirmed 2026-08-30).
- MASTER / RELEASE / operator queue incorrectly treated **057** as fully applied; Code still has typo CONFIG string.
- Perfect Week award for WAS `recl3DmBh22ADPWWe` remains **COMPLETE** — do not re-`--apply`. 057 repaste is schema-name alignment, not re-proof of that fixture.
