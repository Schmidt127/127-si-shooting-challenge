"""Live Write Contract Validation — schema-driven gate before Season Sim writes.

Primary source of truth: Airtable Meta API field types (not a static deny list).
``NEVER_WRITE_FIELDS`` remains defense-in-depth in the writer; this module
independently refuses any create/update field that Meta marks as computed /
read-only, and validates value shapes against live field types.

Does not write to Airtable. Does not mutate existing run registries.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable, Sequence

from .constants import (
    DEFAULT_BASE_ID,
    TRANSACTIONAL_TABLES,
)
from .clock_override import (
    PERFECT_WEEK_MANUAL_EXCEPTION_FIELD,
    SEASON_SIM_CLOCK_NOW_FIELD,
    SEASON_SIM_TEST_RECORD_FIELD,
    SEASON_SIM_TEST_SUBMITTED_AT_FIELD,
    VIDEO_UPLOAD_NOTE_FIELD,
)
from .execute import build_intended_writes
from .season_policy import EXPECTED_ACTIVE_PHA_COUNT
from .simulation_clock import SimulationClock
from .video_feedback_contract import SIM_VIDEO_PLACEHOLDER_URL
from .writer import NEVER_WRITE_FIELDS

# Retired DEV base — refuse if client points here.
RETIRED_DEV_BASE_ID = "appTetnuCZlCZdTCT"

# Tables the three-athlete execute path can create/update (or expect via pipeline).
CONTRACT_WRITE_TABLES = (
    "Athletes",
    "Enrollments",
    "Weekly Athlete Summary",
    "Zoom Meetings",
    "Submissions",
    "Submission Assets",
    "Homework Completions",
    "Video Feedback",
    "Zoom Attendance",
    "Email Handoff Queue",
    # Automations create these; harness may update/re-arm in settlement paths.
    "XP Events",
    "Athlete Achievement Unlocks",
    "Streak Occurrences",
)

# Meta types Airtable refuses on write (computed / system).
COMPUTED_FIELD_TYPES = frozenset(
    {
        "formula",
        "rollup",
        "count",
        "multipleLookupValues",
        "lookup",
        "createdTime",
        "lastModifiedTime",
        "createdBy",
        "lastModifiedBy",
        "autoNumber",
        "button",
        "externalSyncSource",
        "aiText",
    }
)

# Ops that are not Airtable create/update payloads.
NON_WRITE_OPS = frozenset({"expect_pipeline", "plan", "note", "expect"})

# Plan placeholders in intended writes (resolved at execute time).
_PLACEHOLDER_RE = re.compile(r"^<[^>]+>$")
_SIM_TOKEN_RE = re.compile(r"^__SIM_[A-Z0-9_]+__$")
_REC_ID_RE = re.compile(r"^rec[A-Za-z0-9]{14}$")
_DATE_ONLY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_DATETIME_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:?\d{2})?)?$"
)

FORBIDDEN_ATTACHMENT_HOST_FRAGMENTS = (
    "invalid.example",
    "example.com/season-sim",
    "placeholder",
)

SEASON_SIM_REQUIRED_SUBMISSION_FIELDS: dict[str, set[str]] = {
    SEASON_SIM_TEST_RECORD_FIELD: {"checkbox"},
    SEASON_SIM_CLOCK_NOW_FIELD: {"date", "dateTime"},
    SEASON_SIM_TEST_SUBMITTED_AT_FIELD: {"dateTime"},
    VIDEO_UPLOAD_NOTE_FIELD: {"singleLineText", "multilineText", "richText"},
    PERFECT_WEEK_MANUAL_EXCEPTION_FIELD: {"checkbox"},
}

EXPECTED_PERFECT_SEASON_XP = 4910
EXPECTED_FINAL_LEVEL = "G.O.A.T."
EXPECTED_PRODUCTION_ZOOM_COUNT = 2
EXPECTED_WEEKS_COUNT = 10

# Authoritative 2026–2027 Production program Zoom meetings (not disposable sim rows).
CANONICAL_PRODUCTION_ZOOM_MEETING_IDS: frozenset[str] = frozenset(
    {
        "recMFP2x5LDqea9ax",  # Introduction to the Challenge — May 2, 2027 (Week 1)
        "recb9EjQIJVzaRpZa",  # Motivation for a Strong Finish — Jun 13, 2027 (Week 7)
    }
)
CANONICAL_PRODUCTION_ZOOM_LABELS: dict[str, str] = {
    "recMFP2x5LDqea9ax": "Introduction to the Challenge",
    "recb9EjQIJVzaRpZa": "Motivation for a Strong Finish",
}

# Perfect-athlete Zoom XP model (oracle).
EXPECTED_ZOOM_LIVE_XP = 60
EXPECTED_ZOOM_RECORDING_XP = 30
EXPECTED_ZOOM_TOTAL_XP = 90
EXPECTED_ZOOM_BONUS_2_XP = 0
EXPECTED_ZOOM_BONUS_3_XP = 0
EXPECTED_CURRENT_RUN_DISPOSABLE_ZOOM_COUNT = 2


@dataclass
class ContractViolation:
    table: str
    field: str
    field_type: str
    op: str
    dedupe_key: str
    value_repr: str
    value_type: str
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class LiveWriteContractReport:
    ok: bool
    base_id: str
    generated_at: str
    tables_validated: list[str] = field(default_factory=list)
    writes_checked: int = 0
    fields_checked: int = 0
    violations: list[ContractViolation] = field(default_factory=list)
    structural: dict[str, Any] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "status": "PASS" if self.ok else "FAIL",
            "base_id": self.base_id,
            "generated_at": self.generated_at,
            "tables_validated": list(self.tables_validated),
            "writes_checked": self.writes_checked,
            "fields_checked": self.fields_checked,
            "violations": [v.to_dict() for v in self.violations],
            "structural": dict(self.structural),
            "notes": list(self.notes),
        }

    def summary_line(self) -> str:
        return f"Live write contract: {'PASS' if self.ok else 'FAIL'}"

    def detail_lines(self) -> list[str]:
        lines = [self.summary_line()]
        if self.ok:
            lines.append(
                f"  Checked {self.writes_checked} write ops / "
                f"{self.fields_checked} fields across "
                f"{len(self.tables_validated)} tables."
            )
            return lines
        for v in self.violations[:50]:
            lines.append(
                f"  - [{v.table}.{v.field}] type={v.field_type or '?'} "
                f"op={v.op} value_type={v.value_type} "
                f"value={v.value_repr} — {v.reason}"
            )
            if v.dedupe_key:
                lines.append(f"      dedupe_key={v.dedupe_key}")
        if len(self.violations) > 50:
            lines.append(f"  … {len(self.violations) - 50} more")
        return lines


class LiveWriteContractError(RuntimeError):
    """Raised when execute must refuse writes due to contract failure."""

    def __init__(self, report: LiveWriteContractReport):
        self.report = report
        super().__init__(
            "Live write contract FAILED — refusing Airtable writes. "
            + "; ".join(
                f"{v.table}.{v.field}: {v.reason}" for v in report.violations[:8]
            )
        )


def _value_repr(value: Any, *, limit: int = 120) -> str:
    try:
        text = json.dumps(value, default=str)
    except TypeError:
        text = repr(value)
    if len(text) > limit:
        return text[: limit - 3] + "..."
    return text


def _field_index(meta_tables: Sequence[dict[str, Any]]) -> dict[str, dict[str, dict[str, Any]]]:
    """table_name -> field_name -> field meta dict."""
    out: dict[str, dict[str, dict[str, Any]]] = {}
    for table in meta_tables:
        tname = str(table.get("name") or "")
        if not tname:
            continue
        fields: dict[str, dict[str, Any]] = {}
        for fld in table.get("fields") or []:
            fname = str(fld.get("name") or "")
            if fname:
                fields[fname] = fld
        out[tname] = fields
    return out


def _table_id_index(meta_tables: Sequence[dict[str, Any]]) -> dict[str, str]:
    return {
        str(t.get("name") or ""): str(t.get("id") or "")
        for t in meta_tables
        if t.get("name")
    }


def is_computed_field(field_meta: dict[str, Any] | None) -> bool:
    if not field_meta:
        return False
    return str(field_meta.get("type") or "") in COMPUTED_FIELD_TYPES


def is_writable_field_type(field_meta: dict[str, Any] | None) -> bool:
    if not field_meta:
        return False
    ftype = str(field_meta.get("type") or "")
    if not ftype or ftype in COMPUTED_FIELD_TYPES:
        return False
    return True


def _single_select_choices(field_meta: dict[str, Any]) -> set[str]:
    opts = field_meta.get("options") or {}
    choices = opts.get("choices") or []
    names: set[str] = set()
    for c in choices:
        if isinstance(c, dict) and c.get("name"):
            names.add(str(c["name"]))
        elif isinstance(c, str):
            names.add(c)
    return names


def _linked_table_id(field_meta: dict[str, Any]) -> str:
    opts = field_meta.get("options") or {}
    return str(opts.get("linkedTableId") or "")


def _is_plan_placeholder(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    return bool(_PLACEHOLDER_RE.match(value) or _SIM_TOKEN_RE.match(value))


def _looks_like_rec_id(value: Any) -> bool:
    return isinstance(value, str) and bool(_REC_ID_RE.match(value))


def validate_attachment_value(
    value: Any,
    *,
    table: str,
    field_name: str,
    op: str,
    dedupe_key: str,
) -> list[ContractViolation]:
    """Reject synthetic / offline-only attachment objects; allow legal URL shape."""
    violations: list[ContractViolation] = []

    def _fail(reason: str, val: Any) -> None:
        violations.append(
            ContractViolation(
                table=table,
                field=field_name,
                field_type="multipleAttachments",
                op=op,
                dedupe_key=dedupe_key,
                value_repr=_value_repr(val),
                value_type=type(val).__name__,
                reason=reason,
            )
        )

    if value is None:
        return violations
    if not isinstance(value, list):
        _fail("attachment value must be a list of objects", value)
        return violations
    for item in value:
        if not isinstance(item, dict):
            _fail("each attachment must be an object", item)
            continue
        # Live create must not invent Airtable attachment ids.
        if "id" in item and item.get("id"):
            aid = str(item.get("id"))
            if not aid.startswith("att"):
                _fail(
                    "synthetic attachment id is not writable "
                    "(Airtable assigns att… ids; offline fixtures only)",
                    item,
                )
        url = item.get("url")
        if not url or not isinstance(url, str):
            _fail("attachment object requires string url", item)
            continue
        lower = url.lower()
        if SIM_VIDEO_PLACEHOLDER_URL in url or "invalid.example" in lower:
            _fail("forbidden placeholder attachment URL (invalid.example)", item)
        for frag in FORBIDDEN_ATTACHMENT_HOST_FRAGMENTS:
            if frag in lower and "lambda-url" not in lower:
                _fail(f"forbidden attachment URL fragment {frag!r}", item)
                break
        if not (url.startswith("https://") or url.startswith("http://")):
            _fail("attachment url must be http(s)", item)
        # filename optional but must be string when present
        if "filename" in item and item["filename"] is not None:
            if not isinstance(item["filename"], str):
                _fail("attachment filename must be a string", item)
    return violations


def validate_field_value(
    *,
    table: str,
    field_name: str,
    value: Any,
    field_meta: dict[str, Any] | None,
    op: str,
    dedupe_key: str,
    table_ids: dict[str, str] | None = None,
) -> list[ContractViolation]:
    """Validate one field value against live Meta field type."""
    violations: list[ContractViolation] = []
    ftype = str((field_meta or {}).get("type") or "")

    def _fail(reason: str) -> None:
        violations.append(
            ContractViolation(
                table=table,
                field=field_name,
                field_type=ftype,
                op=op,
                dedupe_key=dedupe_key,
                value_repr=_value_repr(value),
                value_type=type(value).__name__,
                reason=reason,
            )
        )

    if field_meta is None:
        _fail("field does not exist in live Production schema")
        return violations

    if is_computed_field(field_meta):
        _fail(f"field is computed/read-only (type={ftype})")
        return violations

    if not is_writable_field_type(field_meta):
        _fail(f"field type is not writable (type={ftype})")
        return violations

    # Defense-in-depth: known writer bans
    if field_name in NEVER_WRITE_FIELDS:
        _fail("field is in NEVER_WRITE_FIELDS defense list")
        return violations

    if ftype == "multipleAttachments":
        return validate_attachment_value(
            value, table=table, field_name=field_name, op=op, dedupe_key=dedupe_key
        )

    if ftype == "checkbox":
        if not isinstance(value, bool):
            _fail("checkbox requires bool")
        return violations

    if ftype in {"number", "currency", "percent", "duration", "rating"}:
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            _fail(f"{ftype} requires number")
        return violations

    if ftype in {
        "singleLineText",
        "multilineText",
        "richText",
        "email",
        "url",
        "phoneNumber",
        "barcode",
    }:
        if not isinstance(value, str):
            _fail(f"{ftype} requires string")
        elif ftype == "email" and value and "@" not in value:
            _fail("email value must contain @")
        elif "invalid.example" in value.lower():
            _fail("forbidden invalid.example string")
        return violations

    if ftype == "singleSelect":
        if isinstance(value, dict) and "name" in value:
            choice = str(value["name"])
        elif isinstance(value, str):
            choice = value
        else:
            _fail("singleSelect requires string choice name")
            return violations
        choices = _single_select_choices(field_meta)
        if choices and choice not in choices:
            _fail(f"invalid singleSelect option {choice!r}; live choices={sorted(choices)[:20]}")
        return violations

    if ftype == "multipleSelects":
        if not isinstance(value, list):
            _fail("multipleSelects requires list of choice names")
            return violations
        choices = _single_select_choices(field_meta)
        for item in value:
            name = item["name"] if isinstance(item, dict) and "name" in item else item
            if not isinstance(name, str):
                _fail("multipleSelects items must be strings")
                break
            if choices and name not in choices:
                _fail(f"invalid multipleSelects option {name!r}")
                break
        return violations

    if ftype == "multipleRecordLinks":
        if not isinstance(value, list):
            _fail("linked record field requires list of record ids")
            return violations
        for item in value:
            if _is_plan_placeholder(item):
                continue
            if not isinstance(item, str):
                _fail("linked record ids must be strings")
                break
            if not (_looks_like_rec_id(item) or item.startswith("rec")):
                _fail(f"invalid linked record id shape {item!r}")
                break
        # Linked table target sanity (id present in schema index).
        linked = _linked_table_id(field_meta)
        if linked and table_ids:
            if linked not in set(table_ids.values()):
                _fail(f"linkedTableId {linked} not found in live base tables")
        return violations

    if ftype == "date":
        if isinstance(value, date) and not isinstance(value, datetime):
            return violations
        if isinstance(value, str) and _DATE_ONLY_RE.match(value):
            return violations
        _fail("date requires YYYY-MM-DD string (or date object)")
        return violations

    if ftype == "dateTime":
        if isinstance(value, datetime):
            return violations
        if isinstance(value, str) and (_DATETIME_RE.match(value) or _DATE_ONLY_RE.match(value)):
            return violations
        _fail("dateTime requires ISO datetime/date string")
        return violations

    # Other writable types (collaborator, etc.) — accept without deep validation.
    return violations


def validate_write_payload(
    *,
    table: str,
    op: str,
    fields: dict[str, Any],
    schema: dict[str, dict[str, dict[str, Any]]],
    table_ids: dict[str, str] | None = None,
    dedupe_key: str = "",
) -> list[ContractViolation]:
    """Validate all fields in one create/update payload."""
    if op in NON_WRITE_OPS:
        return []
    if op not in {"create", "update", "patch"}:
        # Unknown ops with fields still validated if fields present.
        if not fields:
            return []

    violations: list[ContractViolation] = []
    table_fields = schema.get(table)
    if table_fields is None:
        violations.append(
            ContractViolation(
                table=table,
                field="(table)",
                field_type="",
                op=op,
                dedupe_key=dedupe_key,
                value_repr="",
                value_type="",
                reason="table does not exist in live Production schema",
            )
        )
        return violations

    for fname, value in (fields or {}).items():
        violations.extend(
            validate_field_value(
                table=table,
                field_name=fname,
                value=value,
                field_meta=table_fields.get(fname),
                op=op,
                dedupe_key=dedupe_key,
                table_ids=table_ids,
            )
        )
    return violations


def validate_intended_writes(
    writes: Sequence[dict[str, Any]],
    meta_tables: Sequence[dict[str, Any]],
    *,
    base_id: str = DEFAULT_BASE_ID,
) -> LiveWriteContractReport:
    """Validate a list of intended create/update payloads against Meta schema."""
    from datetime import timezone

    schema = _field_index(meta_tables)
    table_ids = _table_id_index(meta_tables)
    violations: list[ContractViolation] = []
    tables_seen: set[str] = set()
    writes_checked = 0
    fields_checked = 0

    for w in writes:
        table = str(w.get("table") or "")
        op = str(w.get("op") or "")
        if not table or table == "(none)" or op in NON_WRITE_OPS:
            continue
        fields = w.get("fields")
        if not isinstance(fields, dict):
            continue
        writes_checked += 1
        fields_checked += len(fields)
        tables_seen.add(table)
        violations.extend(
            validate_write_payload(
                table=table,
                op=op,
                fields=fields,
                schema=schema,
                table_ids=table_ids,
                dedupe_key=str(w.get("dedupe_key") or ""),
            )
        )

    return LiveWriteContractReport(
        ok=len(violations) == 0,
        base_id=base_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        tables_validated=sorted(tables_seen),
        writes_checked=writes_checked,
        fields_checked=fields_checked,
        violations=violations,
    )


def validate_season_sim_fields(
    meta_tables: Sequence[dict[str, Any]],
) -> list[ContractViolation]:
    """Ensure Season Sim gate fields exist with expected writable types."""
    schema = _field_index(meta_tables)
    sub = schema.get("Submissions") or {}
    violations: list[ContractViolation] = []
    for fname, allowed_types in SEASON_SIM_REQUIRED_SUBMISSION_FIELDS.items():
        meta = sub.get(fname)
        if meta is None:
            violations.append(
                ContractViolation(
                    table="Submissions",
                    field=fname,
                    field_type="",
                    op="schema",
                    dedupe_key="",
                    value_repr="",
                    value_type="",
                    reason="required Season Sim field missing from live schema",
                )
            )
            continue
        ftype = str(meta.get("type") or "")
        if ftype not in allowed_types:
            violations.append(
                ContractViolation(
                    table="Submissions",
                    field=fname,
                    field_type=ftype,
                    op="schema",
                    dedupe_key="",
                    value_repr="",
                    value_type="",
                    reason=f"expected type in {sorted(allowed_types)}; got {ftype!r}",
                )
            )
    return violations


def validate_base_id(base_id: str | None) -> list[ContractViolation]:
    violations: list[ContractViolation] = []
    bid = str(base_id or "")
    if bid == RETIRED_DEV_BASE_ID:
        violations.append(
            ContractViolation(
                table="(base)",
                field="base_id",
                field_type="",
                op="schema",
                dedupe_key="",
                value_repr=bid,
                value_type="str",
                reason="retired DEV base — Production-only (appn84sqPw03zEbTT)",
            )
        )
    elif bid and bid != DEFAULT_BASE_ID:
        violations.append(
            ContractViolation(
                table="(base)",
                field="base_id",
                field_type="",
                op="schema",
                dedupe_key="",
                value_repr=bid,
                value_type="str",
                reason=f"unexpected base_id; expected Production {DEFAULT_BASE_ID}",
            )
        )
    return violations


def load_oracle_expectations() -> dict[str, Any]:
    path = Path(__file__).resolve().parent / "expected_perfect_season_xp.json"
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _oracle_source_expected_xp(oracle: dict[str, Any], source: str) -> int | None:
    for block_name in (
        "per_source_table",
        "source_by_source",
        "xp_by_source",
        "source_totals",
        "source_by_source_breakdown",
        "xp_sources",
        "sources",
    ):
        block = oracle.get(block_name)
        if not isinstance(block, list):
            continue
        for row in block:
            if not isinstance(row, dict):
                continue
            key = str(
                row.get("xp_source") or row.get("source") or row.get("rule_key") or ""
            )
            if key == source and row.get("expected_xp") is not None:
                return int(row["expected_xp"])
    return None


def validate_oracle_zoom_model(
    oracle: dict[str, Any] | None = None,
) -> tuple[dict[str, Any], list[ContractViolation]]:
    """Perfect season Zoom model: 60 live + 30 recording = 90; no Bonus 2/3; season 4910."""
    violations: list[ContractViolation] = []
    oracle = oracle if oracle is not None else load_oracle_expectations()
    live = _oracle_source_expected_xp(oracle, "ZOOM_ATTEND_BASE")
    rec = _oracle_source_expected_xp(oracle, "ZOOM_RECORDING_CREDIT")
    b2 = _oracle_source_expected_xp(oracle, "ZOOM_ATTEND_BONUS_2")
    b3 = _oracle_source_expected_xp(oracle, "ZOOM_ATTEND_BONUS_3")
    # Bonus rows may be present with expected_xp 0 or units 0
    if b2 is None:
        b2 = 0
    if b3 is None:
        b3 = 0
    detail = {
        "live_xp": live,
        "recording_xp": rec,
        "bonus_2_xp": b2,
        "bonus_3_xp": b3,
        "zoom_total_xp": (live or 0) + (rec or 0) + (b2 or 0) + (b3 or 0),
        "expected_live_xp": EXPECTED_ZOOM_LIVE_XP,
        "expected_recording_xp": EXPECTED_ZOOM_RECORDING_XP,
        "expected_zoom_total_xp": EXPECTED_ZOOM_TOTAL_XP,
        "season_xp": oracle.get("expected_perfect_season_xp"),
    }
    checks = [
        (live, EXPECTED_ZOOM_LIVE_XP, "ZOOM_ATTEND_BASE"),
        (rec, EXPECTED_ZOOM_RECORDING_XP, "ZOOM_RECORDING_CREDIT"),
        (b2, EXPECTED_ZOOM_BONUS_2_XP, "ZOOM_ATTEND_BONUS_2"),
        (b3, EXPECTED_ZOOM_BONUS_3_XP, "ZOOM_ATTEND_BONUS_3"),
    ]
    for observed, expected, label in checks:
        if observed is None:
            violations.append(
                ContractViolation(
                    table="(oracle)",
                    field=label,
                    field_type="",
                    op="structural",
                    dedupe_key="",
                    value_repr="",
                    value_type="",
                    reason=f"oracle missing expected XP for {label}",
                )
            )
        elif int(observed) != int(expected):
            violations.append(
                ContractViolation(
                    table="(oracle)",
                    field=label,
                    field_type="",
                    op="structural",
                    dedupe_key="",
                    value_repr=str(observed),
                    value_type="int",
                    reason=f"oracle {label} XP must be {expected}; found {observed}",
                )
            )
    zoom_total = (live or 0) + (rec or 0) + (b2 or 0) + (b3 or 0)
    if live is not None and rec is not None and zoom_total != EXPECTED_ZOOM_TOTAL_XP:
        violations.append(
            ContractViolation(
                table="(oracle)",
                field="zoom_total_xp",
                field_type="",
                op="structural",
                dedupe_key="",
                value_repr=str(zoom_total),
                value_type="int",
                reason=f"oracle Zoom total must be {EXPECTED_ZOOM_TOTAL_XP}; found {zoom_total}",
            )
        )
    return detail, violations


def registry_zoom_meeting_ids(
    registry_dir: Path | None,
    shared_run_id: str,
) -> set[str]:
    """Collect Zoom Meeting RIDs owned by profile registries under a shared three-athlete run."""
    if registry_dir is None or not shared_run_id or not Path(registry_dir).is_dir():
        return set()
    from .execute_three import PROFILE_ORDER, profile_registry_run_id
    from .run_registry import load_registry

    ids: set[str] = set()
    base = Path(registry_dir)
    for profile in PROFILE_ORDER:
        rid = profile_registry_run_id(shared_run_id, profile)
        path = base / f"{rid}.json"
        if not path.is_file():
            # Also accept registries that use shared_run_id as filename stem prefix.
            continue
        try:
            reg = load_registry(base, rid)
        except Exception:  # noqa: BLE001
            continue
        for zid in reg.ids_by_table().get("Zoom Meetings") or []:
            if isinstance(zid, str) and zid.startswith("rec"):
                ids.add(zid)
        meta = reg.meta or {}
        for key in ("zoom_live_meeting_id", "zoom_recorded_meeting_id"):
            zid = meta.get(key)
            if isinstance(zid, str) and zid.startswith("rec"):
                ids.add(zid)
    # Fallback: any registry file whose name starts with shared_run_id
    if not ids:
        for path in base.glob(f"{shared_run_id}*.json"):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                continue
            for row in data.get("records") or []:
                if row.get("table") == "Zoom Meetings" and str(row.get("record_id") or "").startswith(
                    "rec"
                ):
                    ids.add(str(row["record_id"]))
            meta = data.get("meta") or {}
            for key in ("zoom_live_meeting_id", "zoom_recorded_meeting_id"):
                zid = meta.get(key)
                if isinstance(zid, str) and zid.startswith("rec"):
                    ids.add(zid)
    return ids


def discover_paused_three_athlete_run_id(registry_dir: Path | None) -> str:
    """Pick the paused three-athlete shared run_id when exactly one is active/paused."""
    if registry_dir is None or not Path(registry_dir).is_dir():
        return ""
    found: set[str] = set()
    for path in Path(registry_dir).glob("SEASON-SIM-2027-*-threeathlete*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            continue
        status = str(data.get("status") or "")
        if status not in {"paused", "running"}:
            continue
        shared = str((data.get("meta") or {}).get("shared_run_id") or "")
        rid = str(data.get("run_id") or "")
        if shared and "threeathlete" in shared:
            found.add(shared)
        elif "threeathlete" in rid and "__" not in rid:
            found.add(rid)
        elif "threeathlete" in rid:
            # profile registry: strip __athleteN suffix
            shared2 = rid.split("__", 1)[0]
            if "threeathlete" in shared2:
                found.add(shared2)
    if len(found) == 1:
        return next(iter(found))
    return ""


def is_season_sim_zoom_name(meeting_name: str, display: str = "") -> bool:
    text = f"{meeting_name} {display}"
    return "SEASON-SIM|" in text


def classify_zoom_meetings(
    *,
    live_meetings: Sequence[dict[str, Any]],
    registry_sim_ids: set[str],
    shared_run_id: str = "",
) -> dict[str, Any]:
    """Classify non-cancelled Zoom rows into canonical / current-run disposable / unexpected."""
    canonical_present: list[str] = []
    current_run_disposable: list[str] = []
    unexpected: list[dict[str, str]] = []
    other_run_sim: list[str] = []

    live_ids = {str(m.get("record_id") or m.get("id") or "") for m in live_meetings}

    for mid in sorted(CANONICAL_PRODUCTION_ZOOM_MEETING_IDS):
        if mid in live_ids:
            canonical_present.append(mid)

    for meeting in live_meetings:
        mid = str(meeting.get("record_id") or meeting.get("id") or "")
        if not mid:
            continue
        name = str(meeting.get("meeting_name") or meeting.get("Meeting Name") or "")
        display = str(meeting.get("display") or meeting.get("Meeting Display Name") or "")
        if mid in CANONICAL_PRODUCTION_ZOOM_MEETING_IDS:
            continue
        if mid in registry_sim_ids:
            current_run_disposable.append(mid)
            continue
        if is_season_sim_zoom_name(name, display):
            # Unregistered only fails when clearly owned by *this* shared run.
            if shared_run_id and shared_run_id in f"{name} {display}":
                unexpected.append(
                    {
                        "record_id": mid,
                        "reason": "unregistered Season Sim Zoom for current run",
                        "name": name or display,
                    }
                )
            else:
                # Leftover disposable meetings from other runs — report, do not fail gate.
                other_run_sim.append(mid)
            continue
        unexpected.append(
            {
                "record_id": mid,
                "reason": "unexpected non-canonical Zoom meeting",
                "name": name or display,
            }
        )

    # Registry claims a Zoom that is missing live
    missing_registry = sorted(registry_sim_ids - live_ids)

    missing_canonical = sorted(CANONICAL_PRODUCTION_ZOOM_MEETING_IDS - set(canonical_present))
    ok = (
        len(canonical_present) == EXPECTED_PRODUCTION_ZOOM_COUNT
        and not missing_canonical
        and set(canonical_present) == CANONICAL_PRODUCTION_ZOOM_MEETING_IDS
        and len(current_run_disposable) == len(registry_sim_ids)
        and set(current_run_disposable) == registry_sim_ids
        and (
            not registry_sim_ids
            or len(current_run_disposable) == EXPECTED_CURRENT_RUN_DISPOSABLE_ZOOM_COUNT
        )
        and not unexpected
        and not missing_registry
    )
    # When no registry context (fresh run), disposable may be 0 — still require canonical exactly 2
    # and unexpected must not include third canonical; other_run_sim still unexpected.
    if not registry_sim_ids:
        ok = (
            len(canonical_present) == EXPECTED_PRODUCTION_ZOOM_COUNT
            and set(canonical_present) == CANONICAL_PRODUCTION_ZOOM_MEETING_IDS
            and not unexpected
        )

    summary = (
        f"Zoom contract: {'PASS' if ok else 'FAIL'} — "
        f"canonical={len(canonical_present)}, "
        f"current-run disposable={len(current_run_disposable)}, "
        f"unexpected={len(unexpected)}"
    )
    return {
        "ok": ok,
        "summary": summary,
        "canonical_expected_ids": sorted(CANONICAL_PRODUCTION_ZOOM_MEETING_IDS),
        "canonical_present_ids": canonical_present,
        "canonical_missing_ids": missing_canonical,
        "current_run_disposable_ids": sorted(current_run_disposable),
        "registry_sim_ids": sorted(registry_sim_ids),
        "registry_missing_live_ids": missing_registry,
        "unexpected": unexpected,
        "other_run_sim_ids": other_run_sim,
        "live_meeting_count": len(live_meetings),
    }


def validate_zoom_contract(
    *,
    live_meetings: Sequence[dict[str, Any]] | None,
    registry_sim_ids: set[str] | None = None,
    shared_run_id: str = "",
) -> tuple[dict[str, Any], list[ContractViolation]]:
    """Hard Zoom gate: exactly 2 canonical RIDs; registry disposable matched; unexpected=0."""
    violations: list[ContractViolation] = []
    if live_meetings is None:
        # Offline / payload-only paths may omit catalog; live preflight + execute always pass it.
        return {
            "ok": True,
            "skipped": True,
            "summary": "Zoom contract: SKIPPED — no live meetings provided",
            "canonical_present_ids": [],
            "current_run_disposable_ids": [],
            "unexpected": [],
        }, []

    classified = classify_zoom_meetings(
        live_meetings=live_meetings,
        registry_sim_ids=set(registry_sim_ids or []),
        shared_run_id=shared_run_id,
    )
    if classified["canonical_missing_ids"]:
        violations.append(
            ContractViolation(
                table="Zoom Meetings",
                field="(canonical)",
                field_type="",
                op="structural",
                dedupe_key="",
                value_repr=",".join(classified["canonical_missing_ids"]),
                value_type="list",
                reason=(
                    "missing canonical 2026-2027 Production Zoom meeting(s): "
                    + ", ".join(
                        f"{rid} ({CANONICAL_PRODUCTION_ZOOM_LABELS.get(rid, '?')})"
                        for rid in classified["canonical_missing_ids"]
                    )
                ),
            )
        )
    if len(classified["canonical_present_ids"]) != EXPECTED_PRODUCTION_ZOOM_COUNT:
        violations.append(
            ContractViolation(
                table="Zoom Meetings",
                field="(canonical)",
                field_type="",
                op="structural",
                dedupe_key="",
                value_repr=str(len(classified["canonical_present_ids"])),
                value_type="int",
                reason=(
                    f"canonical Production Zoom meetings must be exactly "
                    f"{EXPECTED_PRODUCTION_ZOOM_COUNT}; found "
                    f"{len(classified['canonical_present_ids'])}"
                ),
            )
        )
    reg_ids = set(registry_sim_ids or [])
    if reg_ids:
        if set(classified["current_run_disposable_ids"]) != reg_ids:
            violations.append(
                ContractViolation(
                    table="Zoom Meetings",
                    field="(disposable)",
                    field_type="",
                    op="structural",
                    dedupe_key="",
                    value_repr=str(classified["current_run_disposable_ids"]),
                    value_type="list",
                    reason=(
                        "current-run disposable Zoom RIDs must match registry exactly; "
                        f"registry={sorted(reg_ids)} live_owned="
                        f"{classified['current_run_disposable_ids']}"
                    ),
                )
            )
        if len(classified["current_run_disposable_ids"]) != EXPECTED_CURRENT_RUN_DISPOSABLE_ZOOM_COUNT:
            violations.append(
                ContractViolation(
                    table="Zoom Meetings",
                    field="(disposable)",
                    field_type="",
                    op="structural",
                    dedupe_key="",
                    value_repr=str(len(classified["current_run_disposable_ids"])),
                    value_type="int",
                    reason=(
                        f"current-run disposable Zoom meetings must be exactly "
                        f"{EXPECTED_CURRENT_RUN_DISPOSABLE_ZOOM_COUNT}; found "
                        f"{len(classified['current_run_disposable_ids'])}"
                    ),
                )
            )
    if classified["registry_missing_live_ids"]:
        violations.append(
            ContractViolation(
                table="Zoom Meetings",
                field="(disposable)",
                field_type="",
                op="structural",
                dedupe_key="",
                value_repr=",".join(classified["registry_missing_live_ids"]),
                value_type="list",
                reason="registry-owned Zoom meeting missing from live base",
            )
        )
    for row in classified["unexpected"]:
        violations.append(
            ContractViolation(
                table="Zoom Meetings",
                field="(unexpected)",
                field_type="",
                op="structural",
                dedupe_key="",
                value_repr=row.get("record_id", ""),
                value_type="str",
                reason=f"{row.get('reason')}: {row.get('record_id')} ({row.get('name')})",
            )
        )
    classified["ok"] = len(violations) == 0
    classified["summary"] = (
        f"Zoom contract: {'PASS' if classified['ok'] else 'FAIL'} — "
        f"canonical={len(classified['canonical_present_ids'])}, "
        f"current-run disposable={len(classified['current_run_disposable_ids'])}, "
        f"unexpected={len(classified['unexpected'])}"
    )
    return classified, violations


def validate_structural_assumptions(
    *,
    zoom_count: int | None = None,
    pha_count: int | None = None,
    weeks_count: int | None = None,
    oracle: dict[str, Any] | None = None,
    live_zoom_meetings: Sequence[dict[str, Any]] | None = None,
    registry_zoom_ids: set[str] | None = None,
    shared_run_id: str = "",
) -> tuple[dict[str, Any], list[ContractViolation]]:
    """PHA/Weeks/oracle + classified Zoom contract (not a loose Zoom count)."""
    violations: list[ContractViolation] = []
    oracle = oracle if oracle is not None else load_oracle_expectations()
    structural: dict[str, Any] = {
        "expected_production_zoom_count": EXPECTED_PRODUCTION_ZOOM_COUNT,
        "expected_pha_count": EXPECTED_ACTIVE_PHA_COUNT,
        "expected_weeks_count": EXPECTED_WEEKS_COUNT,
        "expected_perfect_season_xp": EXPECTED_PERFECT_SEASON_XP,
        "expected_final_level": EXPECTED_FINAL_LEVEL,
        "observed_zoom_count": zoom_count,
        "observed_pha_count": pha_count,
        "observed_weeks_count": weeks_count,
        "oracle_xp": oracle.get("expected_perfect_season_xp"),
        "oracle_level": oracle.get("final_current_level"),
        "canonical_production_zoom_ids": sorted(CANONICAL_PRODUCTION_ZOOM_MEETING_IDS),
    }

    zoom_detail, zoom_violations = validate_zoom_contract(
        live_meetings=live_zoom_meetings,
        registry_sim_ids=registry_zoom_ids,
        shared_run_id=shared_run_id,
    )
    structural["zoom_contract"] = zoom_detail
    violations.extend(zoom_violations)

    zoom_xp_detail, zoom_xp_violations = validate_oracle_zoom_model(oracle)
    structural["zoom_xp_model"] = zoom_xp_detail
    violations.extend(zoom_xp_violations)

    if pha_count is not None and pha_count != EXPECTED_ACTIVE_PHA_COUNT:
        violations.append(
            ContractViolation(
                table="Program Homework Assignments",
                field="(catalog)",
                field_type="",
                op="structural",
                dedupe_key="",
                value_repr=str(pha_count),
                value_type="int",
                reason=(
                    f"expected {EXPECTED_ACTIVE_PHA_COUNT} active PHA; found {pha_count}"
                ),
            )
        )
    if weeks_count is not None and weeks_count != EXPECTED_WEEKS_COUNT:
        violations.append(
            ContractViolation(
                table="Weeks",
                field="(catalog)",
                field_type="",
                op="structural",
                dedupe_key="",
                value_repr=str(weeks_count),
                value_type="int",
                reason=f"expected {EXPECTED_WEEKS_COUNT} Weeks; found {weeks_count}",
            )
        )

    oxp = oracle.get("expected_perfect_season_xp")
    if oxp is not None and int(oxp) != EXPECTED_PERFECT_SEASON_XP:
        violations.append(
            ContractViolation(
                table="(oracle)",
                field="expected_perfect_season_xp",
                field_type="",
                op="structural",
                dedupe_key="",
                value_repr=str(oxp),
                value_type="int",
                reason=f"oracle XP must be {EXPECTED_PERFECT_SEASON_XP}",
            )
        )
    olev = oracle.get("final_current_level")
    if olev is not None and str(olev) != EXPECTED_FINAL_LEVEL:
        violations.append(
            ContractViolation(
                table="(oracle)",
                field="final_current_level",
                field_type="",
                op="structural",
                dedupe_key="",
                value_repr=str(olev),
                value_type="str",
                reason=f"oracle final level must be {EXPECTED_FINAL_LEVEL!r}",
            )
        )
    return structural, violations


def collect_three_athlete_intended_writes(
    scenarios: dict[str, Any],
    clock: SimulationClock,
    *,
    execute_contexts: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Build all intended create/update payloads for three profiles (no network)."""
    writes: list[dict[str, Any]] = []
    for profile, scenario in scenarios.items():
        ctx = None
        if execute_contexts:
            ctx = execute_contexts.get(profile)
        plan = build_intended_writes(scenario, clock, ctx=ctx)
        for w in plan:
            row = dict(w)
            row["profile"] = profile
            writes.append(row)
    return writes


def run_live_write_contract_validation(
    *,
    meta_tables: Sequence[dict[str, Any]],
    writes: Sequence[dict[str, Any]],
    base_id: str | None = None,
    zoom_count: int | None = None,
    pha_count: int | None = None,
    weeks_count: int | None = None,
    include_structural: bool = True,
    live_zoom_meetings: Sequence[dict[str, Any]] | None = None,
    registry_zoom_ids: set[str] | None = None,
    shared_run_id: str = "",
) -> LiveWriteContractReport:
    """Full contract check: base + Season Sim fields + payloads + structural."""
    from datetime import timezone

    bid = base_id or DEFAULT_BASE_ID
    violations: list[ContractViolation] = []
    notes: list[str] = [
        "Writability derived from Airtable Meta field types "
        f"(computed types: {', '.join(sorted(COMPUTED_FIELD_TYPES))}).",
        "NEVER_WRITE_FIELDS used only as defense-in-depth secondary check.",
        "Existing registry-owned records are not write payloads and are not validated as errors.",
    ]

    violations.extend(validate_base_id(bid))
    violations.extend(validate_season_sim_fields(meta_tables))

    payload_report = validate_intended_writes(writes, meta_tables, base_id=bid)
    violations.extend(payload_report.violations)

    structural: dict[str, Any] = {}
    if include_structural:
        structural, struct_violations = validate_structural_assumptions(
            zoom_count=zoom_count,
            pha_count=pha_count,
            weeks_count=weeks_count,
            live_zoom_meetings=live_zoom_meetings,
            registry_zoom_ids=registry_zoom_ids,
            shared_run_id=shared_run_id,
        )
        violations.extend(struct_violations)
        zc = (structural.get("zoom_contract") or {}).get("summary")
        if zc:
            notes.append(zc)

    # Ensure expected write tables exist in schema (even if no write this plan).
    schema = _field_index(meta_tables)
    for tname in CONTRACT_WRITE_TABLES:
        if tname not in schema and tname in TRANSACTIONAL_TABLES:
            # Soft note for tables not always written (XP Events etc.)
            if tname in {"XP Events", "Athlete Achievement Unlocks", "Streak Occurrences"}:
                notes.append(f"Table {tname} present={tname in schema} (automation-owned)")
            elif tname not in schema:
                violations.append(
                    ContractViolation(
                        table=tname,
                        field="(table)",
                        field_type="",
                        op="schema",
                        dedupe_key="",
                        value_repr="",
                        value_type="",
                        reason="expected sim write table missing from live schema",
                    )
                )

    tables = sorted(set(payload_report.tables_validated) | set(CONTRACT_WRITE_TABLES))
    return LiveWriteContractReport(
        ok=len(violations) == 0,
        base_id=bid,
        generated_at=datetime.now(timezone.utc).isoformat(),
        tables_validated=tables,
        writes_checked=payload_report.writes_checked,
        fields_checked=payload_report.fields_checked,
        violations=violations,
        structural=structural,
        notes=notes,
    )


def assert_live_write_contract_pass(report: LiveWriteContractReport) -> None:
    if report.ok:
        return
    raise LiveWriteContractError(report)


def build_contract_validation_for_client(
    client: Any,
    *,
    run_id: str,
    offline_fixture: bool = False,
    acknowledge_clock_override: bool = False,  # reserved; kept for API symmetry
    registry_dir: Path | str | None = None,
) -> LiveWriteContractReport:
    """Assemble three-athlete intended writes from live/offline reference and validate."""
    from datetime import timezone

    del acknowledge_clock_override  # API symmetry with preflight/execute flags
    from .constants import SIM_START
    from .reference_data import resolve_zoom_meetings
    from .three_athlete import build_three_athlete_scenarios
    from .writer import (
        build_execute_context_from_reference,
        field_names_for_table,
    )

    meta_tables = list(client.meta_tables() if client is not None else [])
    base_id = getattr(client, "base_id", None) or DEFAULT_BASE_ID
    reg_dir = Path(registry_dir) if registry_dir else (
        Path(__file__).resolve().parent / "run_registries"
    )

    if offline_fixture:
        return LiveWriteContractReport(
            ok=True,
            base_id=base_id,
            generated_at=datetime.now(timezone.utc).isoformat(),
            tables_validated=list(CONTRACT_WRITE_TABLES),
            writes_checked=0,
            fields_checked=0,
            violations=[],
            structural={"offline_fixture": True},
            notes=[
                "offline_fixture=True — live Meta write-contract skipped "
                "(not a Production execute path)"
            ],
        )

    scenarios, ref_meta = build_three_athlete_scenarios(
        run_id=run_id,
        client=client,
        offline_fixture=False,
    )
    clock = SimulationClock(enabled=True, current_date=SIM_START, run_id=run_id)

    execute_contexts: dict[str, Any] = {}
    weeks_objs = ref_meta.get("weeks_objs") or []
    if weeks_objs and client is not None:
        from dataclasses import replace

        sample = next(iter(scenarios.values()))
        shared = build_execute_context_from_reference(
            scenario=sample,
            weeks=weeks_objs,
            school_year=str(ref_meta.get("school_year") or "2026-2027"),
            goal_program_instance_ids=list(
                ref_meta.get("goal_program_instance_ids") or []
            ),
            submission_field_names=field_names_for_table(client, "Submissions") or None,
            video_feedback_field_names=field_names_for_table(client, "Video Feedback")
            or None,
            zoom_meeting_field_names=field_names_for_table(client, "Zoom Meetings")
            or None,
            zoom_attendance_field_names=field_names_for_table(client, "Zoom Attendance")
            or None,
        )
        for profile, scenario in scenarios.items():
            execute_contexts[profile] = replace(
                shared,
                goal_record_id=scenario.goal_record_id,
                grade_band_id=scenario.grade_band_id,
            )

    writes = collect_three_athlete_intended_writes(
        scenarios, clock, execute_contexts=execute_contexts or None
    )

    zoom_count = ref_meta.get("zoom_count")
    if zoom_count is None and isinstance(ref_meta.get("zoom_meetings"), list):
        zoom_count = len(ref_meta["zoom_meetings"])
    pha_count = ref_meta.get("homework_count")
    weeks_count = ref_meta.get("weeks_count")
    if weeks_count is None and weeks_objs:
        weeks_count = len(weeks_objs)

    live_zoom: list[dict[str, Any]] = []
    if client is not None:
        try:
            live_zoom = [
                {
                    "record_id": z.record_id,
                    "meeting_name": z.meeting_name,
                    "display": z.display,
                    "start_time": z.start_time,
                    "status": z.status,
                    "week_id": z.week_id,
                }
                for z in resolve_zoom_meetings(client)
            ]
        except Exception:  # noqa: BLE001
            # Fall back to reference snapshot list if present
            for z in ref_meta.get("zoom_meetings") or []:
                if isinstance(z, dict) and z.get("record_id"):
                    live_zoom.append(z)

    shared_run = run_id
    if "__" in shared_run:
        shared_run = shared_run.split("__", 1)[0]
    # Prefer explicit run; else paused three-athlete registry for resume gates.
    if not registry_zoom_meeting_ids(reg_dir, shared_run):
        paused = discover_paused_three_athlete_run_id(reg_dir)
        if paused:
            shared_run = paused
    reg_zoom = registry_zoom_meeting_ids(reg_dir, shared_run)

    return run_live_write_contract_validation(
        meta_tables=meta_tables,
        writes=writes,
        base_id=base_id,
        zoom_count=int(zoom_count) if zoom_count is not None else None,
        pha_count=int(pha_count) if pha_count is not None else None,
        weeks_count=int(weeks_count) if weeks_count is not None else None,
        include_structural=True,
        live_zoom_meetings=live_zoom,
        registry_zoom_ids=reg_zoom,
        shared_run_id=shared_run,
    )


__all__ = [
    "CANONICAL_PRODUCTION_ZOOM_MEETING_IDS",
    "CONTRACT_WRITE_TABLES",
    "COMPUTED_FIELD_TYPES",
    "ContractViolation",
    "EXPECTED_PERFECT_SEASON_XP",
    "EXPECTED_PRODUCTION_ZOOM_COUNT",
    "LiveWriteContractError",
    "LiveWriteContractReport",
    "assert_live_write_contract_pass",
    "build_contract_validation_for_client",
    "classify_zoom_meetings",
    "collect_three_athlete_intended_writes",
    "discover_paused_three_athlete_run_id",
    "is_computed_field",
    "is_writable_field_type",
    "load_oracle_expectations",
    "registry_zoom_meeting_ids",
    "run_live_write_contract_validation",
    "validate_attachment_value",
    "validate_field_value",
    "validate_intended_writes",
    "validate_oracle_zoom_model",
    "validate_structural_assumptions",
    "validate_write_payload",
    "validate_zoom_contract",
]
