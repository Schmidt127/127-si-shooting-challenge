"""Canonical paths for season publicity / media kit assets."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
MEDIA_ROOT = REPO_ROOT / "media"

# Active season for close-out tooling (update each year).
ACTIVE_SEASON = "2025-2026"


def season_root(season: str = ACTIVE_SEASON) -> Path:
    return MEDIA_ROOT / season


def newspapers_root(season: str = ACTIVE_SEASON) -> Path:
    return season_root(season) / "newspapers"


def newspaper_packets(season: str = ACTIVE_SEASON) -> Path:
    return newspapers_root(season) / "final-packets"


def radio_root(season: str = ACTIVE_SEASON) -> Path:
    return season_root(season) / "radio"


def facebook_root(season: str = ACTIVE_SEASON) -> Path:
    return season_root(season) / "facebook"


def photos_root(season: str = ACTIVE_SEASON) -> Path:
    return season_root(season) / "photos"


def captions_root(season: str = ACTIVE_SEASON) -> Path:
    return season_root(season) / "captions"


def award_articles_root(season: str = ACTIVE_SEASON) -> Path:
    return season_root(season) / "award-articles"


def templates_root(season: str = ACTIVE_SEASON) -> Path:
    return season_root(season) / "templates"


def future_enhancements_root(season: str = ACTIVE_SEASON) -> Path:
    return season_root(season) / "future-enhancements"

# Legacy alias used during 2025-26 build scripts migration.
NEWSPAPER_PREP = newspapers_root()
