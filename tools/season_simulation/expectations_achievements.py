"""SC-169 — Athlete Achievement Unlock expectations for Season Simulation.

Authoritative paths:
- Shot milestones: Automation 066 creates unlocks → 059 awards SHOT_MILESTONE XP
- Perfect Week: 057 eligibility → 058 unlock → 059 PERFECT_WEEK XP
- Streaks: 053 Streak Occurrences → 054 STREAK_XP (NOT Athlete Achievement Unlocks)

Unlocks table keys use Milestone Source Key:
  SHOT_MILESTONE|{enrollmentId}|{shotMilestoneId}
  PERFECT_WEEK|{enrollmentId}|{weekId}
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Iterable, Mapping, Sequence


@dataclass(frozen=True)
class ShotMilestoneDef:
    record_id: str
    shot_count: int
    points: int = 0
    label: str = ""
    active: bool = True
    grade_band_id: str = ""
    grade_band_name: str = ""


@dataclass(frozen=True)
class ExpectedUnlock:
    kind: str  # shot_milestone | perfect_week
    source_key: str
    milestone_id: str = ""
    week_id: str = ""
    shot_count: int = 0
    points: int = 0
    label: str = ""


@dataclass
class AchievementExpectation:
    enrollment_id: str
    grade_band_id: str
    grade_band_name: str
    total_shots_counted: int
    perfect_week_eligible_count: int
    expected_shot_milestone_unlocks: list[ExpectedUnlock] = field(default_factory=list)
    expected_perfect_week_unlocks: list[ExpectedUnlock] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    @property
    def expected_unlock_count(self) -> int:
        return len(self.expected_shot_milestone_unlocks) + len(
            self.expected_perfect_week_unlocks
        )

    @property
    def expected_shot_milestone_xp_count(self) -> int:
        # One XP Event per unlock via 059 when award succeeds.
        return len(self.expected_shot_milestone_unlocks)

    def to_dict(self) -> dict[str, Any]:
        return {
            **asdict(self),
            "expected_unlock_count": self.expected_unlock_count,
            "expected_shot_milestone_xp_count": self.expected_shot_milestone_xp_count,
            "streaks_use_unlock_table": False,
        }


def shot_milestone_source_key(enrollment_id: str, shot_milestone_id: str) -> str:
    return f"SHOT_MILESTONE|{enrollment_id}|{shot_milestone_id}"


def perfect_week_source_key(enrollment_id: str, week_id: str) -> str:
    return f"PERFECT_WEEK|{enrollment_id}|{week_id}"


def _normalize_band_label(value: str) -> str:
    text = " ".join(str(value or "").strip().split())
    text = text.replace("–", "-").replace("—", "-").replace("−", "-")
    if text.lower().startswith("grades "):
        text = text[7:].strip()
    if text.lower().startswith("grade "):
        text = text[6:].strip()
    return text


def grade_band_matches(
    *,
    enrollment_band_id: str,
    enrollment_band_name: str,
    milestone_band_id: str,
    milestone_band_name: str,
) -> bool:
    """Mirror 066 gradeBandsMatchForMilestone: prefer IDs, else normalized labels."""
    if enrollment_band_id and milestone_band_id:
        return enrollment_band_id == milestone_band_id
    en = _normalize_band_label(enrollment_band_name)
    ms = _normalize_band_label(milestone_band_name)
    return bool(en and ms and en == ms)


def extract_grade_band_from_milestone_lookup(raw: Any) -> tuple[str, str]:
    """Parse Shot Milestones.Grade Band (link or lookup-of-link) into (id, name).

    REST/MCP lookup shape may nest values under valuesByLinkedRecordId while
    linkedRecordIds point at Target Goal Shot, not Grade Band.
    """
    if raw is None:
        return "", ""
    if isinstance(raw, list) and raw:
        first = raw[0]
        if isinstance(first, dict):
            return str(first.get("id") or ""), str(first.get("name") or "")
        return "", str(first)
    if isinstance(raw, dict):
        values = raw.get("valuesByLinkedRecordId") or {}
        if isinstance(values, dict):
            for nested in values.values():
                if isinstance(nested, list) and nested:
                    item = nested[0]
                    if isinstance(item, dict):
                        return str(item.get("id") or ""), str(item.get("name") or "")
                    return "", str(item)
                if isinstance(nested, dict):
                    return str(nested.get("id") or ""), str(nested.get("name") or "")
        # Flat {id, name}
        if raw.get("id") or raw.get("name"):
            return str(raw.get("id") or ""), str(raw.get("name") or "")
    return "", str(raw)


def select_crossed_shot_milestones(
    milestones: Sequence[ShotMilestoneDef],
    *,
    total_shots: int,
    grade_band_id: str,
    grade_band_name: str,
) -> list[ShotMilestoneDef]:
    crossed: list[ShotMilestoneDef] = []
    for ms in milestones:
        if not ms.active:
            continue
        if ms.shot_count <= 0 or ms.shot_count > total_shots:
            continue
        if not grade_band_matches(
            enrollment_band_id=grade_band_id,
            enrollment_band_name=grade_band_name,
            milestone_band_id=ms.grade_band_id,
            milestone_band_name=ms.grade_band_name,
        ):
            continue
        crossed.append(ms)
    crossed.sort(key=lambda m: (m.shot_count, m.record_id))
    return crossed


def build_achievement_expectation(
    *,
    enrollment_id: str,
    grade_band_id: str,
    grade_band_name: str,
    total_shots_counted: int,
    milestones: Sequence[ShotMilestoneDef],
    perfect_week_eligible_week_ids: Sequence[str] | None = None,
    perfect_week_eligible_count: int | None = None,
) -> AchievementExpectation:
    """Compute expected Athlete Achievement Unlocks under current production rules."""
    notes = [
        "Streak awards do not create Athlete Achievement Unlocks (053/054 path).",
        "Shot milestone unlocks require 066 (Run Shot Milestone Check?) then 059 XP.",
    ]
    crossed = select_crossed_shot_milestones(
        milestones,
        total_shots=total_shots_counted,
        grade_band_id=grade_band_id,
        grade_band_name=grade_band_name,
    )
    shot_unlocks = [
        ExpectedUnlock(
            kind="shot_milestone",
            source_key=shot_milestone_source_key(enrollment_id, ms.record_id),
            milestone_id=ms.record_id,
            shot_count=ms.shot_count,
            points=ms.points,
            label=ms.label,
        )
        for ms in crossed
    ]

    pw_weeks = list(perfect_week_eligible_week_ids or [])
    if perfect_week_eligible_count is None:
        perfect_week_eligible_count = len(pw_weeks)
    if perfect_week_eligible_count == 0:
        notes.append("Perfect Week Eligible = 0 → expect 0 PERFECT_WEEK unlocks.")
    pw_unlocks = [
        ExpectedUnlock(
            kind="perfect_week",
            source_key=perfect_week_source_key(enrollment_id, week_id),
            week_id=week_id,
        )
        for week_id in pw_weeks
    ]

    return AchievementExpectation(
        enrollment_id=enrollment_id,
        grade_band_id=grade_band_id,
        grade_band_name=grade_band_name,
        total_shots_counted=total_shots_counted,
        perfect_week_eligible_count=perfect_week_eligible_count,
        expected_shot_milestone_unlocks=shot_unlocks,
        expected_perfect_week_unlocks=pw_unlocks,
        notes=notes,
    )


def athlete1_t122531z_expectation() -> AchievementExpectation:
    """Frozen expectation for SEASON-SIM-2027-20260905T122531Z-athlete1 evidence."""
    # Production 9-12 band rec75ruo3XT5nSvaK; active milestones ≤ 13906 shots.
    milestones = [
        ShotMilestoneDef(
            "recjHsGxBGVoZ1Atb", 3000, 10, "9-12 - 12000 shots - 25%", True,
            "rec75ruo3XT5nSvaK", "9-12",
        ),
        ShotMilestoneDef(
            "recbUUwpAA6M91mH6", 6000, 15, "9-12 - 12000 shots - 50%", True,
            "rec75ruo3XT5nSvaK", "9-12",
        ),
        ShotMilestoneDef(
            "recuLqXBSyB7PE7jC", 9000, 20, "9-12 - 12000 shots - 75%", True,
            "rec75ruo3XT5nSvaK", "9-12",
        ),
        ShotMilestoneDef(
            "recSiWHRSsdjKytFU", 12000, 30, "9-12 - 12000 shots - 100%", True,
            "rec75ruo3XT5nSvaK", "9-12",
        ),
        ShotMilestoneDef(
            "rect6Rnm4NugIYzSp", 14400, 40, "9-12 - 12000 shots - 120%", True,
            "rec75ruo3XT5nSvaK", "9-12",
        ),
    ]
    return build_achievement_expectation(
        enrollment_id="recmImoXTlKb5NWSY",
        grade_band_id="rec75ruo3XT5nSvaK",
        grade_band_name="9-12",
        total_shots_counted=13906,
        milestones=milestones,
        perfect_week_eligible_count=0,
    )


def compare_unlock_source_keys(
    expected: Iterable[ExpectedUnlock],
    actual_source_keys: Iterable[str],
) -> dict[str, Any]:
    expected_keys = {u.source_key for u in expected}
    actual_keys = {str(k) for k in actual_source_keys if k}
    return {
        "expected_count": len(expected_keys),
        "actual_count": len(actual_keys),
        "missing": sorted(expected_keys - actual_keys),
        "unexpected": sorted(actual_keys - expected_keys),
        "matched": sorted(expected_keys & actual_keys),
        "ok": expected_keys == actual_keys,
    }


def milestone_defs_from_airtable_rows(
    rows: Sequence[Mapping[str, Any]],
) -> list[ShotMilestoneDef]:
    """Normalize list_records field maps into ShotMilestoneDef."""
    out: list[ShotMilestoneDef] = []
    for row in rows:
        rid = str(row.get("id") or "")
        fields = row.get("fields") or row
        if not rid and isinstance(row, Mapping):
            # MCP shape: id at top, fields in cellValuesByFieldId already flattened
            rid = str(row.get("id") or "")
        band_id, band_name = extract_grade_band_from_milestone_lookup(
            fields.get("Grade Band")
        )
        active = fields.get("Active")
        if active is None:
            active = fields.get("Active?")
        out.append(
            ShotMilestoneDef(
                record_id=rid,
                shot_count=int(fields.get("Milestone Shot Count") or 0),
                points=int(fields.get("Points Awarded") or 0),
                label=str(fields.get("Milestone Label") or ""),
                active=bool(active),
                grade_band_id=band_id,
                grade_band_name=band_name,
            )
        )
    return out
