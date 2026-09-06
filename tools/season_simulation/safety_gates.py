"""Pre-execution safety gate checklist for SC-SEASON-SIM-001 (read-only capable).

Stop conditions (fail-closed):
- Non-allowlisted email on enrollment or outbound plan
- Unexpected real athlete names in transactional scope
- Ambiguous registry ownership / duplicate active XP
- Formula verify failure or OMNI ``Unable to generate formula`` text
- Wrong automation version vs manifest
- Payment / registration records detected in sim scope
- Wrong three-athlete profile count
- Unresolved automation descendants
- Competing active run in local registry
- Protected reference tables must remain untouched (checked at cleanup, not here)
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from .constants import (
    DEFAULT_BASE_ID,
    SAFE_EMAIL_RECIPIENT,
    SC001_ATHLETES,
    THREE_ATHLETE_RUN_SUFFIX,
    TRANSACTIONAL_TABLES,
)
from .formula_lifecycle import (
    OMNI_FORMULA_FAILURE_STRING,
    verify_formula_state,
)
from .recipient_safety import resolve_simulation_recipient
from .season_policy import EXPECTED_ACTIVE_PHA_COUNT

# SC-SEASON-SIM-001 execution manifest automation pins (read-only version check).
SC001_REQUIRED_AUTOMATION_VERSIONS: dict[str, str] = {
    "010": "v10.14",
    "066": "v4.1",
    "114": "v6.2",
}

SC001_DISPOSABLE_ATHLETE_NAMES: frozenset[str] = frozenset(
    f"{a['first_name']} {a['last_name']}" for a in SC001_ATHLETES
)

REAL_ATHLETE_STOP_NAMES: frozenset[str] = frozenset(
    {"Athlete 1", "Athlete 2", "Athlete 3"}
)


@dataclass
class SafetyGateCheck:
    name: str
    ok: bool
    detail: str
    stop: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class SafetyGateReport:
    ok: bool
    run_id: str
    checks: list[SafetyGateCheck]
    stop_reasons: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "run_id": self.run_id,
            "checks": [c.to_dict() for c in self.checks],
            "stop_reasons": list(self.stop_reasons),
            "warnings": list(self.warnings),
        }


def _check(
    checks: list[SafetyGateCheck],
    *,
    name: str,
    ok: bool,
    detail: str,
    stop: bool = False,
) -> None:
    checks.append(SafetyGateCheck(name=name, ok=ok, detail=detail, stop=stop))


def check_base_id(
    *,
    base_id: str | None,
    expected: str = DEFAULT_BASE_ID,
) -> SafetyGateCheck:
    actual = (base_id or "").strip()
    ok = actual == expected
    return SafetyGateCheck(
        name="base_id",
        ok=ok,
        detail=f"base_id={actual!r} expected={expected!r}",
        stop=not ok,
    )


def check_git_sha(
    *,
    git_sha: str | None,
    expected_sha: str | None = None,
) -> SafetyGateCheck:
    actual = (git_sha or "").strip()
    if not expected_sha:
        ok = bool(actual) or True  # optional when not pinned
        return SafetyGateCheck(
            name="git_sha",
            ok=ok,
            detail=f"git_sha={actual!r} (no pin — informational)",
            stop=False,
        )
    ok = actual.startswith(expected_sha[:7]) if actual else False
    return SafetyGateCheck(
        name="git_sha",
        ok=ok,
        detail=f"git_sha={actual!r} expected_prefix={expected_sha[:7]!r}",
        stop=not ok,
    )


def check_automation_versions(
    version_map: dict[str, str] | None,
    *,
    required: dict[str, str] | None = None,
) -> SafetyGateCheck:
    req = required or SC001_REQUIRED_AUTOMATION_VERSIONS
    provided = version_map or {}
    mismatches: list[str] = []
    for num, ver in req.items():
        live = provided.get(num) or provided.get(f"automation_{num}") or ""
        if live != ver:
            mismatches.append(f"{num}: got {live!r} want {ver!r}")
    ok = not mismatches
    detail = "automation versions match" if ok else "; ".join(mismatches)
    return SafetyGateCheck(name="automation_versions", ok=ok, detail=detail, stop=not ok)


def check_formula_state(meta_tables: list[dict[str, Any]], *, expect_gated: bool) -> SafetyGateCheck:
    verify = verify_formula_state(
        meta_tables,
        expect_production_normal=not expect_gated,
        expect_gated=expect_gated,
    )
    omni_hits = [
        k
        for k, v in verify.field_results.items()
        if OMNI_FORMULA_FAILURE_STRING in str(v.get("error") or "")
    ]
    ok = verify.ok and not omni_hits
    detail = "; ".join(verify.errors) if verify.errors else "formula state OK"
    if omni_hits:
        detail += f"; OMNI failure in {omni_hits}"
    return SafetyGateCheck(name="formula_state", ok=ok, detail=detail, stop=not ok)


def check_email_allowlist(
    enrollment_parent_emails: list[str | None],
    *,
    enable_email_delivery: bool = False,
) -> SafetyGateCheck:
    bad: list[str] = []
    for raw in enrollment_parent_emails:
        decision = resolve_simulation_recipient(
            enrollment_parent_email=raw,
            force_safe=True,
        )
        if not decision.ok:
            bad.append(decision.reason)
    if enable_email_delivery:
        # Still only allowlist — any non-allowlist is a hard stop.
        pass
    ok = not bad
    detail = (
        f"allowlist={SAFE_EMAIL_RECIPIENT!r} checked={len(enrollment_parent_emails)}"
        if ok
        else "; ".join(bad)
    )
    return SafetyGateCheck(name="email_allowlist", ok=ok, detail=detail, stop=not ok)


def check_transactional_empty(
    counts_by_table: dict[str, int] | None,
    *,
    sim_only: bool = True,
) -> SafetyGateCheck:
    """Expect zero transactional rows before a fresh three-athlete run."""
    counts = counts_by_table or {}
    total = sum(counts.get(t, 0) for t in TRANSACTIONAL_TABLES)
    ok = total == 0
    detail = (
        f"transactional_total={total} (expect 0 pre-run)"
        if sim_only
        else f"transactional_total={total}"
    )
    return SafetyGateCheck(
        name="transactional_empty",
        ok=ok,
        detail=detail,
        stop=sim_only and not ok,
    )


def check_weeks_pha(
    *,
    weeks_count: int,
    homework_count: int,
    expected_pha: int = EXPECTED_ACTIVE_PHA_COUNT,
    min_weeks: int = 1,
) -> SafetyGateCheck:
    ok = weeks_count >= min_weeks and homework_count == expected_pha
    detail = (
        f"weeks={weeks_count} pha={homework_count} expected_pha={expected_pha}"
    )
    return SafetyGateCheck(name="weeks_pha", ok=ok, detail=detail, stop=not ok)


def check_no_competing_run(registry_dir: Path, run_id: str) -> SafetyGateCheck:
    active: list[str] = []
    if registry_dir.is_dir():
        for path in registry_dir.glob("SEASON-SIM-2027-*.json"):
            if path.name.endswith(".json"):
                try:
                    import json

                    data = json.loads(path.read_text(encoding="utf-8"))
                except Exception:  # noqa: BLE001
                    continue
                rid = str(data.get("run_id") or "")
                status = str(data.get("status") or "")
                if status == "running" and rid and rid != run_id:
                    active.append(rid)
    ok = not active
    detail = "no competing running registry" if ok else f"competing: {active}"
    return SafetyGateCheck(name="no_competing_run", ok=ok, detail=detail, stop=not ok)


def check_three_athlete_run_id(run_id: str) -> SafetyGateCheck:
    ok = THREE_ATHLETE_RUN_SUFFIX in (run_id or "")
    return SafetyGateCheck(
        name="three_athlete_run_id",
        ok=ok,
        detail=f"run_id must contain {THREE_ATHLETE_RUN_SUFFIX!r}",
        stop=not ok,
    )


def check_profile_count(profile_count: int, *, expected: int = 3) -> SafetyGateCheck:
    ok = profile_count == expected
    return SafetyGateCheck(
        name="profile_count",
        ok=ok,
        detail=f"profiles={profile_count} expected={expected}",
        stop=not ok,
    )


def check_unexpected_real_athletes(athlete_names: list[str]) -> SafetyGateCheck:
    hits = [n for n in athlete_names if n in REAL_ATHLETE_STOP_NAMES]
    ok = not hits
    return SafetyGateCheck(
        name="unexpected_real_athlete",
        ok=ok,
        detail=f"real athlete names blocked: {hits}" if hits else "no real athlete names",
        stop=not ok,
    )


def check_unresolved_descendants(unresolved_count: int) -> SafetyGateCheck:
    ok = unresolved_count == 0
    return SafetyGateCheck(
        name="unresolved_descendants",
        ok=ok,
        detail=f"unresolved_descendants={unresolved_count}",
        stop=not ok,
    )


def check_duplicate_active_xp(duplicate_keys: list[str]) -> SafetyGateCheck:
    ok = not duplicate_keys
    return SafetyGateCheck(
        name="duplicate_active_xp",
        ok=ok,
        detail=(
            f"duplicate SUBMISSION_XP keys: {duplicate_keys[:5]}"
            if duplicate_keys
            else "no duplicate active XP"
        ),
        stop=not ok,
    )


def run_pre_execution_safety_gates(
    *,
    run_id: str,
    base_id: str | None = None,
    git_sha: str | None = None,
    expected_git_sha: str | None = None,
    meta_tables: list[dict[str, Any]] | None = None,
    automation_versions: dict[str, str] | None = None,
    expect_gated_formula: bool = False,
    enrollment_emails: list[str | None] | None = None,
    enable_email_delivery: bool = False,
    transactional_counts: dict[str, int] | None = None,
    weeks_count: int = 0,
    homework_count: int = 0,
    profile_count: int = 3,
    athlete_names: list[str] | None = None,
    unresolved_descendants: int = 0,
    duplicate_xp_keys: list[str] | None = None,
    registry_dir: Path | None = None,
    payment_records_detected: bool = False,
) -> SafetyGateReport:
    """Aggregate read-only safety gate checklist."""
    checks: list[SafetyGateCheck] = []
    warnings: list[str] = []

    for fn, kwargs in (
        (check_three_athlete_run_id, {"run_id": run_id}),
        (check_base_id, {"base_id": base_id}),
        (check_git_sha, {"git_sha": git_sha, "expected_sha": expected_git_sha}),
        (check_automation_versions, {"version_map": automation_versions}),
    ):
        checks.append(fn(**kwargs))  # type: ignore[arg-type]

    if meta_tables is not None:
        checks.append(check_formula_state(meta_tables, expect_gated=expect_gated_formula))
    else:
        checks.append(
            SafetyGateCheck(
                name="formula_state",
                ok=True,
                detail="skipped (no meta_tables)",
                stop=False,
            )
        )

    checks.append(
        check_email_allowlist(
            list(enrollment_emails or [None]),
            enable_email_delivery=enable_email_delivery,
        )
    )
    checks.append(check_transactional_empty(transactional_counts))
    checks.append(check_weeks_pha(weeks_count=weeks_count, homework_count=homework_count))

    if registry_dir is not None:
        checks.append(check_no_competing_run(registry_dir, run_id))
    checks.append(check_profile_count(profile_count))
    checks.append(check_unexpected_real_athletes(list(athlete_names or [])))
    checks.append(check_unresolved_descendants(unresolved_descendants))
    checks.append(check_duplicate_active_xp(list(duplicate_xp_keys or [])))

    if payment_records_detected:
        checks.append(
            SafetyGateCheck(
                name="payment_registration",
                ok=False,
                detail="payment/registration records in sim scope — stop",
                stop=True,
            )
        )

    if enable_email_delivery:
        warnings.append(
            "Email delivery requested — still restricted to allowlist only; "
            "verify Email Handoff Queue recipient before send-arm"
        )
    elif not enable_email_delivery:
        warnings.append("Email OFF by default (SC-001)")

    stop_reasons = [c.detail for c in checks if c.stop and not c.ok]
    ok = not stop_reasons
    return SafetyGateReport(
        ok=ok,
        run_id=run_id,
        checks=checks,
        stop_reasons=stop_reasons,
        warnings=warnings,
    )


def assert_safety_gates_pass(report: SafetyGateReport) -> None:
    if report.ok:
        return
    raise RuntimeError(
        "Pre-execution safety gates failed: " + "; ".join(report.stop_reasons)
    )


def disposable_athlete_name_ok(name: str) -> bool:
    return name in SC001_DISPOSABLE_ATHLETE_NAMES
