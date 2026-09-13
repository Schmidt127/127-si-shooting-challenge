"""Season-simulation Video Feedback contract helpers (073 / 013 / 022 parity).

Offline-safe deterministic fixtures representing post-070b/022 pipeline state.
Does not call Make, Lambda, S3, Resend, Gmail, Airtable production, or Hub.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any

from .constants import SAFE_EMAIL_RECIPIENT

CANONICAL_KEY_PREFIX = "VIDEO_FEEDBACK"
HANDOFF_EVENT_TYPE = "VIDEO_FEEDBACK"
HANDOFF_TEMPLATE_KEY = "VIDEO_FEEDBACK"

# Writable on Submission Assets — drives Reviewer File URL formula in production.
SIM_VIDEO_REVIEWER_ACCESS_TOKEN = "season-sim-reviewer-token"
# Query token for deterministic Lambda viewer URLs (lib/secure-video-url.js pattern).
SIM_LAMBDA_VIEWER_TOKEN = "season-sim-viewer-token"
SIM_LAMBDA_VIEWER_HOST = "season-sim-viewer.lambda-url.us-east-2.on.aws"
SIM_VIDEO_PLACEHOLDER_URL = "https://invalid.example/season-sim/video-placeholder"


def sim_source_attachment_id(marker: str, day_number: int) -> str:
    return f"{marker}|SA|VIDEO|D{day_number:02d}"


def canonical_video_feedback_key(asset_id: str) -> str:
    return f"{CANONICAL_KEY_PREFIX}|{asset_id}"


def video_feedback_handoff_key(video_feedback_id: str) -> str:
    return f"{HANDOFF_EVENT_TYPE}|{HANDOFF_EVENT_TYPE}|{video_feedback_id}"


def video_xp_source_key(video_feedback_id: str) -> str:
    return f"VIDEO_SUBMISSION|{video_feedback_id}"


def sim_lambda_viewer_url(asset_id: str, *, token: str = SIM_LAMBDA_VIEWER_TOKEN) -> str:
    """Deterministic Lambda viewer URL satisfying classifySecureVideoUrl."""
    return (
        f"https://{SIM_LAMBDA_VIEWER_HOST}/file/{asset_id}?token={token}"
    )


def sim_video_upload_attachment(
    source_attachment_id: str,
    filename: str,
) -> list[dict[str, Any]]:
    """Offline-only Submission.Video Upload shape (invalid for live Airtable writes).

    Live Season Sim creates the video pipeline without attachment objects.
    """
    return [
        {
            "id": source_attachment_id,
            "url": SIM_VIDEO_PLACEHOLDER_URL,
            "filename": filename,
        }
    ]


def sim_airtable_attachment(filename: str) -> list[dict[str, Any]]:
    """Offline-only Submission Assets.Airtable Attachment (invalid for live writes)."""
    return [{"url": SIM_VIDEO_PLACEHOLDER_URL, "filename": filename}]


def build_video_asset_create_fields(
    *,
    marker: str,
    day_number: int,
    submission_id: str,
    enrollment_id: str,
    source_attachment_id: str,
    filename: str,
    include_synthetic_attachments: bool = False,
) -> dict[str, Any]:
    """Submission Asset fields at create (013-compatible; pre-VF back-link).

    Live Season Sim omits ``Airtable Attachment`` — placeholder URLs are rejected
    by the Airtable API. Offline fixtures may pass
    ``include_synthetic_attachments=True``.
    """
    fields: dict[str, Any] = {
        "Asset Label": f"{marker}|VIDEO|D{day_number:02d}",
        "Asset Purpose": "Video For Feedback",
        "Asset Slot": "VIDEO",
        "Asset Type": "Video",
        "Original File Name": filename,
        "Source Attachment ID": source_attachment_id,
        "Submission - Linked": [submission_id],
        "Enrollment - Linked": [enrollment_id],
        "Send to Make Trigger": False,
        "Reviewer Access Token": SIM_VIDEO_REVIEWER_ACCESS_TOKEN,
        "Upload Status": "Uploaded",
    }
    if include_synthetic_attachments:
        fields["Airtable Attachment"] = sim_airtable_attachment(filename)
    return fields


def build_video_feedback_create_fields(
    *,
    enrollment_id: str,
    submission_id: str,
    asset_id: str,
    coach_feedback: str,
    grade_band_id: str | None = None,
) -> dict[str, Any]:
    fields: dict[str, Any] = {
        "Enrollment": [enrollment_id],
        "Submission": [submission_id],
        "Submission Asset": [asset_id],
        "Active?": True,
        "Award Status": "Pending",
        "Video Feedback Key": canonical_video_feedback_key(asset_id),
        "Coach Feedback": coach_feedback,
    }
    if grade_band_id:
        fields["Grade Band"] = [grade_band_id]
    return fields


def build_video_asset_finalize_fields(*, video_feedback_id: str) -> dict[str, Any]:
    """Post-013 back-link + post-070b uploaded state."""
    return {
        "Video Feedback": [video_feedback_id],
        "Upload Status": "Uploaded",
        "Send to Make Trigger": False,
    }


def build_video_feedback_pipeline_fields(*, asset_id: str) -> dict[str, Any]:
    """Post-022 writeback fields on Video Feedback (Lambda viewer URL only)."""
    return {
        "Video URL or Drive Link": sim_lambda_viewer_url(asset_id),
        "Upload Status": "Uploaded",
        "Video Asset File Name": "season-sim-video.mp4",
    }


def build_video_feedback_arm_fields() -> dict[str, Any]:
    return {
        "Feedback Posted?": True,
        "Parent Feedback Ready?": True,
        "Parent Feedback Sent?": False,
    }


def video_feedback_email_intent(*, day_number: int, recipient: str = SAFE_EMAIL_RECIPIENT) -> dict[str, Any]:
    return {
        "event_type": HANDOFF_EVENT_TYPE,
        "day_number": day_number,
        "recipient": recipient,
        "send": False,
        "expected_from_execute_alone": True,
        "requires_parent_feedback_ready": True,
    }


def _linked_ids(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if isinstance(item, str) and item.startswith("rec"):
            out.append(item)
        elif isinstance(item, dict) and item.get("id"):
            out.append(str(item["id"]))
    return out


def _truthy(value: Any) -> bool:
    if value is True or value == 1:
        return True
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "count", "counted"}
    return False


def _text(value: Any) -> str:
    return str(value or "").strip()


def _attachment_count(value: Any) -> int:
    return len(value) if isinstance(value, list) else 0


@dataclass
class EligibilityResult:
    eligible: bool
    errors: list[str] = field(default_factory=list)
    handoff_key: str = ""
    event_type: str = HANDOFF_EVENT_TYPE


def validate_073_eligibility(
    *,
    video_feedback: dict[str, Any],
    submission: dict[str, Any],
    submission_asset: dict[str, Any],
    enrollment: dict[str, Any],
    xp_events: list[dict[str, Any]] | None = None,
    wall_today: date | None = None,
    require_xp_gates: bool = True,
) -> EligibilityResult:
    """Mirror Automation 073 structural + optional XP gates (offline helper).

    ``video_feedback`` / ``submission`` / etc. are ``{"id": ..., "fields": ...}`` rows.
    When ``require_xp_gates`` is False, XP-linked checks are skipped (structural only).
    """
    errors: list[str] = []
    vf_id = str(video_feedback.get("id") or "")
    vf = video_feedback.get("fields") or {}
    sub = submission.get("fields") or {}
    asset = submission_asset.get("fields") or {}
    enr = enrollment.get("fields") or {}

    if not _truthy(vf.get("Active?")):
        errors.append("Video Feedback is inactive/retired.")
    if not _truthy(vf.get("Feedback Posted?")):
        errors.append("Feedback Posted? is not checked.")
    if not _truthy(vf.get("Parent Feedback Ready?")):
        errors.append("Parent Feedback Ready? is not checked.")
    if _truthy(vf.get("Parent Feedback Sent?")):
        errors.append("Parent Feedback Sent? is already checked.")
    if not _text(vf.get("Coach Feedback")):
        errors.append("Coach Feedback is blank.")

    enrollment_ids = _linked_ids(vf.get("Enrollment"))
    submission_ids = _linked_ids(vf.get("Submission"))
    asset_ids = _linked_ids(vf.get("Submission Asset"))
    if len(enrollment_ids) != 1:
        errors.append(f"Video Feedback Enrollment must contain exactly one link; found {len(enrollment_ids)}.")
    if len(submission_ids) != 1:
        errors.append(f"Video Feedback Submission must contain exactly one link; found {len(submission_ids)}.")
    if len(asset_ids) != 1:
        errors.append(f"Video Feedback Submission Asset must contain exactly one link; found {len(asset_ids)}.")

    asset_id = asset_ids[0] if asset_ids else ""
    enrollment_id = enrollment_ids[0] if enrollment_ids else ""
    submission_id = submission_ids[0] if submission_ids else ""

    expected_key = canonical_video_feedback_key(asset_id) if asset_id else ""
    if asset_id and _text(vf.get("Video Feedback Key")) != expected_key:
        errors.append(f"Video Feedback Key mismatch. Expected {expected_key}.")

    if submission_id and _linked_ids(asset.get("Submission - Linked")) != [submission_id]:
        errors.append("Submission Asset does not belong exclusively to the linked Submission.")
    if enrollment_id and _linked_ids(asset.get("Enrollment - Linked")) != [enrollment_id]:
        errors.append("Submission Asset Enrollment does not match Video Feedback Enrollment.")
    if vf_id and vf_id not in _linked_ids(asset.get("Video Feedback")):
        errors.append("Submission Asset does not link back to this canonical Video Feedback.")
    if not _truthy(asset.get("Is True Video Feedback Asset?")):
        errors.append("Submission Asset is not a true Video Feedback asset.")

    if enrollment_id and _linked_ids(sub.get("Enrollment")) != [enrollment_id]:
        errors.append("Submission Enrollment does not match Video Feedback Enrollment.")
    week_ids = _linked_ids(sub.get("Week"))
    if len(week_ids) != 1:
        errors.append(f"Submission must have exactly one Week; found {len(week_ids)}.")
    if not _text(vf.get("Week")):
        errors.append("Video Feedback Week lookup is blank.")
    if not _truthy(sub.get("Count This Submission?")):
        errors.append("Linked Submission is not countable/current.")
    # Live Season Sim omits Video Upload attachment objects (API rejects placeholders).
    # Accept deterministic Source Attachment ID + video asset purpose/slot instead.
    has_video_upload = _attachment_count(sub.get("Video Upload")) > 0
    has_sim_video_provenance = (
        bool(_text(asset.get("Source Attachment ID")))
        and _text(asset.get("Asset Purpose")) == "Video For Feedback"
        and _text(asset.get("Asset Slot")) == "VIDEO"
    )
    if not has_video_upload and not has_sim_video_provenance:
        errors.append(
            "Linked Submission has no Video Upload and asset lacks Season Sim video provenance."
        )

    activity_raw = sub.get("Activity Date")
    if not activity_raw:
        errors.append("Submission Activity Date is missing/invalid.")
    elif wall_today is not None:
        try:
            activity_day = date.fromisoformat(str(activity_raw)[:10])
            if activity_day > wall_today:
                errors.append("Submission Activity Date is in the future.")
        except ValueError:
            errors.append("Submission Activity Date is missing/invalid.")

    video_url = _text(vf.get("Video URL or Drive Link"))
    if not video_url:
        errors.append('Video Feedback "Video URL or Drive Link" is blank.')
    elif "lambda-url.us-east-2.on.aws" not in video_url:
        errors.append("Video URL is not a Lambda viewer URL.")

    parent = _text(enr.get("Parent Email - Cleaned") or enr.get("Parent Email")).lower()
    if not parent or "@" not in parent:
        errors.append("No usable cleaned parent recipient on Enrollment.")
    elif parent != SAFE_EMAIL_RECIPIENT:
        errors.append(f"Enrollment parent email must be safe test recipient; found {parent!r}.")

    if not _truthy(enr.get("Active?")):
        errors.append("Enrollment is inactive.")

    if require_xp_gates:
        xp_rows = xp_events or []
        week_id = week_ids[0] if week_ids else ""
        active_points = 0
        for xp in xp_rows:
            xf = xp.get("fields") or {}
            if not _truthy(xf.get("Active?")):
                continue
            if _linked_ids(xf.get("Enrollment")) != [enrollment_id]:
                continue
            if week_id and _linked_ids(xf.get("Week")) != [week_id]:
                continue
            if vf_id not in _linked_ids(xf.get("Video Feedback")):
                continue
            pts = xf.get("XP Points")
            if isinstance(pts, (int, float)) and pts > 0:
                active_points += int(pts)
        if active_points <= 0:
            errors.append("No active Video Feedback XP Event matches Enrollment + Week + source.")
        base_xp = vf.get("Base XP Awarded")
        total_xp = vf.get("Total Video XP Awarded")
        if not (isinstance(base_xp, (int, float)) and base_xp > 0):
            errors.append("Video Feedback Base XP Awarded is not positive.")
        if not (isinstance(total_xp, (int, float)) and total_xp > 0):
            errors.append("Video Feedback Total Video XP Awarded is not positive.")

    handoff = video_feedback_handoff_key(vf_id) if vf_id else ""
    return EligibilityResult(
        eligible=len(errors) == 0,
        errors=errors,
        handoff_key=handoff,
        event_type=HANDOFF_EVENT_TYPE,
    )


def validate_113_readiness(
    *,
    video_feedback: dict[str, Any],
    submission: dict[str, Any],
) -> EligibilityResult:
    """Structural gates Automation 113 enforces before arming 114."""
    errors: list[str] = []
    vf = video_feedback.get("fields") or {}
    sub = submission.get("fields") or {}

    if not _truthy(vf.get("Active?")):
        errors.append("Video Feedback Active? is unchecked.")
    if not _truthy(vf.get("Feedback Posted?")):
        errors.append("Feedback Posted? is not checked.")
    if _truthy(vf.get("Do Not Award XP?")):
        errors.append("Do Not Award XP? is checked.")
    if not _text(vf.get("Coach Feedback")):
        errors.append("Coach Feedback is empty.")
    if len(_linked_ids(vf.get("Enrollment"))) != 1:
        errors.append("Enrollment must contain exactly one linked record.")
    if len(_linked_ids(vf.get("Submission"))) != 1:
        errors.append("Submission must contain exactly one linked record.")

    enr_id = _linked_ids(vf.get("Enrollment"))[0] if _linked_ids(vf.get("Enrollment")) else ""
    if enr_id and _linked_ids(sub.get("Enrollment")) != [enr_id]:
        errors.append("Submission Enrollment must match Video Feedback Enrollment.")
    if len(_linked_ids(sub.get("Week"))) != 1:
        errors.append("Submission Week must contain exactly one linked record.")
    if not _truthy(sub.get("Count This Submission?")):
        errors.append("Count This Submission? is not 1/true.")
    if _truthy(sub.get("Activity Date Is Future?")):
        errors.append("Activity Date Is Future? is 1/true.")

    return EligibilityResult(eligible=len(errors) == 0, errors=errors)


def build_073_handoff_payload_preview(
    *,
    video_feedback: dict[str, Any],
    enrollment: dict[str, Any],
    test_mode: bool = True,
) -> dict[str, Any]:
    """Non-secret Hub handoff payload shape for offline assertions (no send)."""
    vf = video_feedback.get("fields") or {}
    enr = enrollment.get("fields") or {}
    vf_id = str(video_feedback.get("id") or "")
    return {
        "eventType": HANDOFF_EVENT_TYPE,
        "handoffKey": video_feedback_handoff_key(vf_id),
        "templateKey": HANDOFF_TEMPLATE_KEY,
        "testMode": test_mode,
        "enrollmentId": (_linked_ids(vf.get("Enrollment")) or [""])[0],
        "sourceRecordId": vf_id,
        "recipient": _text(enr.get("Parent Email - Cleaned") or enr.get("Parent Email")),
        "coachFeedback": _text(vf.get("Coach Feedback")),
        "hasVideoUrl": bool(_text(vf.get("Video URL or Drive Link"))),
    }
