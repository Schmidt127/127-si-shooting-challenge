"""Offline tests for FUT-002 field inventory (schema snapshot parse + classify)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "tools" / "airtable"))

from fut_002_field_inventory import (  # noqa: E402
    DEFAULT_SNAPSHOT,
    classify_field,
    parse_schema_doc,
    run,
    FieldRecord,
)


def test_parse_schema_has_hub_tables():
    tables, index = parse_schema_doc(DEFAULT_SNAPSHOT)
    assert "Submission Assets" in tables
    assert "Homework Completions" in tables
    assert len(tables) >= 30
    assert len(index) >= 1000


def test_asset_key_depends_on_drive_file_id():
    _, index = parse_schema_doc(DEFAULT_SNAPSHOT)
    asset_key = index["Submission Assets::Asset Key"]
    assert "Google Drive File ID" in asset_key.depends_on


def test_google_drive_file_url_classified_obsolete():
    rec = FieldRecord(table="Submission Assets", name="Google Drive File URL")
    cls, _ = classify_field(rec, {})
    assert cls in {"legacy", "duplicate"}


def test_video_url_or_drive_link_active():
    rec = FieldRecord(table="Video Feedback", name="Video URL or Drive Link")
    cls, _ = classify_field(rec, {"automation": ["airtable/automations/shooting-challenge/073-foo.js"]})
    assert cls == "active"


def test_run_produces_json_artifact(tmp_path):
    out = tmp_path / "fut-002-test.json"
    result = run(DEFAULT_SNAPSHOT, out)
    assert out.exists()
    payload = json.loads(out.read_text())
    assert payload["auditId"] == "FUT-002"
    assert payload["fieldCount"] == result["fieldCount"]
    assert payload["classificationCounts"]["active"] > 500
    assert len(payload["googleDriveFields"]) >= 20
    assert any(
        f["field"] == "Google Drive File URL" for f in payload["googleDriveFields"]
    )


def test_safe_delete_excludes_asset_key():
    result = run(DEFAULT_SNAPSHOT, None)
    blocked = {(b["table"], b["field"]) for b in result["doNotDelete"]}
    assert ("Submission Assets", "Asset Key") in blocked
