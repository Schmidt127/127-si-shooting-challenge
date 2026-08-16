# PKG-038 — Repository vs Production script audit

**Date prepared:** 2026-08-16  
**Repository HEAD:** commit on branch `cursor/pkg-038-closeout-docs-cff3`  
**Production base:** `appn84sqPw03zEbTT` (Shooting Challenge Production)

**Rule:** Repository text does **not** prove current Production editor state. Every version/trigger cell marked **UNVERIFIED** requires Mike UI attestation before paste.

---

## Summary matrix

| # | Automation record ID (2026-08-04 export) | Repository target | Last attested PROD (dated evidence) | Gap / uncertainty |
|---|---|---|---|---|
| **053** | `recgH5hQgJA9IfLQE` | **v5.5** (2026-08-14) | **v5.3** attested 2026-08-06 PI isolation; **v5.0** in 2026-08-07 inventory | **UNVERIFIED** — editor may be v5.3, not v5.5; first-create 054 handoff (v5.5) not proven in PROD |
| **054** | `recb8cKBqAPjh1A2J` | **v5.8** (2026-08-13) | **v5.6** referenced SC-022 (2026-07-24); export stored **v4.0** code (2026-08-04) | **UNVERIFIED** — lifecycle trigger + v5.8 exact-ownership not attested; export code stale |
| **059** | `recxDRvpiuvCeeAhC` | **v3.6** (2026-08-13) | **v3.5** contract award proven (Perfect Week); export trigger **`Ready for 059 XP? = 1`** (2026-08-04) | **BLOCKER until trigger fixed** — lifecycle withdrawal/restoration requires trigger without formula filter |
| **066** | `rec0qiy0iXVqrU3c2` | **v3.8** (2026-08-14) | **v3.5** live replay PASS 2026-08-08 on `recCyFEPeATOVNlr9` | **UNVERIFIED** — v3.7 counted-submission + v3.8 optional Notes not pasted; inventory still says v3.3 |

---

## Repository script versions (authoritative for paste)

| File | `version` in script | `Last Updated` | Key PKG-038 changes |
|---|---|---|---|
| `053-…-rebuild-and-upsert-from-submissions.js` | **5.5** | 2026-08-14 | Two-step create → `Ready for XP` for 054 first-create handoff |
| `054-…-create-or-repair-streak-xp-event.js` | **v5.8** | 2026-08-13 | Exact `STREAK_XP` ownership; inactive/reactivate same event ID |
| `059-…-create-xp-event-from-achievement-unlock.js` | **v3.6** | 2026-08-13 | Shot-milestone `Active?` lifecycle; Perfect Week preserved |
| `066-…-create-shot-milestone-unlocks.js` | **v3.8** | 2026-08-14 | v3.7 `Count This Submission?` gate; v3.8 optional `Notes` |

**Offline regression (repository):**

```bash
node airtable/automations/shooting-challenge/lib/pkg-038-streak-lifecycle.test.js
node airtable/automations/shooting-challenge/lib/pkg-038-066-notes-optional.test.js
```

Both PASS on 2026-08-16.

---

## Stale authority documents (do not trust alone)

| Document | Says | Conflict |
|---|---|---|
| `docs/AUTOMATION_VERSION_INVENTORY.md` | 053 **5.1**, 054 **v5.4**, 059 **v3.5**, 066 **v3.3** | Behind repository; all **UNKNOWN** PROD |
| `docs/automation-index.md` | 053 **v5.4**, 066 **v3.7** | 053/066 version strings not updated for v5.5/v3.8 |
| `docs/v2-change-backlog.md` PKG-038 row | Blocked by PKG-006R + PKG-036 | **PKG-006R and PKG-036 marked complete 2026-08-15** — release gate needs Mike confirmation, not automatic unblock |
| `067-AUTOMATIONS-ROWS.json` (2026-08-04) | Embedded automation **code** for 054 v4.0, 059 v3.1 | Historical export only; not current editor proof |

---

## Per-automation uncertainty detail

### 053

| Item | Repository | Production evidence | Uncertainty |
|---|---|---|---|
| Version | v5.5 | v5.3 PI-scoped week (2026-08-06); operator “retain status” (2026-08-08) | **Cannot assume v5.5 installed** |
| Trigger | Submissions **record updated**; watch Enrollment, Activity Date, `Count This Submission?`, `Total Shots Counted` | Not fully attested in inventory | **UNVERIFIED** — must screenshot watched fields |
| First-create 054 handoff | v5.5 two-step `Source Status` | Not in any PROD proof | **UNVERIFIED** — core PKG-038 streak fix |
| Corrected-history deactivate | v5.4+ topology reconcile | Schmidt streak exists (SC-029) but withdrawal not proven | **UNVERIFIED** |

### 054

| Item | Repository | Production evidence | Uncertainty |
|---|---|---|---|
| Version | v5.8 | SC-022 cites v5.6 installed 2026-07-24; export shows v4.0 body | **Editor version unknown** |
| Trigger | Streak Occurrences **record updated**; watch `Active?`, `Source Status`, Enrollment, Achievement, Week, Streak End Date, `XP Events`; **no** positive-only `Ready for XP` filter | Legacy docs say “when Source Status = Ready for XP” | **UNVERIFIED** — withdrawal path may not fire |
| Same-event lifecycle | v5.8 | Positive award path proven (3 STREAK_XP on Schmidt); inactive/reactivate not proven | **UNVERIFIED** |
| Duplicate rule guard | v5.6+ | Assumed from SC-022 | **UNVERIFIED** at v5.8 |

### 059

| Item | Repository | Production evidence | Uncertainty |
|---|---|---|---|
| Version | v3.6 | v3.5 Perfect Week award `recMdcI5lN8gJ6830` (2026-08-05) | **v3.6 milestone lifecycle not in PROD** |
| Trigger | Lifecycle **record updated**; watch `Active?`, `XP Award Status`, `XP Events`, Enrollment, Shot Milestone, Week, `Milestone Source Key`; **never** filter `Ready for 059 XP?` or Shot Milestone empty | 2026-08-04 export: `Ready for 059 XP? = 1` AND `XP Events is empty` | **BLOCKER** — formula filter prevents mid-run link + withdrawal updates |
| Perfect Week | Preserved in v3.6 | CASE-01 proven with manual/contract path | Auto-fire after trigger fix **UNVERIFIED** |
| Shot milestone lifecycle | v3.6 inactive XP on unlock withdraw | Not proven in PROD | **UNVERIFIED** |

### 066

| Item | Repository | Production evidence | Uncertainty |
|---|---|---|---|
| Version | v3.8 | v3.5 replay PASS 2026-08-08 (`recCyFEPeATOVNlr9`, 8 unlocks skipped) | **v3.7/v3.8 not pasted** |
| Trigger | `Run Shot Milestone Check?` checked | Attested for v3.5 controlled run | **UNVERIFIED** for v3.8 |
| Counted total | v3.7+ requires `Count This Submission?` | PROD uses formula field (schema snapshot) | **Assumed** — confirm formula settled before milestone run |
| Below-threshold deactivate | v3.6+ | Not proven in PROD | **UNVERIFIED** |
| Notes optional | v3.8 | N/A | **UNVERIFIED** in live base |

---

## Mike attestation required before paste (minimum)

For each of 053, 054, 059, 066 record in one screenshot set:

1. Automation editor **version string** (first line of docblock).
2. **ON/OFF** state.
3. Trigger **table**, **type**, **conditions**, and **watched fields** (for record-updated triggers).
4. Script action input: dynamic `recordId` from trigger — **never** a fixed `rec…`.
5. Save to `docs/testing/evidence/YYYY-MM-DD-pkg-038-preflight/`.

If any attestation disagrees with this packet, **stop** per [PKG-038-DO-NOT-PROCEED-GATE.md](./PKG-038-DO-NOT-PROCEED-GATE.md).

---

## Prerequisite packages (release gates)

| Package | Backlog status (2026-08-15) | PKG-038 dependency |
|---|---|---|
| PKG-006R (010 reconciliation) | **complete** | 010 must be ON and proven before milestone/streak reversal test |
| PKG-036 (041/042 progression) | **complete** | Observe 041 queue / 042 during XP settlement; do not paste 041/042 in this packet |

Mike must still confirm **no competing lifetime-XP observation window** before enabling PKG-038 automations.
