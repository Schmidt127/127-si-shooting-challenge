"""Run-ID helpers and local registry for cleanup targeting."""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from .constants import RUN_MARKER_PREFIX

_RUN_ID_RE = re.compile(r"^SEASON-SIM-2027-[0-9]{8}T[0-9]{6}Z-[a-z0-9]{6}$")


def new_run_id(*, now: datetime | None = None, suffix: str = "athlete1") -> str:
    """Generate a stable run ID: SEASON-SIM-2027-<utc>-<suffix>."""
    moment = now or datetime.now(timezone.utc)
    stamp = moment.strftime("%Y%m%dT%H%M%SZ")
    safe_suffix = re.sub(r"[^a-z0-9]+", "", suffix.lower())[:12] or "run"
    return f"SEASON-SIM-2027-{stamp}-{safe_suffix}"


def validate_run_id(run_id: str) -> str:
    value = (run_id or "").strip()
    if not value.startswith("SEASON-SIM-2027-"):
        raise ValueError(
            f"Run ID must start with SEASON-SIM-2027-: got {run_id!r}"
        )
    if len(value) < 20 or len(value) > 80:
        raise ValueError(f"Run ID length out of bounds: {run_id!r}")
    return value


def run_marker(run_id: str) -> str:
    """Text stamped into Notes / debug fields where writable."""
    rid = validate_run_id(run_id)
    return f"{RUN_MARKER_PREFIX}|{rid}"


def marker_matches(text: str | None, run_id: str) -> bool:
    if not text:
        return False
    return run_marker(run_id) in str(text)


def extract_run_ids(text: str | None) -> list[str]:
    if not text:
        return []
    return re.findall(r"SEASON-SIM-2027-[A-Za-z0-9\-]+", str(text))


@dataclass
class CreatedRecord:
    table: str
    record_id: str
    dedupe_key: str = ""
    notes: str = ""
    fields_snapshot: dict[str, Any] = field(default_factory=dict)


@dataclass
class RunRegistry:
    run_id: str
    created_at: str
    athlete_name: str = "Athlete 1"
    enrollment_id: str = ""
    athlete_id: str = ""
    status: str = "planned"  # planned | running | paused | complete | failed
    last_completed_step: str = ""
    pause_reason: str = ""
    records: list[CreatedRecord] = field(default_factory=list)
    email_events: list[dict[str, Any]] = field(default_factory=list)
    meta: dict[str, Any] = field(default_factory=dict)

    def add(
        self,
        table: str,
        record_id: str,
        *,
        dedupe_key: str = "",
        notes: str = "",
        fields_snapshot: dict[str, Any] | None = None,
    ) -> None:
        if not record_id.startswith("rec"):
            raise ValueError(f"Invalid Airtable record id: {record_id!r}")
        existing = self.find_by_dedupe_key(dedupe_key) if dedupe_key else None
        if existing:
            # Idempotent: keep first registration; refresh snapshot if provided.
            if fields_snapshot:
                for row in self.records:
                    if row.dedupe_key == dedupe_key:
                        row.fields_snapshot = fields_snapshot
                        row.record_id = record_id
                        break
            return
        self.records.append(
            CreatedRecord(
                table=table,
                record_id=record_id,
                dedupe_key=dedupe_key,
                notes=notes,
                fields_snapshot=fields_snapshot or {},
            )
        )

    def find_by_dedupe_key(self, dedupe_key: str) -> str | None:
        if not dedupe_key:
            return None
        for row in self.records:
            if row.dedupe_key == dedupe_key:
                return row.record_id
        return None

    def has_dedupe_key(self, dedupe_key: str) -> bool:
        return self.find_by_dedupe_key(dedupe_key) is not None

    def ids_by_table(self) -> dict[str, list[str]]:
        out: dict[str, list[str]] = {}
        for row in self.records:
            out.setdefault(row.table, []).append(row.record_id)
        return out

    def all_record_ids(self) -> set[str]:
        return {r.record_id for r in self.records}

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "created_at": self.created_at,
            "athlete_name": self.athlete_name,
            "enrollment_id": self.enrollment_id,
            "athlete_id": self.athlete_id,
            "status": self.status,
            "last_completed_step": self.last_completed_step,
            "pause_reason": self.pause_reason,
            "records": [asdict(r) for r in self.records],
            "email_events": list(self.email_events),
            "meta": dict(self.meta),
            "ids_by_table": self.ids_by_table(),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "RunRegistry":
        reg = cls(
            run_id=validate_run_id(data["run_id"]),
            created_at=str(data.get("created_at") or ""),
            athlete_name=str(data.get("athlete_name") or "Athlete 1"),
            enrollment_id=str(data.get("enrollment_id") or ""),
            athlete_id=str(data.get("athlete_id") or ""),
            status=str(data.get("status") or "planned"),
            last_completed_step=str(data.get("last_completed_step") or ""),
            pause_reason=str(data.get("pause_reason") or ""),
            email_events=list(data.get("email_events") or []),
            meta=dict(data.get("meta") or {}),
        )
        for row in data.get("records") or []:
            reg.add(
                row["table"],
                row["record_id"],
                dedupe_key=row.get("dedupe_key") or "",
                notes=row.get("notes") or "",
                fields_snapshot=row.get("fields_snapshot") or {},
            )
        return reg


def registry_path(base_dir: Path, run_id: str) -> Path:
    safe = validate_run_id(run_id).replace(":", "_")
    return base_dir / f"{safe}.json"


def save_registry(reg: RunRegistry, base_dir: Path) -> Path:
    base_dir.mkdir(parents=True, exist_ok=True)
    path = registry_path(base_dir, reg.run_id)
    path.write_text(json.dumps(reg.to_dict(), indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return path


def load_registry(base_dir: Path, run_id: str) -> RunRegistry:
    path = registry_path(base_dir, run_id)
    if not path.exists():
        raise FileNotFoundError(f"No local registry for run_id={run_id}: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    return RunRegistry.from_dict(data)


def filter_records_for_run(
    records: list[dict[str, Any]],
    run_id: str,
    *,
    text_fields: Sequence[str] | None = None,
    allowlist_ids: set[str] | None = None,
) -> list[dict[str, Any]]:
    """Keep only records that match run marker text and/or local allowlist."""
    fields = tuple(text_fields or ())
    marker = run_marker(run_id)
    out: list[dict[str, Any]] = []
    for rec in records:
        rid = rec.get("id") or ""
        if allowlist_ids is not None and rid in allowlist_ids:
            out.append(rec)
            continue
        f = rec.get("fields") or {}
        blob = " ".join(str(f.get(name) or "") for name in fields)
        if marker in blob:
            out.append(rec)
    return out
