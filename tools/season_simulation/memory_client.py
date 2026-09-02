"""In-memory Airtable client for offline execute orchestration tests."""

from __future__ import annotations

import itertools
from typing import Any

from .airtable_client import WriteBlockedError


class MemoryAirtableClient:
    """Minimal create/update/list client — no network."""

    def __init__(self, *, allow_writes: bool = True, base_id: str = "appMEMORYTEST000") -> None:
        self.allow_writes = allow_writes
        self.base_id = base_id
        self._seq = itertools.count(1)
        self.tables: dict[str, dict[str, dict[str, Any]]] = {}

    def _require_writes(self, table: str) -> None:
        if not self.allow_writes:
            raise WriteBlockedError(f"Write blocked for table {table!r}")

    def _new_id(self) -> str:
        return f"recMEM{next(self._seq):010d}"

    def list_records(
        self,
        table: str,
        *,
        fields: list[str] | None = None,
        formula: str | None = None,
        page_size: int = 100,
        max_records: int | None = None,
    ) -> list[dict]:
        rows = list((self.tables.get(table) or {}).values())
        if max_records is not None:
            rows = rows[:max_records]
        if fields is None:
            return [dict(r) for r in rows]
        out = []
        for r in rows:
            f = r.get("fields") or {}
            out.append({"id": r["id"], "fields": {k: f[k] for k in fields if k in f}})
        return out

    def get_record(self, table: str, record_id: str) -> dict:
        rec = (self.tables.get(table) or {}).get(record_id)
        if not rec:
            raise RuntimeError(f"Missing {table}/{record_id}")
        return dict(rec)

    def meta_tables(self) -> list[dict]:
        return [{"name": name, "fields": []} for name in sorted(self.tables)]

    def create_records(self, table: str, records: list[dict[str, Any]]) -> list[dict]:
        self._require_writes(table)
        bucket = self.tables.setdefault(table, {})
        out: list[dict] = []
        for fields in records:
            rid = self._new_id()
            rec = {"id": rid, "fields": dict(fields)}
            bucket[rid] = rec
            out.append(dict(rec))
        return out

    def update_records(self, table: str, updates: list[dict[str, Any]]) -> list[dict]:
        self._require_writes(table)
        bucket = self.tables.setdefault(table, {})
        out: list[dict] = []
        for u in updates:
            rid = u["id"]
            if rid not in bucket:
                raise RuntimeError(f"Cannot update missing {table}/{rid}")
            bucket[rid]["fields"].update(u.get("fields") or {})
            out.append(dict(bucket[rid]))
        return out

    def delete_records(self, table: str, record_ids: list[str]) -> list[dict]:
        self._require_writes(table)
        bucket = self.tables.setdefault(table, {})
        out: list[dict] = []
        for rid in record_ids:
            if rid in bucket:
                del bucket[rid]
                out.append({"id": rid, "deleted": True})
        return out
