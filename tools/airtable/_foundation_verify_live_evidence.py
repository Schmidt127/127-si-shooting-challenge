import json
import urllib.parse
import urllib.request
from pathlib import Path

PROD = "appn84sqPw03zEbTT"
SUB = "recaCcxDqtzFWjmyi"
XP = "recOqzhV4kTdsfzMf"
WAS = "rechWp330MqSgRWzN"


def load_tok():
    env = {}
    for line in Path(__file__).with_name(".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_TOKEN") or env.get("AIRTABLE_API_TOKEN")


def get(tok, url):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main():
    tok = load_tok()
    sub = get(tok, f"https://api.airtable.com/v0/{PROD}/Submissions/{SUB}")
    xp = get(tok, f"https://api.airtable.com/v0/{PROD}/XP%20Events/{XP}")
    was = get(tok, f"https://api.airtable.com/v0/{PROD}/Weekly%20Athlete%20Summary/{WAS}")
    formula = f"FIND('{SUB}', ARRAYJOIN({{Submission}}))"
    params = urllib.parse.urlencode({"filterByFormula": formula, "pageSize": "20"})
    xps = get(tok, f"https://api.airtable.com/v0/{PROD}/XP%20Events?{params}")
    interesting_xp = {
        k: xp["fields"].get(k)
        for k in xp["fields"]
        if any(x in k.lower() for x in ["key", "source", "reason", "point", "amount", "status", "enrollment", "submission"])
    }
    out = {
        "submission": {
            "id": SUB,
            "Week": sub["fields"].get("Week"),
            "XP Events": sub["fields"].get("XP Events"),
            "Daily Email Status": sub["fields"].get("Daily Email Status"),
            "XP Award Status": sub["fields"].get("XP Award Status"),
            "Weekly Athlete Summary": sub["fields"].get("Weekly Athlete Summary"),
        },
        "xpEvent": {"id": XP, **interesting_xp},
        "xpEventsForSubmission": [r["id"] for r in xps.get("records", [])],
        "was": {
            "id": WAS,
            "Enrollment": was["fields"].get("Enrollment"),
            "Week": was["fields"].get("Week"),
        },
    }
    Path("docs/foundation-reset/live-foundation-test-verify.json").write_text(
        json.dumps(out, indent=2, default=str), encoding="utf-8"
    )
    print(json.dumps(out, indent=2, default=str)[:4000])


if __name__ == "__main__":
    main()
