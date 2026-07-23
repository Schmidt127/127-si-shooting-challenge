"""Overnight zoom-storage audit helper: summarize Make blueprint module chains."""

from __future__ import annotations

import json
import sys


def walk(flow: list, depth: int = 0) -> None:
    for m in flow:
        name = (m.get("metadata") or {}).get("designer", {}).get("name", "")
        print("  " * depth + "[{}] {} - {}".format(m.get("id"), m.get("module"), name))
        mapper = m.get("mapper") or {}
        interesting = {
            k: v
            for k, v in mapper.items()
            if isinstance(v, str) and ("{{" in v or k in ("url", "record", "id"))
        }
        for k, v in list(interesting.items())[:12]:
            print("  " * depth + "    {} = {}".format(k, v[:160]))
        for r in m.get("routes") or []:
            cond = json.dumps(r.get("filter", {}))[:160] if r.get("filter") else ""
            print("  " * depth + "  route: " + cond)
            walk(r.get("flow", []), depth + 2)


def main() -> None:
    path = sys.argv[1]
    d = json.load(open(path, encoding="utf-8"))
    print("NAME:", d.get("name"))
    walk(d.get("flow", []))


if __name__ == "__main__":
    main()
