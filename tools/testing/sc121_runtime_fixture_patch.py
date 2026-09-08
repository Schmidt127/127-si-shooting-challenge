from pathlib import Path
p = Path('tools/testing/tests/test_057_runtime.mjs')
text = p.read_text()
old = '''  const weeks = new MockTable("Weeks", [{ name: "Start Date", type: "date" }], [
    new MockRecord(IDS.week, { "Start Date": "2026-08-02" }),
  ]);'''
new = '''  const weeks = new MockTable("Weeks", [
    { name: "Start Date", type: "date" },
    { name: "End Date", type: "date" },
  ], [
    new MockRecord(IDS.week, {
      "Start Date": "2026-08-02",
      "End Date": "2026-08-08",
    }),
  ]);'''
if old not in text:
    raise SystemExit('runtime Week fixture pattern missing')
p.write_text(text.replace(old, new, 1))
