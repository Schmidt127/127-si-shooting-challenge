# Mike decision sheet — DEV Automation Architecture (corrected)

**Stop.** Analysis only — no Airtable deletes/disables except during **approved consolidation handoffs**.

## Binding rule

**OFF ≠ obsolete.** Do not delete OFF automations. Capacity comes from **merging required automations**.

## First phase (recommend approve)

1. Consolidate **006 + 021** → **+1** slot  
2. Paste **117** orchestrator **OFF**  
3. Leave **070a–078** alone (keep slots even while OFF)

## Path to ≥5 free after 117

| Phase | Consolidation | Slots |
|-------|---------------|------:|
| A | 006∪021 then paste 117 | 0 net |
| B | 030∪032∪033 | +2 |
| C | 063→020 | +1 |
| D | 111→013 | +1 |
| E | 072∪074 | +1 |
| **Total free** | | **5** |

## Retracted

- Deleting **061**, **078**, or any OFF automation for capacity  
- Treating **070a–078 OFF** as free slots  

## Optional (replacement evidence only — not OFF)

Fold **043 into 042** only if you explicitly approve replacement retirement.

Docs: `docs/architecture/AIRTABLE-AUTOMATION-CAPACITY-LEDGER.md`
