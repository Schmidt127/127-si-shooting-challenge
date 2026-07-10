from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from upload_core.fields import (
    FIELD_PROCESSING_STARTED_AT,
    FIELD_UPLOAD_CLAIM_RUN_ID,
    FIELD_UPLOAD_STATUS,
)
from upload_core.util import DENVER, select_name

CLAIM_LEASE_MINUTES = 30

STATUS_PENDING_LINK = "Pending Link"
STATUS_PROCESSING = "Processing"
STATUS_UPLOADED = "Uploaded"
STATUS_ERROR = "Error"


@dataclass(frozen=True)
class ClaimEvaluation:
    """Result of evaluating whether this worker may upload this asset record."""

    should_upload: bool
    status_out: str
    action_out: str
    message: str
    claim_run_id: str | None = None
    claim_patch: dict[str, Any] | None = None
    continuation: bool = False


def claim_run_id_from_payload(payload: dict) -> str:
    raw = str(payload.get("uploadClaimRunId") or "").strip()
    return raw or str(uuid.uuid4())


def parse_processing_started_at(fields: dict) -> datetime | None:
    raw = fields.get(FIELD_PROCESSING_STARTED_AT)
    if raw is None or raw == "":
        return None
    if isinstance(raw, datetime):
        return raw if raw.tzinfo else raw.replace(tzinfo=DENVER)
    text = str(raw).strip()
    if not text:
        return None
    normalized = text.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=DENVER)
    return parsed


def is_claim_stale(
    started_at: datetime | None,
    *,
    now: datetime,
    lease_minutes: int = CLAIM_LEASE_MINUTES,
) -> bool:
    if started_at is None:
        return True
    if now.tzinfo is None:
        now = now.replace(tzinfo=DENVER)
    started = started_at if started_at.tzinfo else started_at.replace(tzinfo=DENVER)
    return now - started > timedelta(minutes=lease_minutes)


def processing_started_at_iso(now: datetime | None = None) -> str:
    moment = now or datetime.now(DENVER)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=DENVER)
    return moment.isoformat(timespec="milliseconds")


def build_claim_patch(claim_run_id: str, *, now: datetime | None = None) -> dict[str, Any]:
    return {
        FIELD_UPLOAD_STATUS: STATUS_PROCESSING,
        FIELD_UPLOAD_CLAIM_RUN_ID: claim_run_id,
        FIELD_PROCESSING_STARTED_AT: processing_started_at_iso(now),
    }


def evaluate_upload_claim(
    fields: dict,
    payload: dict,
    *,
    now: datetime | None = None,
) -> ClaimEvaluation:
    """
    Accepted starting-state matrix (v1 — Lambda owns claim, Option A):

    | Upload Status | Claim on record | Payload claim | Lease   | Outcome |
    |---------------|-----------------|---------------|---------|---------|
    | Pending Link  | n/a             | optional      | n/a     | claim → upload |
    | Processing    | matches payload | same          | active  | continue upload |
    | Processing    | differs/missing | any           | active  | concurrent skip |
    | Processing    | any             | any           | stale   | stale skip (no reset) |
    | Uploaded*     | any             | any           | any     | *handled earlier as skipped_already_uploaded |
    | Error/other   | any             | any           | any     | invalid status error |

    Stale claims are reported only — never auto-reset in v1.
    """
    moment = now or datetime.now(DENVER)
    status = select_name(fields.get(FIELD_UPLOAD_STATUS))
    stored_claim = str(fields.get(FIELD_UPLOAD_CLAIM_RUN_ID) or "").strip()
    payload_claim = str(payload.get("uploadClaimRunId") or "").strip()

    if status == STATUS_PENDING_LINK:
        run_id = payload_claim or str(uuid.uuid4())
        return ClaimEvaluation(
            should_upload=True,
            status_out="success",
            action_out="claim_acquired",
            message="Pending Link asset claimed for upload.",
            claim_run_id=run_id,
            claim_patch=build_claim_patch(run_id, now=moment),
            continuation=False,
        )

    if status == STATUS_PROCESSING:
        started = parse_processing_started_at(fields)
        stale = is_claim_stale(started, now=moment)
        if stale:
            return ClaimEvaluation(
                should_upload=False,
                status_out="skipped",
                action_out="stale_claim",
                message=(
                    "Processing claim is stale (>30 minutes) or missing Processing Started At; "
                    "manual recovery required — not auto-reset in v1."
                ),
                claim_run_id=stored_claim or None,
            )

        if not stored_claim:
            return ClaimEvaluation(
                should_upload=False,
                status_out="skipped",
                action_out="error_claim_conflict",
                message=(
                    "Asset is Processing without Upload Claim Run ID; "
                    "cannot safely continue (legacy or competing worker)."
                ),
            )

        effective_claim = payload_claim or stored_claim
        if effective_claim != stored_claim:
            return ClaimEvaluation(
                should_upload=False,
                status_out="skipped",
                action_out="skipped_concurrent_upload",
                message="Another active upload claim holds this asset record.",
                claim_run_id=stored_claim,
            )

        return ClaimEvaluation(
            should_upload=True,
            status_out="success",
            action_out="claim_continuation",
            message="Continuing upload under matching active claim.",
            claim_run_id=stored_claim,
            claim_patch=None,
            continuation=True,
        )

    if status == STATUS_UPLOADED:
        return ClaimEvaluation(
            should_upload=False,
            status_out="skipped",
            action_out="skipped_already_uploaded",
            message="Asset already marked Uploaded (claim evaluation fallback).",
        )

    return ClaimEvaluation(
        should_upload=False,
        status_out="error",
        action_out="error_invalid_upload_status",
        message=f'Upload Status must be "{STATUS_PENDING_LINK}" or active "{STATUS_PROCESSING}" claim; got "{status or "[blank]"}"',
    )


def claim_state_matrix_doc() -> str:
    """Human-readable matrix for docs/tests."""
    return (
        "Pending Link → claim_acquired; "
        "Processing+matching claim+active lease → claim_continuation; "
        "Processing+other claim → skipped_concurrent_upload; "
        "Processing+stale → stale_claim; "
        "Uploaded → skipped_already_uploaded"
    )
