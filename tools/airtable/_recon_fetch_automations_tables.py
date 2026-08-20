"""⛔ RETIRED (2026-08-20): Do not fetch the Production Automations data table.

That table is obsolete pre-V2 inventory and is not an authority source for
Version 2 audits or operational decisions. See docs/CURRENT-TRUTH.md and
docs/AUTHORITY-MAP.md.

Historical fetch logic was removed so this module cannot accidentally be used
to re-query the obsolete table.
"""
from __future__ import annotations

import sys


def main() -> None:
    print(
        "BLOCKED: Do not query the obsolete Production Automations data table.\n"
        "Use Airtable Automations UI, Mike-dated evidence, and GitHub SCRIPT headers.\n"
        "See docs/CURRENT-TRUTH.md and docs/AUTHORITY-MAP.md.",
        file=sys.stderr,
    )
    raise SystemExit(2)


if __name__ == "__main__":
    main()
