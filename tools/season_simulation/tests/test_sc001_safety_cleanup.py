"""Offline tests for SC-SEASON-SIM-001 safety, cleanup, formula lifecycle."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

TOOLS = Path(__file__).resolve().parents[2]
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from season_simulation.cleanup import (  # noqa: E402
    PROTECTED_NEVER_DELETE,
    assert_no_protected_delete_targets,
    build_cleanup_plan,
    build_three_athlete_cleanup_plan,
    cleanup_preview_three,
    discover_automation_descendants,
    enrollment_ids_from_registry,
    run_cleanup,
)
from season_simulation.constants import (  # noqa: E402
    CONFIRM_CLEANUP_TOKEN,
    CONFIRM_TOKEN,
    SAFE_EMAIL_RECIPIENT,
)
from season_simulation.formula_lifecycle import (  # noqa: E402
    FormulaFieldSnapshot,
    FormulaLifecycleContext,
    FormulaLifecycleError,
    FormulaSnapshotBundle,
    OMNI_FORMULA_FAILURE_STRING,
    install_formula_hooks,
    reject_invalid_formula_text,
    restore_production_formulas,
    restore_stage_z,
    snapshot_formulas,
    snapshot_formulas_from_meta,
    verify_formula_state,
)
from season_simulation.memory_client import MemoryAirtableClient  # noqa: E402
from season_simulation.recipient_safety import assert_safe_recipient  # noqa: E402
from season_simulation.run_registry import RunRegistry, save_registry  # noqa: E402
from season_simulation.safety_gates import (  # noqa: E402
    run_pre_execution_safety_gates,
)
from season_simulation.zero_remnant_audit import run_zero_remnant_audit  # noqa: E402


RUN_ID = "SEASON-SIM-2027-20260906T120000Z-threeathlete"
ENROLL_A = "recEnrProfileA001"
ENROLL_B = "recEnrProfileB002"
MARKER = f"SEASON-SIM|{RUN_ID}"


def _meta_production() -> list[dict]:
    return [
        {
            "name": "Submissions",
            "fields": [
                {
                    "id": "fldFuture01",
                    "name": "Activity Date Is Future?",
                    "type": "formula",
                    "options": {
                        "formula": (
                            "IF({Activity Date}, IF({Activity Date} > NOW(), 1, 0), BLANK())"
                        )
                    },
                }
            ],
        }
    ]


class TestFormulaLifecycle(unittest.TestCase):
    def test_rejects_omni_failure_string(self):
        with self.assertRaises(FormulaLifecycleError) as ctx:
            reject_invalid_formula_text(
                f"IF(1, {OMNI_FORMULA_FAILURE_STRING}, 0)",
                field_name="Activity Date Is Future?",
            )
        self.assertIn("OMNI", str(ctx.exception))

    def test_snapshot_stores_exact_text(self):
        bundle = snapshot_formulas_from_meta(_meta_production())
        self.assertEqual(len(bundle.snapshots), 1)
        self.assertIn("NOW()", bundle.snapshots[0].formula_text)

    def test_stage_z_restore_called_on_failure_path(self):
        snap = FormulaFieldSnapshot(
            table="Submissions",
            field_name="Activity Date Is Future?",
            field_id="fldX",
            formula_text="IF({Activity Date}, IF({Activity Date} > NOW(), 1, 0), BLANK())",
            captured_at=datetime.now(timezone.utc).isoformat(),
        )
        bundle = FormulaSnapshotBundle(snapshots=[snap], run_id=RUN_ID)
        restore_mock = MagicMock(
            return_value=restore_stage_z(bundle, dry_run=True, reason="test")
        )
        with self.assertRaises(RuntimeError):
            with FormulaLifecycleContext(
                bundle, restore_fn=restore_mock, dry_run=True
            ):
                raise RuntimeError("simulated execute failure")
        restore_mock.assert_called_once()
        self.assertEqual(
            restore_mock.call_args.kwargs.get("reason"),
            "stage_z_failure_or_interrupt",
        )

    def test_snapshot_formulas_hook_extends_stub(self):
        result = snapshot_formulas(None, allow_writes=False, run_id=RUN_ID)
        self.assertIn(result["status"], {"partial", "ok", "skipped"})
        self.assertFalse(result.get("snapshotted") and result["status"] == "stub")
        self.assertTrue(result.get("prohibit_omni_formula_generation"))

    def test_restore_production_formulas_skips_without_bundle(self):
        from season_simulation.formula_lifecycle import restore_production_formulas

        result = restore_production_formulas(None, allow_writes=False)
        self.assertEqual(result["status"], "skipped")
        self.assertFalse(result["restored"])

    def test_install_hooks_never_executes(self):
        hooks = install_formula_hooks(target_mode="gated")
        self.assertFalse(hooks["executed"])
        self.assertTrue(hooks["prohibit_omni_formula_generation"])


class TestSafetyGates(unittest.TestCase):
    def test_wrong_allowlist_stops(self):
        report = run_pre_execution_safety_gates(
            run_id=RUN_ID,
            base_id="appn84sqPw03zEbTT",
            enrollment_emails=["family@example.com"],
            automation_versions={"010": "v10.14", "066": "v4.1", "114": "v6.2"},
            transactional_counts={t: 0 for t in ("Athletes", "Enrollments", "Submissions")},
            weeks_count=10,
            homework_count=18,
        )
        self.assertFalse(report.ok)
        self.assertTrue(any("allowlist" in r.lower() for r in report.stop_reasons))

    def test_allowlist_passes(self):
        report = run_pre_execution_safety_gates(
            run_id=RUN_ID,
            base_id="appn84sqPw03zEbTT",
            enrollment_emails=[SAFE_EMAIL_RECIPIENT],
            automation_versions={"010": "v10.14", "066": "v4.1", "114": "v6.2"},
            transactional_counts={"Athletes": 0, "Enrollments": 0},
            weeks_count=10,
            homework_count=18,
            meta_tables=_meta_production(),
            expect_gated_formula=False,
        )
        self.assertTrue(report.ok, report.stop_reasons)


class TestCleanupPreview(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.registry_dir = Path(self.tmp)
        self.client = MemoryAirtableClient(allow_writes=True)
        self.reg = RunRegistry(
            run_id=RUN_ID,
            created_at=datetime.now(timezone.utc).isoformat(),
            enrollment_id=ENROLL_A,
            meta={
                "profiles": {
                    "athlete1_perfect": {"enrollment_id": ENROLL_A},
                    "athlete2_recovery": {"enrollment_id": ENROLL_B},
                    "athlete3_edge": {"enrollment_id": "recEnrProfileC003"},
                }
            },
        )
        self.reg.add("Athletes", "recSimAth001", dedupe_key=f"{RUN_ID}|ATH")
        self.reg.add("Enrollments", ENROLL_A, dedupe_key=f"{RUN_ID}|ENR-A")
        self.reg.add("Enrollments", ENROLL_B, dedupe_key=f"{RUN_ID}|ENR-B")
        save_registry(self.reg, self.registry_dir)

        self.client.seed("Athletes", "recSimAth001", {"First Name": "Sim", "Last Name": "Perfect"})
        self.client.seed("Enrollments", ENROLL_A, {"Athlete": ["recSimAth001"]})
        self.client.seed("Enrollments", ENROLL_B, {"Athlete": ["recSimAth001"]})
        self.client.seed(
            "Submissions",
            "recSub001",
            {"Enrollment": [ENROLL_A], "Video Upload Note": MARKER},
        )
        # Automation descendant XP (not in registry)
        self.client.seed(
            "XP Events",
            "recXpOrphan01",
            {
                "Source Key": f"SUBMISSION_XP|recSub001",
                "XP Reason Debug": MARKER,
                "Active?": True,
            },
        )
        self.client.seed(
            "Athlete Achievement Unlocks",
            "recUnlockOrphan01",
            {"Milestone Source Key": f"SHOT_MILESTONE|{ENROLL_A}|recMs"},
        )

    def test_cleanup_preview_does_not_delete(self):
        before = len(self.client.tables.get("Athletes") or {})
        result = cleanup_preview_three(
            run_id=RUN_ID,
            registry_dir=self.registry_dir,
            client=self.client,
        )
        self.assertTrue(result.dry_run)
        self.assertEqual(result.deleted, {})
        after = len(self.client.tables.get("Athletes") or {})
        self.assertEqual(before, after)
        self.assertIn("recSimAth001", self.client.tables["Athletes"])

    def test_protected_tables_never_in_delete_set(self):
        plan = build_three_athlete_cleanup_plan(
            run_id=RUN_ID,
            registry_dir=self.registry_dir,
            client=self.client,
        )
        for table in plan.targets:
            self.assertNotIn(
                table,
                PROTECTED_NEVER_DELETE - {"Zoom Meetings"},
                f"{table} must not be bulk-deleted",
            )
        errors = assert_no_protected_delete_targets(plan.targets)
        self.assertFalse(errors)

    def test_descendant_discovery_includes_xp_and_unlocks(self):
        descendants, _ = discover_automation_descendants(
            self.client,
            run_id=RUN_ID,
            enrollment_ids=[ENROLL_A],
        )
        xp_ids = descendants.get("XP Events") or []
        unlock_ids = descendants.get("Athlete Achievement Unlocks") or []
        self.assertIn("recXpOrphan01", xp_ids)
        self.assertIn("recUnlockOrphan01", unlock_ids)

        plan = build_cleanup_plan(
            run_id=RUN_ID,
            registry_dir=self.registry_dir,
            client=self.client,
        )
        self.assertIn("recXpOrphan01", plan.targets.get("XP Events") or [])
        self.assertIn(
            "recUnlockOrphan01",
            plan.targets.get("Athlete Achievement Unlocks") or [],
        )

    def test_run_cleanup_deletes_when_gated(self):
        result = run_cleanup(
            run_id=RUN_ID,
            registry_dir=self.registry_dir,
            execute=True,
            confirm=CONFIRM_TOKEN,
            confirm_cleanup=CONFIRM_CLEANUP_TOKEN,
            simulation_id=RUN_ID,
            client=self.client,
        )
        self.assertFalse(result.dry_run)
        self.assertIn("Athletes", result.deleted)
        self.assertNotIn("recSimAth001", self.client.tables.get("Athletes") or {})


class TestZeroRemnantAudit(unittest.TestCase):
    def test_detects_sim_athlete_name(self):
        client = MemoryAirtableClient()
        client.seed(
            "Athletes",
            "recLeftover",
            {"First Name": "Sim", "Last Name": "Perfect"},
        )

        def list_records(table, **kwargs):
            return list(client.tables.get(table, {}).values())

        report = run_zero_remnant_audit(
            run_id=RUN_ID,
            list_records=list_records,
        )
        self.assertFalse(report.ok)
        self.assertTrue(any(h.record_id == "recLeftover" for h in report.hits))


class TestRecipientSafety(unittest.TestCase):
    def test_non_allowlist_raises(self):
        with self.assertRaises(ValueError):
            assert_safe_recipient("not-allowed@example.com")


if __name__ == "__main__":
    unittest.main()
