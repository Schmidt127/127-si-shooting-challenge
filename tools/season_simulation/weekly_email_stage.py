"""SC-168 — Opt-in weekly email send-arm stage (119 substitute).

Authorized exercise only. Does not change Production 118/119 Sunday schedules.
Default is plan/verify (read-only). Apply requires the same confirm gates as
Season Sim execute and only arms Send to Make? on Ready packages whose
recipients are exactly the simulation allowlist.
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .airtable_client import AirtableClient, fields_of, linked_ids
from .constants import (
    CONFIRM_DISPOSABLE_TOKEN,
    CONFIRM_TOKEN,
    SAFE_EMAIL_RECIPIENT,
)
from .expectations_weekly_email import (
    WEEKLY_EVENT_TYPE,
    handoff_key_for_was,
)
from .recipient_safety import assert_safe_recipient, normalize_email
from .run_registry import load_registry

WAS_TABLE = "Weekly Athlete Summary"
HANDOFF_TABLE = "Email Handoff Queue"

WAS_FIELDS = [
    "Enrollment",
    "Week",
    "Week - Display",
    "Build Weekly Email Now?",
    "Weekly Email Ready?",
    "Weekly Email Sent?",
    "Send to Make?",
    "Weekly Email Recipients",
    "Weekly Email Subject",
    "Weekly Email Error",
    "Parent Email - Cleaned",
    "Combined Recipient Emails",
]


@dataclass
class WasCandidate:
    was_id: str
    enrollment_id: str | None
    week_display: str | None
    ready: bool
    sent: bool
    send_to_make: bool
    build: bool
    recipients: str
    subject: str | None
    skip_reason: str | None = None
    handoff_key: str = ""
    existing_handoff_ids: list[str] = field(default_factory=list)


@dataclass
class WeeklyEmailStageReport:
    run_id: str
    mode: str  # plan | verify | apply
    generated_at: str
    enrollment_id: str | None
    allowlist: str
    candidates: list[dict[str, Any]] = field(default_factory=list)
    armed: list[str] = field(default_factory=list)
    skipped: list[dict[str, Any]] = field(default_factory=list)
    handoffs: list[dict[str, Any]] = field(default_factory=list)
    retry_probe: dict[str, Any] | None = None
    errors: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _recipients_safe(raw: str | None) -> bool:
    text = (raw or "").strip().lower()
    if not text:
        return False
    # Split common separators; every address token must be allowlist or empty.
    parts = [
        p.strip()
        for chunk in text.replace(";", ",").split(",")
        for p in [chunk.strip()]
        if p
    ]
    if not parts:
        return False
    safe = SAFE_EMAIL_RECIPIENT.lower()
    for p in parts:
        # Recipients may be JSON-ish; require allowlist substring and refuse
        # any other obvious @ address.
        emails = []
        if "@" in p:
            # crude extract
            for token in p.replace('"', " ").replace("'", " ").split():
                if "@" in token:
                    emails.append(normalize_email(token.strip("[]{},")))
        if emails:
            if any(e != safe for e in emails):
                return False
        elif safe not in p:
            return False
    return safe in text


def _registry_was_email_arm_ids(registry_dir: Path, run_id: str) -> list[str]:
    reg = load_registry(registry_dir, run_id)
    ids: list[str] = []
    for r in reg.records:
        if r.table != WAS_TABLE:
            continue
        dk = r.dedupe_key or ""
        if "WAS_EMAIL_ARM" in dk or "|WAS|" in dk:
            if r.record_id and r.record_id not in ids:
                ids.append(r.record_id)
    # Prefer arms first
    arms = [
        r.record_id
        for r in reg.records
        if r.table == WAS_TABLE and "WAS_EMAIL_ARM" in (r.dedupe_key or "")
    ]
    return arms or ids


def _find_handoffs(client: AirtableClient, was_id: str) -> list[dict[str, Any]]:
    key = handoff_key_for_was(was_id)
    rows = client.list_records(
        HANDOFF_TABLE,
        formula=f"{{Handoff Key}}='{key}'",
        max_records=20,
    )
    out: list[dict[str, Any]] = []
    for r in rows:
        f = fields_of(r)
        out.append(
            {
                "id": r["id"],
                "Handoff Key": f.get("Handoff Key"),
                "Event Type": f.get("Event Type"),
                "Status": f.get("Status"),
                "Recipients JSON": f.get("Recipients JSON"),
                "Source Record ID": f.get("Source Record ID"),
                "Test Mode?": f.get("Test Mode?"),
            }
        )
    return out


def evaluate_candidate(
    client: AirtableClient,
    was_id: str,
    *,
    enrollment_id: str | None,
) -> WasCandidate:
    f = fields_of(client.get_record(WAS_TABLE, was_id))
    enroll_ids = linked_ids(f.get("Enrollment"))
    recip = str(f.get("Weekly Email Recipients") or "")
    cand = WasCandidate(
        was_id=was_id,
        enrollment_id=enroll_ids[0] if enroll_ids else None,
        week_display=str(f.get("Week - Display") or "") or None,
        ready=f.get("Weekly Email Ready?") is True,
        sent=f.get("Weekly Email Sent?") is True,
        send_to_make=f.get("Send to Make?") is True,
        build=f.get("Build Weekly Email Now?") is True,
        recipients=recip,
        subject=str(f.get("Weekly Email Subject") or "") or None,
        handoff_key=handoff_key_for_was(was_id),
    )
    if enrollment_id and enrollment_id not in enroll_ids:
        cand.skip_reason = "foreign_enrollment"
        return cand
    if not _recipients_safe(recip):
        cand.skip_reason = "unsafe_or_empty_recipients"
        return cand
    # Parent cleaned / combined as secondary guard
    parent = f.get("Parent Email - Cleaned")
    parent_s = ""
    if isinstance(parent, list) and parent:
        parent_s = str(parent[0])
    elif parent:
        parent_s = str(parent)
    if parent_s:
        try:
            assert_safe_recipient(parent_s)
        except ValueError:
            cand.skip_reason = "unsafe_parent_email_cleaned"
            return cand
    if cand.sent:
        cand.skip_reason = "already_sent"
        return cand
    if not cand.ready:
        cand.skip_reason = "not_ready"
        return cand
    cand.existing_handoff_ids = [h["id"] for h in _find_handoffs(client, was_id)]
    return cand


def plan_weekly_email_stage(
    client: AirtableClient,
    *,
    run_id: str,
    registry_dir: Path,
    enrollment_id: str | None = None,
    was_ids: list[str] | None = None,
) -> WeeklyEmailStageReport:
    report = WeeklyEmailStageReport(
        run_id=run_id,
        mode="plan",
        generated_at=datetime.now(timezone.utc).isoformat(),
        enrollment_id=enrollment_id,
        allowlist=SAFE_EMAIL_RECIPIENT,
    )
    report.notes.append(
        "119 substitute only — does not change Sunday cron. "
        "Apply arms Send to Make? false→true on Ready allowlisted WAS."
    )
    ids = list(was_ids or [])
    if not ids:
        try:
            ids = _registry_was_email_arm_ids(registry_dir, run_id)
        except FileNotFoundError:
            report.errors.append(f"Registry not found for run_id={run_id}")
            return report
    if not ids:
        report.errors.append("No WAS ids from registry WAS_EMAIL_ARM / WAS create keys")
        return report

    enroll = enrollment_id
    if not enroll:
        try:
            reg = load_registry(registry_dir, run_id)
            for r in reg.records:
                if r.table == "Enrollments":
                    enroll = r.record_id
                    break
        except FileNotFoundError:
            pass
    report.enrollment_id = enroll

    for wid in ids:
        try:
            cand = evaluate_candidate(client, wid, enrollment_id=enroll)
        except Exception as exc:  # noqa: BLE001 — surface per-row
            report.errors.append(f"{wid}: {exc}")
            continue
        row = asdict(cand)
        report.candidates.append(row)
        if cand.skip_reason:
            report.skipped.append({"was_id": wid, "reason": cand.skip_reason})
    return report


def apply_weekly_email_send_arm(
    client: AirtableClient,
    *,
    run_id: str,
    registry_dir: Path,
    confirm: str,
    confirm_disposable: str,
    enrollment_id: str | None = None,
    was_ids: list[str] | None = None,
    limit: int = 1,
    retry_dedupe_probe: bool = True,
    settle_seconds: float = 8.0,
) -> WeeklyEmailStageReport:
    """Arm Send to Make? for up to ``limit`` Ready allowlisted WAS rows."""
    if confirm != CONFIRM_TOKEN or confirm_disposable != CONFIRM_DISPOSABLE_TOKEN:
        raise ValueError(
            "weekly-email-stage apply refused: confirm gates must match "
            f"{CONFIRM_TOKEN!r} and {CONFIRM_DISPOSABLE_TOKEN!r}"
        )
    if not client.allow_writes:
        raise ValueError("client allow_writes=False — refusing apply")
    if limit < 1:
        raise ValueError("limit must be >= 1")

    plan = plan_weekly_email_stage(
        client,
        run_id=run_id,
        registry_dir=registry_dir,
        enrollment_id=enrollment_id,
        was_ids=was_ids,
    )
    plan.mode = "apply"
    eligible = [
        c
        for c in plan.candidates
        if not c.get("skip_reason") and c.get("ready") and not c.get("sent")
    ]
    # Prefer not-yet-handed-off
    eligible.sort(key=lambda c: len(c.get("existing_handoff_ids") or []))

    armed: list[str] = []
    for c in eligible[:limit]:
        wid = c["was_id"]
        # Hard stop: re-read recipients immediately before write
        fresh = evaluate_candidate(client, wid, enrollment_id=plan.enrollment_id)
        if fresh.skip_reason:
            plan.skipped.append({"was_id": wid, "reason": fresh.skip_reason})
            continue
        if not _recipients_safe(fresh.recipients):
            plan.errors.append(f"STOP unsafe recipients on {wid}")
            return plan

        client.update_records(
            WAS_TABLE,
            [{"id": wid, "fields": {"Send to Make?": False}}],
        )
        client.update_records(
            WAS_TABLE,
            [{"id": wid, "fields": {"Send to Make?": True}}],
        )
        armed.append(wid)
        plan.notes.append(f"armed_send_false_then_true:{wid}")

    plan.armed = armed
    if not armed:
        plan.notes.append("no eligible Ready allowlisted WAS to arm")
        return plan

    time.sleep(max(0.0, settle_seconds))
    for wid in armed:
        handoffs = _find_handoffs(client, wid)
        plan.handoffs.extend(handoffs)
        for h in handoffs:
            recip = str(h.get("Recipients JSON") or "")
            if SAFE_EMAIL_RECIPIENT.lower() not in recip.lower():
                plan.errors.append(f"STOP non-allowlist handoff {h.get('id')}")
            et = str(h.get("Event Type") or "")
            if et and et != WEEKLY_EVENT_TYPE:
                plan.errors.append(f"unexpected event type {et} on {h.get('id')}")

    if retry_dedupe_probe and armed:
        wid = armed[0]
        before = _find_handoffs(client, wid)
        before_ids = {h["id"] for h in before}
        # Re-arm Send to Make? — 074 must not create a second Handoff Key row
        client.update_records(
            WAS_TABLE,
            [{"id": wid, "fields": {"Send to Make?": False}}],
        )
        client.update_records(
            WAS_TABLE,
            [{"id": wid, "fields": {"Send to Make?": True}}],
        )
        time.sleep(max(0.0, settle_seconds))
        after = _find_handoffs(client, wid)
        after_ids = {h["id"] for h in after}
        new_ids = sorted(after_ids - before_ids)
        plan.retry_probe = {
            "was_id": wid,
            "handoff_key": handoff_key_for_was(wid),
            "before_count": len(before_ids),
            "after_count": len(after_ids),
            "new_handoff_ids": new_ids,
            "dedupe_ok": len(after_ids) == len(before_ids) and len(before_ids) >= 1,
        }
        if not plan.retry_probe["dedupe_ok"]:
            plan.errors.append(
                f"retry dedupe failed for {wid}: before={len(before_ids)} "
                f"after={len(after_ids)} new={new_ids}"
            )
        plan.handoffs = after

    return plan


def verify_weekly_email_stage(
    client: AirtableClient,
    *,
    run_id: str,
    registry_dir: Path,
    enrollment_id: str | None = None,
    was_ids: list[str] | None = None,
) -> WeeklyEmailStageReport:
    report = plan_weekly_email_stage(
        client,
        run_id=run_id,
        registry_dir=registry_dir,
        enrollment_id=enrollment_id,
        was_ids=was_ids,
    )
    report.mode = "verify"
    for c in report.candidates:
        wid = c["was_id"]
        handoffs = _find_handoffs(client, wid)
        report.handoffs.extend(handoffs)
        c["existing_handoff_ids"] = [h["id"] for h in handoffs]
        c["handoff_count"] = len(handoffs)
    return report


def write_stage_report(report: WeeklyEmailStageReport, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"weekly-email-stage-{report.mode}-{report.run_id}.json"
    path.write_text(json.dumps(report.to_dict(), indent=2, default=str) + "\n", encoding="utf-8")
    return path
