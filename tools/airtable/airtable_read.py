"""Shared read-only Airtable helpers for tools/airtable check scripts."""

from __future__ import annotations

import os
import re
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"


def load_token() -> str:
    tools_env = Path(__file__).with_name(".env")
    web_env = Path(__file__).resolve().parents[2] / "web" / ".env.local"
    if tools_env.exists():
        load_dotenv(tools_env, override=True)
    if web_env.exists():
        load_dotenv(web_env, override=True)
    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not token:
        raise SystemExit("Missing PAT in tools/airtable/.env or web/.env.local")
    return token


def session() -> requests.Session:
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {load_token()}"
    return s


def list_table(sess: requests.Session, table: str, fields: list[str]) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table)}"
    remaining = list(fields)
    while remaining:
        records: list[dict] = []
        offset: str | None = None
        while True:
            params: dict = {"pageSize": 100}
            for i, name in enumerate(remaining):
                params[f"fields[{i}]"] = name
            if offset:
                params["offset"] = offset
            resp = sess.get(url, params=params, timeout=120)
            if resp.status_code == 422 and "UNKNOWN_FIELD_NAME" in resp.text:
                match = re.search(r'Unknown field name: \\?"([^"\\]+)\\?"', resp.text)
                if match and match.group(1) in remaining:
                    remaining.remove(match.group(1))
                    break
                raise RuntimeError(f"GET {table} -> {resp.text[:400]}")
            if not resp.ok:
                raise RuntimeError(f"GET {table} -> {resp.status_code}: {resp.text[:400]}")
            data = resp.json()
            records.extend(data.get("records", []))
            offset = data.get("offset")
            if not offset:
                return records
        if not remaining:
            break
    records = []
    offset = None
    while True:
        params: dict = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        resp = sess.get(url, params=params, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            return records


def f(rec: dict) -> dict:
    return rec.get("fields", {})


def linked_ids(value) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if isinstance(item, str):
            out.append(item)
        elif isinstance(item, dict) and item.get("id"):
            out.append(str(item["id"]))
    return out


def first_id(value) -> str:
    return linked_ids(value)[0] if linked_ids(value) else ""


def txt(value) -> str:
    if value is None:
        return ""
    if isinstance(value, dict) and value.get("name"):
        return str(value["name"]).strip()
    return str(value).strip()


def is_active(value) -> bool:
    return value is True or value == 1 or str(value).lower() == "true"


def athlete_label(fields: dict, record_id: str = "") -> str:
    for key in ("Full Athlete Name", "Athlete First Name", "Athlete"):
        v = txt(fields.get(key))
        if v:
            return v
    return record_id or "(unknown)"
