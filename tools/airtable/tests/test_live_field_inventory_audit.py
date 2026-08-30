"""Offline contract tests for live_field_inventory_audit helpers."""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "tools" / "airtable"))

import live_field_inventory_audit as inv  # noqa: E402

OUT = REPO / "docs" / "audits" / "field-inventory"


def test_is_blank_and_formula_error():
    assert inv.is_blank(None)
    assert inv.is_blank("")
    assert inv.is_blank([])
    assert inv.is_blank({})
    assert not inv.is_blank(False)
    assert not inv.is_blank(0)
    assert inv.is_formula_error("#ERROR!")
    assert not inv.is_formula_error("ok")


def test_count_population_basic():
    records = [
        {"fields": {"A": "x", "B": ""}},
        {"fields": {"A": "y"}},
        {"fields": {}},
    ]
    out = inv.count_population(["A", "B", "C"], records)
    assert out["A"]["totalRecords"] == 3
    assert out["A"]["populatedCount"] == 2
    assert out["A"]["blankCount"] == 1
    assert out["B"]["populatedCount"] == 0
    assert out["B"]["emptyStringCount"] == 1
    assert out["C"]["blankCount"] == 3


def test_extract_formula_config():
    field = {
        "id": "fldTest",
        "name": "X",
        "type": "formula",
        "options": {"formula": "AND({A},{B})", "isValid": True, "result": {"type": "checkbox"}},
    }
    cfg = inv.extract_field_config(field)
    assert cfg["formula"] == "AND({A},{B})"
    assert inv.formula_deps_from_text(cfg["formula"]) == ["A", "B"]


def test_inventory_outputs_exist_when_generated():
    """If the live audit has been run, enforce QC on the JSON pack."""
    path = OUT / "field-inventory.json"
    if not path.exists():
        return
    data = json.loads(path.read_text(encoding="utf-8"))
    summary = data["summary"]
    fields = data["fields"]
    assert summary["inventoryRows"] == summary["liveFieldCount"]
    assert len(fields) == summary["liveFieldCount"]
    ids = [f["fieldId"] for f in fields]
    assert len(ids) == len(set(ids))
    assert all(f.get("classification") in inv.CLASSIFICATIONS for f in fields)
    for f in fields:
        assert f["fieldName"] and f["fieldId"].startswith("fld")
        assert "..." not in f["fieldName"]
