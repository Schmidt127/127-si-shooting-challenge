#!/usr/bin/env python3
"""
Read-only, deterministic athlete identity matching helper.

Mirrors Automation 001 match hierarchy (repo evidence):
  1. Existing Enrollment → Athlete link (already-linked)
  2. Athletes.{Athlete Match Key} formula exact match
  3. firstName + lastName + parentEmail (normalized)
  4. No match → candidate for create (caller decides; this helper never writes)

Match key format (script-built, same as 001):
  normalizeEmail(parentEmail) | normalizeText(firstName) | normalizeText(lastName)

This module never merges, deletes, or mutates records.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable, Optional


def normalize_text(value: Any) -> str:
    """Trim, lowercase, collapse internal whitespace — matches 001 normalizeText."""
    return " ".join(str(value or "").strip().lower().split())


def normalize_email(value: Any) -> str:
    """Normalize email for matching — mirrors 001 normalizeEmail."""
    email = str(value or "").strip().lower()
    angle_start = email.find("<")
    angle_end = email.find(">")
    if angle_start != -1 and angle_end != -1 and angle_end > angle_start:
        email = email[angle_start + 1 : angle_end].strip().lower()
    email = email.strip("\"'")
    while email.endswith(",") or email.endswith(";"):
        email = email[:-1]
    email = "".join(email.split())
    return email


def build_athlete_match_key(parent_email: Any, first_name: Any, last_name: Any) -> str:
    return "|".join(
        [
            normalize_email(parent_email),
            normalize_text(first_name),
            normalize_text(last_name),
        ]
    )


def is_valid_match_key(match_key: str) -> bool:
    if not match_key or match_key == "||":
        return False
    parts = match_key.split("|")
    if len(parts) != 3:
        return False
    return all(parts)


@dataclass(frozen=True)
class AthleteCandidate:
    athlete_id: str
    first_name: str = ""
    last_name: str = ""
    parent_email: str = ""
    athlete_match_key: str = ""
    active: Optional[bool] = None
    enrollment_ids: tuple[str, ...] = ()
    current_season_enrollment_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class EnrollmentIdentityInput:
    enrollment_id: str = ""
    athlete_first_name: str = ""
    athlete_last_name: str = ""
    parent_email: str = ""
    parent_email_cleaned: str = ""
    parent_email_submitted: str = ""
    athlete_email: str = ""
    existing_athlete_id: str = ""
    school_year: str = ""
    program_instance_id: str = ""


@dataclass
class MatchResult:
    status: str  # matched | create_candidate | skipped_missing_required | ambiguous
    match_method: str
    athlete_id: str = ""
    athlete_match_key: str = ""
    parent_email_used: str = ""
    reason: str = ""
    warnings: list[str] = field(default_factory=list)
    candidates: list[str] = field(default_factory=list)


def resolve_parent_email(enrollment: EnrollmentIdentityInput) -> tuple[str, str]:
    """Prefer Cleaned → Parent Email → Submitted (001 order)."""
    for field_name, raw in (
        ("Parent Email - Cleaned", enrollment.parent_email_cleaned),
        ("Parent Email", enrollment.parent_email),
        ("Parent Email Submitted", enrollment.parent_email_submitted),
    ):
        normalized = normalize_email(raw)
        if normalized:
            return normalized, field_name
    return "", ""


def find_matching_athlete(
    athlete_records: Iterable[AthleteCandidate],
    athlete_match_key: str,
    first_name: str,
    last_name: str,
    parent_email: str,
) -> MatchResult:
    """Pure match against an in-memory athlete list. Read-only."""
    records = list(athlete_records)
    key = athlete_match_key or build_athlete_match_key(parent_email, first_name, last_name)
    n_first = normalize_text(first_name)
    n_last = normalize_text(last_name)
    n_email = normalize_email(parent_email)

    key_matches = [
        r
        for r in records
        if r.athlete_match_key and r.athlete_match_key.strip() == key
    ]
    if key_matches:
        if len(key_matches) > 1:
            return MatchResult(
                status="ambiguous",
                match_method="formula-match-key",
                athlete_match_key=key,
                parent_email_used=n_email,
                reason="multiple_athletes_share_match_key",
                candidates=[r.athlete_id for r in key_matches],
                warnings=["Do not auto-merge ambiguous Athletes."],
            )
        return MatchResult(
            status="matched",
            match_method="formula-match-key",
            athlete_id=key_matches[0].athlete_id,
            athlete_match_key=key,
            parent_email_used=n_email,
            reason="exact_match_key",
        )

    component_matches = [
        r
        for r in records
        if normalize_text(r.first_name) == n_first
        and normalize_text(r.last_name) == n_last
        and normalize_email(r.parent_email) == n_email
    ]
    if component_matches:
        if len(component_matches) > 1:
            return MatchResult(
                status="ambiguous",
                match_method="first-last-parent-email",
                athlete_match_key=key,
                parent_email_used=n_email,
                reason="multiple_athletes_share_identity_components",
                candidates=[r.athlete_id for r in component_matches],
                warnings=["Do not auto-merge ambiguous Athletes."],
            )
        return MatchResult(
            status="matched",
            match_method="first-last-parent-email",
            athlete_id=component_matches[0].athlete_id,
            athlete_match_key=key,
            parent_email_used=n_email,
            reason="exact_name_and_parent_email",
        )

    return MatchResult(
        status="create_candidate",
        match_method="none",
        athlete_match_key=key,
        parent_email_used=n_email,
        reason="no_existing_athlete_match",
    )


def evaluate_enrollment_identity(
    enrollment: EnrollmentIdentityInput,
    athlete_records: Iterable[AthleteCandidate],
    *,
    current_season_label: str = "",
) -> MatchResult:
    """
    Full read-only identity evaluation for one enrollment intake payload.
    Never invents destructive merge behavior.
    """
    parent_email, source = resolve_parent_email(enrollment)
    first = str(enrollment.athlete_first_name or "").strip()
    last = str(enrollment.athlete_last_name or "").strip()
    match_key = build_athlete_match_key(parent_email, first, last)

    if not first or not last or not parent_email:
        missing = []
        if not first:
            missing.append("Athlete First Name")
        if not last:
            missing.append("Athlete Last Name")
        if not parent_email:
            missing.append("Parent Email")
        return MatchResult(
            status="skipped_missing_required",
            match_method="none",
            athlete_match_key=match_key,
            parent_email_used=parent_email,
            reason="missing_required_identity_fields",
            warnings=[f"Missing: {', '.join(missing)}"],
        )

    warnings: list[str] = []
    if not enrollment.athlete_email:
        warnings.append("Athlete email missing — allowed; not used by 001 matching.")
    if source != "Parent Email - Cleaned" and enrollment.parent_email_cleaned:
        warnings.append(f"Parent email resolved from {source}.")

    if enrollment.existing_athlete_id:
        return MatchResult(
            status="matched",
            match_method="existing-enrollment-link",
            athlete_id=enrollment.existing_athlete_id,
            athlete_match_key=match_key,
            parent_email_used=parent_email,
            reason="enrollment_already_linked",
            warnings=warnings,
        )

    result = find_matching_athlete(
        athlete_records, match_key, first, last, parent_email
    )
    result.warnings.extend(warnings)

    # Season / multi-enrollment diagnostics (read-only; never merge)
    if result.status == "matched" and result.athlete_id:
        athlete = next(
            (a for a in athlete_records if a.athlete_id == result.athlete_id), None
        )
        if athlete:
            if athlete.current_season_enrollment_ids:
                result.warnings.append(
                    "Athlete already has enrollment(s) in current season: "
                    + ", ".join(athlete.current_season_enrollment_ids)
                )
            if current_season_label and len(athlete.enrollment_ids) > 0:
                result.warnings.append(
                    f"Returning athlete with {len(athlete.enrollment_ids)} prior enrollment link(s)."
                )
            # Same name + shared parent among siblings is expected when last names match
            siblingish = [
                a
                for a in athlete_records
                if a.athlete_id != athlete.athlete_id
                and normalize_email(a.parent_email) == parent_email
                and normalize_text(a.last_name) == normalize_text(last)
            ]
            if siblingish:
                result.warnings.append(
                    "Shared parent email with other athletes (sibling family pattern): "
                    + ", ".join(a.athlete_id for a in siblingish)
                )

    # Same name, different parent → create_candidate by design (not a match)
    if result.status == "create_candidate":
        same_name_other_parent = [
            a
            for a in athlete_records
            if normalize_text(a.first_name) == normalize_text(first)
            and normalize_text(a.last_name) == normalize_text(last)
            and normalize_email(a.parent_email) != parent_email
        ]
        if same_name_other_parent:
            result.warnings.append(
                "Same athlete name exists under a different parent email — "
                "treated as distinct athlete (no automatic merge)."
            )
            result.candidates = [a.athlete_id for a in same_name_other_parent]

    return result


def classify_identity_scenario(
    scenario_id: str,
    enrollment: EnrollmentIdentityInput,
    athlete_records: Iterable[AthleteCandidate],
) -> dict[str, Any]:
    """Return a JSON-serializable audit row for a named scenario."""
    result = evaluate_enrollment_identity(enrollment, athlete_records)
    return {
        "scenarioId": scenario_id,
        "status": result.status,
        "matchMethod": result.match_method,
        "athleteId": result.athlete_id,
        "athleteMatchKey": result.athlete_match_key,
        "parentEmailUsed": result.parent_email_used,
        "reason": result.reason,
        "warnings": list(result.warnings),
        "candidates": list(result.candidates),
    }


__all__ = [
    "AthleteCandidate",
    "EnrollmentIdentityInput",
    "MatchResult",
    "build_athlete_match_key",
    "classify_identity_scenario",
    "evaluate_enrollment_identity",
    "find_matching_athlete",
    "is_valid_match_key",
    "normalize_email",
    "normalize_text",
    "resolve_parent_email",
]
