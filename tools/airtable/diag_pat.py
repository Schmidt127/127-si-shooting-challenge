from pathlib import Path
from dotenv import load_dotenv
import os
import requests

REPO_ROOT = Path(__file__).resolve().parents[2]
tools_env = Path(__file__).with_name(".env")
web_env = REPO_ROOT / "web" / ".env.local"

if tools_env.exists():
    load_dotenv(tools_env, override=True)
if web_env.exists():
    load_dotenv(web_env, override=True)

token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
base_id = os.getenv("BASE_ID") or os.getenv("AIRTABLE_BASE_ID") or ""

print("token_len", len(token))
print("has_quote", '"' in token or "'" in token)
print("has_space", " " in token or "\t" in token)
print("dot_count", token.count("."))
print("base_id", base_id)

r = requests.get(
    "https://api.airtable.com/v0/meta/bases",
    headers={"Authorization": f"Bearer {token}"},
    timeout=60,
)
print("meta_bases_status", r.status_code)
print("body_prefix", r.text[:240])

if base_id:
    r2 = requests.get(
        f"https://api.airtable.com/v0/meta/bases/{base_id}/tables",
        headers={"Authorization": f"Bearer {token}"},
        timeout=60,
    )
    print("meta_tables_status", r2.status_code)
    print("tables_body_prefix", r2.text[:240])

    r3 = requests.get(
        f"https://api.airtable.com/v0/{base_id}/Enrollments?maxRecords=1",
        headers={"Authorization": f"Bearer {token}"},
        timeout=60,
    )
    print("records_api_status", r3.status_code)
    print("records_body_prefix", r3.text[:240])
