#!/usr/bin/env python3
"""XP events tied to Newcomer submissions — verify shot correction propagated."""

from __future__ import annotations

import os
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"
TARGETS = {
    "rec8Z5KzsNif6mtpG": "Lincoln Newcomer",
    "recmhY61iU2AwEiMI": "Jackson Newcomer",
}
JUN19_SUBS = {
    "rec8Z5KzsNif6mtpG": "rec3yBhIbWqO795tf",
    "recmhY61iU2AwEiMI": "recvvElCSMuWfk6hK",
}


def load_token() -> str:
    tools_env = Path(__file__).with_name(".env")
    web_env = Path(__file__).resolve().parents[2] / "web" / ".env.local"
    if tools_env.exists():
        load_dotenv(tools_env, override=True)
    if web_env.exists():
        load_dotenv(web_env, override=True)
    return os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""


def txt(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(str(x) for x in value if x is not None)
    return str(value).strip()


def num(value) -> float:
    try:
        return float(str(value or "0").replace(",", ""))
    except ValueError:
        return 0.0


def first_id(value) -> str:
    if isinstance(value, list) and value:
        item = value[0]
        return item if isinstance(item, str) else str(item.get("id") or "")
    return ""


def list_all(session, table, fields):
    url = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table)}"
    records = []
    offset = None
    while True:
        params = {"pageSize": 100}
        for i, f in enumerate(fields):
            params[f"fields[{i}]"] = f
        if offset:
            params["offset"] = offset
        data = session.get(url, params=params, timeout=120).json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
    return records


def main() -> None:
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {load_token()}"
    jun19_xp = {
        "rec8Z5KzsNif6mtpG": "recMZY6P10L6b13Ri",
        "recmhY61iU2AwEiMI": "recEEn61ivsmsvAju",
    }
    for enr_id, name in TARGETS.items():
        enr = session.get(
            f"https://api.airtable.com/v0/{BASE_ID}/Enrollments/{enr_id}", timeout=60
        ).json()
        ef = enr.get("fields", {})
        xp_ids = ef.get("XP Events") or []
        active_sum = 0
        print(f"=== {name} ===")
        print(f"Lifetime XP Total: {int(num(ef.get('Lifetime XP Total')))}")
        print(f"XP Events linked on enrollment: {len(xp_ids)}")
        for xid in xp_ids:
            xrec = session.get(
                f"https://api.airtable.com/v0/{BASE_ID}/XP%20Events/{xid}", timeout=60
            ).json()
            xf = xrec.get("fields", {})
            if xf.get("Active?") is True:
                active_sum += int(num(xf.get("Active XP Points")))
        print(f"Active XP Points summed from linked events: {active_sum:,}")
        xid = jun19_xp[enr_id]
        xf = session.get(
            f"https://api.airtable.com/v0/{BASE_ID}/XP%20Events/{xid}", timeout=60
        ).json().get("fields", {})
        print(f"Jun 19 submission XP event ({xid}):")
        for k in [
            "Active XP Points",
            "XP Total Points",
            "XP Base Points",
            "XP Volume Bonus",
            "XP Bonus Points",
            "Source Key",
            "Reason Public",
            "Active?",
        ]:
            if k in xf:
                print(f"  {k}: {xf.get(k)}")
        print()


if __name__ == "__main__":
    main()
