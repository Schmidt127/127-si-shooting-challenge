"""Downstream cascade settlement — homework, streak, threshold, PW, zoom gate.

Polls observed Airtable state after Submission Base XP (Stage D) settles.
Hard-fails with exact record IDs on timeout (season sim orchestration contract).
"""

from __future__ import annotations

import time
from dataclasses import asdict, dataclass, field
from typing import Any, Callable

from .business_expectations import expectations_for_profile
from .constants import DEFAULT_STREAK_XP_THRESHOLDS

DEFAULT_DOWNSTREAM_TIMEOUT_S = 600.0
DEFAULT_DOWNSTREAM_POLL_S = 5.0
DEFAULT_DOWNSTREAM_STABLE_ROUNDS = 2

HOMEWORK_XP_PREFIX = "HOMEWORK_XP|"
STREAK_XP_PREFIX = "STREAK_XP|"
WEEKLY_THRESHOLD_PREFIX = "WEEKLY_THRESHOLD|"
PERFECT_WEEK_PREFIX = "PERFECT_WEEK|"


@dataclass
class DownstreamCheck:
    name: str
    ok: bool
    detail: str
    record_ids: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class DownstreamSettlementResult:
    run_id: str
    profile: str | None
    enrollment_id: str
    complete: bool
    timed_out: bool
    polls: int
    elapsed_s: float
    checks: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    rearm: dict[str, Any] = field(default_factory=dict)

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


def _norm_enrollment_id(enrollment_id: str) -> str:
    return (enrollment_id or "").strip().lower()


def list_xp_events_by_prefix(
    list_records: Callable[..., list[dict[str, Any]]],
    *,
    enrollment_id: str,
    prefix: str,
) -> list[dict[str, Any]]:
    formula = (
        f"AND(FIND('{prefix}', {{Source Key}}), "
        f"FIND('{enrollment_id}', ARRAYJOIN({{Enrollment}})), {{Active?}}=1)"
    )
    try:
        return list_records(
            "XP Events",
            fields=["Source Key", "XP Points", "Active?", "Enrollment"],
            formula=formula,
            max_records=200,
        ) or []
    except TypeError:
        rows = list_records("XP Events", fields=["Source Key", "Active?", "Enrollment"]) or []
        out = []
        for row in rows:
            f = row.get("fields") or row
            sk = str(f.get("Source Key") or "")
            if not sk.startswith(prefix):
                continue
            if enrollment_id not in _link_ids(f.get("Enrollment")):
                continue
            if not _as_boolish_one(f.get("Active?")):
                continue
            out.append(row)
        return out
    except Exception:
        return []


def list_active_xp_for_hc(
    list_records: Callable[..., list[dict[str, Any]]],
    hc_id: str,
) -> list[str]:
    key = f"{HOMEWORK_XP_PREFIX}{hc_id}"
    try:
        rows = list_records(
            "XP Events",
            fields=["Source Key", "Active?"],
            formula=f"AND({{Source Key}}='{key}', {{Active?}}=1)",
            max_records=5,
        )
    except TypeError:
        rows = list_records("XP Events", fields=["Source Key", "Active?"]) or []
        rows = [
            r
            for r in rows
            if str((r.get("fields") or r).get("Source Key") or "") == key
            and _as_boolish_one((r.get("fields") or r).get("Active?"))
        ]
    except Exception:
        return []
    return [str(r.get("id") or "") for r in rows or [] if r.get("id")]


def classify_homework_completion(
    *,
    hc_id: str,
    fields: dict[str, Any],
    list_records: Callable[..., list[dict[str, Any]]] | None,
) -> DownstreamCheck:
    award = str(fields.get("Award Status") or "").strip()
    recon = fields.get("Homework XP Reconciliation Needed?")
    was_link = _link_ids(fields.get("Weekly Athlete Summary Link"))
    xp_ids: list[str] = []
    if callable(list_records):
        xp_ids = list_active_xp_for_hc(list_records, hc_id)

    if award.lower() == "awarded" and not _as_boolish_one(recon) and xp_ids:
        return DownstreamCheck(
            name=f"homework|{hc_id}",
            ok=True,
            detail="settled",
            record_ids=[hc_id, *was_link, *xp_ids],
        )

    parts: list[str] = []
    if award.lower() != "awarded":
        parts.append(f"Award_Status={award or 'blank'}")
    if _as_boolish_one(recon):
        parts.append("Homework_XP_Reconciliation_Needed=1")
    if not xp_ids:
        parts.append("xp_event_count=0")
    if not was_link:
        parts.append("missing_Weekly_Athlete_Summary_Link")

    return DownstreamCheck(
        name=f"homework|{hc_id}",
        ok=False,
        detail="; ".join(parts) or "not_settled",
        record_ids=[hc_id, *was_link],
    )


def count_streak_occurrences_for_threshold(
    list_records: Callable[..., list[dict[str, Any]]],
    *,
    enrollment_id: str,
    threshold: int,
) -> tuple[int, int]:
    """Return (occurrence_count, xp_event_count) for one streak threshold."""
    enr_norm = _norm_enrollment_id(enrollment_id)
    occ_formula = (
        f"AND(FIND('{enrollment_id}', ARRAYJOIN({{Enrollment}})), "
        f"{{Streak Days}}={threshold}, {{Active?}}=1)"
    )
    try:
        occ_rows = list_records(
            "Streak Occurrences",
            fields=["Enrollment", "Streak Days", "Active?", "XP Events"],
            formula=occ_formula,
            max_records=20,
        ) or []
    except TypeError:
        occ_rows = list_records(
            "Streak Occurrences",
            fields=["Enrollment", "Streak Days", "Active?"],
        ) or []
        occ_rows = [
            r
            for r in occ_rows
            if int((r.get("fields") or r).get("Streak Days") or 0) == threshold
            and _as_boolish_one((r.get("fields") or r).get("Active?"))
            and enr_norm
            in [_norm_enrollment_id(x) for x in _link_ids((r.get("fields") or r).get("Enrollment"))]
        ]
    except Exception:
        occ_rows = []

    xp_rows = list_xp_events_by_prefix(
        list_records,
        enrollment_id=enrollment_id,
        prefix=f"{STREAK_XP_PREFIX}",
    )
    xp_for_threshold = [
        r
        for r in xp_rows
        if f"|{threshold}|" in str((r.get("fields") or r).get("Source Key") or "")
        or f"_{threshold}-day" in str((r.get("fields") or r).get("Source Key") or "").lower()
        or f"{threshold}-day" in str((r.get("fields") or r).get("Source Key") or "").lower()
    ]
    return len(occ_rows), len(xp_for_threshold)


def snapshot_downstream_checks(
    client: Any,
    reg: Any,
    *,
    enrollment_id: str,
    profile: str,
) -> list[DownstreamCheck]:
    get_record = getattr(client, "get_record", None)
    list_records = getattr(client, "list_records", None)
    if not callable(get_record):
        raise ValueError("client must provide get_record")

    exp = expectations_for_profile(profile) or {}
    checks: list[DownstreamCheck] = []

    hc_ids: list[str] = []
    was_ids: list[str] = []
    for rec in reg.records:
        if rec.table == "Homework Completions" and rec.record_id:
            hc_ids.append(rec.record_id)
        if (
            rec.table == "Weekly Athlete Summary"
            and rec.record_id
            and "|WAS|" in str(rec.dedupe_key or "")
        ):
            was_ids.append(rec.record_id)

    hc_ids = sorted(set(hc_ids))
    was_ids = sorted(set(was_ids))

    for hc_id in hc_ids:
        try:
            raw = get_record("Homework Completions", hc_id)
            fields = raw.get("fields") or {}
        except Exception as exc:  # noqa: BLE001
            checks.append(
                DownstreamCheck(
                    name=f"homework|{hc_id}",
                    ok=False,
                    detail=f"get_record failed: {exc}",
                    record_ids=[hc_id],
                )
            )
            continue
        checks.append(
            classify_homework_completion(
                hc_id=hc_id,
                fields=fields,
                list_records=list_records if callable(list_records) else None,
            )
        )

    # WAS inverse: each WAS should link back to registry HC rows for that week.
    for was_id in was_ids:
        try:
            was = get_record("Weekly Athlete Summary", was_id)
            linked = _link_ids((was.get("fields") or {}).get("Homework Completions Link"))
            hc_for_was = [
                hc_id
                for hc_id in hc_ids
                if was_id
                in _link_ids(
                    (get_record("Homework Completions", hc_id).get("fields") or {}).get(
                        "Weekly Athlete Summary Link"
                    )
                )
            ]
            ok = len(linked) >= len(hc_for_was) and len(hc_for_was) > 0
            checks.append(
                DownstreamCheck(
                    name=f"was_inverse|{was_id}",
                    ok=ok,
                    detail="ok" if ok else f"was_links={len(linked)} hc_for_week={len(hc_for_was)}",
                    record_ids=[was_id, *linked, *hc_for_was],
                )
            )
        except Exception as exc:  # noqa: BLE001
            checks.append(
                DownstreamCheck(
                    name=f"was_inverse|{was_id}",
                    ok=False,
                    detail=str(exc),
                    record_ids=[was_id],
                )
            )

    if callable(list_records):
        pw_events = list_xp_events_by_prefix(
            list_records, enrollment_id=enrollment_id, prefix=PERFECT_WEEK_PREFIX
        )
        expected_pw = int(exp.get("perfect_weeks") or 10)
        checks.append(
            DownstreamCheck(
                name="perfect_week_xp",
                ok=len(pw_events) >= expected_pw,
                detail=f"pw_xp={len(pw_events)} expected={expected_pw}",
                record_ids=[str(r.get("id") or "") for r in pw_events],
            )
        )

        wt_events = list_xp_events_by_prefix(
            list_records, enrollment_id=enrollment_id, prefix=WEEKLY_THRESHOLD_PREFIX
        )
        expected_wt = int(exp.get("weekly_threshold_event_count") or 26)
        checks.append(
            DownstreamCheck(
                name="weekly_threshold_xp",
                ok=len(wt_events) >= expected_wt,
                detail=f"count={len(wt_events)} expected={expected_wt}",
                record_ids=[str(r.get("id") or "") for r in wt_events],
            )
        )

        streak_thresholds = list(exp.get("streak_thresholds") or DEFAULT_STREAK_XP_THRESHOLDS)
        for threshold in streak_thresholds:
            occ_n, xp_n = count_streak_occurrences_for_threshold(
                list_records,
                enrollment_id=enrollment_id,
                threshold=threshold,
            )
            checks.append(
                DownstreamCheck(
                    name=f"streak|{threshold}",
                    ok=occ_n >= 1 and xp_n >= 1,
                    detail=f"occurrence_count={occ_n}; xp_count={xp_n}",
                    record_ids=[],
                )
            )

        try:
            enr = get_record("Enrollments", enrollment_id)
            ef = enr.get("fields") or {}
            current = int(float(ef.get("Current Shooting Streak") or 0))
            longest = int(float(ef.get("Longest Streak Days") or 0))
            min_longest = int(exp.get("minimum_longest_streak_days") or 60)
            unmaterialized = [
                t
                for t in streak_thresholds
                if current >= t
                and count_streak_occurrences_for_threshold(
                    list_records, enrollment_id=enrollment_id, threshold=t
                )[0]
                == 0
            ]
            checks.append(
                DownstreamCheck(
                    name="streak|current_gt_longest",
                    ok=longest >= min_longest and not unmaterialized,
                    detail=(
                        f"Current Shooting Streak={current} > Longest={longest}; "
                        f"unmaterialized thresholds={unmaterialized}"
                    ),
                    record_ids=[],
                )
            )
        except Exception as exc:  # noqa: BLE001
            checks.append(
                DownstreamCheck(
                    name="streak|current_gt_longest",
                    ok=False,
                    detail=str(exc),
                    record_ids=[],
                )
            )

        zoom_gate_ok = _check_effective_zoom_gate(client, enrollment_id, exp)
        checks.append(zoom_gate_ok)

    return checks


def _check_effective_zoom_gate(
    client: Any,
    enrollment_id: str,
    exp: dict[str, Any],
) -> DownstreamCheck:
    """Verify effective zoom gate credit count (live ∪ recording) meets minimum."""
    minimum = int(exp.get("minimum_effective_zoom_gate_meetings") or 2)
    get_record = getattr(client, "get_record", None)
    list_records = getattr(client, "list_records", None)
    if not callable(get_record):
        return DownstreamCheck(
            name="zoom_gate_effective",
            ok=False,
            detail="get_record unavailable",
            record_ids=[],
        )

    try:
        enr = get_record("Enrollments", enrollment_id)
        ef = enr.get("fields") or {}
        effective = ef.get("Effective Zoom Gate Meetings")
        if effective is not None and str(effective).strip() != "":
            count = int(float(effective))
        else:
            count = _compute_effective_zoom_count(
                list_records if callable(list_records) else None,
                enrollment_id=enrollment_id,
                live_count=int(float(ef.get("Total Zoom Attendances") or 0)),
            )
        gate_debug = str(ef.get("Gate Debug Summary") or "")
        ok = count >= minimum
        return DownstreamCheck(
            name="zoom_gate_effective",
            ok=ok,
            detail=f"effective_zoom={count}/{minimum}; gate_debug={gate_debug[:120]}",
            record_ids=[enrollment_id],
        )
    except Exception as exc:  # noqa: BLE001
        return DownstreamCheck(
            name="zoom_gate_effective",
            ok=False,
            detail=str(exc),
            record_ids=[enrollment_id],
        )


def _compute_effective_zoom_count(
    list_records: Callable[..., list] | None,
    *,
    enrollment_id: str,
    live_count: int,
) -> int:
    """Mirror 042 v3.1+ live Attendees meetings ∪ qualifying recording credits."""
    if not callable(list_records):
        return live_count

    live_meeting_ids: set[str] = set()
    try:
        zm_rows = list_records(
            "Zoom Meetings",
            fields=["Attendees"],
            max_records=200,
        ) or []
        for row in zm_rows:
            mids = _link_ids((row.get("fields") or row).get("Attendees"))
            if enrollment_id in mids:
                live_meeting_ids.add(str(row.get("id") or ""))
    except Exception:
        live_meeting_ids = set()

    meeting_set = {m for m in live_meeting_ids if m}
    try:
        za_rows = list_records(
            "Zoom Attendance",
            fields=[
                "Enrollment",
                "Zoom Meeting",
                "Attendance Method",
                "Zoom Credit Approved?",
                "Zoom Gate Credit Earned?",
                "Zoom Credit Conflict?",
                "Recording Quiz Review Status",
            ],
            max_records=500,
        ) or []
    except Exception:
        return max(live_count, len(meeting_set))

    for row in za_rows:
        f = row.get("fields") or row
        if enrollment_id not in _link_ids(f.get("Enrollment")):
            continue
        if str(f.get("Attendance Method") or "") != "Recording Quiz":
            continue
        if _as_boolish_one(f.get("Zoom Credit Conflict?")):
            continue
        if not _as_boolish_one(f.get("Zoom Credit Approved?")):
            continue
        if not _as_boolish_one(f.get("Zoom Gate Credit Earned?")):
            continue
        if str(f.get("Recording Quiz Review Status") or "") == "Needs Correction":
            continue
        mid = (_link_ids(f.get("Zoom Meeting")) or [None])[0]
        if mid and mid not in meeting_set:
            meeting_set.add(mid)

    return len(meeting_set) if meeting_set else live_count


def rearm_pending_homework(
    client: Any,
    reg: Any,
    *,
    pending_hc_ids: list[str],
) -> dict[str, Any]:
    """Re-trigger 064/065 path for stuck Homework Completions."""
    update_records = getattr(client, "update_records", None)
    get_record = getattr(client, "get_record", None)
    if not callable(update_records) or not callable(get_record):
        return {"status": "skipped", "reason": "client not writable"}

    rearmed: list[str] = []
    errors: list[str] = []
    for hc_id in pending_hc_ids:
        try:
            raw = get_record("Homework Completions", hc_id)
            fields = raw.get("fields") or {}
            feedback = str(fields.get("Coach Feedback") or "").rstrip()
            # false→true Review Complete + feedback nudge re-enters 064/065 watchers.
            update_records(
                "Homework Completions",
                [{"id": hc_id, "fields": {"Review Complete": False}}],
            )
            patch: dict[str, Any] = {
                "Review Complete": True,
                "Coach Feedback": feedback + " ",
            }
            if not _link_ids(fields.get("Weekly Athlete Summary Link")):
                week_ids = _link_ids(fields.get("Week"))
                enr_ids = _link_ids(fields.get("Enrollment"))
                if week_ids and enr_ids:
                    was_id = _find_was_for_week(client, enr_ids[0], week_ids[0], reg)
                    if was_id:
                        patch["Weekly Athlete Summary Link"] = [was_id]
            update_records("Homework Completions", [{"id": hc_id, "fields": patch}])
            rearmed.append(hc_id)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{hc_id}: {exc}")

    return {"status": "ok", "rearmed": rearmed, "errors": errors}


def _find_was_for_week(
    client: Any,
    enrollment_id: str,
    week_id: str,
    reg: Any,
) -> str | None:
    for rec in reg.records:
        if rec.table != "Weekly Athlete Summary":
            continue
        if not rec.record_id:
            continue
        if week_id in str(rec.dedupe_key or ""):
            return rec.record_id
    list_records = getattr(client, "list_records", None)
    if not callable(list_records):
        return None
    try:
        rows = list_records(
            "Weekly Athlete Summary",
            fields=["Enrollment", "Week"],
            formula=(
                f"AND(FIND('{enrollment_id}', ARRAYJOIN({{Enrollment}})), "
                f"FIND('{week_id}', ARRAYJOIN({{Week}})))"
            ),
            max_records=5,
        )
        if rows:
            return str(rows[0].get("id") or "") or None
    except Exception:
        pass
    return None


def rearm_weekly_thresholds(
    client: Any,
    reg: Any,
) -> dict[str, Any]:
    """Toggle Requeue Threshold XP on each registry WAS so 035 re-enters."""
    update_records = getattr(client, "update_records", None)
    if not callable(update_records):
        return {"status": "skipped"}

    was_ids = sorted(
        {
            r.record_id
            for r in reg.records
            if r.table == "Weekly Athlete Summary"
            and r.record_id
            and "|WAS|" in str(r.dedupe_key or "")
        }
    )
    rearmed: list[str] = []
    for was_id in was_ids:
        try:
            update_records(
                "Weekly Athlete Summary",
                [{"id": was_id, "fields": {"Requeue Threshold XP": False}}],
            )
            update_records(
                "Weekly Athlete Summary",
                [{"id": was_id, "fields": {"Requeue Threshold XP": True}}],
            )
            rearmed.append(was_id)
        except Exception:
            continue
    return {"status": "ok", "rearmed_was": rearmed}


def rearm_streak_rebuild(
    client: Any,
    reg: Any,
    *,
    enrollment_id: str,
) -> dict[str, Any]:
    """Force 053 on the last registry submission (Enrollment clear→restore)."""
    update_records = getattr(client, "update_records", None)
    get_record = getattr(client, "get_record", None)
    if not callable(update_records) or not callable(get_record):
        return {"status": "skipped"}

    sub_ids = [
        r.record_id
        for r in reg.records
        if r.table == "Submissions" and r.record_id and "|SUB|" not in str(r.dedupe_key or "")
    ]
    if not sub_ids:
        sub_ids = [r.record_id for r in reg.records if r.table == "Submissions" and r.record_id]
    if not sub_ids:
        return {"status": "skipped", "reason": "no submissions in registry"}

    # Use highest day number submission when dedupe keys encode day.
    last_id = sub_ids[-1]
    try:
        update_records("Submissions", [{"id": last_id, "fields": {"Enrollment": []}}])
        raw = get_record("Submissions", last_id)
        f = raw.get("fields") or {}
        restore: dict[str, Any] = {"Enrollment": [enrollment_id]}
        if f.get("Activity Date"):
            restore["Activity Date"] = f.get("Activity Date")
        update_records("Submissions", [{"id": last_id, "fields": restore}])
        return {"status": "ok", "submission_id": last_id}
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "error": str(exc)}


def rearm_level_recalc(client: Any, enrollment_id: str) -> dict[str, Any]:
    update_records = getattr(client, "update_records", None)
    if not callable(update_records):
        return {"status": "skipped"}
    try:
        update_records(
            "Enrollments",
            [{"id": enrollment_id, "fields": {"Level Recalc Needed?": True}}],
        )
        return {"status": "ok", "enrollment_id": enrollment_id}
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "error": str(exc)}


def poll_downstream_settlement(
    client: Any,
    reg: Any,
    *,
    run_id: str,
    profile: str,
    enrollment_id: str,
    timeout_s: float = DEFAULT_DOWNSTREAM_TIMEOUT_S,
    poll_interval_s: float = DEFAULT_DOWNSTREAM_POLL_S,
    stable_rounds: int = DEFAULT_DOWNSTREAM_STABLE_ROUNDS,
    sleep_fn: Callable[[float], None] = time.sleep,
    monotonic_fn: Callable[[], float] = time.monotonic,
    allow_rearm: bool = True,
) -> DownstreamSettlementResult:
    start = monotonic_fn()
    deadline = start + max(1.0, timeout_s)
    polls = 0
    stable = 0
    last_fp: tuple[int, int] | None = None
    rearm_log: dict[str, Any] = {}
    rearm_pass = 0

    while True:
        polls += 1
        checks = snapshot_downstream_checks(
            client, reg, enrollment_id=enrollment_id, profile=profile
        )
        failed = [c for c in checks if not c.ok]
        fp = (len(failed), len(checks))
        complete = len(failed) == 0

        if complete:
            return DownstreamSettlementResult(
                run_id=run_id,
                profile=profile,
                enrollment_id=enrollment_id,
                complete=True,
                timed_out=False,
                polls=polls,
                elapsed_s=monotonic_fn() - start,
                checks=[c.to_dict() for c in checks],
                errors=[],
                rearm=rearm_log,
            )

        if last_fp == fp:
            stable += 1
        else:
            stable = 0
        last_fp = fp

        # One bounded re-arm pass when progress stalls.
        if allow_rearm and stable >= stable_rounds and rearm_pass == 0:
            rearm_pass = 1
            pending_hc = [c.name.split("|", 1)[1] for c in failed if c.name.startswith("homework|")]
            rearm_log["homework"] = rearm_pending_homework(client, reg, pending_hc_ids=pending_hc)
            if any(c.name == "weekly_threshold_xp" for c in failed):
                rearm_log["threshold"] = rearm_weekly_thresholds(client, reg)
            if any(c.name.startswith("streak|") for c in failed):
                rearm_log["streak"] = rearm_streak_rebuild(
                    client, reg, enrollment_id=enrollment_id
                )
            if any(c.name == "zoom_gate_effective" for c in failed):
                rearm_log["level_recalc"] = rearm_level_recalc(client, enrollment_id)
            stable = 0
            sleep_fn(max(0.05, poll_interval_s))
            continue

        if monotonic_fn() >= deadline:
            errors = [
                f"{c.name}: {c.detail} ids={c.record_ids}"
                for c in failed
            ]
            return DownstreamSettlementResult(
                run_id=run_id,
                profile=profile,
                enrollment_id=enrollment_id,
                complete=False,
                timed_out=True,
                polls=polls,
                elapsed_s=monotonic_fn() - start,
                checks=[c.to_dict() for c in checks],
                errors=errors,
                rearm=rearm_log,
            )

        sleep_fn(max(0.05, poll_interval_s))


def stage_d_downstream_settlement_hook(
    client: Any,
    reg: Any,
    *,
    run_id: str,
    profile: str,
    enrollment_id: str,
    timeout_s: float = DEFAULT_DOWNSTREAM_TIMEOUT_S,
    poll_interval_s: float = DEFAULT_DOWNSTREAM_POLL_S,
) -> dict[str, Any]:
    if client is None:
        return {
            "stage": "D_downstream_settlement",
            "profile": profile,
            "status": "skipped",
            "complete": False,
            "note": "No client",
        }
    result = poll_downstream_settlement(
        client,
        reg,
        run_id=run_id,
        profile=profile,
        enrollment_id=enrollment_id,
        timeout_s=timeout_s,
        poll_interval_s=poll_interval_s,
    )
    return {
        "stage": "D_downstream_settlement",
        "profile": profile,
        "status": "ok" if result.complete else ("timeout" if result.timed_out else "partial"),
        "complete": result.complete,
        "result": result.to_dict(),
        "errors": result.errors,
    }


__all__ = [
    "DownstreamSettlementResult",
    "poll_downstream_settlement",
    "rearm_level_recalc",
    "rearm_pending_homework",
    "rearm_streak_rebuild",
    "rearm_weekly_thresholds",
    "snapshot_downstream_checks",
    "stage_d_downstream_settlement_hook",
]
