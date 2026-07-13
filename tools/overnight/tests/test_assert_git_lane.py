#!/usr/bin/env python3
"""Offline tests for assert_git_lane."""

from __future__ import annotations

import subprocess
import tempfile
import unittest
from pathlib import Path

from tools.overnight.assert_git_lane import validate_lane


class AssertGitLaneTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.repo = Path(self.tempdir.name)
        subprocess.run(["git", "init"], cwd=self.repo, check=True, capture_output=True)
        subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=self.repo, check=True)
        subprocess.run(["git", "config", "user.name", "Test"], cwd=self.repo, check=True)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def _checkout(self, branch: str) -> None:
        subprocess.run(["git", "checkout", "-B", branch], cwd=self.repo, check=True, capture_output=True)

    def _stage_file(self, rel_path: str, content: str = "x") -> None:
        path = self.repo / rel_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        subprocess.run(["git", "add", rel_path], cwd=self.repo, check=True, capture_output=True)

    def test_lead_passes_on_lead_branch(self) -> None:
        self._checkout("overnight/lead-integration")
        ok, message = validate_lane(self.repo, role="lead")
        self.assertTrue(ok, message)

    def test_lead_fails_when_role_worker(self) -> None:
        self._checkout("overnight/lead-integration")
        ok, message = validate_lane(self.repo, role="worker", lane="worker-a")
        self.assertFalse(ok)
        self.assertIn("lead integration", message)

    def test_worker_passes_on_valid_branch(self) -> None:
        self._checkout("overnight/v2-run/worker-a-s6-pipeline-audit")
        ok, message = validate_lane(self.repo, role="worker", lane="worker-a")
        self.assertTrue(ok, message)

    def test_worker_fails_on_invalid_branch(self) -> None:
        self._checkout("feature/wrong-branch")
        ok, message = validate_lane(self.repo, role="worker", lane="worker-a")
        self.assertFalse(ok)
        self.assertIn("worker branch must match", message)

    def test_worker_fails_on_lead_branch(self) -> None:
        self._checkout("overnight/lead-integration")
        ok, message = validate_lane(self.repo, role="worker", lane="worker-a")
        self.assertFalse(ok)
        self.assertIn("worker role cannot commit", message)

    def test_lead_fails_on_worker_branch(self) -> None:
        self._checkout("overnight/v2-run/worker-b-s6-scope")
        ok, message = validate_lane(self.repo, role="lead")
        self.assertFalse(ok)
        self.assertIn("lead role requires branch", message)

    def test_fails_on_unexpected_staged_path(self) -> None:
        self._checkout("overnight/lead-integration")
        self._stage_file("media/unexpected.txt")
        ok, message = validate_lane(self.repo, role="lead")
        self.assertFalse(ok)
        self.assertIn("outside approved roots", message)

    def test_fails_on_staged_secret_like_file(self) -> None:
        self._checkout("overnight/lead-integration")
        self._stage_file("docs/.env")
        ok, message = validate_lane(self.repo, role="lead")
        self.assertFalse(ok)
        self.assertIn("secret-like", message)

    def test_passes_on_allowed_staged_docs_path(self) -> None:
        self._checkout("overnight/lead-integration")
        self._stage_file("docs/overnight-runs/CONTROL.json", "{}")
        ok, message = validate_lane(self.repo, role="lead")
        self.assertTrue(ok, message)

    def test_passes_on_allowed_root_agents_md(self) -> None:
        self._checkout("overnight/lead-integration")
        self._stage_file("AGENTS.md", "# agents")
        ok, message = validate_lane(self.repo, role="lead")
        self.assertTrue(ok, message)


if __name__ == "__main__":
    unittest.main()
