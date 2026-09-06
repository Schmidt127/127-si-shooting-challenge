"""Dependency-aware XP cascade settlement for season simulation.

Polls observed Airtable state (not fixed sleeps) until Submission Base XP
settles for registry-owned countable submissions, or until a terminal timeout.

Completion requires reconciliation — writer create counts alone are not enough.
"""

from __future__ import annotations

import time
from dataclasses import asdict, dataclass, field
from typing import Any, Callable

from .run_registry import RunRegistry, run_marker

SUBMISSION_XP_PREFIX = "SUBMISSION_XP|"

# Observed-state polling defaults (seconds).
DEFAULT_POLL_INTERVAL_S = 3.0
DEFAULT_TIMEOUT_S = 180.0
DEFAULT_STABLE_ROUNDS = 2


@dataclass
class SubmissionXpStatus:
    submission_id: str
    countable: bool
    enrollment_linked: bool
    week_linked: bool
    was_linked: bool
    reconciliation_needed: Any
    last_reconciled_signature: str
    active_submission_xp_ids: list[str]
    classification: str  # settled | pending | not_ready | inapplicable | stuck
    detail: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class CascadeSettlementResult:
    run_id: str
    profile: str | None
    enrollment_id: str
    expected_countable: int
    settled_countable: int
    pending: list[str] = field(default_factory=list)
    not_ready: list[str] = field(default_factory=list)
    inapplicable: list[str] = field(default_factory=list)
    stuck: list[str] = field(default_factory=list)
    polls: int = 0
    elapsed_s: float = 0.0
    timed_out: bool = False
    complete: bool = False
    statuses: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _as_boolish_one(value: Any) -> bool:
    if value is True:
        return True
    if value in (None, "", False):
        return False
    try:
        return int(float(value)) == 1
    except (TypeError, ValueError):
        return bool(value)


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


def _source_key_for_submission(submission_id: str) -> str:
    return f"{SUBMISSION_XP_PREFIX}{submission_id}"


def classify_submission_xp_status(
    *,
    submission_id: str,
    fields: dict[str, Any],
    active_xp_ids: list[str],
) -> SubmissionXpStatus:
    """Classify one submission against 010 eligibility / settlement expectations."""
    enrollment_linked = bool(_link_ids(fields.get("Enrollment")))
    week_linked = bool(_link_ids(fields.get("Week")))
    was_linked = bool(_link_ids(fields.get("Weekly Athlete Summary")))
    countable = _as_boolish_one(fields.get("Count This Submission?"))
    needed = fields.get("Reconciliation Needed?")
    last_sig = str(fields.get("Last Reconciled Signature") or "")
    active = list(active_xp_ids)

    if active:
        return SubmissionXpStatus(
            submission_id=submission_id,
            countable=countable,
            enrollment_linked=enrollment_linked,
            week_linked=week_linked,
            was_linked=was_linked,
            reconciliation_needed=needed,
            last_reconciled_signature=last_sig,
            active_submission_xp_ids=active,
            classification="settled",
            detail="Active SUBMISSION_XP present",
        )

    if not countable:
        return SubmissionXpStatus(
            submission_id=submission_id,
            countable=False,
            enrollment_linked=enrollment_linked,
            week_linked=week_linked,
            was_linked=was_linked,
            reconciliation_needed=needed,
            last_reconciled_signature=last_sig,
            active_submission_xp_ids=[],
            classification="inapplicable",
            detail="Count This Submission? != 1",
        )

    missing: list[str] = []
    if not enrollment_linked:
        missing.append("Enrollment")
    if not week_linked:
        missing.append("Week")
    if not was_linked:
        missing.append("Weekly Athlete Summary")
    if missing:
        return SubmissionXpStatus(
            submission_id=submission_id,
            countable=True,
            enrollment_linked=enrollment_linked,
            week_linked=week_linked,
            was_linked=was_linked,
            reconciliation_needed=needed,
            last_reconciled_signature=last_sig,
            active_submission_xp_ids=[],
            classification="not_ready",
            detail="Missing links: " + ", ".join(missing),
        )

    if last_sig and not _as_boolish_one(needed):
        # 010 may latch skipped_ineligible (e.g. Activity Date outside Week) with
        # empty XP_SIG in the signature — that is not a re-arm candidate.
        if "XP_SIG=|" in last_sig or last_sig.rstrip().endswith("XP_SIG="):
            return SubmissionXpStatus(
                submission_id=submission_id,
                countable=True,
                enrollment_linked=True,
                week_linked=True,
                was_linked=True,
                reconciliation_needed=needed,
                last_reconciled_signature=last_sig,
                active_submission_xp_ids=[],
                classification="inapplicable",
                detail="010 latched without XP (likely skipped_ineligible)",
            )
        return SubmissionXpStatus(
            submission_id=submission_id,
            countable=True,
            enrollment_linked=True,
            week_linked=True,
            was_linked=True,
            reconciliation_needed=needed,
            last_reconciled_signature=last_sig,
            active_submission_xp_ids=[],
            classification="stuck",
            detail="Latched without Active SUBMISSION_XP — re-arm candidate",
        )

    return SubmissionXpStatus(
        submission_id=submission_id,
        countable=True,
        enrollment_linked=True,
        week_linked=True,
        was_linked=True,
        reconciliation_needed=needed,
        last_reconciled_signature=last_sig,
        active_submission_xp_ids=[],
        classification="pending",
        detail="Eligible for 010; Active SUBMISSION_XP not yet observed",
    )


def list_active_submission_xp_ids(
    list_records: Callable[..., list[dict[str, Any]]],
    submission_id: str,
) -> list[str]:
    """Return Active? XP Event ids with Source Key SUBMISSION_XP|{submission_id}."""
    key = _source_key_for_submission(submission_id)
    try:
        rows = list_records(
            "XP Events",
            fields=["Source Key", "Active?"],
            formula=f"AND({{Source Key}}='{key}', {{Active?}}=1)",
            max_records=10,
        )
    except TypeError:
        # Memory client / MCP-style list_records without formula kw.
        rows = list_records("XP Events", fields=["Source Key", "Active?"]) or []
        filtered = []
        for row in rows:
            fields = row.get("fields") or row
            if str(fields.get("Source Key") or "") != key:
                continue
            if fields.get("Active?") is True or _as_boolish_one(fields.get("Active?")):
                filtered.append(row)
        rows = filtered
    except Exception:
        return []

    ids: list[str] = []
    for row in rows or []:
        rid = str(row.get("id") or "")
        if not rid:
            continue
        fields = row.get("fields") or {}
        if fields and str(fields.get("Source Key") or "") not in ("", key):
            # formula path already filtered; memory path may include fields
            if str(fields.get("Source Key") or "") != key:
                continue
        ids.append(rid)
    return ids


def snapshot_registry_submissions(
    client: Any,
    reg: RunRegistry,
) -> list[SubmissionXpStatus]:
    """Snapshot XP settlement status for Submissions in a run registry."""
    list_records = getattr(client, "list_records", None)
    get_record = getattr(client, "get_record", None)
    if not callable(get_record):
        raise ValueError("client must provide get_record")

    statuses: list[SubmissionXpStatus] = []
    seen: set[str] = set()
    for rec in reg.records:
        if rec.table != "Submissions":
            continue
        sid = rec.record_id
        if not sid or sid in seen:
            continue
        # Skip post-create arm rows that re-register the same submission id
        # under different dedupe keys — still one logical submission.
        seen.add(sid)
        try:
            raw = get_record("Submissions", sid)
        except Exception as exc:  # noqa: BLE001
            statuses.append(
                SubmissionXpStatus(
                    submission_id=sid,
                    countable=False,
                    enrollment_linked=False,
                    week_linked=False,
                    was_linked=False,
                    reconciliation_needed=None,
                    last_reconciled_signature="",
                    active_submission_xp_ids=[],
                    classification="stuck",
                    detail=f"get_record failed: {exc}",
                )
            )
            continue
        fields = raw.get("fields") or {}
        active_ids: list[str] = []
        if callable(list_records):
            active_ids = list_active_submission_xp_ids(list_records, sid)
        else:
            # Fallback: XP Events linked on the submission
            for xid in _link_ids(fields.get("XP Events")):
                active_ids.append(xid)
        statuses.append(
            classify_submission_xp_status(
                submission_id=sid,
                fields=fields,
                active_xp_ids=active_ids,
            )
        )
    return statuses


def summarize_statuses(statuses: list[SubmissionXpStatus]) -> dict[str, Any]:
    by = {
        "settled": [],
        "pending": [],
        "not_ready": [],
        "inapplicable": [],
        "stuck": [],
    }
    for st in statuses:
        by.setdefault(st.classification, []).append(st.submission_id)
    expected = [
        s.submission_id
        for s in statuses
        if s.classification in {"settled", "pending", "not_ready", "stuck"}
        and s.countable
    ]
    settled = [s.submission_id for s in statuses if s.classification == "settled"]
    return {
        "expected_countable": len(expected),
        "settled_countable": len(settled),
        "pending": by["pending"],
        "not_ready": by["not_ready"],
        "inapplicable": by["inapplicable"],
        "stuck": by["stuck"],
        "complete": (
            len(by["pending"]) == 0
            and len(by["not_ready"]) == 0
            and len(by["stuck"]) == 0
            and len(expected) == len(settled)
        ),
    }


def poll_cascade_settlement(
    client: Any,
    reg: RunRegistry,
    *,
    run_id: str,
    profile: str | None = None,
    timeout_s: float = DEFAULT_TIMEOUT_S,
    poll_interval_s: float = DEFAULT_POLL_INTERVAL_S,
    stable_rounds: int = DEFAULT_STABLE_ROUNDS,
    sleep_fn: Callable[[float], None] = time.sleep,
    monotonic_fn: Callable[[], float] = time.monotonic,
) -> CascadeSettlementResult:
    """Poll until countable submissions have Active SUBMISSION_XP or timeout.

    Uses observed state only. Does not create XP Events itself.
    """
    _ = run_marker(run_id)  # validate run_id shape early

    start = monotonic_fn()
    deadline = start + max(1.0, timeout_s)
    polls = 0
    last_summary: dict[str, Any] | None = None
    stable = 0
    statuses: list[SubmissionXpStatus] = []
    errors: list[str] = []

    while True:
        polls += 1
        try:
            statuses = snapshot_registry_submissions(client, reg)
        except Exception as exc:  # noqa: BLE001
            errors.append(str(exc))
            statuses = []
        summary = summarize_statuses(statuses)
        if summary["complete"]:
            elapsed = monotonic_fn() - start
            return CascadeSettlementResult(
                run_id=run_id,
                profile=profile,
                enrollment_id=reg.enrollment_id,
                expected_countable=int(summary["expected_countable"]),
                settled_countable=int(summary["settled_countable"]),
                pending=list(summary["pending"]),
                not_ready=list(summary["not_ready"]),
                inapplicable=list(summary["inapplicable"]),
                stuck=list(summary["stuck"]),
                polls=polls,
                elapsed_s=elapsed,
                timed_out=False,
                complete=True,
                statuses=[s.to_dict() for s in statuses],
                errors=errors,
            )

        # Stability: no progress across rounds while still incomplete → keep polling
        # until timeout (progress resets stable counter).
        fingerprint = (
            summary["settled_countable"],
            len(summary["pending"]),
            len(summary["not_ready"]),
            len(summary["stuck"]),
        )
        if last_summary is not None and fingerprint == (
            last_summary["settled_countable"],
            len(last_summary["pending"]),
            len(last_summary["not_ready"]),
            len(last_summary["stuck"]),
        ):
            stable += 1
        else:
            stable = 0
        last_summary = summary

        if monotonic_fn() >= deadline:
            elapsed = monotonic_fn() - start
            return CascadeSettlementResult(
                run_id=run_id,
                profile=profile,
                enrollment_id=reg.enrollment_id,
                expected_countable=int(summary["expected_countable"]),
                settled_countable=int(summary["settled_countable"]),
                pending=list(summary["pending"]),
                not_ready=list(summary["not_ready"]),
                inapplicable=list(summary["inapplicable"]),
                stuck=list(summary["stuck"]),
                polls=polls,
                elapsed_s=elapsed,
                timed_out=True,
                complete=False,
                statuses=[s.to_dict() for s in statuses],
                errors=errors
                + [
                    f"Settlement timeout after {elapsed:.1f}s "
                    f"(stable_rounds={stable}/{stable_rounds})"
                ],
            )

        sleep_fn(max(0.05, poll_interval_s))


def stage_d_settlement_hook(
    client: Any,
    reg: RunRegistry,
    *,
    run_id: str,
    profile: str | None = None,
    allow_writes: bool = False,
    timeout_s: float = DEFAULT_TIMEOUT_S,
    poll_interval_s: float = DEFAULT_POLL_INTERVAL_S,
) -> dict[str, Any]:
    """Stage D — poll XP settlement. Read-only (never writes)."""
    _ = allow_writes  # settlement never writes; signature matches other stage hooks
    if client is None:
        return {
            "stage": "D_settlement",
            "profile": profile,
            "status": "skipped",
            "writes": False,
            "note": "No client — settlement skipped",
            "complete": False,
        }
    result = poll_cascade_settlement(
        client,
        reg,
        run_id=run_id,
        profile=profile,
        timeout_s=timeout_s,
        poll_interval_s=poll_interval_s,
    )
    return {
        "stage": "D_settlement",
        "profile": profile,
        "status": "ok" if result.complete else ("timeout" if result.timed_out else "partial"),
        "writes": False,
        "complete": result.complete,
        "result": result.to_dict(),
    }


def stage_e_reconcile_hook(
    settlement: dict[str, Any] | None,
    *,
    profile: str | None = None,
    writer_created: int = 0,
) -> dict[str, Any]:
    """Stage E — truthful completion from settlement, not writer counts alone."""
    result = (settlement or {}).get("result") or {}
    complete = bool((settlement or {}).get("complete"))
    expected = int(result.get("expected_countable") or 0)
    settled = int(result.get("settled_countable") or 0)
    errors: list[str] = []
    if not complete:
        errors.append(
            f"Cascade incomplete: settled {settled}/{expected} countable "
            f"Submission Base XP (writer_created={writer_created})"
        )
        if result.get("stuck"):
            errors.append(f"stuck={result.get('stuck')}")
        if result.get("pending"):
            errors.append(f"pending_count={len(result.get('pending') or [])}")
        if result.get("not_ready"):
            errors.append(f"not_ready={result.get('not_ready')}")
    return {
        "stage": "E_reconcile",
        "profile": profile,
        "status": "ok" if complete else "failed",
        "writes": False,
        "complete": complete,
        "expected_countable_submission_xp": expected,
        "settled_countable_submission_xp": settled,
        "writer_created_records": writer_created,
        "errors": errors,
        "truth": (
            "complete_requires_xp_reconciliation"
            if complete
            else "writer_complete_is_not_cascade_complete"
        ),
    }


__all__ = [
    "CascadeSettlementResult",
    "SubmissionXpStatus",
    "classify_submission_xp_status",
    "list_active_submission_xp_ids",
    "poll_cascade_settlement",
    "snapshot_registry_submissions",
    "stage_d_settlement_hook",
    "stage_e_reconcile_hook",
    "summarize_statuses",
]
