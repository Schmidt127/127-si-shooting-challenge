import json
from pathlib import Path

p = Path(
    r"C:\Users\mschmidt_fairfield\.cursor\projects"
    r"\c-Users-mschmidt-fairfield-Documents-GitHub-127-si-shooting-challenge"
    r"\agent-transcripts\e66cd234-df93-4fb6-82b3-0740af41726a"
    r"\e66cd234-df93-4fb6-82b3-0740af41726a.jsonl"
)
marker = "Fresh Airtable Source - v2"
for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
    if marker in line:
        print("line", i, "len", len(line), "hook", "gateway:CustomWebHook" in line)
        obj = json.loads(line)
        t = obj["message"]["content"][0]["text"]
        print("text len", len(t), "starts", t[:80].replace("\n", "\\n"))
