#!/usr/bin/env python3
"""Verify git worktree lane before commit or merge.

Never modifies git state. Exit 0 = OK, 1 = hard fail.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath

LEAD_BRANCH = "overnight/lead-integration"
WORKER_BRANCH_RE = re.compile(r"^overnight/v2-run/worker-[a-d]-s\d+-.+$")
ALLOWED_STAGED_ROOTS = (
    "docs/",
    "tools/",
    "airtable/",
    "lambda/",
    "web/",
    ".cursor/",
)
ALLOWED_STAGED_ROOT_FILES = (
    "AGENTS.md",
    "CHANGELOG.md",
    "README.md",
)
SECRET_BASENAME_EXACT = {
    ".env",
    "credentials.json",
    "credentials.csv",
    "secrets.json",
    "id_rsa",
    "id_ed25519",
    "webhook_secret",
}
SECRET_BASENAME_SUFFIXES = (".pem", ".p12", ".pfx", ".key")
SECRET_BASENAME_CONTAINS = (
    "credential",
    "private_key",
    "private-key",
    "api_token",
    "access_token",
    "webhook_secret",
)


def _run_git(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )


def _normalize_path(path: str) -> str:
    return path.replace("\\", "/")


def _is_secret_path(path: str) -> bool:
    name = PurePosixPath(_normalize_path(path)).name.lower()
    if name == ".env" or name.startswith(".env."):
        return True
    if name in SECRET_BASENAME_EXACT:
        return True
    if any(name.endswith(suffix) for suffix in SECRET_BASENAME_SUFFIXES):
        return True
    return any(fragment in name for fragment in SECRET_BASENAME_CONTAINS)


def _is_allowed_staged_path(path: str) -> bool:
    normalized = _normalize_path(path)
    if normalized in ALLOWED_STAGED_ROOT_FILES:
        return True
    return any(normalized.startswith(root) or normalized == root.rstrip("/") for root in ALLOWED_STAGED_ROOTS)


def validate_lane(
    repo: Path,
    role: str,
    lane: str | None = None,
    expected_repo: Path | None = None,
) -> tuple[bool, str]:
    repo = repo.resolve()
    if not (repo / ".git").exists() and _run_git(repo, "rev-parse", "--git-dir").returncode != 0:
        return False, f"not a git repository: {repo}"

    top = _run_git(repo, "rev-parse", "--show-toplevel")
    if top.returncode != 0:
        return False, f"git rev-parse --show-toplevel failed: {top.stderr.strip()}"

    top_level = Path(top.stdout.strip()).resolve()
    if expected_repo is not None and top_level != expected_repo.resolve():
        return False, f"repository root mismatch: expected {expected_repo.resolve()}, got {top_level}"

    branch = _run_git(repo, "branch", "--show-current")
    if branch.returncode != 0:
        return False, f"git branch --show-current failed: {branch.stderr.strip()}"
    current_branch = branch.stdout.strip()

    if role == "lead":
        if current_branch != LEAD_BRANCH:
            return False, f"lead role requires branch {LEAD_BRANCH}, got {current_branch!r}"
    elif role == "worker":
        if current_branch == LEAD_BRANCH:
            return False, "worker role cannot commit on lead integration branch"
        if not WORKER_BRANCH_RE.match(current_branch):
            return False, (
                "worker branch must match overnight/v2-run/worker-[a-d]-s[stage]-[scope], "
                f"got {current_branch!r}"
            )
        if lane:
            lane_letter = lane.replace("worker-", "")
            if f"worker-{lane_letter}-" not in current_branch:
                return False, f"lane {lane!r} does not match branch {current_branch!r}"
    else:
        return False, f"unknown role: {role!r}"

    status = _run_git(repo, "status", "--short")
    if status.returncode != 0:
        return False, f"git status --short failed: {status.stderr.strip()}"

    staged_lines = [line for line in status.stdout.splitlines() if line and line[0] in "MADRCU"]
    staged_paths: list[str] = []
    for line in staged_lines:
        path = line[3:].strip()
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        staged_paths.append(_normalize_path(path))

    for path in staged_paths:
        if _is_secret_path(path):
            return False, f"staged secret-like file blocked: {path}"
        if not _is_allowed_staged_path(path):
            return False, f"staged path outside approved roots blocked: {path}"

    short_status = status.stdout.strip() or "(clean)"
    return True, f"OK branch={current_branch} status={short_status}"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate git lane before commit.")
    parser.add_argument("--role", choices=["lead", "worker"], required=True)
    parser.add_argument("--lane", choices=["worker-a", "worker-b", "worker-c", "worker-d"])
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--expected-repo", type=Path)
    args = parser.parse_args(argv)

    ok, message = validate_lane(
        repo=args.repo,
        role=args.role,
        lane=args.lane,
        expected_repo=args.expected_repo,
    )
    print(message)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
