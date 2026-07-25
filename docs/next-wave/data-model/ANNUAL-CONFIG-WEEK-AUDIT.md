# Annual Config / Week Separation Audit (corrected)

---

## Year separation mechanisms

| Mechanism | How | Evidence |
|-----------|-----|----------|
| Config rows | `Active School Year` unique per year | config-selection tests |
| Enrollment | `School Year` in Enrollment Key | schema-snapshot |
| Program Instance | Enrollment + Weeks links | schema-snapshot |
| Week Code | Annual readable code (Mike PROD) | verified-prod; OMNI attest formula |
| Week Key | RECORD_ID() | schema-snapshot |
| WAS Summary Key | Enrollment Key (has year) + Week Key | overnight + schema |

---

## 2026–2027 Week naming

| Field | Role |
|-------|------|
| Week Name | Display (`Week 0`…`Post-Challenge`) |
| Week Key | Stable RID |
| Week Code | Ops/uniqueness aid `2026-2027\|…` when present |

Start/End: America/Denver dateTime. No Week End Key field — 118/119 derive Saturday from End Date.

---

## Checks

| Check | Result |
|-------|--------|
| Config year-specific | Pass (repo) |
| Enrollment Key has year | Pass |
| Summaries cross years | Fail only if wrong Week linked |
| Forms default old Config | **Unverified** — Fillout checklist |
| 118/119 ON for season | Pass (verified-prod) |
