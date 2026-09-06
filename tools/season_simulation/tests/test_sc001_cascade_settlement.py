"""Offline tests for cascade settlement, re-arm, cleanup merge, truthful completion."""

from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

TOOLS = Path(__file__).resolve().parents[2]
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from season_simulation.cascade_settlement import (  # noqa: E402
    classify_submission_xp_status,
    poll_cascade_settlement,
    stage_d_settlement_hook,
    stage_e_reconcile_hook,
    summarize_statuses,
)
from season_simulation.cleanup import (  # noqa: E402
    build_three_athlete_cleanup_plan,
    run_three_athlete_cleanup,
)
from season_simulation.constants import (  # noqa: E402
    CONFIRM_CLEANUP_TOKEN,
    CONFIRM_DISPOSABLE_TOKEN,
    CONFIRM_TOKEN,
)
from season_simulation.execute_three import (  # noqa: E402
    profile_registry_run_id,
    run_execute_three,
)
from season_simulation.memory_client import MemoryAirtableClient  # noqa: E402
from season_simulation.rearm_submission_xp import (  # noqa: E402
    build_rearm_plan,
    run_rearm_submission_xp,
)
from season_simulation.run_registry import RunRegistry, save_registry  # noqa: E402


RUN_ID = "SEASON-SIM-2027-20260906T120000Z-threeathlete"
MARKER = f"SEASON-SIM|{RUN_ID}"


def _reg_for_profile(profile: str, *, enrollment: str, submissions: list[str]) -> RunRegistry:
    reg = RunRegistry(
        run_id=profile_registry_run_id(RUN_ID, profile),
        created_at=datetime.now(timezone.utc).isoformat(),
        enrollment_id=enrollment,
        athlete_name=profile,
        meta={"shared_run_id": RUN_ID, "profile": profile},
    )
    reg.add("Enrollments", enrollment, dedupe_key=f"{MARKER}|{profile}|ENR")
    for i, sid in enumerate(submissions):
        reg.add("Submissions", sid, dedupe_key=f"{MARKER}|{profile}|SUB|{i}")
    return reg


class TestClassifySubmissionXp(unittest.TestCase):
    def test_settled_when_active_xp(self):
        st = classify_submission_xp_status(
            submission_id="recSub1",
            fields={
                "Enrollment": ["recEnr"],
                "Week": ["recWeek"],
                "Weekly Athlete Summary": ["recWas"],
                "Count This Submission?": 1,
            },
            active_xp_ids=["recXp1"],
        )
        self.assertEqual(st.classification, "settled")

    def test_inapplicable_when_not_countable(self):
        st = classify_submission_xp_status(
            submission_id="recSub1",
            fields={"Count This Submission?": 0},
            active_xp_ids=[],
        )
        self.assertEqual(st.classification, "inapplicable")

    def test_not_ready_missing_links(self):
        st = classify_submission_xp_status(
            submission_id="recSub1",
            fields={"Count This Submission?": 1, "Enrollment": ["recEnr"]},
            active_xp_ids=[],
        )
        self.assertEqual(st.classification, "not_ready")
        self.assertIn("Week", st.detail)

    def test_stuck_latched_without_xp(self):
        st = classify_submission_xp_status(
            submission_id="recSub1",
            fields={
                "Enrollment": ["recEnr"],
                "Week": ["recWeek"],
                "Weekly Athlete Summary": ["recWas"],
                "Count This Submission?": 1,
                "Last Reconciled Signature": "sig-abc",
                "Reconciliation Needed?": 0,
            },
            active_xp_ids=[],
        )
        self.assertEqual(st.classification, "stuck")

    def test_pending_eligible_without_xp(self):
        st = classify_submission_xp_status(
            submission_id="recSub1",
            fields={
                "Enrollment": ["recEnr"],
                "Week": ["recWeek"],
                "Weekly Athlete Summary": ["recWas"],
                "Count This Submission?": 1,
                "Reconciliation Needed?": 1,
            },
            active_xp_ids=[],
        )
        self.assertEqual(st.classification, "pending")


class TestSettlementPolling(unittest.TestCase):
    def test_poll_completes_when_xp_appears(self):
        client = MemoryAirtableClient(allow_writes=True)
        client.seed(
            "Submissions",
            "recSubA",
            {
                "Enrollment": ["recEnr"],
                "Week": ["recWeek"],
                "Weekly Athlete Summary": ["recWas"],
                "Count This Submission?": 1,
                "Season Sim Test Record?": True,
                "Video Upload Note": MARKER,
            },
        )
        reg = _reg_for_profile("athlete1_perfect", enrollment="recEnr", submissions=["recSubA"])

        ticks = {"n": 0}

        def fake_sleep(_s: float) -> None:
            ticks["n"] += 1
            if ticks["n"] == 2:
                client.seed(
                    "XP Events",
                    "recXpA",
                    {"Source Key": "SUBMISSION_XP|recSubA", "Active?": True},
                )

        clock = {"t": 0.0}

        def mono() -> float:
            return clock["t"]

        def sleep(s: float) -> None:
            clock["t"] += s
            fake_sleep(s)

        result = poll_cascade_settlement(
            client,
            reg,
            run_id=RUN_ID,
            profile="athlete1_perfect",
            timeout_s=30,
            poll_interval_s=1,
            sleep_fn=sleep,
            monotonic_fn=mono,
        )
        self.assertTrue(result.complete)
        self.assertFalse(result.timed_out)
        self.assertEqual(result.settled_countable, 1)

    def test_poll_timeout(self):
        client = MemoryAirtableClient(allow_writes=True)
        client.seed(
            "Submissions",
            "recSubB",
            {
                "Enrollment": ["recEnr"],
                "Week": ["recWeek"],
                "Weekly Athlete Summary": ["recWas"],
                "Count This Submission?": 1,
            },
        )
        reg = _reg_for_profile("athlete2_recovery", enrollment="recEnr", submissions=["recSubB"])
        clock = {"t": 0.0}

        result = poll_cascade_settlement(
            client,
            reg,
            run_id=RUN_ID,
            timeout_s=5,
            poll_interval_s=2,
            sleep_fn=lambda s: clock.__setitem__("t", clock["t"] + s),
            monotonic_fn=lambda: clock["t"],
        )
        self.assertTrue(result.timed_out)
        self.assertFalse(result.complete)
        self.assertEqual(result.pending, ["recSubB"])

    def test_reconcile_truth_not_writer_counts(self):
        settlement = {
            "complete": False,
            "result": {
                "expected_countable": 3,
                "settled_countable": 1,
                "pending": ["recA", "recB"],
                "stuck": [],
                "not_ready": [],
            },
        }
        report = stage_e_reconcile_hook(settlement, profile="athlete2_recovery", writer_created=267)
        self.assertEqual(report["status"], "failed")
        self.assertFalse(report["complete"])
        self.assertIn("writer_complete_is_not_cascade_complete", report["truth"])
        self.assertEqual(report["writer_created_records"], 267)


class TestRearmOwnership(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.registry_dir = Path(self.tmp)
        self.client = MemoryAirtableClient(allow_writes=True)
        reg = _reg_for_profile(
            "athlete1_perfect",
            enrollment="recEnrP",
            submissions=["recOwnedSub", "recSettledSub"],
        )
        save_registry(reg, self.registry_dir)
        self.client.seed(
            "Submissions",
            "recOwnedSub",
            {
                "Enrollment": ["recEnrP"],
                "Week": ["recWeek"],
                "Weekly Athlete Summary": ["recWas"],
                "Count This Submission?": 1,
                "Season Sim Test Record?": True,
                "Video Upload Note": MARKER,
                "Last Reconciled Signature": "old-sig",
                "Reconciliation Needed?": 0,
            },
        )
        self.client.seed(
            "Submissions",
            "recSettledSub",
            {
                "Enrollment": ["recEnrP"],
                "Week": ["recWeek"],
                "Weekly Athlete Summary": ["recWas"],
                "Count This Submission?": 1,
                "Season Sim Test Record?": True,
                "Video Upload Note": MARKER,
                "Last Reconciled Signature": "ok",
            },
        )
        self.client.seed(
            "XP Events",
            "recXpSettled",
            {"Source Key": "SUBMISSION_XP|recSettledSub", "Active?": True},
        )
        # Unknown non-registry submission — must never be proposed even if fetched.
        self.client.seed(
            "Submissions",
            "recProdAthlete",
            {
                "Enrollment": ["recReal"],
                "Week": ["recWeek"],
                "Count This Submission?": 1,
                "Last Reconciled Signature": "prod-sig",
            },
        )

    def test_dry_run_plan_only_owned_stuck(self):
        plan = build_rearm_plan(
            run_id=RUN_ID,
            registry_dir=self.registry_dir,
            client=self.client,
        )
        self.assertFalse(plan.errors)
        ids = [c.submission_id for c in plan.candidates]
        self.assertIn("recOwnedSub", ids)
        self.assertNotIn("recSettledSub", ids)
        self.assertNotIn("recProdAthlete", ids)
        for c in plan.candidates:
            self.assertEqual(c.proposed_fields, {"Last Reconciled Signature": ""})

    def test_refuse_without_registry(self):
        empty = Path(tempfile.mkdtemp())
        plan = build_rearm_plan(run_id=RUN_ID, registry_dir=empty, client=self.client)
        self.assertTrue(plan.errors)
        self.assertEqual(plan.candidates, [])

    def test_live_rearm_requires_gates(self):
        result = run_rearm_submission_xp(
            run_id=RUN_ID,
            registry_dir=self.registry_dir,
            client=self.client,
            execute=True,
            confirm="WRONG",
            confirm_disposable=CONFIRM_DISPOSABLE_TOKEN,
        )
        self.assertTrue(result.dry_run)
        self.assertTrue(result.errors)
        # Signature unchanged
        fields = self.client.tables["Submissions"]["recOwnedSub"]["fields"]
        self.assertEqual(fields["Last Reconciled Signature"], "old-sig")

    def test_live_rearm_clears_signature_when_gated(self):
        result = run_rearm_submission_xp(
            run_id=RUN_ID,
            registry_dir=self.registry_dir,
            client=self.client,
            execute=True,
            confirm=CONFIRM_TOKEN,
            confirm_disposable=CONFIRM_DISPOSABLE_TOKEN,
        )
        self.assertFalse(result.dry_run)
        self.assertFalse(result.errors)
        self.assertEqual(len(result.applied), 1)
        fields = self.client.tables["Submissions"]["recOwnedSub"]["fields"]
        self.assertEqual(fields.get("Last Reconciled Signature"), "")


class TestMergedCleanupRegistries(unittest.TestCase):
    def test_cleanup_merges_profile_registries_without_shared_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            reg_dir = Path(tmp)
            client = MemoryAirtableClient(allow_writes=True)
            for i, profile in enumerate(
                ("athlete1_perfect", "athlete2_recovery", "athlete3_edge")
            ):
                enr = f"recEnr{i}"
                ath = f"recAth{i}"
                reg = _reg_for_profile(profile, enrollment=enr, submissions=[f"recSub{i}"])
                reg.add("Athletes", ath, dedupe_key=f"{MARKER}|{profile}|ATH")
                save_registry(reg, reg_dir)
                client.seed("Athletes", ath, {"First Name": "Sim", "Last Name": profile})
                client.seed("Enrollments", enr, {"Athlete": [ath]})
                client.seed(
                    "Submissions",
                    f"recSub{i}",
                    {"Enrollment": [enr], "Video Upload Note": MARKER},
                )

            plan = build_three_athlete_cleanup_plan(
                run_id=RUN_ID,
                registry_dir=reg_dir,
                client=client,
            )
            # Missing shared registry must not block merge
            self.assertGreaterEqual(plan.total_records(), 9)
            self.assertEqual(len(plan.targets.get("Athletes") or []), 3)
            self.assertEqual(len(plan.targets.get("Enrollments") or []), 3)

            # Filter the known "No local registry for shared run_id" noise like production fix
            result = run_three_athlete_cleanup(
                run_id=RUN_ID,
                registry_dir=reg_dir,
                execute=True,
                confirm=CONFIRM_TOKEN,
                confirm_cleanup=CONFIRM_CLEANUP_TOKEN,
                client=client,
            )
            self.assertFalse(result.dry_run)
            self.assertFalse(result.errors)
            self.assertEqual(len(result.deleted.get("Athletes") or []), 3)
            self.assertEqual(sum(len(v) for v in client.tables.get("Athletes", {}).values()), 0)

    def test_interrupted_profile_registry_preserved(self):
        """Failure of profile 2 must not erase profile 1 registry file."""
        with tempfile.TemporaryDirectory() as tmp:
            reg_dir = Path(tmp)
            r1 = _reg_for_profile(
                "athlete1_perfect", enrollment="recE1", submissions=["recS1"]
            )
            save_registry(r1, reg_dir)
            path1 = reg_dir / f"{profile_registry_run_id(RUN_ID, 'athlete1_perfect')}.json"
            self.assertTrue(path1.exists())
            # Simulate profile 2 never finishing — only one registry exists
            plan = build_three_athlete_cleanup_plan(
                run_id=RUN_ID, registry_dir=reg_dir, client=None
            )
            self.assertIn("recS1", plan.targets.get("Submissions") or [])
            self.assertTrue(path1.exists())


class TestLiveWriteGatingDoesNotLeak(unittest.TestCase):
    def test_execute_three_dry_plan_allow_writes_forced_false(self):
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            result = run_execute_three(
                run_id=RUN_ID,
                execute=False,
                registry_dir=Path(tmp) / "reg",
                out_dir=Path(tmp) / "out",
                client=client,
                offline_fixture=True,
                allow_writes=True,  # caller mistake — must still force false
            )
            self.assertFalse(result["allow_writes"])
            self.assertEqual(result["airtable_writes_performed"], 0)
            self.assertEqual(sum(len(t) for t in client.tables.values()), 0)
            for pr in result["profile_results"].values():
                self.assertEqual((pr.get("E_reconcile") or {}).get("status"), "planned")
                self.assertFalse((pr.get("E_reconcile") or {}).get("complete"))


class TestFormulaRestoreStillGuaranteed(unittest.TestCase):
    def test_settlement_failure_still_runs_stage_z(self):
        from season_simulation.constants import (
            CONFIRM_THREE_ATHLETE_TOKEN,
            THREE_ATHLETE_AUTHORIZATION_PHRASE,
        )

        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch(
                "season_simulation.execute_three._run_profile_writer",
                return_value={
                    "writer_status": "complete",
                    "created_records": [{"table": "Submissions", "id": "recX"}],
                    "errors": [],
                },
            ):
                with mock.patch(
                    "season_simulation.execute_three.stage_d_settlement_hook",
                    return_value={
                        "stage": "D_settlement",
                        "complete": False,
                        "result": {
                            "expected_countable": 1,
                            "settled_countable": 0,
                            "pending": ["recX"],
                            "stuck": [],
                            "not_ready": [],
                        },
                    },
                ):
                    result = run_execute_three(
                        run_id=RUN_ID,
                        execute=True,
                        confirm=CONFIRM_TOKEN,
                        confirm_disposable=CONFIRM_DISPOSABLE_TOKEN,
                        confirm_three_athlete=CONFIRM_THREE_ATHLETE_TOKEN,
                        authorization_phrase=THREE_ATHLETE_AUTHORIZATION_PHRASE,
                        registry_dir=Path(tmp),
                        out_dir=Path(tmp),
                        client=client,
                        offline_fixture=True,
                        allow_writes=True,
                    )
            self.assertIn("Z_formula_restore", result["stages"])
            self.assertFalse(result.get("cascade_complete"))
            self.assertTrue(result["errors"])


class TestDuplicateXpPreventionSemantics(unittest.TestCase):
    def test_summarize_complete_requires_all_settled(self):
        from season_simulation.cascade_settlement import SubmissionXpStatus

        statuses = [
            SubmissionXpStatus(
                submission_id="a",
                countable=True,
                enrollment_linked=True,
                week_linked=True,
                was_linked=True,
                reconciliation_needed=0,
                last_reconciled_signature="x",
                active_submission_xp_ids=["xp1"],
                classification="settled",
            ),
            SubmissionXpStatus(
                submission_id="b",
                countable=True,
                enrollment_linked=True,
                week_linked=True,
                was_linked=True,
                reconciliation_needed=1,
                last_reconciled_signature="",
                active_submission_xp_ids=[],
                classification="pending",
            ),
        ]
        summary = summarize_statuses(statuses)
        self.assertFalse(summary["complete"])
        self.assertEqual(summary["settled_countable"], 1)


if __name__ == "__main__":
    unittest.main()
