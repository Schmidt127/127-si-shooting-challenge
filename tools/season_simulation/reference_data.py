"""Dynamic resolution of configuration / reference data from Airtable.

Never invent homework, Zoom, goals, XP rules, levels, or gates — read live.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from typing import Any

from .airtable_client import (
    AirtableClient,
    as_number,
    fields_of,
    first_link,
    is_truthy,
    linked_ids,
    txt,
)
from .constants import ATHLETE_GRADE, SIM_END, SIM_START
from .simulation_clock import saturday_of, sunday_of


@dataclass
class GradeBandInfo:
    record_id: str
    name: str
    min_grade: int | None
    max_grade: int | None
    active: bool
    target_goal_ids: list[str] = field(default_factory=list)


@dataclass
class TargetGoalInfo:
    record_id: str
    label: str
    total_shot_target: int | None
    grade_band_id: str
    active: bool
    program_instance_ids: list[str] = field(default_factory=list)


@dataclass
class HomeworkAssignmentInfo:
    record_id: str
    display: str
    week_id: str
    grade_band_id: str
    slot: str
    library_id: str
    active: bool
    program_instance_id: str
    schedule_key: str = ""


@dataclass
class ZoomMeetingInfo:
    record_id: str
    display: str
    meeting_name: str
    start_time: str
    week_id: str
    status: str


@dataclass
class WeekInfo:
    record_id: str
    name: str
    start: date | None
    end: date | None
    program_instance_id: str = ""


@dataclass
class LevelInfo:
    record_id: str
    name: str
    xp_required: int | None
    sort_order: int | None
    active: bool
    gate_rule_ids: list[str] = field(default_factory=list)


@dataclass
class ReferenceSnapshot:
    grade_band: GradeBandInfo | None
    highest_goal: TargetGoalInfo | None
    all_goals_for_band: list[TargetGoalInfo]
    homework: list[HomeworkAssignmentInfo]
    zoom_meetings: list[ZoomMeetingInfo]
    weeks_covering_window: list[WeekInfo]
    levels: list[LevelInfo]
    level_gate_rules_count: int
    achievements_count: int
    shot_milestones_count: int
    xp_reward_rules_count: int
    config_rows: list[dict[str, Any]]
    ambiguous: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        def _week(w: WeekInfo) -> dict[str, Any]:
            d = asdict(w)
            d["start"] = w.start.isoformat() if w.start else None
            d["end"] = w.end.isoformat() if w.end else None
            return d

        return {
            "grade_band": asdict(self.grade_band) if self.grade_band else None,
            "highest_goal": asdict(self.highest_goal) if self.highest_goal else None,
            "all_goals_for_band": [asdict(g) for g in self.all_goals_for_band],
            "homework_count": len(self.homework),
            "homework": [asdict(h) for h in self.homework],
            "zoom_meetings_count": len(self.zoom_meetings),
            "zoom_meetings": [asdict(z) for z in self.zoom_meetings],
            "weeks_covering_window": [_week(w) for w in self.weeks_covering_window],
            "levels": [asdict(lv) for lv in self.levels],
            "level_gate_rules_count": self.level_gate_rules_count,
            "achievements_count": self.achievements_count,
            "shot_milestones_count": self.shot_milestones_count,
            "xp_reward_rules_count": self.xp_reward_rules_count,
            "config_rows": self.config_rows,
            "ambiguous": list(self.ambiguous),
            "warnings": list(self.warnings),
            "errors": list(self.errors),
        }


def parse_date_value(value: Any) -> date | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()
    try:
        return date.fromisoformat(s[:10])
    except ValueError:
        return None


def grade_covers(min_g: int | None, max_g: int | None, grade: int) -> bool:
    if min_g is None or max_g is None:
        return False
    return min_g <= grade <= max_g


def resolve_grade_band_for_grade(
    client: AirtableClient,
    grade: str | int = ATHLETE_GRADE,
) -> tuple[GradeBandInfo | None, list[str]]:
    ambiguous: list[str] = []
    grade_n = int(str(grade))
    rows = client.list_records(
        "Grade Bands",
        fields=[
            "Grade Band Name",
            "Min Grade",
            "Max Grade",
            "Active?",
            "Target Goal Shots",
        ],
    )
    matches: list[GradeBandInfo] = []
    for rec in rows:
        f = fields_of(rec)
        info = GradeBandInfo(
            record_id=rec["id"],
            name=txt(f.get("Grade Band Name")),
            min_grade=int(as_number(f.get("Min Grade")) or -999),
            max_grade=int(as_number(f.get("Max Grade")) or -999),
            active=is_truthy(f.get("Active?")),
            target_goal_ids=linked_ids(f.get("Target Goal Shots")),
        )
        if info.min_grade == -999:
            info.min_grade = None
        if info.max_grade == -999:
            info.max_grade = None
        if info.active and grade_covers(info.min_grade, info.max_grade, grade_n):
            matches.append(info)

    if not matches:
        return None, [f"No active Grade Band covers grade {grade_n}"]
    if len(matches) > 1:
        ambiguous.append(
            "Multiple active Grade Bands cover grade "
            f"{grade_n}: " + ", ".join(f"{m.name} ({m.record_id})" for m in matches)
        )
        # Prefer wider HS band naming if present; still report ambiguity.
        preferred = next((m for m in matches if "9-12" in m.name or "9–12" in m.name), matches[0])
        return preferred, ambiguous
    return matches[0], ambiguous


def resolve_highest_goal_for_band(
    client: AirtableClient,
    band: GradeBandInfo,
) -> tuple[TargetGoalInfo | None, list[TargetGoalInfo], list[str]]:
    warnings: list[str] = []
    goals: list[TargetGoalInfo] = []
    rows = client.list_records(
        "Target Goal Shots",
        fields=[
            "Target Label",
            "Total Shot Target",
            "Grade Band",
            "Active?",
            "Program Instance",
        ],
    )
    for rec in rows:
        f = fields_of(rec)
        gb = first_link(f.get("Grade Band"))
        if gb != band.record_id:
            # Also accept goals linked from the band side
            if rec["id"] not in band.target_goal_ids:
                continue
        target = as_number(f.get("Total Shot Target"))
        goals.append(
            TargetGoalInfo(
                record_id=rec["id"],
                label=txt(f.get("Target Label")),
                total_shot_target=int(target) if target is not None else None,
                grade_band_id=gb or band.record_id,
                active=is_truthy(f.get("Active?")),
                program_instance_ids=linked_ids(f.get("Program Instance")),
            )
        )

    active = [g for g in goals if g.active and g.total_shot_target is not None]
    pool = active or [g for g in goals if g.total_shot_target is not None]
    if not pool:
        return None, goals, ["No Target Goal Shots with Total Shot Target for grade band"]
    if len(pool) > 1:
        warnings.append(
            f"{len(pool)} goal options for band {band.name}; selecting highest Total Shot Target"
        )
    highest = max(pool, key=lambda g: g.total_shot_target or 0)
    return highest, goals, warnings


def resolve_homework(
    client: AirtableClient,
    *,
    grade_band_id: str | None = None,
    active_only: bool = True,
) -> list[HomeworkAssignmentInfo]:
    rows = client.list_records(
        "Program Homework Assignments",
        fields=[
            "Program Homework Assignment Display",
            "Program Homework Assignment",
            "Week",
            "Grade Band",
            "Homework Slot",
            "Homework Assignment",
            "Active?",
            "Program Instance",
            "Schedule Key",
        ],
    )
    out: list[HomeworkAssignmentInfo] = []
    for rec in rows:
        f = fields_of(rec)
        gb = first_link(f.get("Grade Band"))
        if grade_band_id and gb and gb != grade_band_id:
            continue
        active = is_truthy(f.get("Active?"))
        if active_only and not active:
            continue
        out.append(
            HomeworkAssignmentInfo(
                record_id=rec["id"],
                display=txt(f.get("Program Homework Assignment Display"))
                or txt(f.get("Program Homework Assignment")),
                week_id=first_link(f.get("Week")),
                grade_band_id=gb,
                slot=txt(f.get("Homework Slot")),
                library_id=first_link(f.get("Homework Assignment")),
                active=active,
                program_instance_id=first_link(f.get("Program Instance")),
                schedule_key=txt(f.get("Schedule Key")),
            )
        )
    out.sort(key=lambda h: (h.week_id, h.slot, h.record_id))
    return out


def resolve_zoom_meetings(client: AirtableClient) -> list[ZoomMeetingInfo]:
    rows = client.list_records(
        "Zoom Meetings",
        fields=[
            "Meeting Display Name",
            "Meeting Name",
            "Start Time",
            "Week",
            "Meeting Status",
        ],
    )
    out: list[ZoomMeetingInfo] = []
    for rec in rows:
        f = fields_of(rec)
        status = txt(f.get("Meeting Status"))
        if status.lower() == "cancelled":
            continue
        out.append(
            ZoomMeetingInfo(
                record_id=rec["id"],
                display=txt(f.get("Meeting Display Name")),
                meeting_name=txt(f.get("Meeting Name")),
                start_time=txt(f.get("Start Time")),
                week_id=first_link(f.get("Week")),
                status=status,
            )
        )
    out.sort(key=lambda z: (z.start_time, z.record_id))
    return out


def resolve_weeks_covering_window(
    client: AirtableClient,
    *,
    start: date = SIM_START,
    end: date = SIM_END,
) -> list[WeekInfo]:
    rows = client.list_records(
        "Weeks",
        fields=["Week Name", "Start Date", "End Date", "Program Instance"],
    )
    out: list[WeekInfo] = []
    for rec in rows:
        f = fields_of(rec)
        ws = parse_date_value(f.get("Start Date"))
        we = parse_date_value(f.get("End Date"))
        if not ws or not we:
            continue
        # Overlap with [start, end]
        if we < start or ws > end:
            continue
        out.append(
            WeekInfo(
                record_id=rec["id"],
                name=txt(f.get("Week Name")),
                start=ws,
                end=we,
                program_instance_id=first_link(f.get("Program Instance")),
            )
        )
    out.sort(key=lambda w: (w.start or date.min, w.name))
    return out


def resolve_levels(client: AirtableClient) -> list[LevelInfo]:
    rows = client.list_records(
        "Levels",
        fields=[
            "Level Name",
            "XP Required (Cumulative)",
            "Sort Order",
            "Active?",
            "Level Gate Rules",
        ],
    )
    out: list[LevelInfo] = []
    for rec in rows:
        f = fields_of(rec)
        xp = as_number(f.get("XP Required (Cumulative)"))
        so = as_number(f.get("Sort Order"))
        out.append(
            LevelInfo(
                record_id=rec["id"],
                name=txt(f.get("Level Name")),
                xp_required=int(xp) if xp is not None else None,
                sort_order=int(so) if so is not None else None,
                active=is_truthy(f.get("Active?")),
                gate_rule_ids=linked_ids(f.get("Level Gate Rules")),
            )
        )
    out.sort(key=lambda lv: (lv.sort_order is None, lv.sort_order or 0, lv.xp_required or 0))
    return out


def load_reference_snapshot(client: AirtableClient) -> ReferenceSnapshot:
    ambiguous: list[str] = []
    warnings: list[str] = []
    errors: list[str] = []

    band, band_amb = resolve_grade_band_for_grade(client, ATHLETE_GRADE)
    ambiguous.extend(band_amb)
    if not band:
        errors.append(f"Could not resolve Grade Band for grade {ATHLETE_GRADE}")

    highest = None
    all_goals: list[TargetGoalInfo] = []
    if band:
        highest, all_goals, goal_warn = resolve_highest_goal_for_band(client, band)
        warnings.extend(goal_warn)
        if not highest:
            errors.append("Could not resolve highest Target Goal Shots for Grade 12 band")

    homework = resolve_homework(
        client, grade_band_id=band.record_id if band else None, active_only=True
    )
    if not homework:
        warnings.append(
            "No active Program Homework Assignments found for Grade 12 band "
            "(final run may require assignments to be present)"
        )

    zoom = resolve_zoom_meetings(client)
    if len(zoom) < 2:
        warnings.append(
            f"Found {len(zoom)} Zoom Meetings (non-cancelled); final run expects two selected meetings"
        )

    weeks = resolve_weeks_covering_window(client)
    # Coverage check day-by-day
    uncovered: list[str] = []
    cur = SIM_START
    from datetime import timedelta

    while cur <= SIM_END:
        if not any(w.start and w.end and w.start <= cur <= w.end for w in weeks):
            uncovered.append(cur.isoformat())
        cur += timedelta(days=1)
    if uncovered:
        errors.append(
            f"{len(uncovered)} simulation dates lack a Weeks row "
            f"(first missing: {uncovered[0]}; last: {uncovered[-1]}). "
            "Weeks covering May–June 2027 are required before execute."
        )

    levels = resolve_levels(client)
    if not levels:
        errors.append("No Levels records found")

    gate_count = len(client.list_records("Level Gate Rules", max_records=500))
    ach_count = len(client.list_records("Achievements", max_records=500))
    ms_count = len(client.list_records("Shot Milestones", max_records=500))
    xp_count = len(client.list_records("XP Reward Rules", max_records=500))
    if gate_count == 0:
        warnings.append("No Level Gate Rules found")
    if ach_count == 0:
        warnings.append("No Achievements found")
    if ms_count == 0:
        warnings.append("No Shot Milestones found")
    if xp_count == 0:
        errors.append("No XP Reward Rules found")

    config_rows_raw = client.list_records("Config", max_records=20)
    config_rows = [
        {"id": r["id"], "active_school_year": txt(fields_of(r).get("Active School Year"))}
        for r in config_rows_raw
    ]
    if not config_rows:
        warnings.append("No Config rows found")

    # Sunday–Saturday note for window
    if sunday_of(SIM_START) != SIM_START:
        warnings.append(
            f"Simulation starts mid-week ({SIM_START} is {SIM_START.strftime('%A')}; "
            f"week Sunday={sunday_of(SIM_START)}, Saturday={saturday_of(SIM_START)})"
        )

    return ReferenceSnapshot(
        grade_band=band,
        highest_goal=highest,
        all_goals_for_band=all_goals,
        homework=homework,
        zoom_meetings=zoom,
        weeks_covering_window=weeks,
        levels=levels,
        level_gate_rules_count=gate_count,
        achievements_count=ach_count,
        shot_milestones_count=ms_count,
        xp_reward_rules_count=xp_count,
        config_rows=config_rows,
        ambiguous=ambiguous,
        warnings=warnings,
        errors=errors,
    )

