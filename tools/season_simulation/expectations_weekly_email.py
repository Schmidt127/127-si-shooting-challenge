"""SC-168 — Weekly email handoff expectations for Season Simulation.

Production weekly parent email path:

  118 (Sunday 05:00 Denver cron) → arms Build Weekly Email Now?
  072 (recordMatchesConditions) → builds package; sets Weekly Email Ready?
  119 (Sunday 10:00 Denver cron) → arms Send to Make?
  074 → Email Handoff Queue (WEEKLY_ATHLETE_SUMMARY)
  079 → Communications Hub → Resend (allowlist / Test Mode)

Season Simulation execute with ``--enable-email-delivery``:

  - Arms Build Weekly Email Now? (072 substitute for 118) on Saturday WAS rows
  - Does **not** arm Send to Make? (119 still owns send schedule)
  - Does **not** advance wall/cron time — Airtable scheduled automations do not fire
  - Therefore **0 WEEKLY Hub handoffs after execute alone is EXPECTED**

T213135Z observed 6 WEEKLY Accepted only after an explicit post-run Send-to-Make
arm (119 substitute). T122531Z had 6 build arms + 69 other Accepted emails and
0 WEEKLY — consistent with this contract, not a 072/074 Production logic defect
(072 Live ``recordId`` is dynamic ``$ref: trigger → id`` as of 2026-09-05).
"""

from __future__ import annotations

from typing import Any

WEEKLY_EVENT_TYPE = "WEEKLY_ATHLETE_SUMMARY"
HANDOFF_KEY_TEMPLATE = "WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|{was_id}"

# Classification for discrepancy triage (SC-168).
ROOT_CAUSE_CLASSIFICATION = "EXPECTED_BEHAVIOR_HARNESS_GAP"
ROOT_CAUSE_SUMMARY = (
    "Season Sim execute arms Build Weekly (072 path) only; "
    "118/119 are Sunday cron schedules that the simulation clock cannot drive; "
    "WEEKLY Hub handoffs require an explicit weekly-email send-arm stage "
    "(119 substitute) after packages are Ready."
)

PIPELINE_STAGES = (
    "was_ready",
    "weekly_calc_settled",
    "build_armed",  # 118 or sim false→true Build Weekly
    "package_ready",  # 072 → Weekly Email Ready?
    "send_armed",  # 119 or sim false→true Send to Make?
    "hub_handoff",  # 074 → Email Handoff Queue
    "allowlist_accepted",  # Hub Test Mode + allowlist
)


def handoff_key_for_was(was_id: str) -> str:
    return HANDOFF_KEY_TEMPLATE.format(was_id=was_id)


def classify_weekly_email_intent(event: dict[str, Any]) -> dict[str, Any]:
    """Annotate a scenario intended_emails row for weekly summary.

    ``send=False`` remains the default. Presence in intended_emails means the
    *pipeline* should be exercisable via the weekly-email stage — not that
    execute alone must create Hub rows.
    """
    et = str(event.get("event_type") or "")
    if et != WEEKLY_EVENT_TYPE:
        return {
            "event_type": et,
            "is_weekly": False,
            "expected_from_execute_alone": False,
            "requires_weekly_email_stage": False,
        }
    return {
        "event_type": et,
        "is_weekly": True,
        "expected_from_execute_alone": False,
        "requires_weekly_email_stage": True,
        "build_armed_by_execute_when_email_enabled": True,
        "send_armed_by_execute": False,
        "owner_send_schedule": "119 Sunday 10:00 America/Denver (cron)",
        "owner_build_schedule": "118 Sunday 05:00 America/Denver (cron)",
        "sim_build_substitute": "_arm_was_email_flags / WAS_EMAIL_ARM",
        "sim_send_substitute": "weekly_email_stage arm-send (119 substitute)",
        "root_cause_if_zero_after_execute": ROOT_CAUSE_CLASSIFICATION,
    }


def expected_weekly_handoff_count_after_execute(
    *,
    enable_email_delivery: bool,
    weekly_email_arms: int,
    weekly_email_stage_completed: bool,
) -> dict[str, Any]:
    """Return the expected WEEKLY handoff count contract for a sim run."""
    if not enable_email_delivery:
        return {
            "expected_min": 0,
            "expected_max": 0,
            "reason": "email delivery disabled — no build arm",
            "classification": "EXPECTED_BEHAVIOR",
        }
    if not weekly_email_stage_completed:
        return {
            "expected_min": 0,
            "expected_max": 0,
            "reason": (
                f"execute armed {weekly_email_arms} Build Weekly flag(s) but "
                "did not run weekly-email send-arm stage; 119 cron not driven "
                "by sim clock"
            ),
            "classification": ROOT_CAUSE_CLASSIFICATION,
            "weekly_email_arms": weekly_email_arms,
        }
    return {
        "expected_min": 1 if weekly_email_arms else 0,
        "expected_max": weekly_email_arms,
        "reason": "weekly-email stage completed after Ready packages",
        "classification": "STAGE_EXERCISED",
        "weekly_email_arms": weekly_email_arms,
    }


def annotate_intended_weekly_emails(
    intended_emails: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return copies of intended emails with SC-168 expectation metadata."""
    out: list[dict[str, Any]] = []
    for ev in intended_emails:
        row = dict(ev)
        if str(row.get("event_type") or "") == WEEKLY_EVENT_TYPE:
            row["sc168"] = classify_weekly_email_intent(row)
        out.append(row)
    return out


def assert_zero_weekly_handoffs_ok_without_stage(
    *,
    observed_weekly_handoffs: int,
    enable_email_delivery: bool,
    weekly_email_arms: int,
    weekly_email_stage_completed: bool = False,
) -> None:
    """Raise AssertionError only when zero WEEKLY is unexpected."""
    contract = expected_weekly_handoff_count_after_execute(
        enable_email_delivery=enable_email_delivery,
        weekly_email_arms=weekly_email_arms,
        weekly_email_stage_completed=weekly_email_stage_completed,
    )
    lo = int(contract["expected_min"])
    hi = int(contract["expected_max"])
    if not (lo <= observed_weekly_handoffs <= hi):
        raise AssertionError(
            f"WEEKLY handoffs={observed_weekly_handoffs} outside "
            f"[{lo}, {hi}]: {contract['reason']}"
        )
