"""Season simulation infrastructure for Athlete 1 (SC-SEASON-SIM-002).

Default mode is dry-run / read-only. Early execute requires a gated
Activity Date Is Future? override — see README and
docs/deploy-checklists/SC-SEASON-SIM-002-operator-checklist.md.
"""

from .constants import (
    CONFIRM_TOKEN,
    SAFE_EMAIL_RECIPIENT,
    SIM_END,
    SIM_START,
    SIMULATION_DAY_COUNT,
)

__all__ = [
    "CONFIRM_TOKEN",
    "SAFE_EMAIL_RECIPIENT",
    "SIM_END",
    "SIM_START",
    "SIMULATION_DAY_COUNT",
]

__version__ = "0.2.0"
