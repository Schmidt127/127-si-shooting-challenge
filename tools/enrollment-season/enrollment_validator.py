#!/usr/bin/env python3
"""
Standalone enrollment intake validator (offline / fixtures only).

Returns field-level findings with severity:
  PASS | WARNING | FAIL

Does not create Airtable records or call live APIs.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Optional

try:
    from identity_matching import (
        build_athlete_match_key,
        is_valid_match_key,
        normalize_email,
        normalize_text,
    )
except ImportError:  # pragma: no cover
    from enrollment_season.identity_matching import (  # type: ignore
        build_athlete_match_key,
        is_valid_match_key,
        normalize_email,
        normalize_text,
    )

EMAIL_RE = re.compile(r"^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$")
PHONE_RE = re.compile(r"^\+?[0-9().\-\s]{7,20}$")

# Grade options observed / expected for Fillout → Enrollments.Grade single-select.
# Keep permissive; Fillout contract may narrow further.
ALLOWED_GRADES = {
    "Pre K",
    "K",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "Pre-K",
    "Kindergarten",
}


@dataclass
class Finding:
    field: str
    severity: str  # PASS | WARNING | FAIL
    code: str
    message: str


@dataclass
class ValidationResult:
    overall: str  # PASS | WARNING | FAIL
    findings: list[Finding] = field(default_factory=list)
    normalized: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "overall": self.overall,
            "findings": [
                {
                    "field": f.field,
                    "severity": f.severity,
                    "code": f.code,
                    "message": f.message,
                }
                for f in self.findings
            ],
            "normalized": self.normalized,
        }


def _name_ok(value: str) -> bool:
    cleaned = value.strip()
    if len(cleaned) < 1 or len(cleaned) > 60:
        return False
    # Reject pure numbers / emails as names
    if "@" in cleaned or cleaned.isdigit():
        return False
    return True


def _validate_email(raw: Any, *, field_name: str, required: bool) -> list[Finding]:
    findings: list[Finding] = []
    original = str(raw or "")
    stripped = original.strip()
    if not stripped:
        if required:
            findings.append(
                Finding(
                    field_name,
                    "FAIL",
                    "required_missing",
                    f"{field_name} is required.",
                )
            )
        else:
            findings.append(
                Finding(
                    field_name,
                    "WARNING",
                    "optional_missing",
                    f"{field_name} is empty (allowed for some athletes).",
                )
            )
        return findings

    if original != stripped or "  " in original:
        findings.append(
            Finding(
                field_name,
                "WARNING",
                "whitespace",
                f"{field_name} has leading/trailing or doubled whitespace; normalize before write.",
            )
        )

    normalized = normalize_email(stripped)
    if not EMAIL_RE.match(normalized):
        findings.append(
            Finding(
                field_name,
                "FAIL",
                "malformed_email",
                f"{field_name} is not a valid email address.",
            )
        )
        return findings

    if stripped != stripped.lower() or stripped != normalized:
        findings.append(
            Finding(
                field_name,
                "WARNING",
                "capitalization_or_format",
                f"{field_name} should be stored lowercase-normalized.",
            )
        )

    findings.append(
        Finding(field_name, "PASS", "email_ok", f"{field_name} looks valid.")
    )
    return findings


def validate_enrollment_payload(
    payload: dict[str, Any],
    *,
    existing_match_keys: Optional[set[str]] = None,
    current_season_enrollment_keys: Optional[set[str]] = None,
) -> ValidationResult:
    """
    Validate a Fillout-shaped / Enrollment-shaped dict.

    Expected keys (snake or Airtable labels accepted via aliases).
    """
    existing_match_keys = existing_match_keys or set()
    current_season_enrollment_keys = current_season_enrollment_keys or set()

    def get(*keys: str, default: str = "") -> str:
        for k in keys:
            if k in payload and payload[k] is not None:
                return str(payload[k])
        return default

    first = get("athleteFirstName", "Athlete First Name")
    last = get("athleteLastName", "Athlete Last Name")
    parent_first = get("parentFirstName", "Parent First Name")
    parent_last = get("parentLastName", "Parent Last Name")
    parent_full = get("parentFullName", "Parent Full Name Submitted")
    parent_email = get("parentEmail", "Parent Email")
    athlete_email = get("athleteEmail", "Athlete Email")
    grade = get("grade", "Grade")
    school = get("school", "School", "School Name")
    phone = get("parentCell", "Parent Cell Number", "phone")
    school_year = get("schoolYear", "School Year", "enrollmentYear")
    consent = payload.get("consent", payload.get("Consent", None))
    submission_fingerprint = get("submissionFingerprint", "Submission Fingerprint")

    findings: list[Finding] = []
    normalized: dict[str, Any] = {}

    # Athlete names
    if not first.strip():
        findings.append(
            Finding("Athlete First Name", "FAIL", "required_missing", "Athlete first name is required.")
        )
    elif not _name_ok(first):
        findings.append(
            Finding("Athlete First Name", "FAIL", "invalid_name", "Athlete first name is invalid.")
        )
    else:
        if first != first.strip() or first != first.title() and first != first:
            if first != first.strip():
                findings.append(
                    Finding(
                        "Athlete First Name",
                        "WARNING",
                        "whitespace",
                        "Trim whitespace from athlete first name.",
                    )
                )
        findings.append(
            Finding("Athlete First Name", "PASS", "name_ok", "Athlete first name present.")
        )
        normalized["athleteFirstName"] = first.strip()

    if not last.strip():
        findings.append(
            Finding("Athlete Last Name", "FAIL", "required_missing", "Athlete last name is required.")
        )
    elif not _name_ok(last):
        findings.append(
            Finding("Athlete Last Name", "FAIL", "invalid_name", "Athlete last name is invalid.")
        )
    else:
        if last != last.strip():
            findings.append(
                Finding(
                    "Athlete Last Name",
                    "WARNING",
                    "whitespace",
                    "Trim whitespace from athlete last name.",
                )
            )
        findings.append(
            Finding("Athlete Last Name", "PASS", "name_ok", "Athlete last name present.")
        )
        normalized["athleteLastName"] = last.strip()

    # Parent / guardian name
    parent_name = " ".join(
        x for x in [parent_first.strip(), parent_last.strip()] if x
    ) or parent_full.strip()
    if not parent_name:
        findings.append(
            Finding(
                "Parent Name",
                "FAIL",
                "required_missing",
                "Parent/guardian name is required (first+last or full name).",
            )
        )
    else:
        findings.append(
            Finding("Parent Name", "PASS", "name_ok", "Parent/guardian name present.")
        )
        normalized["parentName"] = parent_name

    # Emails
    findings.extend(_validate_email(parent_email, field_name="Parent Email", required=True))
    findings.extend(_validate_email(athlete_email, field_name="Athlete Email", required=False))
    normalized["parentEmail"] = normalize_email(parent_email)
    if athlete_email.strip():
        normalized["athleteEmail"] = normalize_email(athlete_email)

    # Grade
    grade_stripped = grade.strip()
    if not grade_stripped:
        findings.append(
            Finding("Grade", "FAIL", "required_missing", "Grade is required for Grade Band assignment.")
        )
    else:
        # Accept numeric strings and known labels
        grade_norm = grade_stripped
        if grade_norm.lower() in {"pre k", "prek", "pre-k"}:
            grade_norm = "Pre K"
        if grade_norm not in ALLOWED_GRADES and not grade_norm.isdigit():
            findings.append(
                Finding(
                    "Grade",
                    "WARNING",
                    "unexpected_grade",
                    f"Grade '{grade_stripped}' is not in the known option set; confirm Fillout mapping.",
                )
            )
        else:
            findings.append(Finding("Grade", "PASS", "grade_ok", "Grade present."))
        normalized["grade"] = grade_norm

    # School
    if not school.strip():
        findings.append(
            Finding("School", "WARNING", "optional_missing", "School is empty; confirm if required for season.")
        )
    else:
        findings.append(Finding("School", "PASS", "school_ok", "School present."))
        normalized["school"] = school.strip()

    # Phone
    if phone.strip():
        if not PHONE_RE.match(phone.strip()):
            findings.append(
                Finding("Phone", "FAIL", "malformed_phone", "Phone number looks malformed.")
            )
        else:
            findings.append(Finding("Phone", "PASS", "phone_ok", "Phone present."))
            normalized["phone"] = phone.strip()
    else:
        findings.append(
            Finding("Phone", "WARNING", "optional_missing", "Phone empty where applicable.")
        )

    # Season / enrollment year
    if not school_year.strip():
        findings.append(
            Finding(
                "School Year",
                "FAIL",
                "required_missing",
                "Season / School Year is required for enrollment scoping.",
            )
        )
    else:
        findings.append(
            Finding("School Year", "PASS", "season_ok", "School Year present.")
        )
        normalized["schoolYear"] = school_year.strip()

    # Consent
    if consent is None:
        findings.append(
            Finding(
                "Consent",
                "WARNING",
                "consent_unknown",
                "Consent field not present in payload; confirm Fillout required checkbox.",
            )
        )
    elif consent in (True, "true", "True", "yes", "Yes", 1, "1"):
        findings.append(Finding("Consent", "PASS", "consent_ok", "Consent accepted."))
        normalized["consent"] = True
    else:
        findings.append(
            Finding("Consent", "FAIL", "consent_missing", "Consent must be accepted.")
        )

    # Identity key + duplicate submission checks
    match_key = build_athlete_match_key(
        normalized.get("parentEmail", ""),
        normalized.get("athleteFirstName", first),
        normalized.get("athleteLastName", last),
    )
    normalized["athleteMatchKey"] = match_key
    if is_valid_match_key(match_key):
        findings.append(
            Finding("Athlete Match Key", "PASS", "match_key_ok", "Match key can be built.")
        )
    else:
        findings.append(
            Finding(
                "Athlete Match Key",
                "FAIL",
                "match_key_invalid",
                "Cannot build Athlete Match Key from supplied identity fields.",
            )
        )

    season_key = f"{match_key}|{normalized.get('schoolYear', school_year.strip())}"
    if season_key in current_season_enrollment_keys:
        findings.append(
            Finding(
                "Duplicate Season Enrollment",
                "FAIL",
                "already_enrolled_current_season",
                "Athlete identity already has an enrollment for this School Year.",
            )
        )

    if submission_fingerprint and submission_fingerprint in existing_match_keys:
        findings.append(
            Finding(
                "Duplicate Submission",
                "FAIL",
                "duplicate_form_submission",
                "Identical form submission fingerprint already processed.",
            )
        )
    elif submission_fingerprint:
        findings.append(
            Finding(
                "Duplicate Submission",
                "PASS",
                "submission_unique",
                "Submission fingerprint not seen.",
            )
        )

    # Mixed capitalization note for names
    for label, value in (
        ("Athlete First Name", first),
        ("Athlete Last Name", last),
    ):
        if value and value != value.strip():
            continue
        if value and value == value.upper() and len(value) > 1:
            findings.append(
                Finding(
                    label,
                    "WARNING",
                    "all_caps",
                    f"{label} is ALL CAPS; prefer Title Case normalization in Fillout or 001.",
                )
            )

    severities = {f.severity for f in findings}
    if "FAIL" in severities:
        overall = "FAIL"
    elif "WARNING" in severities:
        overall = "WARNING"
    else:
        overall = "PASS"

    return ValidationResult(overall=overall, findings=findings, normalized=normalized)


__all__ = ["Finding", "ValidationResult", "validate_enrollment_payload", "ALLOWED_GRADES"]
