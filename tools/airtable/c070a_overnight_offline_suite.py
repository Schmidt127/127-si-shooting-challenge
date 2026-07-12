#!/usr/bin/env python3
"""Unified offline 070a overnight regression suite (Worker C / T7).

Runs all repo-only 070a contract tests without live Airtable/Make/AWS calls.

Usage:
  python tools/airtable/c070a_overnight_offline_suite.py
  python tools/airtable/c070a_overnight_offline_suite.py --json
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
TOOLS = Path(__file__).resolve().parent
LAMBDA = REPO / "lambda" / "upload-asset"


@dataclass
class SuiteResult:
    name: str
    command: list[str]
    cwd: Path
    exit_code: int = 1
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    total: int = 0
    output: str = ""
    error: str | None = None

    @property
    def ok(self) -> bool:
        return self.exit_code == 0 and self.failed == 0


def _run(cmd: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def _parse_node_070a(output: str) -> tuple[int, int, int]:
    match = re.search(r"(\d+) passed, (\d+) failed \(of (\d+)\)", output)
    if match:
        passed, failed, total = (int(match.group(i)) for i in range(1, 4))
        return passed, failed, total
    return 0, 1, 1


def _parse_node_upload_response(output: str) -> tuple[int, int, int]:
    ok_count = len(re.findall(r"^ok - ", output, re.MULTILINE))
    fail_count = len(re.findall(r"^FAIL - ", output, re.MULTILINE))
    if ok_count or fail_count:
        return ok_count, fail_count, ok_count + fail_count

    match = re.search(r"All (\d+) upload-make-lambda-response tests passed", output)
    if match:
        total = int(match.group(1))
        return total, 0, total
    return 0, 1, 1


def _parse_unittest(output: str) -> tuple[int, int, int]:
    skipped = 0
    skip_match = re.search(r"skipped=(\d+)", output)
    if skip_match:
        skipped = int(skip_match.group(1))

    ran_match = re.search(r"Ran (\d+) tests? in ", output)
    if ran_match:
        total = int(ran_match.group(1))
        if "FAILED" in output or "FAIL:" in output or "ERROR:" in output:
            fail_match = re.search(r"failures=(\d+)", output)
            err_match = re.search(r"errors=(\d+)", output)
            failed = int(fail_match.group(1)) if fail_match else 0
            failed += int(err_match.group(1)) if err_match else 0
            if failed == 0:
                failed = 1
            return max(0, total - failed - skipped), failed, total

        if "OK" in output:
            return total - skipped, 0, total

    ok_lines = len(re.findall(r"\.\.\. ok$", output, re.MULTILINE))
    fail_lines = len(re.findall(r"\.\.\. FAIL$", output, re.MULTILINE))
    err_lines = len(re.findall(r"\.\.\. ERROR$", output, re.MULTILINE))
    if ok_lines or fail_lines or err_lines:
        failed = fail_lines + err_lines
        return ok_lines, failed, ok_lines + failed + skipped

    return 0, 1, 1


def _parse_smoke_all(output: str) -> tuple[int, int, int, dict[str, Any] | None]:
    payload: dict[str, Any] | None = None
    start = output.find("{")
    end = output.rfind("}")
    if start >= 0 and end > start:
        try:
            payload = json.loads(output[start : end + 1])
        except json.JSONDecodeError:
            payload = None

    if payload is None:
        return 0, 1, 1, None

    phase_count = int(payload.get("phaseCount", 0))
    passed_count = int(payload.get("passedCount", 0))
    failed = phase_count - passed_count
    if payload.get("pass") is not True:
        failed = max(failed, 1)
    return passed_count, failed, phase_count, payload


def run_suite(
    name: str,
    cmd: list[str],
    cwd: Path,
    parser: str,
) -> SuiteResult:
    proc = _run(cmd, cwd)
    combined = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
    result = SuiteResult(
        name=name,
        command=cmd,
        cwd=cwd,
        exit_code=proc.returncode,
        output=combined,
    )

    if parser == "node_070a":
        result.passed, result.failed, result.total = _parse_node_070a(combined)
    elif parser == "node_upload":
        result.passed, result.failed, result.total = _parse_node_upload_response(combined)
    elif parser == "unittest":
        result.passed, result.failed, result.total = _parse_unittest(combined)
    elif parser == "smoke_all":
        passed, failed, total, payload = _parse_smoke_all(combined)
        result.passed, result.failed, result.total = passed, failed, total
        if payload is None:
            result.failed = 1
            result.total = 1
    else:
        result.error = f"Unknown parser: {parser}"

    return result


def build_suites() -> list[tuple[str, list[str], Path, str]]:
    py = sys.executable
    return [
        (
            "node-070a-homework-upload",
            ["node", "airtable/automations/shooting-challenge/lib/070a-homework-upload.test.js"],
            REPO,
            "node_070a",
        ),
        (
            "node-upload-make-lambda-response",
            ["node", "airtable/automations/shooting-challenge/lib/upload-make-lambda-response.test.js"],
            REPO,
            "node_upload",
        ),
        (
            "python-c070a-dev-smoke-run",
            [py, "-m", "unittest", "tests.test_c070a_dev_smoke_run", "-v"],
            TOOLS,
            "unittest",
        ),
        (
            "python-lambda-homework-route",
            [py, "-m", "unittest", "tests.test_homework_route", "-v"],
            LAMBDA,
            "unittest",
        ),
        (
            "python-lambda-070a-regression",
            [py, "-m", "unittest", "tests.test_070a_homework_regression", "-v"],
            LAMBDA,
            "unittest",
        ),
        (
            "python-c013-truncated-json-regression",
            [py, "-m", "unittest", "tests.test_c013_dev_homework_make_smoke", "-v"],
            TOOLS,
            "unittest",
        ),
        (
            "mock-c070a-dev-smoke-all",
            [py, "c070a_dev_smoke_run.py", "all"],
            TOOLS,
            "smoke_all",
        ),
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description="070a overnight offline regression suite")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON summary")
    args = parser.parse_args()

    suites = build_suites()
    results: list[SuiteResult] = []
    for name, cmd, cwd, suite_parser in suites:
        results.append(run_suite(name, cmd, cwd, suite_parser))

    totals = {
        "passed": sum(r.passed for r in results),
        "failed": sum(r.failed for r in results),
        "skipped": sum(r.skipped for r in results),
        "total": sum(r.total for r in results),
    }
    summary = {
        "suite": "c070a_overnight_offline_suite",
        "pass": all(r.ok for r in results),
        "totals": totals,
        "suites": [
            {
                "name": r.name,
                "pass": r.ok,
                "passed": r.passed,
                "failed": r.failed,
                "skipped": r.skipped,
                "total": r.total,
                "exitCode": r.exit_code,
            }
            for r in results
        ],
    }

    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print("070a overnight offline suite")
        print("=" * 40)
        for r in results:
            status = "PASS" if r.ok else "FAIL"
            print(
                f"[{status}] {r.name}: "
                f"{r.passed} passed, {r.failed} failed, {r.skipped} skipped (of {r.total})"
            )
            if not r.ok and r.output.strip():
                tail = "\n".join(r.output.strip().splitlines()[-8:])
                print(tail)
                print("-" * 40)
        print(
            f"\nTOTAL: {totals['passed']} passed, {totals['failed']} failed, "
            f"{totals['skipped']} skipped (of {totals['total']})"
        )
        print(f"OVERALL: {'PASS' if summary['pass'] else 'FAIL'}")

    return 0 if summary["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
