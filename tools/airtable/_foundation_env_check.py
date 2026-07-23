"""Local-only helper: validate .env shape without printing secrets."""
from pathlib import Path

env = {}
path = Path(__file__).with_name(".env")
for line in path.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

tok = env.get("AIRTABLE_TOKEN") or env.get("AIRTABLE_API_TOKEN") or ""
base = env.get("BASE_ID") or env.get("AIRTABLE_BASE_ID") or ""
print("token_ok", tok.startswith("pat") and len(tok) > 20)
print("base", base)
print("has_dev", "DEV_BASE_ID" in env)
