"""Stage E2 — live XP event business reconciliation for season simulation."""

from __future__ import annotations

from typing import Any, Callable

from .business_expectations import expectations_for_profile

# Source Key prefix → reconciliation bucket name (matches final Production report).
SOURCE_PREFIX_TO_BUCKET: dict[str, str] = {
    "SUBMISSION_XP": "Submission XP",
    "HOMEWORK_XP": "Homework XP",
    "VIDEO_SUBMISSION": "Video XP",
    "STREAK_XP": "Streak XP",
    "WEEKLY_THRESHOLD": "Weekly Threshold XP",
    "PERFECT_WEEK": "Perfect Week XP",
    "SHOT_MILESTONE": "Shot Milestone XP",
    "ZOOM_ATTEND_BASE": "Zoom XP",
    "ZOOM_ATTEND_BONUS_2": "Zoom XP",
    "ZOOM_ATTEND_BONUS_3": "Zoom XP",
    "ZOOM_RECORDING_CREDIT": "Zoom XP",
}


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


def _active_truthy(value: Any) -> bool:
    if value is True:
        return True
    try:
        return int(float(value)) == 1
    except (TypeError, ValueError):
        return bool(value)


def _bucket_for_source_key(source_key: str) -> str | None:
    key = (source_key or "").strip()
    if not key:
        return None
    for prefix, bucket in SOURCE_PREFIX_TO_BUCKET.items():
        if key.startswith(prefix):
            return bucket
    return None


def fetch_active_xp_events_for_enrollment(
    client: Any,
    enrollment_id: str,
) -> list[dict[str, Any]]:
    """Read live Active XP Events linked to one Enrollment."""
    list_records = getattr(client, "list_records", None)
    if not callable(list_records):
        return []

    fields = ["Source Key", "XP Points", "Active?", "Enrollment"]
    formula = f"AND(FIND('{enrollment_id}', ARRAYJOIN({{Enrollment}})), {{Active?}}=1)"

    try:
        rows = list_records("XP Events", fields=fields, formula=formula, max_records=500)
    except TypeError:
        rows = list_records("XP Events", fields=fields) or []
    except Exception:
        return []

    out: list[dict[str, Any]] = []
    for row in rows or []:
        rid = str(row.get("id") or "")
        f = row.get("fields") or {}
        if enrollment_id not in _link_ids(f.get("Enrollment")):
            continue
        if not _active_truthy(f.get("Active?")):
            continue
        out.append({"id": rid, "fields": f})
    return out


def bucketize_xp_events(events: list[dict[str, Any]]) -> dict[str, int]:
    buckets: dict[str, int] = {name: 0 for name in set(SOURCE_PREFIX_TO_BUCKET.values())}
    for ev in events:
        f = ev.get("fields") or {}
        sk = str(f.get("Source Key") or "")
        bucket = _bucket_for_source_key(sk)
        if not bucket:
            continue
        try:
            pts = int(float(f.get("XP Points") or 0))
        except (TypeError, ValueError):
            pts = 0
        buckets[bucket] = buckets.get(bucket, 0) + pts
    return buckets


def count_events_by_prefix(events: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for ev in events:
        sk = str((ev.get("fields") or {}).get("Source Key") or "")
        prefix = sk.split("|", 1)[0] if sk else "UNKNOWN"
        counts[prefix] = counts.get(prefix, 0) + 1
    return counts


def duplicate_source_keys(events: list[dict[str, Any]]) -> dict[str, list[str]]:
    by_key: dict[str, list[str]] = {}
    for ev in events:
        sk = str((ev.get("fields") or {}).get("Source Key") or "").strip()
        if not sk:
            continue
        by_key.setdefault(sk, []).append(str(ev.get("id") or ""))
    return {k: ids for k, ids in by_key.items() if len(ids) > 1}


def stage_e2_business_success_hook(
    client: Any | None,
    *,
    enrollment_id: str,
    profile: str,
    cascade_complete: bool,
    downstream_complete: bool,
    get_record: Callable[..., dict] | None = None,
) -> dict[str, Any]:
    """Stage E2 — compare live Enrollment-linked XP Events to profile oracle."""
    exp = expectations_for_profile(profile)
    if exp is None:
        return {
            "stage": "E2_business_success",
            "profile": profile,
            "status": "skipped",
            "complete": False,
            "pass": False,
            "notes": [f"No business expectations registered for profile {profile!r}"],
            "errors": [],
        }

    if client is None:
        return {
            "stage": "E2_business_success",
            "profile": profile,
            "status": "skipped",
            "complete": False,
            "pass": False,
            "expected_total_xp": exp["total_xp"],
            "actual_total_xp": 0,
            "errors": ["No client — E2 skipped"],
            "cascade_complete": cascade_complete,
            "downstream_complete": downstream_complete,
        }

    events = fetch_active_xp_events_for_enrollment(client, enrollment_id)
    buckets = bucketize_xp_events(events)
    actual_total = sum(buckets.values())
    expected_buckets: dict[str, int] = dict(exp["buckets"])
    expected_total = int(exp["total_xp"])

    bucket_diffs: list[dict[str, Any]] = []
    errors: list[str] = []
    for name, expected in expected_buckets.items():
        actual = int(buckets.get(name) or 0)
        ok = actual == expected
        bucket_diffs.append(
            {"name": name, "expected": expected, "actual": actual, "ok": ok}
        )
        if not ok:
            errors.append(f"{name}: expected {expected} actual {actual}")

    if actual_total != expected_total:
        errors.append(f"total XP: expected {expected_total} actual {actual_total}")

    dupes = duplicate_source_keys(events)
    if dupes:
        errors.append(f"duplicate XP Source Keys: {list(dupes.keys())[:5]}")

    if not cascade_complete:
        errors.append("cascade_complete=false")
    if not downstream_complete:
        errors.append("downstream_complete=false")

    actual_level = "(unknown)"
    gate_debug = ""
    longest_streak = None
    if get_record is None:
        get_record = getattr(client, "get_record", None)
    if callable(get_record) and enrollment_id:
        try:
            enr = get_record("Enrollments", enrollment_id)
            ef = enr.get("fields") or {}
            actual_level = str(
                ef.get("Public Level")
                or ef.get("Current Level")
                or ef.get("Level Name")
                or "(unknown)"
            )
            gate_debug = str(ef.get("Gate Debug Summary") or "")
            longest_streak = ef.get("Longest Streak Days")
        except Exception:  # noqa: BLE001
            pass

    passed = not errors
    return {
        "stage": "E2_business_success",
        "profile": profile,
        "status": "ok" if passed else "failed",
        "complete": passed,
        "pass": passed,
        "expected_total_xp": expected_total,
        "actual_total_xp": actual_total,
        "expected_level": exp.get("public_level"),
        "actual_level": actual_level,
        "gate_debug": gate_debug,
        "longest_streak_days": longest_streak,
        "bucket_diffs": bucket_diffs,
        "xp_event_count": len(events),
        "xp_event_prefixes": count_events_by_prefix(events),
        "duplicate_xp_source_keys": dupes,
        "errors": errors,
        "cascade_complete": cascade_complete,
        "downstream_complete": downstream_complete,
        "notes": [],
    }


__all__ = [
    "SOURCE_PREFIX_TO_BUCKET",
    "bucketize_xp_events",
    "duplicate_source_keys",
    "fetch_active_xp_events_for_enrollment",
    "stage_e2_business_success_hook",
]
