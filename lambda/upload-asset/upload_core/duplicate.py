from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from upload_core.airtable import api_url
from upload_core.config import TABLE
from upload_core.fields import (
    ASSET_REUSE_DECISION_NOT_REVIEWED,
    FIELD_ASSET_REUSE_DECISION,
    FIELD_ASSET_REUSE_REVIEW_PRIMARY_REASON,
    FIELD_ASSET_REUSE_REVIEW_REASONS,
    FIELD_ASSET_REUSE_REVIEW_SUMMARY,
    FIELD_DUPLICATE_CHECK_ERROR,
    FIELD_DUPLICATE_CHECKED_AT,
    FIELD_DUPLICATE_FILE_STATUS,
    FIELD_DUPLICATE_MATCH_NOTES,
    FIELD_DUPLICATE_MATCH_RECORD,
    FIELD_DUPLICATE_MATCH_RECORDS_ALL,
    FIELD_DUPLICATE_MATCH_STRENGTH,
    FIELD_EXACT_HASH_MATCH_FOUND,
    FIELD_POTENTIAL_ASSET_REUSE,
    FIELD_SAME_ENROLLMENT_MATCH_FOUND,
)
from upload_core.util import field_text, first_link, http_json, select_name, verify_hash_hex

DUPLICATE_MATCH_READ_FIELDS = [
    "Canonical File URL",
    "Storage Key",
    "File Content Hash",
    "Uploaded At",
    "Enrollment - Linked",
    "Asset Type",
    "Asset Purpose",
    "Upload Destination",
    "Homework Completions",
    "Homework Name - Slot Correct",
    "Asset Slot",
    "Asset Label",
    "Week",
    "Date",
    "Submission - Linked",
    "Video Feedback",
    "Source Attachment ID",
    "Original File Name",
    "File Size Bytes",
]

REASON_HOMEWORK_FOR_VF = "Homework Used for Video Feedback"
REASON_VF_FOR_HOMEWORK = "Video Feedback Used for Homework"
REASON_DIFF_ASSIGNMENT = "Different Assignment Reuse"
REASON_DIFF_WEEK = "Different Week Reuse"
REASON_DIFF_SUBMISSION = "Different Submission Reuse"
REASON_SAME_ASSIGNMENT_RESUB = "Same Assignment Resubmission"
REASON_MISSING_CONTEXT = "Missing Context"
REASON_MULTIPLE_PRIOR = "Multiple Prior Uses"
REASON_CROSS_TYPE = "Cross-Type Reuse"
REASON_CROSS_ENROLLMENT_INFO = "Cross-Enrollment Match — Informational"

PRIMARY_REASON_SEVERITY: tuple[str, ...] = (
    REASON_HOMEWORK_FOR_VF,
    REASON_VF_FOR_HOMEWORK,
    REASON_DIFF_ASSIGNMENT,
    REASON_DIFF_WEEK,
    REASON_DIFF_SUBMISSION,
    REASON_SAME_ASSIGNMENT_RESUB,
    REASON_MISSING_CONTEXT,
    REASON_MULTIPLE_PRIOR,
    REASON_CROSS_TYPE,
    REASON_CROSS_ENROLLMENT_INFO,
)

SEVERITY_RANK = {reason: index for index, reason in enumerate(PRIMARY_REASON_SEVERITY)}


@dataclass(frozen=True)
class AssetContext:
    record_id: str
    enrollment_id: str
    asset_type: str
    asset_purpose: str
    upload_destination: str
    homework_ids: tuple[str, ...]
    homework_label: str
    asset_slot: str
    asset_label: str
    week: str
    activity_date: str
    submission_id: str
    video_feedback_ids: tuple[str, ...]
    source_attachment_id: str
    original_filename: str
    uploaded_at: str | None


@dataclass
class MatchClassification:
    exact_hash_match: bool
    same_enrollment_matches: list[dict]
    cross_enrollment_matches: list[dict]
    pair_reasons: dict[str, list[str]]
    all_reasons: list[str]
    primary_match: dict | None
    primary_reason: str | None
    potential_reuse: bool
    summary: str
    informational_note: str = ""


def duplicate_checked_at_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def quote_formula(formula: str) -> str:
    from urllib.parse import quote

    return quote(formula, safe="")


def lookup_duplicate_matches(
    token: str,
    base_id: str,
    file_hash: str,
    exclude_record_id: str,
    *,
    max_records: int = 25,
) -> list[dict]:
    if not file_hash or not verify_hash_hex(file_hash):
        return []
    formula = (
        f'AND({{File Content Hash}} = "{file_hash}", RECORD_ID() != "{exclude_record_id}", '
        f'{{Upload Status}} = "Uploaded")'
    )
    base = api_url(base_id, TABLE)
    params = "&".join(
        [
            f"filterByFormula={quote_formula(formula)}",
            f"maxRecords={max_records}",
        ]
        + [f"fields%5B{i}%5D={f.replace(' ', '%20')}" for i, f in enumerate(DUPLICATE_MATCH_READ_FIELDS)]
    )
    url = f"{base}?{params}"
    status, data = http_json("GET", url, token=token)
    if status != 200 or not isinstance(data, dict):
        raise RuntimeError(f"duplicate lookup GET -> HTTP {status}: {data}")
    return data.get("records", [])


def _link_ids(fields: dict, key: str) -> tuple[str, ...]:
    val = fields.get(key)
    if not isinstance(val, list):
        return ()
    return tuple(item for item in val if isinstance(item, str) and item)


def extract_asset_context(record_id: str, fields: dict) -> AssetContext:
    homework_label = field_text(fields.get("Homework Name - Slot Correct"))
    if not homework_label:
        homework_label = field_text(fields.get("Asset Label"))
    return AssetContext(
        record_id=record_id,
        enrollment_id=first_link(fields, "Enrollment - Linked"),
        asset_type=select_name(fields.get("Asset Type")),
        asset_purpose=select_name(fields.get("Asset Purpose")),
        upload_destination=select_name(fields.get("Upload Destination")),
        homework_ids=_link_ids(fields, "Homework Completions"),
        homework_label=homework_label,
        asset_slot=field_text(fields.get("Asset Slot")),
        asset_label=field_text(fields.get("Asset Label")),
        week=field_text(fields.get("Week")),
        activity_date=field_text(fields.get("Date")),
        submission_id=first_link(fields, "Submission - Linked"),
        video_feedback_ids=_link_ids(fields, "Video Feedback"),
        source_attachment_id=field_text(fields.get("Source Attachment ID")),
        original_filename=field_text(fields.get("Original File Name")),
        uploaded_at=field_text(fields.get("Uploaded At")) or None,
    )


def _is_homework_like(ctx: AssetContext) -> bool:
    if ctx.homework_ids:
        return True
    combined = " ".join(
        part.lower()
        for part in (ctx.asset_type, ctx.asset_purpose, ctx.upload_destination, ctx.homework_label)
        if part
    )
    return "homework" in combined


def _is_video_feedback_like(ctx: AssetContext) -> bool:
    if ctx.video_feedback_ids:
        return True
    combined = " ".join(
        part.lower()
        for part in (ctx.asset_type, ctx.asset_purpose, ctx.upload_destination)
        if part
    )
    return "video" in combined and "feedback" in combined


def _assignment_key(ctx: AssetContext) -> str:
    if ctx.homework_ids:
        return "hc:" + ",".join(sorted(ctx.homework_ids))
    label = ctx.homework_label or ctx.asset_label or ctx.asset_slot
    return f"label:{label.lower()}" if label else ""


def _context_missing_for_compare(ctx: AssetContext) -> bool:
    if not ctx.enrollment_id:
        return True
    has_activity = bool(
        ctx.submission_id
        or ctx.homework_ids
        or ctx.video_feedback_ids
        or ctx.week
        or ctx.homework_label
    )
    has_type = bool(ctx.asset_type or ctx.asset_purpose or ctx.upload_destination)
    return not has_activity or not has_type


def compare_pair_reasons(current: AssetContext, prior: AssetContext) -> list[str]:
    reasons: list[str] = []

    if _context_missing_for_compare(current) or _context_missing_for_compare(prior):
        reasons.append(REASON_MISSING_CONTEXT)

    prior_hw = _is_homework_like(prior)
    prior_vf = _is_video_feedback_like(prior)
    current_hw = _is_homework_like(current)
    current_vf = _is_video_feedback_like(current)

    if prior_hw and current_vf and not (prior_vf and current_hw):
        reasons.append(REASON_HOMEWORK_FOR_VF)
    if prior_vf and current_hw and not (prior_hw and current_vf):
        reasons.append(REASON_VF_FOR_HOMEWORK)

    if current.asset_type and prior.asset_type and current.asset_type != prior.asset_type:
        if REASON_HOMEWORK_FOR_VF not in reasons and REASON_VF_FOR_HOMEWORK not in reasons:
            reasons.append(REASON_CROSS_TYPE)

    current_assignment = _assignment_key(current)
    prior_assignment = _assignment_key(prior)
    if current_assignment and prior_assignment and current_assignment != prior_assignment:
        reasons.append(REASON_DIFF_ASSIGNMENT)

    if current.week and prior.week and current.week != prior.week:
        reasons.append(REASON_DIFF_WEEK)

    if current.submission_id and prior.submission_id and current.submission_id != prior.submission_id:
        reasons.append(REASON_DIFF_SUBMISSION)

    same_assignment = (
        current_assignment
        and prior_assignment
        and current_assignment == prior_assignment
        and current.week == prior.week
        and current.submission_id == prior.submission_id
        and (not current.asset_type or not prior.asset_type or current.asset_type == prior.asset_type)
    )
    if same_assignment and current.record_id != prior.record_id:
        reasons.append(REASON_SAME_ASSIGNMENT_RESUB)

    if not reasons and current.record_id != prior.record_id:
        reasons.append(REASON_MISSING_CONTEXT)

    return _dedupe_reasons(reasons)


def _dedupe_reasons(reasons: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for reason in reasons:
        if reason not in seen:
            seen.add(reason)
            ordered.append(reason)
    return ordered


def _parse_uploaded_at(value: str | None) -> datetime:
    if not value:
        return datetime.max.replace(tzinfo=timezone.utc)
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return datetime.max.replace(tzinfo=timezone.utc)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _match_sort_key(match: dict, reasons: list[str]) -> tuple[int, datetime, str]:
    best_rank = min((SEVERITY_RANK.get(r, 999) for r in reasons), default=999)
    fields = match.get("fields", {})
    uploaded = _parse_uploaded_at(field_text(fields.get("Uploaded At")) or None)
    record_id = str(match.get("id") or "")
    return (best_rank, uploaded, record_id)


def select_primary_match(
    current: AssetContext,
    same_enrollment_matches: list[dict],
    pair_reasons: dict[str, list[str]],
) -> tuple[dict | None, str | None]:
    if not same_enrollment_matches:
        return None, None

    ranked: list[tuple[dict, list[str]]] = []
    for match in same_enrollment_matches:
        match_id = str(match.get("id") or "")
        reasons = pair_reasons.get(match_id, [])
        ranked.append((match, reasons))

    ranked.sort(key=lambda item: _match_sort_key(item[0], item[1]))
    primary_match, primary_reasons = ranked[0]

    primary_reason = None
    for reason in PRIMARY_REASON_SEVERITY:
        if reason in primary_reasons:
            primary_reason = reason
            break
    if primary_reason is None and primary_reasons:
        primary_reason = primary_reasons[0]
    return primary_match, primary_reason


def _format_context_line(ctx: AssetContext) -> str:
    parts: list[str] = []
    if ctx.week:
        parts.append(f"Week {ctx.week}")
    if ctx.homework_label:
        parts.append(ctx.homework_label)
    elif ctx.asset_type:
        parts.append(ctx.asset_type)
    elif ctx.upload_destination:
        parts.append(ctx.upload_destination)
    if ctx.submission_id:
        parts.append(f"Submission {ctx.submission_id}")
    return " / ".join(parts) if parts else "unknown context"


def build_comparison_summary(
    current: AssetContext,
    primary_match: dict | None,
    *,
    primary_reason: str | None,
    all_reasons: list[str],
    cross_enrollment_count: int,
) -> str:
    if not primary_match and cross_enrollment_count and not all_reasons:
        return (
            f"Identical file bytes also exist on {cross_enrollment_count} other enrollment(s) "
            f"(informational only — processing normally)."
        )
    if not primary_match:
        if REASON_MISSING_CONTEXT in all_reasons:
            return "Identical file bytes matched a prior upload but comparison context is incomplete."
        return "No same-enrollment contextual reuse detected."

    prior_id = str(primary_match.get("id") or "")
    prior_ctx = extract_asset_context(prior_id, primary_match.get("fields", {}))
    prior_line = _format_context_line(prior_ctx)
    current_line = _format_context_line(current)
    reason_text = primary_reason or "Potential reuse"
    summary = (
        f"{reason_text}: identical file was previously submitted for {prior_line} "
        f"and was submitted again for {current_line}."
    )
    if REASON_MULTIPLE_PRIOR in all_reasons:
        summary += " Multiple prior same-enrollment uses exist."
    if cross_enrollment_count:
        summary += f" ({cross_enrollment_count} cross-enrollment informational match(es).)"
    return summary


def classify_duplicate_matches(
    *,
    current_record_id: str,
    current_fields: dict,
    matches: list[dict],
) -> MatchClassification:
    current_ctx = extract_asset_context(current_record_id, current_fields)
    exact_hash_match = bool(matches)

    same_enrollment: list[dict] = []
    cross_enrollment: list[dict] = []
    for match in matches:
        prior_ctx = extract_asset_context(str(match.get("id") or ""), match.get("fields", {}))
        if (
            current_ctx.enrollment_id
            and prior_ctx.enrollment_id
            and current_ctx.enrollment_id == prior_ctx.enrollment_id
        ):
            same_enrollment.append(match)
        else:
            cross_enrollment.append(match)

    pair_reasons: dict[str, list[str]] = {}
    all_reasons: list[str] = []
    for match in same_enrollment:
        match_id = str(match.get("id") or "")
        prior_ctx = extract_asset_context(match_id, match.get("fields", {}))
        reasons = compare_pair_reasons(current_ctx, prior_ctx)
        pair_reasons[match_id] = reasons
        all_reasons.extend(reasons)

    if len(same_enrollment) > 1:
        all_reasons.append(REASON_MULTIPLE_PRIOR)

    if cross_enrollment:
        all_reasons.append(REASON_CROSS_ENROLLMENT_INFO)

    all_reasons = _dedupe_reasons(all_reasons)

    primary_match, primary_reason = select_primary_match(current_ctx, same_enrollment, pair_reasons)

    reuse_reasons = [r for r in all_reasons if r != REASON_CROSS_ENROLLMENT_INFO]
    potential_reuse = bool(same_enrollment and reuse_reasons)

    informational_note = ""
    if cross_enrollment and not same_enrollment:
        informational_note = (
            f"Cross-enrollment informational match(es): "
            f"{', '.join(str(m.get('id')) for m in cross_enrollment[:3])}"
        )

    summary = build_comparison_summary(
        current_ctx,
        primary_match,
        primary_reason=primary_reason,
        all_reasons=all_reasons,
        cross_enrollment_count=len(cross_enrollment),
    )

    return MatchClassification(
        exact_hash_match=exact_hash_match,
        same_enrollment_matches=same_enrollment,
        cross_enrollment_matches=cross_enrollment,
        pair_reasons=pair_reasons,
        all_reasons=all_reasons,
        primary_match=primary_match,
        primary_reason=primary_reason,
        potential_reuse=potential_reuse,
        summary=summary,
        informational_note=informational_note,
    )


def human_decision_is_locked(fields: dict) -> bool:
    decision = select_name(fields.get(FIELD_ASSET_REUSE_DECISION))
    return bool(decision) and decision != ASSET_REUSE_DECISION_NOT_REVIEWED


def build_review_writeback(
    classification: MatchClassification,
    *,
    existing_fields: dict,
    file_hash: str,
    lookup_error: str = "",
) -> dict[str, Any]:
    checked_at = duplicate_checked_at_iso()

    if lookup_error:
        return {
            FIELD_DUPLICATE_FILE_STATUS: "Error",
            FIELD_DUPLICATE_MATCH_STRENGTH: "Manual Review",
            FIELD_DUPLICATE_MATCH_NOTES: "Duplicate lookup failed.",
            FIELD_DUPLICATE_CHECKED_AT: checked_at,
            FIELD_DUPLICATE_CHECK_ERROR: lookup_error,
            FIELD_EXACT_HASH_MATCH_FOUND: False,
        }

    if not file_hash:
        return {
            FIELD_DUPLICATE_FILE_STATUS: "Error",
            FIELD_DUPLICATE_MATCH_STRENGTH: "Manual Review",
            FIELD_DUPLICATE_MATCH_NOTES: "Hash missing — duplicate check skipped.",
            FIELD_DUPLICATE_CHECKED_AT: checked_at,
            FIELD_DUPLICATE_CHECK_ERROR: "SHA-256 hash not computed.",
            FIELD_EXACT_HASH_MATCH_FOUND: False,
        }

    if not classification.exact_hash_match:
        fields: dict[str, Any] = {
            FIELD_EXACT_HASH_MATCH_FOUND: False,
            FIELD_SAME_ENROLLMENT_MATCH_FOUND: False,
            FIELD_DUPLICATE_FILE_STATUS: "Unique",
            FIELD_DUPLICATE_MATCH_STRENGTH: "Exact SHA-256 Hash",
            FIELD_DUPLICATE_MATCH_RECORD: [],
            FIELD_DUPLICATE_MATCH_RECORDS_ALL: [],
            FIELD_POTENTIAL_ASSET_REUSE: False,
            FIELD_DUPLICATE_MATCH_NOTES: "No matching file hash found.",
            FIELD_DUPLICATE_CHECKED_AT: checked_at,
            FIELD_DUPLICATE_CHECK_ERROR: "",
            FIELD_ASSET_REUSE_REVIEW_SUMMARY: "",
            FIELD_ASSET_REUSE_REVIEW_REASONS: [],
            FIELD_ASSET_REUSE_REVIEW_PRIMARY_REASON: None,
        }
        return _apply_decision_guard(fields, existing_fields)

    primary_id = ""
    if classification.primary_match:
        primary_id = str(classification.primary_match.get("id") or "")
    elif classification.cross_enrollment_matches:
        primary_id = str(classification.cross_enrollment_matches[0].get("id") or "")

    all_same_ids = [str(m.get("id") or "") for m in classification.same_enrollment_matches if m.get("id")]

    notes = classification.summary
    if classification.informational_note:
        notes = f"{notes}\n{classification.informational_note}".strip()

    review_reasons = [r for r in classification.all_reasons if r != REASON_CROSS_ENROLLMENT_INFO]

    fields = {
        FIELD_EXACT_HASH_MATCH_FOUND: True,
        FIELD_SAME_ENROLLMENT_MATCH_FOUND: bool(classification.same_enrollment_matches),
        FIELD_DUPLICATE_FILE_STATUS: "Exact Duplicate",
        FIELD_DUPLICATE_MATCH_STRENGTH: "Exact SHA-256 Hash",
        FIELD_DUPLICATE_MATCH_RECORD: [primary_id] if primary_id else [],
        FIELD_DUPLICATE_MATCH_RECORDS_ALL: all_same_ids,
        FIELD_POTENTIAL_ASSET_REUSE: classification.potential_reuse,
        FIELD_ASSET_REUSE_REVIEW_PRIMARY_REASON: classification.primary_reason,
        FIELD_ASSET_REUSE_REVIEW_REASONS: review_reasons,
        FIELD_ASSET_REUSE_REVIEW_SUMMARY: classification.summary,
        FIELD_DUPLICATE_MATCH_NOTES: notes,
        FIELD_DUPLICATE_CHECKED_AT: checked_at,
        FIELD_DUPLICATE_CHECK_ERROR: "",
    }
    return _apply_decision_guard(fields, existing_fields)


def _apply_decision_guard(writeback: dict[str, Any], existing_fields: dict) -> dict[str, Any]:
    if human_decision_is_locked(existing_fields):
        writeback = dict(writeback)
        writeback.pop(FIELD_ASSET_REUSE_DECISION, None)
        writeback.pop(FIELD_ASSET_REUSE_REVIEW_PRIMARY_REASON, None)
        writeback.pop(FIELD_ASSET_REUSE_REVIEW_REASONS, None)
        writeback.pop(FIELD_ASSET_REUSE_REVIEW_SUMMARY, None)
        writeback.pop(FIELD_POTENTIAL_ASSET_REUSE, None)
    elif not select_name(existing_fields.get(FIELD_ASSET_REUSE_DECISION)):
        writeback = dict(writeback)
        writeback[FIELD_ASSET_REUSE_DECISION] = ASSET_REUSE_DECISION_NOT_REVIEWED
    return writeback


def build_c023_duplicate_report(
    *,
    record_id: str,
    file_hash: str,
    classification: MatchClassification,
    lookup_performed: bool,
    review_writeback_applied: bool,
    review_writeback_error: str = "",
) -> dict[str, Any]:
    formatted = [
        {
            "recordId": match.get("id"),
            "enrollmentId": first_link(match.get("fields", {}), "Enrollment - Linked"),
        }
        for match in classification.same_enrollment_matches + classification.cross_enrollment_matches
    ]
    return {
        "currentAssetId": record_id,
        "computedSha256": file_hash,
        "duplicateLookupPerformed": lookup_performed,
        "exactHashMatchFound": classification.exact_hash_match,
        "sameEnrollmentMatchCount": len(classification.same_enrollment_matches),
        "crossEnrollmentMatchCount": len(classification.cross_enrollment_matches),
        "duplicateMatchCount": len(formatted),
        "duplicateMatches": formatted,
        "reviewReasons": classification.all_reasons,
        "primaryReason": classification.primary_reason,
        "primaryMatchId": (classification.primary_match or {}).get("id"),
        "potentialAssetReuse": classification.potential_reuse,
        "reviewSummary": classification.summary,
        "reviewWritebackApplied": review_writeback_applied,
        "reviewWritebackError": review_writeback_error,
        "uploadBlocked": False,
        "notes": "C-023 — independent upload; potential reuse is warning-only.",
    }
