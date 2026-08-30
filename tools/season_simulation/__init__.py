"""Season simulation infrastructure for Athlete 1 (SC-SEASON-SIM-002).

Default mode is dry-run / read-only. Execute and cleanup require an explicit
confirmation token and are not invoked during infrastructure development.
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

__version__ = "0.1.0"
