"""Thin Airtable REST client with retries. Writes are gated by allow_writes."""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests

try:
    from dotenv import load_dotenv
except ImportError:  # offline CI / minimal env — .env loading optional
    def load_dotenv(*_args, **_kwargs):  # type: ignore[misc]
        return False

from .constants import DEFAULT_BASE_ID


class WriteBlockedError(RuntimeError):
    """Raised when a write is attempted without allow_writes + confirmation."""


class AirtableClient:
    def __init__(
        self,
        *,
        token: str | None = None,
        base_id: str | None = None,
        allow_writes: bool = False,
        max_retries: int = 4,
        timeout: int = 120,
    ) -> None:
        self.token = token or load_token()
        self.base_id = base_id or load_base_id()
        self.allow_writes = allow_writes
        self.max_retries = max_retries
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers["Authorization"] = f"Bearer {self.token}"
        self.session.headers["Content-Type"] = "application/json"

    def _url(self, table: str, record_id: str | None = None) -> str:
        base = f"https://api.airtable.com/v0/{self.base_id}/{quote(table, safe='')}"
        if record_id:
            return f"{base}/{record_id}"
        return base

    def _request(
        self,
        method: str,
        url: str,
        *,
        params: dict | None = None,
        json_body: dict | None = None,
    ) -> dict:
        last_err: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                resp = self.session.request(
                    method,
                    url,
                    params=params,
                    json=json_body,
                    timeout=self.timeout,
                )
                if resp.status_code in (429, 500, 502, 503, 504):
                    wait = min(2**attempt, 20)
                    time.sleep(wait)
                    last_err = RuntimeError(
                        f"{method} {url} -> {resp.status_code}: {resp.text[:300]}"
                    )
                    continue
                if not resp.ok:
                    raise RuntimeError(
                        f"{method} {url} -> {resp.status_code}: {resp.text[:500]}"
                    )
                if resp.status_code == 204 or not resp.content:
                    return {}
                return resp.json()
            except (requests.Timeout, requests.ConnectionError) as exc:
                last_err = exc
                time.sleep(min(2**attempt, 20))
        raise RuntimeError(f"Airtable request failed after retries: {last_err}")

    def list_records(
        self,
        table: str,
        *,
        fields: list[str] | None = None,
        formula: str | None = None,
        page_size: int = 100,
        max_records: int | None = None,
    ) -> list[dict]:
        records: list[dict] = []
        offset: str | None = None
        while True:
            params: dict[str, Any] = {"pageSize": min(page_size, 100)}
            if formula:
                params["filterByFormula"] = formula
            if fields:
                for i, name in enumerate(fields):
                    params[f"fields[{i}]"] = name
            if offset:
                params["offset"] = offset
            data = self._request("GET", self._url(table), params=params)
            batch = data.get("records") or []
            records.extend(batch)
            if max_records is not None and len(records) >= max_records:
                return records[:max_records]
            offset = data.get("offset")
            if not offset:
                return records

    def get_record(self, table: str, record_id: str) -> dict:
        return self._request("GET", self._url(table, record_id))

    def meta_tables(self) -> list[dict]:
        url = f"https://api.airtable.com/v0/meta/bases/{self.base_id}/tables"
        data = self._request("GET", url)
        return list(data.get("tables") or [])

    def create_records(self, table: str, records: list[dict[str, Any]]) -> list[dict]:
        self._require_writes(table)
        out: list[dict] = []
        for i in range(0, len(records), 10):
            chunk = records[i : i + 10]
            data = self._request(
                "POST",
                self._url(table),
                json_body={"records": [{"fields": r} for r in chunk], "typecast": True},
            )
            out.extend(data.get("records") or [])
        return out

    def update_records(self, table: str, updates: list[dict[str, Any]]) -> list[dict]:
        """updates: [{id, fields}]"""
        self._require_writes(table)
        out: list[dict] = []
        for i in range(0, len(updates), 10):
            chunk = updates[i : i + 10]
            data = self._request(
                "PATCH",
                self._url(table),
                json_body={
                    "records": [
                        {"id": u["id"], "fields": u["fields"]} for u in chunk
                    ],
                    "typecast": True,
                },
            )
            out.extend(data.get("records") or [])
        return out

    def delete_records(self, table: str, record_ids: list[str]) -> list[dict]:
        self._require_writes(table)
        out: list[dict] = []
        for i in range(0, len(record_ids), 10):
            chunk = record_ids[i : i + 10]
            params = [("records[]", rid) for rid in chunk]
            # requests params with duplicates
            url = self._url(table)
            last_err: Exception | None = None
            for attempt in range(self.max_retries + 1):
                resp = self.session.delete(url, params=params, timeout=self.timeout)
                if resp.status_code in (429, 500, 502, 503, 504):
                    time.sleep(min(2**attempt, 20))
                    last_err = RuntimeError(resp.text[:300])
                    continue
                if not resp.ok:
                    raise RuntimeError(
                        f"DELETE {table} -> {resp.status_code}: {resp.text[:500]}"
                    )
                data = resp.json()
                out.extend(data.get("records") or [])
                break
            else:
                raise RuntimeError(f"DELETE failed after retries: {last_err}")
        return out

    def _require_writes(self, table: str) -> None:
        if not self.allow_writes:
            raise WriteBlockedError(
                f"Write blocked for table {table!r}: client allow_writes=False "
                "(dry-run / preflight default)"
            )


def load_token() -> str:
    _load_env_files()
    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not token:
        raise SystemExit(
            "Missing AIRTABLE_TOKEN / AIRTABLE_API_TOKEN "
            "(tools/airtable/.env or web/.env.local)"
        )
    return token


def load_base_id() -> str:
    _load_env_files()
    return (
        os.getenv("BASE_ID")
        or os.getenv("AIRTABLE_BASE_ID")
        or DEFAULT_BASE_ID
    )


def _load_env_files() -> None:
    root = Path(__file__).resolve().parents[2]
    for path in (
        Path(__file__).resolve().parent / ".env",
        root / "tools" / "airtable" / ".env",
        root / "web" / ".env.local",
    ):
        if path.exists():
            load_dotenv(path, override=False)


def fields_of(rec: dict) -> dict:
    return rec.get("fields") or {}


def linked_ids(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if isinstance(item, str):
            out.append(item)
        elif isinstance(item, dict) and item.get("id"):
            out.append(str(item["id"]))
    return out


def first_link(value: Any) -> str:
    ids = linked_ids(value)
    return ids[0] if ids else ""


def txt(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict) and value.get("name"):
        return str(value["name"]).strip()
    if isinstance(value, list):
        parts = [txt(v) for v in value]
        return ", ".join(p for p in parts if p)
    return str(value).strip()


def is_truthy(value: Any) -> bool:
    return value is True or value == 1 or str(value).lower() in {"true", "1", "checked"}


def as_number(value: Any) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, list) and value:
        return as_number(value[0])
    try:
        return float(str(value).strip())
    except ValueError:
        return None
