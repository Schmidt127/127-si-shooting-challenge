import csv, json, re
from collections import defaultdict
from pathlib import Path
from airtable_read import f, first_id, list_table, session

PREVIEW = Path("_preview/newspaper-radio-prep")
athletes = json.loads((PREVIEW / "athlete-master-export.json").read_text(encoding="utf-8"))
eids = {a["enrollment_id"] for a in athletes}
by_name = {a["enrollment_id"]: a for a in athletes}

def flat(v):
    if v is None: return ""
    if isinstance(v, list): return ", ".join(flat(x) for x in v if x)
    if isinstance(v, dict): return str(v.get("name") or v.get("id") or "").strip()
    return str(v).strip()

def norm(s):
    return re.sub(r"\s+", " ", str(s or "").strip().lower())

MAJOR = ["conquered goal","grade band champion","grade band runner","grade band second","grade band third","grade band 3rd","daily shot submission","keep shooting","random drawing","thanks for playing","every bit counts","g.o.a.t","goat","riley","statewide","champion"]
SKIP = ["homework - submitted","homework submitted"]

def is_major(name):
    n = norm(name)
    if any(s in n for s in SKIP): return False
    return any(p in n for p in MAJOR)

sess = session()
awards_raw = list_table(sess, "Award Recipients", ["Enrollment","Award","Award Category Lookup"])
by_e = defaultdict(list)
for row in awards_raw:
    rf = f(row)
    eid = first_id(rf.get("Enrollment"))
    if eid not in eids: continue
    nm = flat(rf.get("Award")) or flat(rf.get("Award Category Lookup"))
    if nm: by_e[eid].append(nm)

out = []
for a in athletes:
    eid = a["enrollment_id"]
    all_aw = sorted(set(by_e.get(eid, [])))
    major = [x for x in all_aw if is_major(x)]
    joined = norm("; ".join(major or all_aw))
    out.append({
        "enrollment_id": eid,
        "athlete_name": a["athlete_name"],
        "school_name": a["school_name"],
        "major_awards": "; ".join(major),
        "all_awards": "; ".join(all_aw),
        "major_award_count": len(major),
        "conquered_goal_award": "Yes" if "conquered goal" in joined else "No",
        "goal_met": a["goal_met"],
        "mention_riley_goat": "Yes" if any(x in joined for x in ("riley","g.o.a.t","goat")) else "No",
        "mention_statewide_winners": "Yes" if any(x in joined for x in ("statewide","grade band champion","grade band runner","grade band third","daily shot")) else "No",
    })
cols = list(out[0].keys())
with open(PREVIEW/"award-recognition-export.csv","w",newline="",encoding="utf-8") as fh:
    w=csv.DictWriter(fh,fieldnames=cols); w.writeheader(); w.writerows(out)
(PREVIEW/"award-recognition-export.json").write_text(json.dumps(out,indent=2),encoding="utf-8")
print("Agent2:", len(out))

# Agent 3 headshots
def head_meta(v):
    if not v: return {"has":False,"filename":"","url":"","id":""}
    items = v if isinstance(v,list) else [v]
    for it in items:
        if isinstance(it,dict) and it.get("url"):
            return {"has":True,"filename":str(it.get("filename") or ""),"url":str(it.get("url") or ""),"id":str(it.get("id") or "")}
    return {"has":False,"filename":"","url":"","id":""}

recs = list_table(sess, "Enrollments", ["Athlete Headshot"])
heads = {r["id"]: head_meta(f(r).get("Athlete Headshot")) for r in recs if r["id"] in eids}
hout=[]
for a in athletes:
    m = heads.get(a["enrollment_id"], head_meta(None))
    hout.append({
        "enrollment_id": a["enrollment_id"],
        "athlete_name": a["athlete_name"],
        "school_name": a["school_name"],
        "headshot_available": "Yes" if m["has"] else "No",
        "headshot_filename": m["filename"],
        "headshot_url": m["url"],
        "headshot_attachment_id": m["id"],
    })
hcols = list(hout[0].keys())
with open(PREVIEW/"headshot-inventory.csv","w",newline="",encoding="utf-8") as fh:
    w=csv.DictWriter(fh,fieldnames=hcols); w.writeheader(); w.writerows(hout)
(PREVIEW/"headshot-inventory.json").write_text(json.dumps(hout,indent=2),encoding="utf-8")
missing = sum(1 for r in hout if r["headshot_available"]=="No")
print("Agent3:", len(hout), "missing headshots:", missing)
