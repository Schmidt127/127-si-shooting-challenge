#!/usr/bin/env python3
"""Offline validator for C-013 DEV Make dual-route blueprint and webhook payloads.

Repo-only — no Make, AWS, or Airtable calls.

Usage:
  python c013_dev_blueprint_validator.py
  python c013_dev_blueprint_validator.py --payload make/test-payloads/homework-completion-070a-dev.sample.json
  python c013_dev_blueprint_validator.py --json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_BLUEPRINT = (
    REPO_ROOT / "make" / "blueprints" / "upload-asset-engine-lambda-dev-v1.template.json"
)

REQUIRED_PAYLOAD_FIELDS = (
    "sourceName",
    "automationNumber",
    "sentAtIso",
    "routeKey",
    "uploadDestination",
    "sourceTable",
    "submissionAssetRecordId",
    "targetTable",
    "targetRecordId",
)

ROUTE_CONTRACTS: dict[str, dict[str, str]] = {
    "070a": {
        "routeKey": "homework_completion",
        "uploadDestination": "Homework Completions",
        "targetTable": "Homework Completions",
    },
    "070b": {
        "routeKey": "video_feedback",
        "uploadDestination": "Video Feedback",
        "targetTable": "Video Feedback",
    },
}

SOURCE_TABLE = "Submission Assets"
REC_ID_RE = re.compile(r"^rec[A-Za-z0-9]{10,}$")

# Operational secret / URL markers — must not appear outside placeholders in sanitized blueprint.
FORBIDDEN_SECRET_MARKERS = (
    "https://hook.eu1.make.com/",
    "https://hook.us1.make.com/",
    "https://hook.us2.make.com/",
    "https://lambda-url.",
    "AKIA",
    "sk_live_",
    "whsec_",
)

PLACEHOLDER_PREFIX = "REPLACE_WITH_"


@dataclass
class CheckResult:
    name: str
    passed: bool
    message: str
    details: list[str] = field(default_factory=list)


@dataclass
class ValidationReport:
    target: str
    checks: list[CheckResult] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return all(c.passed for c in self.checks)

    def add(self, name: str, passed: bool, message: str, details: list[str] | None = None) -> None:
        self.checks.append(CheckResult(name, passed, message, details or []))

    def to_dict(self) -> dict[str, Any]:
        return {
            "target": self.target,
            "passed": self.passed,
            "checks": [asdict(c) for c in self.checks],
        }


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, dict):
        raise ValueError(f"{path}: expected JSON object at root")
    return data


def load_blueprint(path: Path | None = None) -> dict[str, Any]:
    return load_json(path or DEFAULT_BLUEPRINT)


def _find_router_module_two(blueprint: dict[str, Any]) -> dict[str, Any] | None:
    modules = (blueprint.get("c013") or {}).get("modules") or []
    for mod in modules:
        if mod.get("id") == 2 and mod.get("module") == "Router":
            return mod
    return None


def _collect_filter_tokens(blueprint: dict[str, Any]) -> set[str]:
    tokens: set[str] = set()
    router = _find_router_module_two(blueprint)
    if not router:
        return tokens
    for filt in router.get("filters") or []:
        name = str(filt.get("name") or "")
        if name:
            tokens.add(name)
        for cond in filt.get("conditions") or []:
            val = str(cond.get("value") or "")
            field_name = str(cond.get("field") or "")
            if val:
                tokens.add(val)
            if field_name:
                tokens.add(field_name)
    return tokens


def _flow_router_filter_text(blueprint: dict[str, Any]) -> str:
    for step in blueprint.get("flow") or []:
        if step.get("id") == 2 and step.get("module") == "flow:Router":
            return str(step.get("filter") or "")
    return ""


def _serialized_blueprint_excludes_placeholders(blueprint: dict[str, Any]) -> str:
    """Serialize blueprint but strip known placeholder strings before secret scan."""
    text = json.dumps(blueprint)
    for token in (
        "REPLACE_WITH_DEV_LAMBDA_FUNCTION_URL",
        "REPLACE_WITH_DEV_UPLOAD_SECRET",
        "REPLACE_WITH_DEV_MAKE_CUSTOM_WEBHOOK_URL",
        "REPLACE_WITH_DEV_CUSTOM_WEBHOOK",
        "REPLACE_WITH_PENDING_HOMEWORK_ASSET",
        "REPLACE_WITH_HOMEWORK_COMPLETION",
    ):
        text = text.replace(token, "")
    return text


def validate_blueprint_structure(blueprint: dict[str, Any], *, path: str = "blueprint") -> ValidationReport:
    report = ValidationReport(target=path)
    c013 = blueprint.get("c013") or {}

    report.add(
        "c013_metadata_present",
        bool(c013),
        "c013 metadata block present" if c013 else "missing c013 metadata block",
    )
    if not c013:
        return report

    env = c013.get("environment")
    report.add(
        "environment_dev",
        env == "DEV",
        f"environment={env!r} (expected DEV)",
    )

    sanitized = c013.get("sanitized")
    report.add(
        "sanitized_flag",
        sanitized is True,
        f"sanitized={sanitized!r} (expected true)",
    )

    no_secrets_flag = c013.get("containsOperationalSecrets") is False
    report.add(
        "contains_operational_secrets_false",
        no_secrets_flag,
        f"containsOperationalSecrets={c013.get('containsOperationalSecrets')!r} (expected false)",
    )

    allowed = set(c013.get("allowedRoutes") or [])
    expected_routes = {"homework_completion", "video_feedback"}
    missing_routes = sorted(expected_routes - allowed)
    report.add(
        "allowed_routes_dual",
        not missing_routes,
        "allowedRoutes includes homework_completion and video_feedback"
        if not missing_routes
        else f"allowedRoutes missing {missing_routes}",
        list(sorted(allowed)),
    )

    auto_nums = set(c013.get("automationNumbers") or [])
    expected_autos = {"070a", "070b"}
    missing_autos = sorted(expected_autos - auto_nums)
    report.add(
        "automation_numbers_dual",
        not missing_autos,
        "automationNumbers includes 070a and 070b"
        if not missing_autos
        else f"automationNumbers missing {missing_autos}",
        list(sorted(auto_nums)),
    )

    tokens = _collect_filter_tokens(blueprint)
    dual_route_tokens = {
        "070a",
        "070b",
        "homework_completion",
        "video_feedback",
        "routeKey",
        "automationNumber",
    }
    missing_tokens = sorted(dual_route_tokens - tokens)
    report.add(
        "module2_router_dual_route",
        not missing_tokens,
        "Module 2 Router filters mention both 070a/homework_completion and 070b/video_feedback"
        if not missing_tokens
        else f"Module 2 Router missing tokens: {missing_tokens}",
        sorted(tokens),
    )

    flow_filter = _flow_router_filter_text(blueprint)
    flow_ok = all(
        needle in flow_filter
        for needle in (
            "070a",
            "070b",
            "homework_completion",
            "video_feedback",
        )
    )
    report.add(
        "flow_router_dual_route",
        flow_ok,
        "flow[2] Router filter covers both routes"
        if flow_ok
        else f"flow router filter incomplete: {flow_filter!r}",
    )

    scan_text = _serialized_blueprint_excludes_placeholders(blueprint)
    hits = [m for m in FORBIDDEN_SECRET_MARKERS if m in scan_text]
    report.add(
        "no_operational_secrets",
        not hits,
        "no operational webhook/Lambda secrets in sanitized blueprint"
        if not hits
        else f"forbidden markers found: {hits}",
    )

    for var in c013.get("scenarioVariables") or []:
        placeholder = str(var.get("placeholder") or "")
        if placeholder and not placeholder.startswith(PLACEHOLDER_PREFIX):
            report.add(
                f"scenario_var_placeholder_{var.get('name')}",
                False,
                f"scenario variable {var.get('name')!r} placeholder must start with {PLACEHOLDER_PREFIX}",
            )

    for shape_key in ("webhookPayloadShapeHomework", "webhookPayloadShapeVideo"):
        shape = c013.get(shape_key) or {}
        missing_fields = [f for f in REQUIRED_PAYLOAD_FIELDS if f not in shape]
        report.add(
            shape_key,
            not missing_fields,
            f"{shape_key} documents all required payload fields"
            if not missing_fields
            else f"{shape_key} missing fields: {missing_fields}",
        )

    flow_iface = None
    for step in blueprint.get("flow") or []:
        if step.get("id") == 1:
            flow_iface = (step.get("configuration") or {}).get("interface")
            break
    if flow_iface:
        missing_iface = [f for f in REQUIRED_PAYLOAD_FIELDS if f not in flow_iface]
        report.add(
            "flow_webhook_interface",
            not missing_iface,
            "Module 1 webhook interface lists all required payload fields"
            if not missing_iface
            else f"webhook interface missing: {missing_iface}",
            list(flow_iface),
        )

    return report


def _is_rec_id(value: Any) -> bool:
    return isinstance(value, str) and bool(REC_ID_RE.match(value))


def validate_webhook_payload(
    payload: dict[str, Any],
    *,
    expected_automation: str | None = None,
    path: str = "payload",
) -> ValidationReport:
    report = ValidationReport(target=path)

    missing = [f for f in REQUIRED_PAYLOAD_FIELDS if not payload.get(f)]
    report.add(
        "required_fields",
        not missing,
        "all required webhook fields present"
        if not missing
        else f"missing or empty fields: {missing}",
    )

    automation = str(payload.get("automationNumber") or "")
    route_key = str(payload.get("routeKey") or "")
    contract = ROUTE_CONTRACTS.get(automation)
    if not contract:
        report.add(
            "automation_number_known",
            False,
            f"unknown automationNumber={automation!r} (expected 070a or 070b)",
        )
        return report

    report.add(
        "automation_number_known",
        True,
        f"automationNumber={automation}",
    )

    pairing_ok = route_key == contract["routeKey"]
    report.add(
        "route_key_pairing",
        pairing_ok,
        f"routeKey={route_key!r} matches automation {automation} ({contract['routeKey']})"
        if pairing_ok
        else f"routeKey={route_key!r} does not match automation {automation} (expected {contract['routeKey']})",
    )

    dest_ok = payload.get("uploadDestination") == contract["uploadDestination"]
    report.add(
        "upload_destination",
        dest_ok,
        f"uploadDestination matches {contract['uploadDestination']}"
        if dest_ok
        else f"uploadDestination={payload.get('uploadDestination')!r} expected {contract['uploadDestination']!r}",
    )

    target_ok = payload.get("targetTable") == contract["targetTable"]
    report.add(
        "target_table",
        target_ok,
        f"targetTable matches {contract['targetTable']}"
        if target_ok
        else f"targetTable={payload.get('targetTable')!r} expected {contract['targetTable']!r}",
    )

    source_ok = payload.get("sourceTable") == SOURCE_TABLE
    report.add(
        "source_table",
        source_ok,
        f"sourceTable is {SOURCE_TABLE}"
        if source_ok
        else f"sourceTable={payload.get('sourceTable')!r} expected {SOURCE_TABLE!r}",
    )

    asset_id = payload.get("submissionAssetRecordId")
    asset_ok = isinstance(asset_id, str) and asset_id.startswith("rec")
    report.add(
        "submission_asset_record_id",
        asset_ok,
        "submissionAssetRecordId present (attachment source record)"
        if asset_ok
        else f"submissionAssetRecordId invalid: {asset_id!r}",
    )

    target_id = payload.get("targetRecordId")
    target_id_ok = isinstance(target_id, str) and target_id.startswith("rec")
    report.add(
        "target_record_id",
        target_id_ok,
        "targetRecordId present (writeback target)"
        if target_id_ok
        else f"targetRecordId invalid: {target_id!r}",
    )

    if expected_automation:
        expect_ok = automation == expected_automation
        report.add(
            "expected_automation",
            expect_ok,
            f"automationNumber matches expected {expected_automation}"
            if expect_ok
            else f"automationNumber={automation!r} expected {expected_automation!r}",
        )

    return report


def validate_blueprint_file(path: Path | None = None) -> ValidationReport:
    bp_path = path or DEFAULT_BLUEPRINT
    blueprint = load_blueprint(bp_path)
    return validate_blueprint_structure(blueprint, path=str(bp_path))


def validate_payload_file(path: Path, *, expected_automation: str | None = None) -> ValidationReport:
    payload = load_json(path)
    return validate_webhook_payload(payload, expected_automation=expected_automation, path=str(path))


UPLOAD_OK_ACTIONS = frozenset(
    {
        "uploaded",
        "skipped_already_uploaded",
        "already_uploaded",
    }
)
SUCCESS_STATUS = frozenset({"success", "skipped"})


def evaluate_make_response_for_route(
    status_code: int,
    body_text: str,
    *,
    route_key: str,
    automation_number: str,
    parsed: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Offline Make/Lambda response evaluation for homework or video route."""
    from c013_dev_make_homework_webhook_post import parse_make_body  # noqa: WPS433

    text = (body_text or "").strip()
    ok_http = 200 <= status_code < 300
    accepted_async = ok_http and text == "Accepted"
    parsed_body = parsed if parsed is not None else parse_make_body(text)

    if accepted_async:
        return {
            "httpOk": ok_http,
            "acceptedAsync": True,
            "pass": True,
            "routeKey": None,
            "automationNumber": None,
            "actionOut": None,
            "note": "Make returned plain Accepted — verify Airtable writeback separately",
        }

    action = str(parsed_body.get("actionOut") or "")
    route = str(parsed_body.get("routeKey") or "")
    automation = str(parsed_body.get("automationNumber") or "")
    status_out = str(parsed_body.get("statusOut") or "")
    ok_flag = parsed_body.get("ok")
    upload_ok = action in UPLOAD_OK_ACTIONS
    status_ok = status_out in SUCCESS_STATUS
    route_ok = route == route_key
    auto_ok = automation == automation_number
    ok_ok = ok_flag is True or (ok_flag is None and upload_ok and status_ok)
    sync_pass = ok_http and ok_ok and status_ok and upload_ok and route_ok and auto_ok
    return {
        "httpOk": ok_http,
        "acceptedAsync": False,
        "ok": ok_flag if isinstance(ok_flag, bool) else None,
        "statusOut": status_out or None,
        "actionOut": action or None,
        "routeKey": route or None,
        "automationNumber": automation or None,
        "pass": sync_pass,
        "note": None,
    }


def format_report(report: ValidationReport) -> str:
    lines = [f"{'PASS' if report.passed else 'FAIL'} — {report.target}"]
    for check in report.checks:
        status = "ok" if check.passed else "FAIL"
        lines.append(f"  [{status}] {check.name}: {check.message}")
        for detail in check.details[:8]:
            lines.append(f"         {detail}")
        if len(check.details) > 8:
            lines.append(f"         ... +{len(check.details) - 8} more")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Offline C-013 DEV Make blueprint + payload validator")
    parser.add_argument(
        "--blueprint",
        type=Path,
        default=DEFAULT_BLUEPRINT,
        help="Path to DEV blueprint template JSON",
    )
    parser.add_argument(
        "--payload",
        type=Path,
        action="append",
        default=[],
        help="Webhook payload JSON to validate (repeatable)",
    )
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON report")
    args = parser.parse_args(argv)

    reports: list[ValidationReport] = []
    reports.append(validate_blueprint_file(args.blueprint))

    payload_paths = args.payload or [
        REPO_ROOT / "make" / "test-payloads" / "homework-completion-070a-dev.sample.json",
        REPO_ROOT / "make" / "test-payloads" / "video-feedback-070b-dev.sample.json",
    ]
    for p in payload_paths:
        if p.exists():
            expected = "070a" if "070a" in p.name else ("070b" if "070b" in p.name else None)
            reports.append(validate_payload_file(p, expected_automation=expected))

    overall_pass = all(r.passed for r in reports)

    if args.json:
        print(
            json.dumps(
                {
                    "passed": overall_pass,
                    "reports": [r.to_dict() for r in reports],
                },
                indent=2,
            )
        )
    else:
        for report in reports:
            print(format_report(report))
            print()

    return 0 if overall_pass else 1


if __name__ == "__main__":
    sys.exit(main())
