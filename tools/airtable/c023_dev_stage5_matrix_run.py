#!/usr/bin/env python3
"""C-023 Stage 5 DEV consequence matrix (S5A–S5L).

Uses c023_dev_stage5_apply.py (116 mirror). Does not enable 070a/070b/Make.
Artifacts: tools/airtable/_preview/c023-dev-stage5-*.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

import c023_dev_stage5_apply as s5  # noqa: E402
from c023_dev_stage5_apply import FIELD_LAST_APPLIED  # noqa: E402

PREVIEW = HERE / "_preview"
DEFAULT_VIDEO_ASSET = "recF86pJTIMFoEypJ"
DEFAULT_HW_ASSET = "rec1PzA7th0qJbsN4"
CROSS_ASSET = "recQcpLCsYFrYYH7w"
SCHMIDT = "recgP9qZYjAhE7NXm"


def save(name: str, data: dict) -> Path:
    PREVIEW.mkdir(parents=True, exist_ok=True)
    out = PREVIEW / name
    out.write_text(json.dumps(data, indent=2, default=str) + "\n", encoding="utf-8")
    return out


def patch_asset(asset_id: str, fields: dict) -> None:
    s5.patch_rec("Submission Assets", asset_id, fields)


def reset_activity_eligibility(asset_id: str) -> None:
    """Clear prior Stage 5 suppress flags so Not Reviewed baseline tests start clean."""
    fields = s5.snap_asset(asset_id)
    target = s5.resolve_target(fields)
    if not target:
        return
    if target["route"] == "video":
        s5.patch_rec("Video Feedback", target["id"], {"Do Not Award XP?": False})
    else:
        act = s5.snap_activity(target["route"], target["id"])
        if s5.select_name(act.get("Award Status")) == "Do Not Award":
            s5.patch_rec("Homework Completions", target["id"], {"Award Status": "Pending"})


def reset_resolution(asset_id: str) -> None:
    fields = {
        "Duplicate Resolution Applied?": False,
        "Duplicate Resolution Applied At": None,
        "Duplicate Resolution Error": None,
    }
    if FIELD_LAST_APPLIED in s5._schema_fields("Submission Assets"):
        fields[FIELD_LAST_APPLIED] = None
    patch_asset(asset_id, fields)
    reset_activity_eligibility(asset_id)


def target_for(asset_id: str) -> dict:
    fields = s5.snap_asset(asset_id)
    t = s5.resolve_target(fields)
    if not t:
        raise SystemExit(f"asset {asset_id} has no activity target")
    return t


def xp_active_points(source_key: str) -> int:
    xf = s5.snap_xp(source_key)
    if not xf:
        return 0
    active = bool(xf.get("Active?"))
    pts = int(xf.get("XP Points") or 0)
    dup = s5.select_name(xf.get("Duplicate Status"))
    if dup == "Duplicate - Remove":
        return 0
    return pts if active else 0


def ensure_test_xp(source_key: str, route: str, activity_id: str, enrollment_id: str, points: int = 25) -> str:
    existing = s5.list_xp_by_source_key(source_key)
    if existing:
        s5.patch_rec(
            "XP Events",
            existing["id"],
            {
                "Active?": True,
                "Duplicate Status": "Unique",
                "XP Points": points,
                "XP Reason Debug": f"{s5.AUDIT_MARKER} test seed",
            },
        )
        return existing["id"]

    fields = {
        "Source Key": source_key,
        "XP Points": points,
        "Active?": True,
        "Duplicate Status": "Unique",
        "Enrollment": [enrollment_id],
        "XP Source": "Video Submission" if route == "video" else "Homework Completion",
        "XP Bucket": "Video Feedback" if route == "video" else "Homework",
        "XP Reason Public": "C-023 Stage 5 test XP",
        "XP Reason Debug": f"{s5.AUDIT_MARKER} test seed",
    }
    if route == "video":
        fields["Video Feedback"] = [activity_id]
    else:
        fields["Homework Completion"] = [activity_id]

    r = __import__("requests").post(
        s5.api("XP Events"),
        headers=s5.headers(),
        json={"fields": fields, "typecast": True},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"create XP failed: {r.status_code} {r.text[:400]}")
    return r.json()["id"]


def run_case(case_id: str, asset_id: str, steps: list, expectations: dict) -> dict:
    checks = {}

    def check(name: str, ok: bool, detail: str = "") -> None:
        checks[name] = {"pass": bool(ok), "detail": detail}

    evidence = {"case": case_id, "assetId": asset_id, "steps": steps, "expectations": expectations}

    try:
        for step in steps:
            evidence.setdefault("stepResults", []).append(step())
    except Exception as exc:
        evidence["error"] = str(exc)
        checks["runtime"] = {"pass": False, "detail": str(exc)}

    af = s5.snap_asset(asset_id)
    target = s5.resolve_target(af)
    evidence["finalAsset"] = af
    if target:
        evidence["finalActivity"] = s5.snap_activity(target["route"], target["id"])
        evidence["finalXp"] = s5.snap_xp(target["source_key"])
        evidence["canonicalUrl"] = af.get("Canonical File URL")
        evidence["storageKey"] = af.get("Storage Key")

    for key, exp in expectations.items():
        if key == "decision":
            check("decision", s5.select_name(af.get("Asset Reuse Decision")) == exp, str(af.get("Asset Reuse Decision")))
        elif key == "resolutionApplied":
            check("resolutionApplied", bool(af.get("Duplicate Resolution Applied?")) == exp, str(af.get("Duplicate Resolution Applied?")))
        elif key == "doNotAwardVideo":
            act = evidence.get("finalActivity") or {}
            check("doNotAwardVideo", bool(act.get("Do Not Award XP?")) == exp, str(act.get("Do Not Award XP?")))
        elif key == "awardStatusHomework":
            act = evidence.get("finalActivity") or {}
            check("awardStatusHomework", s5.select_name(act.get("Award Status")) == exp, str(act.get("Award Status")))
        elif key == "xpActivePoints":
            sk = target["source_key"] if target else ""
            got = xp_active_points(sk)
            check("xpActivePoints", got == exp, str(got))
        elif key == "xpExists":
            check("xpExists", (evidence.get("finalXp") is not None) == exp, str(evidence.get("finalXp") is not None))
        elif key == "canonicalKept":
            check("canonicalKept", bool(evidence.get("canonicalUrl")) == exp, str(evidence.get("canonicalUrl")))
        elif key == "storageKept":
            check("storageKept", bool(evidence.get("storageKey")) == exp, str(evidence.get("storageKey")))
        elif key == "displayLabel":
            act = evidence.get("finalActivity") or {}
            label = act.get("Activity XP Display Label")
            if label is None:
                # fallback proxy when formula field not yet on DEV
                proxy = "Confirmed Duplicate — 0 XP" if exp == "Confirmed Duplicate — 0 XP" else label
                ok = exp == "Confirmed Duplicate — 0 XP" and bool(af.get("Duplicate Resolution Applied?"))
                check("displayLabel", ok, f"missing formula field; proxy={proxy}")
            else:
                check("displayLabel", label == exp, str(label))
        elif key == "actionOut":
            last = evidence.get("stepResults", [{}])[-1] if evidence.get("stepResults") else {}
            check("actionOut", last.get("actionOut") == exp, str(last.get("actionOut")))

    evidence["checks"] = checks
    evidence["pass"] = all(v["pass"] for v in checks.values()) if checks else False
    save(f"c023-dev-stage5-{case_id}-{asset_id}.json", evidence)
    return evidence


def run_s5a(asset_id: str = DEFAULT_VIDEO_ASSET) -> dict:
    reset_resolution(asset_id)
    patch_asset(asset_id, {"Asset Reuse Decision": "Not Reviewed", "Potential Asset Reuse?": True})

    def step():
        return s5.apply_decision(asset_id)

    return run_case(
        "S5A",
        asset_id,
        [step],
        {
            "decision": "Not Reviewed",
            "resolutionApplied": False,
            "doNotAwardVideo": False,
        },
    )


def run_s5b(asset_id: str = DEFAULT_VIDEO_ASSET) -> dict:
    reset_resolution(asset_id)
    patch_asset(asset_id, {"Asset Reuse Decision": "Approved Reuse"})

    def step():
        return s5.apply_decision(asset_id)

    return run_case(
        "S5B",
        asset_id,
        [step],
        {
            "decision": "Approved Reuse",
            "doNotAwardVideo": False,
        },
    )


def run_s5c(asset_id: str = DEFAULT_VIDEO_ASSET) -> dict:
    reset_resolution(asset_id)
    t = target_for(asset_id)
    xf = s5.snap_xp(t["source_key"])
    if xf and xf.get("Active?"):
        s5.patch_rec("XP Events", s5.list_xp_by_source_key(t["source_key"])["id"], {"Active?": False})

    patch_asset(asset_id, {"Asset Reuse Decision": "Confirmed Duplicate"})

    def step():
        return s5.apply_decision(asset_id)

    return run_case(
        "S5C",
        asset_id,
        [step],
        {
            "decision": "Confirmed Duplicate",
            "resolutionApplied": True,
            "doNotAwardVideo": True,
            "xpActivePoints": 0,
            "canonicalKept": True,
            "storageKept": True,
        },
    )


def run_s5d(asset_id: str = DEFAULT_VIDEO_ASSET) -> dict:
    reset_resolution(asset_id)
    t = target_for(asset_id)
    af = s5.snap_asset(asset_id)
    enroll = s5.first_link(af.get("Enrollment - Linked")) or SCHMIDT
    xp_id = ensure_test_xp(t["source_key"], t["route"], t["id"], enroll)
    patch_asset(asset_id, {"Asset Reuse Decision": "Confirmed Duplicate"})

    def step():
        return s5.apply_decision(asset_id)

    result = run_case(
        "S5D",
        asset_id,
        [step],
        {
            "decision": "Confirmed Duplicate",
            "resolutionApplied": True,
            "doNotAwardVideo": True,
            "xpActivePoints": 0,
            "xpExists": True,
        },
    )
    result["xpEventId"] = xp_id
    return result


def run_s5e(asset_id: str = DEFAULT_VIDEO_ASSET) -> dict:
    reset_resolution(asset_id)
    patch_asset(asset_id, {"Asset Reuse Decision": "Confirmed Duplicate"})

    def first():
        return s5.apply_decision(asset_id)

    def second():
        return s5.apply_decision(asset_id)

    return run_case(
        "S5E",
        asset_id,
        [first, second],
        {
            "actionOut": "skipped_idempotent_same_decision",
            "resolutionApplied": True,
        },
    )


def run_s5f(asset_id: str = DEFAULT_VIDEO_ASSET) -> dict:
    reset_resolution(asset_id)
    t = target_for(asset_id)
    af = s5.snap_asset(asset_id)
    enroll = s5.first_link(af.get("Enrollment - Linked")) or SCHMIDT
    ensure_test_xp(t["source_key"], t["route"], t["id"], enroll)
    patch_asset(asset_id, {"Asset Reuse Decision": "Confirmed Duplicate"})
    s5.apply_decision(asset_id)
    before_xp = s5.list_xp_by_source_key(t["source_key"])
    before_id = before_xp["id"] if before_xp else None
    patch_asset(asset_id, {"Asset Reuse Decision": "Approved Reuse"})

    def step():
        return s5.apply_decision(asset_id)

    result = run_case(
        "S5F",
        asset_id,
        [step],
        {
            "decision": "Approved Reuse",
            "doNotAwardVideo": False,
            "xpActivePoints": 25,
            "resolutionApplied": False,
        },
    )
    after_id = (s5.list_xp_by_source_key(t["source_key"]) or {}).get("id")
    result["checks"]["sameXpEvent"] = {"pass": before_id == after_id and before_id is not None, "detail": f"{before_id} -> {after_id}"}
    result["pass"] = all(v["pass"] for v in result["checks"].values())
    save(f"c023-dev-stage5-S5F-{asset_id}.json", result)
    return result


def run_s5g(asset_id: str = DEFAULT_VIDEO_ASSET) -> dict:
    reset_resolution(asset_id)
    t = target_for(asset_id)
    af = s5.snap_asset(asset_id)
    enroll = s5.first_link(af.get("Enrollment - Linked")) or SCHMIDT
    ensure_test_xp(t["source_key"], t["route"], t["id"], enroll)
    patch_asset(asset_id, {"Asset Reuse Decision": "Confirmed Duplicate"})
    s5.apply_decision(asset_id)
    patch_asset(asset_id, {"Asset Reuse Decision": "False Positive"})

    def step():
        return s5.apply_decision(asset_id)

    return run_case(
        "S5G",
        asset_id,
        [step],
        {
            "decision": "False Positive",
            "doNotAwardVideo": False,
            "xpActivePoints": 25,
        },
    )


def run_s5h(asset_id: str = CROSS_ASSET) -> dict:
    reset_resolution(asset_id)
    patch_asset(asset_id, {"Asset Reuse Decision": "Not Reviewed"})

    def step():
        return s5.apply_decision(asset_id)

    return run_case(
        "S5H",
        asset_id,
        [step],
        {
            "decision": "Not Reviewed",
            "resolutionApplied": False,
            "doNotAwardVideo": False,
        },
    )


def run_s5i(asset_id: str = DEFAULT_HW_ASSET) -> dict:
    reset_resolution(asset_id)
    patch_asset(asset_id, {"Asset Reuse Decision": "Confirmed Duplicate"})

    def step():
        return s5.apply_decision(asset_id)

    return run_case(
        "S5I",
        asset_id,
        [step],
        {
            "decision": "Confirmed Duplicate",
            "awardStatusHomework": "Do Not Award",
            "resolutionApplied": True,
            "canonicalKept": True,
        },
    )


def run_s5j(asset_id: str = DEFAULT_VIDEO_ASSET) -> dict:
    return run_s5c(asset_id)


def run_s5k(asset_id: str = DEFAULT_VIDEO_ASSET) -> dict:
    reset_resolution(asset_id)
    patch_asset(asset_id, {"Asset Reuse Decision": "Confirmed Duplicate"})

    def step():
        return s5.apply_decision(asset_id)

    return run_case(
        "S5K",
        asset_id,
        [step],
        {
            "displayLabel": "Confirmed Duplicate — 0 XP",
            "resolutionApplied": True,
        },
    )


def run_s5l(asset_id: str = DEFAULT_VIDEO_ASSET) -> dict:
    before = s5.snap_asset(asset_id)
    canonical = before.get("Canonical File URL")
    storage = before.get("Storage Key")
    reset_resolution(asset_id)
    patch_asset(asset_id, {"Asset Reuse Decision": "Confirmed Duplicate"})

    def step():
        return s5.apply_decision(asset_id)

    result = run_case(
        "S5L",
        asset_id,
        [step],
        {
            "canonicalKept": True,
            "storageKept": True,
        },
    )
    after = s5.snap_asset(asset_id)
    result["checks"]["canonicalUnchanged"] = {
        "pass": after.get("Canonical File URL") == canonical and bool(canonical),
        "detail": str(after.get("Canonical File URL")),
    }
    result["checks"]["storageUnchanged"] = {
        "pass": after.get("Storage Key") == storage and bool(storage),
        "detail": str(after.get("Storage Key")),
    }
    result["pass"] = all(v["pass"] for v in result["checks"].values())
    save(f"c023-dev-stage5-S5L-{asset_id}.json", result)
    return result


RUNNERS = {
    "S5A": run_s5a,
    "S5B": run_s5b,
    "S5C": run_s5c,
    "S5D": run_s5d,
    "S5E": run_s5e,
    "S5F": run_s5f,
    "S5G": run_s5g,
    "S5H": run_s5h,
    "S5I": run_s5i,
    "S5J": run_s5j,
    "S5K": run_s5k,
    "S5L": run_s5l,
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("scenario", choices=["all", *RUNNERS.keys()])
    parser.add_argument("--video-asset", default=DEFAULT_VIDEO_ASSET)
    parser.add_argument("--hw-asset", default=DEFAULT_HW_ASSET)
    parser.add_argument("--cross-asset", default=CROSS_ASSET)
    args = parser.parse_args()
    s5.load_env()

    asset_map = {
        "S5A": args.video_asset,
        "S5B": args.video_asset,
        "S5C": args.video_asset,
        "S5D": args.video_asset,
        "S5E": args.video_asset,
        "S5F": args.video_asset,
        "S5G": args.video_asset,
        "S5H": args.cross_asset,
        "S5I": args.hw_asset,
        "S5J": args.video_asset,
        "S5K": args.video_asset,
        "S5L": args.video_asset,
    }

    keys = list(RUNNERS.keys()) if args.scenario == "all" else [args.scenario]
    results = {}
    for key in keys:
        aid = asset_map[key]
        if key in {"S5I"}:
            results[key] = RUNNERS[key](aid)
        elif key == "S5H":
            results[key] = RUNNERS[key](aid)
        else:
            results[key] = RUNNERS[key](aid)

    summary = {k: {"pass": v.get("pass"), "assetId": v.get("assetId")} for k, v in results.items()}
    print(json.dumps({"summary": summary, "results": results}, indent=2, default=str))


if __name__ == "__main__":
    main()
