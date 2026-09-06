"""Post-cleanup zero-remnant audit — read-only scan for simulation leftovers."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Callable

from .constants import REFERENCE_TABLES, RUN_ID_FIELD_CANDIDATES, SC001_ATHLETES
from .run_registry import marker_matches, run_marker

# Never expect deletion from these tables; audit flags unexpected sim markers only.
PROTECTED_CONFIG_TABLES = frozenset(REFERENCE_TABLES) | frozenset(
    {
        "Countries",
        "States",
        "Automations",
        "Communications Hub",
    }
)

SC001_ATHLETE_NAME_SET = frozenset(
    f"{a['first_name']} {a['last_name']}" for a in SC001_ATHLETES
)


@dataclass
class RemnantHit:
    table: str
    record_id: str
    reason: str
    field: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ZeroRemnantAuditReport:
    run_id: str
    ok: bool
    hits: list[RemnantHit]
    scanned_tables: list[str]
    registry_record_ids_remaining: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "ok": self.ok,
            "hit_count": len(self.hits),
            "hits": [h.to_dict() for h in self.hits],
            "scanned_tables": list(self.scanned_tables),
            "registry_record_ids_remaining": list(self.registry_record_ids_remaining),
            "warnings": list(self.warnings),
        }


def _athlete_display_hit(fields: dict[str, Any]) -> str | None:
    first = str(fields.get("First Name") or fields.get("Athlete First Name") or "")
    last = str(fields.get("Last Name") or fields.get("Athlete Last Name") or "")
    full = f"{first} {last}".strip()
    if full in SC001_ATHLETE_NAME_SET:
        return full
    for a in SC001_ATHLETES:
        if a["first_name"] in first and a["last_name"] in last:
            return full
    return None


def scan_records_for_run_marker(
    records: list[dict[str, Any]],
    *,
    table: str,
    run_id: str,
    text_fields: tuple[str, ...] | None = None,
) -> list[RemnantHit]:
    hits: list[RemnantHit] = []
    fields_to_scan = text_fields or RUN_ID_FIELD_CANDIDATES.get(table, ())
    marker = run_marker(run_id)
    for rec in records:
        rid = str(rec.get("id") or "")
        f = rec.get("fields") or {}
        if table == "Athletes":
            name_hit = _athlete_display_hit(f)
            if name_hit:
                hits.append(
                    RemnantHit(
                        table=table,
                        record_id=rid,
                        reason=f"sim athlete name {name_hit!r}",
                        field="First Name/Last Name",
                    )
                )
        for fname in fields_to_scan:
            text = str(f.get(fname) or "")
            if marker_matches(text, run_id) or marker in text:
                hits.append(
                    RemnantHit(
                        table=table,
                        record_id=rid,
                        reason="run marker text",
                        field=fname,
                    )
                )
    return hits


def run_zero_remnant_audit(
    *,
    run_id: str,
    list_records: Callable[..., list[dict[str, Any]]] | None = None,
    registry_record_ids: set[str] | None = None,
    tables: tuple[str, ...] | None = None,
    max_records_per_table: int = 500,
) -> ZeroRemnantAuditReport:
    """Scan transactional tables for sim remnants (read-only).

    When ``list_records`` is None, returns a structural report with warnings only
    (offline / no Airtable token).
    """
    from .constants import TRANSACTIONAL_TABLES

    scan_tables = tables or TRANSACTIONAL_TABLES
    hits: list[RemnantHit] = []
    warnings: list[str] = []
    registry_remaining: list[str] = []

    if list_records is None:
        warnings.append("No list_records client — audit is structural/offline only")
        return ZeroRemnantAuditReport(
            run_id=run_id,
            ok=True,
            hits=[],
            scanned_tables=list(scan_tables),
            warnings=warnings,
        )

    for table in scan_tables:
        if table in PROTECTED_CONFIG_TABLES:
            warnings.append(f"Skipped protected table {table!r}")
            continue
        try:
            rows = list_records(table, max_records=max_records_per_table)
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"Scan failed for {table}: {exc}")
            continue
        hits.extend(
            scan_records_for_run_marker(rows, table=table, run_id=run_id)
        )
        if registry_record_ids:
            for row in rows:
                rid = str(row.get("id") or "")
                if rid in registry_record_ids:
                    registry_remaining.append(f"{table}:{rid}")

    ok = not hits and not registry_remaining
    if registry_remaining:
        hits.extend(
            RemnantHit(
                table=entry.split(":", 1)[0],
                record_id=entry.split(":", 1)[1],
                reason="registry id still present post-cleanup",
            )
            for entry in registry_remaining
        )

    return ZeroRemnantAuditReport(
        run_id=run_id,
        ok=ok,
        hits=hits,
        scanned_tables=list(scan_tables),
        registry_record_ids_remaining=registry_remaining,
        warnings=warnings,
    )
