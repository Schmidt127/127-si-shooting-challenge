#!/usr/bin/env python3
"""Offline routing + gate tests for SC-001 execute-three command."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.cli import main  # noqa: E402
from season_simulation.confirmation import ConfirmationError  # noqa: E402
from season_simulation.constants import (  # noqa: E402
    CONFIRM_DISPOSABLE_TOKEN,
    CONFIRM_THREE_ATHLETE_TOKEN,
    CONFIRM_TOKEN,
    THREE_ATHLETE_AUTHORIZATION_PHRASE,
)
from season_simulation.execute_three import (  # noqa: E402
    profile_ownership_namespace,
    profile_registry_run_id,
    run_execute_three,
)
from season_simulation.memory_client import MemoryAirtableClient  # noqa: E402
from season_simulation.run_registry import load_registry, save_registry  # noqa: E402
from season_simulation.writer import load_or_new_registry  # noqa: E402
from season_simulation.scenarios_sc001 import build_all_sc001_scenarios  # noqa: E402
from season_simulation.three_athlete import run_three_athlete_dry_run  # noqa: E402


RUN_ID = "SEASON-SIM-2027-20260906T120000Z-threeathlete"


def _gate_kwargs(**overrides):
    base = dict(
        execute=True,
        confirm=CONFIRM_TOKEN,
        confirm_disposable=CONFIRM_DISPOSABLE_TOKEN,
        confirm_three_athlete=CONFIRM_THREE_ATHLETE_TOKEN,
        authorization_phrase=THREE_ATHLETE_AUTHORIZATION_PHRASE,
        simulation_id=RUN_ID,
    )
    base.update(overrides)
    return base


def _gate_execute_kwargs(**overrides):
    g = _gate_kwargs(**overrides)
    g.pop("simulation_id", None)
    return g


class TestExecuteThreeCommandRouting(unittest.TestCase):
    def test_dry_run_three_invokes_three_runner(self):
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch(
                "season_simulation.cli.run_three_athlete_dry_run",
                wraps=run_three_athlete_dry_run,
            ) as dry_run:
                rc = main(
                    [
                        "dry-run-three",
                        "--offline-fixture",
                        "--out-dir",
                        tmp,
                        "--run-id",
                        RUN_ID,
                    ]
                )
                self.assertEqual(rc, 0)
                dry_run.assert_called_once()
                self.assertEqual(dry_run.call_args.kwargs["run_id"], RUN_ID)

    def test_execute_three_invokes_three_runner_not_sc002(self):
        with tempfile.TemporaryDirectory() as tmp:
            reg = Path(tmp) / "registries"
            with mock.patch("season_simulation.cli.run_execute_three") as exec_three:
                exec_three.return_value = {
                    "gates_passed": False,
                    "errors": [],
                    "report_path": str(Path(tmp) / "report.json"),
                }
                with mock.patch("season_simulation.cli.cmd_execute") as sc002:
                    rc = main(
                        [
                            "execute-three",
                            "--offline-fixture",
                            "--out-dir",
                            tmp,
                            "--registry-dir",
                            str(reg),
                            "--run-id",
                            RUN_ID,
                        ]
                    )
                    self.assertEqual(rc, 0)
                    exec_three.assert_called_once()
                    sc002.assert_not_called()

    def test_execute_invokes_sc002_not_three_runner(self):
        with mock.patch("season_simulation.cli.cmd_execute") as sc002:
            sc002.return_value = 2
            with mock.patch("season_simulation.cli.run_execute_three") as exec_three:
                rc = main(["execute"])
                self.assertEqual(rc, 2)
                sc002.assert_called_once()
                exec_three.assert_not_called()

    def test_execute_three_never_calls_sc002_scenario_from_reference(self):
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch("season_simulation.cli.scenario_from_reference") as sfr:
                with mock.patch(
                    "season_simulation.cli.run_execute_three",
                    return_value={"gates_passed": False, "errors": []},
                ):
                    main(
                        [
                            "execute-three",
                            "--offline-fixture",
                            "--out-dir",
                            tmp,
                            "--registry-dir",
                            str(Path(tmp) / "reg"),
                            "--run-id",
                            RUN_ID,
                        ]
                    )
                    sfr.assert_not_called()


class TestExecuteThreeGatesZeroWrites(unittest.TestCase):
    def _run_with_client(self, client: MemoryAirtableClient, **gate_overrides):
        with tempfile.TemporaryDirectory() as tmp:
            reg = Path(tmp) / "reg"
            reg.mkdir()
            out = Path(tmp) / "out"
            return run_execute_three(
                run_id=RUN_ID,
                registry_dir=reg,
                out_dir=out,
                client=client,
                offline_fixture=True,
                allow_writes=True,
                **_gate_execute_kwargs(**gate_overrides),
            )

    def test_wrong_phrase_zero_writes(self):
        client = MemoryAirtableClient(allow_writes=True)
        result = self._run_with_client(
            client,
            authorization_phrase="wrong phrase",
        )
        self.assertFalse(result["gates_passed"])
        self.assertGreater(len(result["errors"]), 0)
        self.assertEqual(result["airtable_writes_performed"], 0)
        self.assertEqual(sum(len(t) for t in client.tables.values()), 0)

    def test_missing_confirm_three_athlete_zero_writes(self):
        client = MemoryAirtableClient(allow_writes=True)
        result = self._run_with_client(
            client,
            confirm_three_athlete="",
        )
        self.assertFalse(result["gates_passed"])
        self.assertEqual(result["airtable_writes_performed"], 0)
        self.assertEqual(sum(len(t) for t in client.tables.values()), 0)

    def test_dry_plan_without_execute_zero_writes(self):
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            result = run_execute_three(
                run_id=RUN_ID,
                execute=False,
                registry_dir=Path(tmp) / "reg",
                out_dir=Path(tmp) / "out",
                client=client,
                offline_fixture=True,
                allow_writes=False,
            )
            self.assertFalse(result["gates_passed"])
            self.assertEqual(result["mode"], "dry-plan")
            self.assertEqual(result["airtable_writes_performed"], 0)
            self.assertEqual(sum(len(t) for t in client.tables.values()), 0)

    def test_gated_execute_with_allow_writes_false_zero_writes(self):
        client = MemoryAirtableClient(allow_writes=False)
        with tempfile.TemporaryDirectory() as tmp:
            result = run_execute_three(
                run_id=RUN_ID,
                registry_dir=Path(tmp) / "reg",
                out_dir=Path(tmp) / "out",
                client=client,
                offline_fixture=True,
                allow_writes=False,
                **_gate_execute_kwargs(),
            )
            self.assertTrue(result["gates_passed"])
            self.assertEqual(result["airtable_writes_performed"], 0)
            self.assertEqual(sum(len(t) for t in client.tables.values()), 0)
            self.assertEqual(len(result["profile_results"]), 3)


class TestExecuteThreeProfileNamespace(unittest.TestCase):
    def test_unique_registry_keys_per_profile(self):
        keys = [profile_registry_run_id(RUN_ID, p) for p in (
            "athlete1_perfect",
            "athlete2_recovery",
            "athlete3_edge",
        )]
        self.assertEqual(len(set(keys)), 3)
        for key in keys:
            self.assertIn("threeathlete", key)

    def test_unique_ownership_namespace(self):
        ns = [
            profile_ownership_namespace(RUN_ID, p)
            for p in ("athlete1_perfect", "athlete2_recovery", "athlete3_edge")
        ]
        self.assertEqual(len(set(ns)), 3)
        for marker in ns:
            self.assertIn(RUN_ID, marker)
            self.assertIn("SEASON-SIM", marker)

    def test_scenario_day_dedupe_keys_are_profile_scoped(self):
        homework = [
            {
                "record_id": f"recHW{i:02d}",
                "slot": "HW1",
                "library_id": f"recLIB{i:02d}",
                "display": f"HW{i}",
            }
            for i in range(1, 19)
        ]
        scenarios = build_all_sc001_scenarios(
            run_id=RUN_ID,
            grade_band_id="recGB",
            goal_record_id="recGOAL",
            goal_total_shots=12000,
            homework=homework,
            zoom_meetings=[
                {"record_id": "recZ1", "display": "Live"},
                {"record_id": "recZ2", "display": "Rec"},
            ],
        )
        dedupe_sets = []
        for profile, scenario in scenarios.items():
            keys = {d.dedupe_key for d in scenario.days if d.dedupe_key}
            dedupe_sets.append(keys)
            ns = profile_ownership_namespace(RUN_ID, profile)
            self.assertTrue(all(k.startswith(ns) for k in keys), profile)
        self.assertEqual(len(dedupe_sets[0] & dedupe_sets[1]), 0)


class TestExecuteThreeRegistryResume(unittest.TestCase):
    def test_registry_dedupe_by_profile(self):
        with tempfile.TemporaryDirectory() as tmp:
            reg_dir = Path(tmp)
            profile = "athlete1_perfect"
            reg_run_id = profile_registry_run_id(RUN_ID, profile)
            reg = load_or_new_registry(
                run_id=reg_run_id,
                registry_dir=reg_dir,
                athlete_name="Sim Perfect",
                meta={"profile": profile, "shared_run_id": RUN_ID},
            )
            ns = profile_ownership_namespace(RUN_ID, profile)
            reg.add("Athletes", "recTESTATHLETE1", dedupe_key=f"{ns}|ATHLETE")
            save_registry(reg, reg_dir)

            reloaded = load_registry(reg_dir, reg_run_id)
            self.assertEqual(reloaded.find_by_dedupe_key(f"{ns}|ATHLETE"), "recTESTATHLETE1")
            self.assertIsNone(reloaded.find_by_dedupe_key(f"{ns}|ENROLLMENT"))

            reg.add("Enrollments", "recTESTENROLL1", dedupe_key=f"{ns}|ENROLLMENT")
            save_registry(reg, reg_dir)
            reloaded2 = load_registry(reg_dir, reg_run_id)
            self.assertEqual(reloaded2.find_by_dedupe_key(f"{ns}|ENROLLMENT"), "recTESTENROLL1")

    def test_partial_profile_registry_isolated(self):
        with tempfile.TemporaryDirectory() as tmp:
            reg_dir = Path(tmp)
            for profile in ("athlete1_perfect", "athlete2_recovery"):
                reg_run_id = profile_registry_run_id(RUN_ID, profile)
                ns = profile_ownership_namespace(RUN_ID, profile)
                reg = load_or_new_registry(
                    run_id=reg_run_id,
                    registry_dir=reg_dir,
                    athlete_name=profile,
                )
                reg.add("Athletes", f"rec{profile[:8]}", dedupe_key=f"{ns}|ATHLETE")
                save_registry(reg, reg_dir)

            r1 = load_registry(reg_dir, profile_registry_run_id(RUN_ID, "athlete1_perfect"))
            r2 = load_registry(reg_dir, profile_registry_run_id(RUN_ID, "athlete2_recovery"))
            self.assertNotEqual(r1.records[0].record_id, r2.records[0].record_id)


class TestDryRunThreeNeverWrites(unittest.TestCase):
    def test_dry_run_three_offline_no_tables(self):
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            payload = run_three_athlete_dry_run(
                run_id=RUN_ID,
                client=client,
                offline_fixture=True,
                out_dir=Path(tmp),
            )
            self.assertFalse(payload.get("executed", True))
            self.assertEqual(sum(len(t) for t in client.tables.values()), 0)


class TestExecuteThreeStageZFinally(unittest.TestCase):
    def test_wrong_phrase_still_runs_stage_z(self):
        """--execute with bad gates must still invoke Stage Z (formulas may already be live)."""
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            result = run_execute_three(
                run_id=RUN_ID,
                execute=True,
                confirm=CONFIRM_TOKEN,
                confirm_disposable=CONFIRM_DISPOSABLE_TOKEN,
                confirm_three_athlete="WRONG",
                authorization_phrase="WRONG",
                registry_dir=Path(tmp),
                out_dir=Path(tmp),
                client=client,
                offline_fixture=True,
                allow_writes=True,
            )
            self.assertFalse(result["gates_passed"])
            self.assertEqual(result["airtable_writes_performed"], 0)
            self.assertIn("Z_formula_restore", result["stages"])
            self.assertTrue(result["stages"]["Final"].get("stage_z_required"))

    def test_writer_abort_runs_cleanup_preview_and_stage_z(self):
        from season_simulation.execute import ExecuteAborted as RealAbort

        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch(
                "season_simulation.execute_three._run_profile_writer",
                side_effect=RealAbort("simulated abort"),
            ):
                result = run_execute_three(
                    run_id=RUN_ID,
                    **_gate_execute_kwargs(),
                    registry_dir=Path(tmp),
                    out_dir=Path(tmp),
                    client=client,
                    offline_fixture=True,
                    allow_writes=False,
                )
            self.assertTrue(result["gates_passed"])
            self.assertIn("Z_formula_restore", result["stages"])
            first = next(iter(result["profile_results"].values()))
            self.assertIn("H_post_cascade_hooks", first)
            self.assertIn("failure_cleanup_preview", result["stages"])


if __name__ == "__main__":
    unittest.main()
