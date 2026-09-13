"""Hard downstream settlement gates for season simulation (HW / PW / threshold / streak).

Writer create counts are not enough. Each gate polls observed Airtable state and
FAILS the profile with record IDs when expected settlements do not arrive.
"""

from __future__ import annotations

import time
from dataclasses import asdict, dataclass, field
from typing import Any, Callable, Sequence

from .run_registry import RunRegistry, run_marker

DEFAULT_POLL_INTERVAL_S = 5.0
DEFAULT_TIMEOUT_S = 300.0

STREAK_XP_THRESHOLDS = (3, 5, 7, 10, 20, 30, 40, 50, 60)
HOMEWORK_XP_PREFIX = "HOMEWORK_XP|"
PERFECT_WEEK_XP_PREFIX = "PERFECT_WEEK|"
WEEKLY_THRESHOLD_PREFIX = "WEEKLY_THRESHOLD|"
STREAK_XP_PREFIX = "STREAK|"


@dataclass
class SettlementCheck:
    name: str
    ok: bool
    detail: str = ""
    record_ids: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class DownstreamSettlementResult:
    run_id: str
    profile: str | None
    complete: bool
    timed_out: bool
    polls: int
    elapsed_s: float
    checks: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _link_ids(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        out: list[str] = []
        for item in value:
            if isinstance(item, str) and item.startswith("rec"):
                out.append(item)
            elif isinstance(item, dict) and str(item.get("id") or "").startswith("rec"):
                out.append(str(item["id"]))
        return out
    return []


def _as_boolish_one(value: Any) -> bool:
    if value is True:
        return True
    if value in (None, "", False):
        return False
    try:
        return int(float(value)) == 1
    except (TypeError, ValueError):
        return bool(value)


def _num(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _registry_ids(reg: RunRegistry, table: str) -> list[str]:
    return sorted(
        {
            r.record_id
            for r in reg.records
            if r.table == table and r.record_id and str(r.record_id).startswith("rec")
        }
    )


def classify_homework_settlement(
    *,
    hc_id: str,
    fields: dict[str, Any],
    xp_ids: list[str],
) -> SettlementCheck:
    was_link = _link_ids(fields.get("Weekly Athlete Summary Link"))
    award = str(fields.get("Award Status") or "")
    base_xp = _num(fields.get("Base XP Awarded"))
    needed = fields.get("Homework XP Reconciliation Needed?")
    satisfactory = bool(fields.get("Satisfactory?")) or str(
        fields.get("Completion Status") or ""
    ) == "Satisfactory"

    if not satisfactory:
        return SettlementCheck(
            name=f"homework|{hc_id}",
            ok=True,
            detail="not_satisfactory_skip",
            record_ids=[hc_id],
        )

    problems: list[str] = []
    if not was_link:
        problems.append("missing_Weekly_Athlete_Summary_Link")
    if award != "Awarded":
        problems.append(f"Award_Status={award or 'blank'}")
    if base_xp is None or base_xp <= 0:
        problems.append(f"Base_XP_Awarded={base_xp}")
    if needed not in (0, "0", False, None) and _as_boolish_one(needed):
        problems.append(f"Homework_XP_Reconciliation_Needed={needed}")
    if len(xp_ids) != 1:
        problems.append(f"xp_event_count={len(xp_ids)}")

    return SettlementCheck(
        name=f"homework|{hc_id}",
        ok=not problems,
        detail="; ".join(problems) if problems else "settled",
        record_ids=[hc_id, *was_link, *xp_ids],
    )


def classify_streak_settlement(
    *,
    enrollment_fields: dict[str, Any],
    expected_thresholds: Sequence[int],
    occurrence_by_threshold: dict[int, list[str]],
    xp_by_threshold: dict[int, list[str]],
) -> list[SettlementCheck]:
    current = int(_num(enrollment_fields.get("Current Shooting Streak")) or 0)
    longest = int(
        _num(enrollment_fields.get("Longest Streak Days"))
        or _num(enrollment_fields.get("Longest Shooting Streak"))
        or 0
    )
    checks: list[SettlementCheck] = []
    for thr in expected_thresholds:
        if current < thr and longest < thr:
            continue
        occ = occurrence_by_threshold.get(thr) or []
        xp = xp_by_threshold.get(thr) or []
        problems: list[str] = []
        if len(occ) != 1:
            problems.append(f"occurrence_count={len(occ)}")
        if len(xp) != 1:
            problems.append(f"xp_count={len(xp)}")
        checks.append(
            SettlementCheck(
                name=f"streak|{thr}",
                ok=not problems,
                detail="; ".join(problems) if problems else "settled",
                record_ids=[*occ, *xp],
            )
        )
    if current > longest:
        missing = [t for t in expected_thresholds if t <= current and t > longest]
        if missing:
            checks.append(
                SettlementCheck(
                    name="streak|current_gt_longest",
                    ok=False,
                    detail=(
                        f"Current Shooting Streak={current} > Longest={longest}; "
                        f"unmaterialized thresholds={missing}"
                    ),
                    record_ids=[],
                )
            )
    return checks


def requeue_was_perfect_week(client: Any, was_id: str) -> None:
    """Toggle Skipped → Pending so Automation 057 re-enters."""
    client.update_records(
        "Weekly Athlete Summary",
        [{"id": was_id, "fields": {"Perfect Week Automation Status": "Skipped"}}],
    )
    client.update_records(
        "Weekly Athlete Summary",
        [{"id": was_id, "fields": {"Perfect Week Automation Status": "Pending"}}],
    )


def _list_xp_for_enrollment_prefix(
    client: Any, *, enrollment_id: str, prefix: str
) -> list[dict[str, Any]]:
    try:
        return (
            client.list_records(
                "XP Events",
                formula=(
                    f"AND(FIND('{prefix}', {{Source Key}} & ''),"
                    f"FIND('{enrollment_id}', ARRAYJOIN({{Enrollment}})))"
                ),
                max_records=200,
            )
            or []
        )
    except Exception:
        return []


def poll_downstream_settlement(
    client: Any,
    reg: RunRegistry,
    *,
    run_id: str,
    profile: str | None,
    enrollment_id: str | None = None,
    expected_perfect_weeks: int | None = None,
    expected_threshold_events: int | None = None,
    expected_streak_thresholds: Sequence[int] | None = None,
    timeout_s: float = DEFAULT_TIMEOUT_S,
    poll_interval_s: float = DEFAULT_POLL_INTERVAL_S,
    sleep_fn: Callable[[float], None] = time.sleep,
    requeue_perfect_week: bool = True,
) -> DownstreamSettlementResult:
    """Poll HW / PW / threshold / streak until settled or timeout (hard fail)."""
    started = time.monotonic()
    polls = 0
    errors: list[str] = []
    last_checks: list[SettlementCheck] = []
    enr_id = enrollment_id or reg.enrollment_id
    _ = run_marker  # marker reserved for future notes

    hc_ids = _registry_ids(reg, "Homework Completions")
    was_ids = _registry_ids(reg, "Weekly Athlete Summary")
    expected_streaks = list(expected_streak_thresholds or STREAK_XP_THRESHOLDS)
    requeued = False

    while True:
        polls += 1
        checks: list[SettlementCheck] = []

        for hc_id in hc_ids:
            try:
                rec = client.get_record("Homework Completions", hc_id)
            except Exception as exc:  # noqa: BLE001
                checks.append(
                    SettlementCheck(
                        name=f"homework|{hc_id}",
                        ok=False,
                        detail=f"read_error:{exc}",
                        record_ids=[hc_id],
                    )
                )
                continue
            fields = rec.get("fields") or {}
            try:
                rows = (
                    client.list_records(
                        "XP Events",
                        formula=f"FIND('{hc_id}', {{Source Key}} & '')",
                        max_records=10,
                    )
                    or []
                )
                xp_ids = [
                    str(r["id"])
                    for r in rows
                    if str((r.get("fields") or {}).get("Source Key") or "").startswith(
                        HOMEWORK_XP_PREFIX
                    )
                ]
            except Exception:
                xp_ids = []
            checks.append(
                classify_homework_settlement(hc_id=hc_id, fields=fields, xp_ids=xp_ids)
            )

        for was_id in was_ids:
            try:
                was = client.get_record("Weekly Athlete Summary", was_id)
            except Exception as exc:  # noqa: BLE001
                checks.append(
                    SettlementCheck(
                        name=f"was_link|{was_id}",
                        ok=False,
                        detail=f"read_error:{exc}",
                        record_ids=[was_id],
                    )
                )
                continue
            was_fields = was.get("fields") or {}
            hc_inv = _link_ids(was_fields.get("Homework Completions Link"))
            pointing: list[str] = []
            for hc_id in hc_ids:
                try:
                    hf = client.get_record("Homework Completions", hc_id).get("fields") or {}
                except Exception:
                    continue
                if was_id in _link_ids(hf.get("Weekly Athlete Summary Link")):
                    pointing.append(hc_id)
            if pointing:
                missing = [h for h in pointing if h not in hc_inv]
                checks.append(
                    SettlementCheck(
                        name=f"was_inverse|{was_id}",
                        ok=not missing,
                        detail=(
                            "ok"
                            if not missing
                            else f"WAS missing Homework Completions Link for {missing}"
                        ),
                        record_ids=[was_id, *pointing],
                    )
                )

        hw_ok = all(
            c.ok
            for c in checks
            if c.name.startswith("homework|") or c.name.startswith("was_")
        )

        if hw_ok and requeue_perfect_week and not requeued and was_ids:
            for was_id in was_ids:
                try:
                    requeue_was_perfect_week(client, was_id)
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"pw_requeue:{was_id}:{exc}")
            requeued = True

        if expected_perfect_weeks is not None and enr_id:
            rows = _list_xp_for_enrollment_prefix(
                client, enrollment_id=str(enr_id), prefix=PERFECT_WEEK_XP_PREFIX
            )
            pw_xp = [str(r["id"]) for r in rows]
            checks.append(
                SettlementCheck(
                    name="perfect_week_xp",
                    ok=len(pw_xp) == int(expected_perfect_weeks),
                    detail=f"pw_xp={len(pw_xp)} expected={expected_perfect_weeks}",
                    record_ids=pw_xp,
                )
            )

        if expected_threshold_events is not None and enr_id:
            rows = _list_xp_for_enrollment_prefix(
                client, enrollment_id=str(enr_id), prefix=WEEKLY_THRESHOLD_PREFIX
            )
            keys = [str((r.get("fields") or {}).get("Source Key") or "") for r in rows]
            dupes = sorted({k for k in keys if k and keys.count(k) > 1})
            checks.append(
                SettlementCheck(
                    name="weekly_threshold_xp",
                    ok=len(rows) == int(expected_threshold_events) and not dupes,
                    detail=(
                        f"count={len(rows)} expected={expected_threshold_events}"
                        + (f" dupes={dupes}" if dupes else "")
                    ),
                    record_ids=[str(r["id"]) for r in rows],
                )
            )

        if enr_id and expected_streaks:
            try:
                enr_fields = (client.get_record("Enrollments", enr_id).get("fields") or {})
            except Exception as exc:  # noqa: BLE001
                enr_fields = {}
                checks.append(
                    SettlementCheck(
                        name="streak|enrollment",
                        ok=False,
                        detail=f"read_error:{exc}",
                        record_ids=[enr_id],
                    )
                )
            occurrence_by_thr: dict[int, list[str]] = {t: [] for t in expected_streaks}
            try:
                occ_rows = (
                    client.list_records(
                        "Streak Occurrences",
                        formula=f"FIND('{enr_id}', ARRAYJOIN({{Enrollment}}))",
                        max_records=100,
                    )
                    or []
                )
            except Exception:
                occ_rows = []
            for row in occ_rows:
                f = row.get("fields") or {}
                days = int(_num(f.get("Streak Days")) or 0)
                key = str(f.get("Streak Occurrence Key") or "").lower()
                for thr in expected_streaks:
                    if days == thr or f"{thr}-day" in key or f"{thr}_day" in key:
                        occurrence_by_thr[thr].append(str(row["id"]))
            key_counts: dict[str, list[str]] = {}
            for row in occ_rows:
                k = str((row.get("fields") or {}).get("Streak Occurrence Key") or "").strip()
                if not k:
                    continue
                key_counts.setdefault(k, []).append(str(row["id"]))
            for k, ids in key_counts.items():
                if len(ids) > 1:
                    checks.append(
                        SettlementCheck(
                            name=f"streak_dupe|{k}",
                            ok=False,
                            detail=f"duplicate_streak_occurrence_key count={len(ids)}",
                            record_ids=ids,
                        )
                    )
            xp_by_thr: dict[int, list[str]] = {t: [] for t in expected_streaks}
            xp_rows = _list_xp_for_enrollment_prefix(
                client, enrollment_id=str(enr_id), prefix=STREAK_XP_PREFIX
            )
            for row in xp_rows:
                key = str((row.get("fields") or {}).get("Source Key") or "").lower()
                for thr in expected_streaks:
                    if f"{thr}" in key and ("day" in key or "streak" in key):
                        xp_by_thr[thr].append(str(row["id"]))
            checks.extend(
                classify_streak_settlement(
                    enrollment_fields=enr_fields,
                    expected_thresholds=expected_streaks,
                    occurrence_by_threshold=occurrence_by_thr,
                    xp_by_threshold=xp_by_thr,
                )
            )

        last_checks = checks
        failed = [c for c in checks if not c.ok]
        if not failed:
            return DownstreamSettlementResult(
                run_id=run_id,
                profile=profile,
                complete=True,
                timed_out=False,
                polls=polls,
                elapsed_s=time.monotonic() - started,
                checks=[c.to_dict() for c in checks],
                errors=errors,
            )

        if time.monotonic() - started >= timeout_s:
            errors.extend(f"{c.name}: {c.detail} ids={c.record_ids}" for c in failed)
            return DownstreamSettlementResult(
                run_id=run_id,
                profile=profile,
                complete=False,
                timed_out=True,
                polls=polls,
                elapsed_s=time.monotonic() - started,
                checks=[c.to_dict() for c in last_checks],
                errors=errors,
            )
        sleep_fn(poll_interval_s)


def stage_d_downstream_settlement_hook(
    client: Any | None,
    reg: RunRegistry,
    *,
    run_id: str,
    profile: str | None = None,
    expected_perfect_weeks: int | None = None,
    expected_threshold_events: int | None = None,
    expected_streak_thresholds: Sequence[int] | None = None,
    timeout_s: float = DEFAULT_TIMEOUT_S,
    poll_interval_s: float = DEFAULT_POLL_INTERVAL_S,
) -> dict[str, Any]:
    """Stage D extension — hard HW/PW/threshold/streak settlement."""
    if client is None:
        return {
            "stage": "D_downstream_settlement",
            "profile": profile,
            "status": "skipped",
            "complete": False,
            "note": "No client — downstream settlement skipped",
        }
    result = poll_downstream_settlement(
        client,
        reg,
        run_id=run_id,
        profile=profile,
        expected_perfect_weeks=expected_perfect_weeks,
        expected_threshold_events=expected_threshold_events,
        expected_streak_thresholds=expected_streak_thresholds,
        timeout_s=timeout_s,
        poll_interval_s=poll_interval_s,
    )
    return {
        "stage": "D_downstream_settlement",
        "profile": profile,
        "status": "ok" if result.complete else ("timeout" if result.timed_out else "failed"),
        "complete": result.complete,
        "result": result.to_dict(),
        "errors": list(result.errors),
    }


__all__ = [
    "STREAK_XP_THRESHOLDS",
    "SettlementCheck",
    "DownstreamSettlementResult",
    "classify_homework_settlement",
    "classify_streak_settlement",
    "poll_downstream_settlement",
    "requeue_was_perfect_week",
    "stage_d_downstream_settlement_hook",
]
