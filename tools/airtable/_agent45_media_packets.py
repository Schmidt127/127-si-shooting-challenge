import csv, json, re
from collections import defaultdict
from pathlib import Path
from airtable_read import f, first_id, list_table, session
from media_paths import NEWSPAPER_PREP

PREVIEW = NEWSPAPER_PREP

def norm(s):
    return re.sub(r"\s+", " ", str(s or "").strip().lower())

def flat(v):
    if v is None: return ""
    if isinstance(v, list): return ", ".join(flat(x) for x in v if x)
    if isinstance(v, dict): return str(v.get("name") or v.get("id") or "").strip()
    return str(v).strip()

MAJOR_PATS = ["conquered goal","grade band champion","grade band runner","grade band third","daily shot submission","keep shooting","random drawing","thanks for playing","every bit counts","g.o.a.t","goat","champion"]
SKIP_PATS = ["homework recognition","zoom","motivation","dedication","coach feedback"]
TOP_WINNER_IDS = {"rechgOSWWFsOivzhX","recKlYEzTwrMaau6B","recVWVlDZMqhsUNhy","recAHTFTFc2q4y59i","recbJ71DHseETAQRP","recZZ4Op05Hg0FpQq","rec83ku1pTHmPNwRo","recLt8puScXPL3sjF","recOSUwW9lXQx6nWL","recNe84xp4corSBmm","recRMktT2fGDup8sm","recvY4UwL5udPp0CW","recnu4CWGYrotdywM","reck0urggYN376kXO","recOLIVrnOS57dH04"}

def is_major(name):
    n = norm(name)
    if any(s in n for s in SKIP_PATS): return False
    return any(p in n for p in MAJOR_PATS)

def fix_awards():
    athletes = json.loads((PREVIEW/"athlete-master-export.json").read_text(encoding="utf-8"))
    eids = {a["enrollment_id"] for a in athletes}
    sess = session()
    catalog = {r["id"]: flat(f(r).get("Award Name")) or flat(f(r).get("Email Display Name")) for r in list_table(sess,"Awards",["Award Name","Email Display Name"])}
    raw = list_table(sess,"Award Recipients",["Enrollment","Award"])
    by_e = defaultdict(list)
    for row in raw:
        rf = f(row); eid = first_id(rf.get("Enrollment"))
        if eid not in eids: continue
        for aid in rf.get("Award") or []:
            if isinstance(aid,str) and aid in catalog and catalog[aid]: by_e[eid].append(catalog[aid])
    out = []
    for a in athletes:
        eid = a["enrollment_id"]; all_aw = sorted(set(by_e.get(eid,[]))); major = [x for x in all_aw if is_major(x)]
        joined = norm("; ".join(major or all_aw))
        is_riley = eid == "recNe84xp4corSBmm" or norm(a["final_level"]) == "g.o.a.t"
        statewide = eid in TOP_WINNER_IDS or any(x in joined for x in ("grade band champion","grade band runner","grade band third","daily shot submission","conquered goal"))
        out.append({"enrollment_id":eid,"athlete_name":a["athlete_name"],"school_name":a["school_name"],"major_awards":"; ".join(major),"all_awards":"; ".join(all_aw),"major_award_count":len(major),"conquered_goal_award":"Yes" if "conquered goal" in joined else "No","goal_met":a["goal_met"],"mention_riley_goat":"Yes" if is_riley else "No","mention_statewide_winners":"Yes" if statewide else "No"})
    cols = list(out[0].keys())
    with open(PREVIEW/"award-recognition-export.csv","w",newline="",encoding="utf-8") as fh:
        w=csv.DictWriter(fh,fieldnames=cols); w.writeheader(); w.writerows(out)
    (PREVIEW/"award-recognition-export.json").write_text(json.dumps(out,indent=2),encoding="utf-8")
    return out

NEWSPAPERS = [
 {"id":"NP-BEL-NEWS","name":"Belgrade News","city":"Belgrade","coverage":"Belgrade, Manhattan, Amsterdam-Churchill","website":"https://www.belgrade-news.com","email":"not found","sports":"not found","source":"https://www.belgrade-news.com/site/about_us.html","subtype":"local weekly","keys":["manhattan christian","manhattan","belgrade"]},
 {"id":"NP-BZN-CHRON","name":"Bozeman Daily Chronicle","city":"Bozeman","coverage":"Gallatin County","website":"https://www.bozemandailychronicle.com","email":"not found","sports":"not found","source":"https://www.bozemandailychronicle.com","subtype":"regional daily","keys":["bozeman","manhattan","belgrade"]},
 {"id":"NP-GF-TRIB","name":"Great Falls Tribune","city":"Great Falls","coverage":"North-central Montana","website":"https://www.greatfallstribune.com","email":"not found","sports":"not found","source":"https://www.greatfallstribune.com","subtype":"regional daily","keys":["great falls","belt","centerville","cascade","highwood","fairfield","conrad","ledger","meadowlark","power","greenfield","fort benton","clancy","jefferson","stanford","broadwater","townsend"]},
 {"id":"NP-MIS-MISS","name":"Missoulian","city":"Missoula","coverage":"Missoula County","website":"https://missoulian.com","email":"not found","sports":"not found","source":"https://missoulian.com","subtype":"regional daily","keys":["missoula","frenchtown","hellgate","loyola","st. joe","st joe"]},
 {"id":"NP-BIL-GAZ","name":"Billings Gazette","city":"Billings","coverage":"Yellowstone County","website":"https://billingsgazette.com","email":"not found","sports":"not found","source":"https://billingsgazette.com","subtype":"regional daily","keys":["billings","highland","lewis & clark","will james","bridger"]},
 {"id":"NP-CCD-NEWS","name":"Carbon County News","city":"Red Lodge","coverage":"Carbon County","website":"https://www.carboncountynews.com","email":"not found","sports":"not found","source":"https://www.carboncountynews.com","subtype":"local weekly","keys":["bridger"]},
 {"id":"NP-ANA-STD","name":"Montana Standard","city":"Butte","coverage":"Butte-Anaconda","website":"https://mtstandard.com","email":"not found","sports":"not found","source":"https://mtstandard.com","subtype":"regional daily","keys":["anaconda"]},
 {"id":"NP-TWN-MAD","name":"Madisonian","city":"Virginia City","coverage":"Madison County","website":"https://www.madisoniannews.com","email":"not found","sports":"not found","source":"https://www.madisoniannews.com","subtype":"local weekly","keys":["townsend","broadwater","sheridan"]},
 {"id":"NP-CFD-IND","name":"Conrad Independent","city":"Conrad","coverage":"Pondera County","website":"https://www.conradindependent.com","email":"not found","sports":"not found","source":"https://www.conradindependent.com","subtype":"local weekly","keys":["conrad","ledger","meadowlark"]},
 {"id":"NP-FB-PRESS","name":"River Press","city":"Fort Benton","coverage":"Fort Benton area","website":"https://www.riverpressnews.com","email":"not found","sports":"not found","source":"https://www.riverpressnews.com","subtype":"local weekly","keys":["fort benton"]},
 {"id":"NP-RAV-REP","name":"Ravalli Republic","city":"Hamilton","coverage":"Bitterroot Valley","website":"https://ravallirepublic.com","email":"not found","sports":"not found","source":"https://ravallirepublic.com","subtype":"regional daily","keys":["darby"]},
 {"id":"NP-DEC-TIMES","name":"Times-News","city":"Twin Falls","coverage":"Magic Valley Idaho","website":"https://magicvalley.com","email":"not found","sports":"not found","source":"https://magicvalley.com","subtype":"regional daily","keys":["declo"]},
 {"id":"NP-STAN-JBP","name":"Judith Basin Press","city":"Stanford","coverage":"Judith Basin County","website":"https://www.judithbasinpress.com","email":"not found","sports":"not found","source":"https://www.judithbasinpress.com","subtype":"local weekly","keys":["stanford"]},
 {"id":"NP-WIB-PION","name":"Wibaux County Pioneer","city":"Wibaux","coverage":"Wibaux County","website":"https://www.wibauxpioneer.com","email":"not found","sports":"not found","source":"https://www.wibauxpioneer.com","subtype":"local weekly","keys":["wibaux"]},
 {"id":"NP-WP-HERALD","name":"Wolf Point Herald-News","city":"Wolf Point","coverage":"Roosevelt County","website":"https://www.wolfpointherald.com","email":"not found","sports":"not found","source":"https://www.wolfpointherald.com","subtype":"local weekly","keys":["wolf point"]},
]

RADIO = [
 {"group":"RG-GALLATIN","area":"Gallatin Valley / Manhattan Christian","station":"KBLL","call":"KBLL","city":"Bozeman","format":"News/Talk","website":"https://kbll.com","email":"not found","contact":"not found","source":"https://www.mtbroadcasters.org","coverage":"Bozeman, Belgrade, Manhattan","why":"Local news/talk reach in Gallatin Valley","keys":["manhattan","bozeman","belgrade","manhattan christian"]},
 {"group":"RG-GALLATIN","area":"Gallatin Valley / Manhattan Christian","station":"KMMS","call":"KMMS","city":"Bozeman","format":"News/Talk","website":"https://kmmsam.com","email":"not found","contact":"not found","source":"https://www.mtbroadcasters.org","coverage":"Bozeman area","why":"Alternative Bozeman talk option","keys":["manhattan","bozeman","belgrade","manhattan christian"]},
 {"group":"RG-GALLATIN","area":"Gallatin Valley / Manhattan Christian","station":"Yellowstone Public Radio","call":"YPR","city":"Bozeman","format":"NPR/News","website":"https://www.ypradio.org","email":"news@ypradio.org","contact":"Ruth Eddy, Bozeman Reporter","source":"https://www.ypradio.org/contact-ypr","coverage":"Southwest Montana","why":"NPR with Bozeman reporter","keys":["manhattan","bozeman","belgrade","manhattan christian","townsend","sheridan"]},
 {"group":"RG-BILLINGS","area":"Billings area","station":"KULR-8","call":"KULR","city":"Billings","format":"TV News","website":"https://www.kulr8.com","email":"News@kulr.com","contact":"not found","source":"https://www.mtbroadcasters.org","coverage":"Billings","why":"Billings TV news","keys":["billings","highland","lewis & clark","will james"]},
 {"group":"RG-BILLINGS","area":"Billings area","station":"Yellowstone Public Radio","call":"YPR","city":"Billings","format":"NPR/News","website":"https://www.ypradio.org","email":"news@ypradio.org","contact":"Kayla Desroches","source":"https://www.ypradio.org/contact-ypr","coverage":"Billings/eastern MT","why":"Billings NPR newsroom","keys":["billings","bridger"]},
 {"group":"RG-MISSOULA","area":"Missoula County","station":"Montana Public Radio","call":"MTPR","city":"Missoula","format":"NPR/News","website":"https://www.mtpr.org","email":"news@mtpr.org","contact":"Eric Whitney","source":"https://www.mtpr.org/contact-mtpr-news","coverage":"Western Montana","why":"Missoula NPR newsroom","keys":["missoula","frenchtown","hellgate","loyola","st. joe","st joe"]},
 {"group":"RG-MISSOULA","area":"Missoula County","station":"KTMF ABC FOX Montana","call":"KTMF","city":"Missoula","format":"TV News","website":"https://www.montanarightnow.com","email":"not found","contact":"406-721-NEWS","source":"https://www.montanarightnow.com/site/contact.html","coverage":"Missoula","why":"Missoula TV news","keys":["missoula","frenchtown","hellgate","loyola","st. joe","st joe"]},
 {"group":"RG-GREAT-FALLS","area":"Great Falls / north-central","station":"KFBB ABC FOX Montana","call":"KFBB","city":"Great Falls","format":"TV News","website":"https://www.montanarightnow.com","email":"not found","contact":"406-453-4370","source":"https://www.montanarightnow.com/site/contact.html","coverage":"Great Falls region","why":"North-central TV news","keys":["great falls","belt","centerville","cascade","highwood","fairfield","conrad","ledger","power","greenfield","fort benton","clancy","jefferson","stanford","broadwater","townsend","anaconda"]},
 {"group":"RG-GREAT-FALLS","area":"Great Falls / north-central","station":"KMON","call":"KMON","city":"Great Falls","format":"News/Talk","website":"https://kmon.com","email":"not found","contact":"not found","source":"https://www.mtbroadcasters.org","coverage":"Great Falls","why":"Great Falls radio talk","keys":["great falls","belt","centerville","cascade","highwood","fairfield","conrad","ledger","power","greenfield","fort benton","clancy","jefferson","stanford"]},
 {"group":"RG-BITTERROOT","area":"Bitterroot Valley","station":"Montana Public Radio","call":"MTPR","city":"Missoula","format":"NPR/News","website":"https://www.mtpr.org","email":"news@mtpr.org","contact":"not found","source":"https://www.mtpr.org/contact-mtpr-news","coverage":"Bitterroot","why":"Darby/Hamilton coverage","keys":["darby"]},
 {"group":"RG-DECLO-ID","area":"Declo Idaho","station":"Magic Valley radio cluster","call":"not found","city":"Twin Falls","format":"not found","website":"https://magicvalley.com","email":"not found","contact":"not found","source":"https://magicvalley.com","coverage":"Magic Valley ID","why":"Declo is Idaho","keys":["declo"]},
 {"group":"RG-WIBAUX","area":"Wibaux County","station":"KATL","call":"KATL","city":"Glendive","format":"Country","website":"not found","email":"not found","contact":"not found","source":"https://www.mtbroadcasters.org","coverage":"Eastern MT","why":"Nearest regional radio","keys":["wibaux"]},
 {"group":"RG-WOLF-POINT","area":"Wolf Point","station":"KPQX","call":"KPQX","city":"Glasgow","format":"not found","website":"not found","email":"not found","contact":"not found","source":"https://www.mtbroadcasters.org","coverage":"Northeast MT","why":"Regional NE Montana","keys":["wolf point"]},
]

def athlete_blob(a):
    return norm(" ".join([a.get("school_name",""), a.get("city_town","")]))

def match_keys(blob, keys):
    return any(k in blob for k in keys)

def first_name(name):
    return name.split(",")[0].strip() if "," in name else name.split()[0]

def priority(a, aw):
    lvl = norm(a["final_level"])
    if lvl in ("g.o.a.t","pro","sharpshooter") or aw.get("mention_statewide_winners")=="Yes": return "High"
    if lvl in ("hot hand","dangerous shooter") or a["total_shots_counted"] >= 5000: return "High"
    if a["total_shots_counted"] >= 2000: return "Medium"
    return "Low"

def headline(a):
    return f"{first_name(a['athlete_name'])} reaches {a['final_level'] or 'new level'} in 127 SI Shooting Challenge ({a['total_shots_counted']:,} counted shots)"

def emphasis(a):
    parts = [f"Lead with final level ({a['final_level']}). Always include {a['total_shots_counted']:,} total counted shots."]
    if a.get("goal_met")=="Yes": parts.append("Highlight goal met.")
    if a.get("homework_count"): parts.append(f"Homework: {a['homework_count']}.")
    if a.get("video_count"): parts.append(f"Videos reviewed: {a['video_count']}.")
    if a.get("zoom_count"): parts.append(f"Zooms: {a['zoom_count']}.")
    if a.get("longest_streak_days"): parts.append(f"Longest streak: {a['longest_streak_days']} days.")
    parts.append("Explain levels reward complete development: shooting, consistency, homework, videos, Zooms, streaks, accountability.")
    return " ".join(parts)

def local_angle(a):
    return f"{a['school_name']} ({a['city_town'] or 'local'}) athlete earned {a['final_level']} in a level-based offseason shooting program."

def read_length(a):
    if a["total_shots_counted"] >= 8000 or norm(a["final_level"]) in ("g.o.a.t","pro","sharpshooter"): return "60 sec"
    if a["total_shots_counted"] >= 3000: return "30 sec"
    return "15 sec"

def run_media(athletes):
    nrows = []
    for o in NEWSPAPERS:
        schools = sorted({a["school_name"] for a in athletes if match_keys(athlete_blob(a), o["keys"])})
        if not schools: continue
        towns = sorted({a["city_town"] for a in athletes if match_keys(athlete_blob(a), o["keys"]) and a["city_town"]})
        nrows.append({"outlet_id":o["id"],"outlet_name":o["name"],"outlet_city":o["city"],"coverage_area":o["coverage"],"website":o["website"],"contact_email":o["email"],"sports_contact":o["sports"],"source_url":o["source"],"outlet_subtype":o["subtype"],"schools_towns_covered":"; ".join(schools+towns),"athlete_count":sum(1 for a in athletes if match_keys(athlete_blob(a),o["keys"]))})
    cols = list(nrows[0].keys())
    with open(PREVIEW/"local-newspaper-targets.csv","w",newline="",encoding="utf-8") as fh:
        w=csv.DictWriter(fh,fieldnames=cols); w.writeheader(); w.writerows(nrows)
    (PREVIEW/"local-newspaper-targets.json").write_text(json.dumps(nrows,indent=2),encoding="utf-8")
    rrows = []
    for r in RADIO:
        cov = [a for a in athletes if match_keys(athlete_blob(a), r["keys"])]
        if not cov: continue
        rrows.append({"radio_group_id":r["group"],"area_focus":r["area"],"station_name":r["station"],"call_sign":r["call"],"station_city":r["city"],"format":r["format"],"website":r["website"],"contact_email":r["email"],"news_sports_contact":r["contact"],"source_url":r["source"],"coverage_area":r["coverage"],"why_useful":r["why"],"athletes_schools_covered":"; ".join(sorted({a["school_name"] for a in cov}))})
    rcols = list(rrows[0].keys())
    with open(PREVIEW/"potential-radio-targets.csv","w",newline="",encoding="utf-8") as fh:
        w=csv.DictWriter(fh,fieldnames=rcols); w.writeheader(); w.writerows(rrows)
    (PREVIEW/"potential-radio-targets.json").write_text(json.dumps(rrows,indent=2),encoding="utf-8")
    notes = "# Local media research notes\n\nLevel-focused story: lead with Final Level, always include Total Shots Counted.\n\nBelgrade News verified for Manhattan/Belgrade (belgrade-news.com/about).\nEmails `not found` unless on public contact page.\nRadio: user selects 1-3 stations per area.\nDeclo uses Idaho outlets. Manhattan Christian uses Belgrade News + Bozeman Chronicle.\n"
    (PREVIEW/"local-media-research-notes.md").write_text(notes,encoding="utf-8")
    print("Agent4:", len(nrows), "outlets,", len(rrows), "radio options")
    return nrows, rrows

def assign_outlets(athletes):
    mapping = defaultdict(list)
    for a in athletes:
        blob = athlete_blob(a)
        matched = [o for o in NEWSPAPERS if match_keys(blob, o["keys"])]
        if a["school_name"] in ("Hellgate","Frenchtown","Loyola Sacred Heart","St. Joe's"): matched = [o for o in matched if o["id"]=="NP-MIS-MISS"]
        elif a["school_name"] in ("Highland","Lewis & Clark Middle School","Will James"): matched = [o for o in matched if o["id"]=="NP-BIL-GAZ"]
        elif a["school_name"]=="Anaconda": matched = [o for o in matched if o["id"]=="NP-ANA-STD"]
        elif a["school_name"]=="Manhattan Christian": matched = [o for o in NEWSPAPERS if o["id"] in ("NP-BEL-NEWS","NP-BZN-CHRON")]
        elif a["school_name"] in ("Bridger","Bridger Elementary School"): matched = [o for o in NEWSPAPERS if o["id"] in ("NP-CCD-NEWS","NP-BIL-GAZ")]
        if not matched: matched = [o for o in NEWSPAPERS if o["id"]=="NP-GF-TRIB"]
        for o in matched:
            if o not in mapping[a["enrollment_id"]]: mapping[a["enrollment_id"]].append(o)
    return mapping

def assign_radio(athletes):
    mapping = defaultdict(set)
    for a in athletes:
        blob = athlete_blob(a)
        for r in RADIO:
            if match_keys(blob, r["keys"]): mapping[a["enrollment_id"]].add(r["group"])
        if not mapping[a["enrollment_id"]]: mapping[a["enrollment_id"]].add("RG-GREAT-FALLS")
    return mapping

def run_packets(athletes, awards, heads):
    aw = {x["enrollment_id"]: x for x in awards}
    hd = {x["enrollment_id"]: x for x in heads}
    outlet_map = assign_outlets(athletes)
    radio_map = assign_radio(athletes)
    packet_rows = []
    for a in athletes:
        eid = a["enrollment_id"]; meta = aw.get(eid,{}); hs = hd.get(eid,{})
        for o in outlet_map.get(eid, []):
            packet_rows.append({
                "packet_id": f"{o['id']}-{eid[:8]}","outlet_name":o["name"],"outlet_type":"Newspaper","outlet_city":o["city"],"coverage_area":o["coverage"],"outlet_website":o["website"],"contact_email":o["email"],"sports_news_contact":o["sports"],"source_url":o["source"],"outlet_subtype":o["subtype"],"schools_towns_covered":o["coverage"],"athlete_included":a["athlete_name"],"athlete_grade":a["grade"],"athlete_gender":a["gender"],"athlete_school":a["school_name"],"athlete_city_town":a["city_town"],"athlete_total_shots_counted":a["total_shots_counted"],"athlete_target_goal_shots":a["target_goal_shots"],"goal_met_status":a["goal_met"],"final_level_current_level":a["final_level"],"level_status":a.get("level_status",""),"lifetime_xp":a["lifetime_xp"],"major_awards":meta.get("major_awards",""),"homework_count":a["homework_count"],"video_count":a["video_count"],"zoom_count":a["zoom_count"],"longest_streak":a["longest_streak_days"],"headshot_available":hs.get("headshot_available","No"),"headshot_filename_or_metadata":hs.get("headshot_filename",""),"suggested_local_angle":local_angle(a),"suggested_headline":headline(a),"suggested_article_emphasis":emphasis(a),"should_mention_riley_goat":meta.get("mention_riley_goat","No"),"should_mention_statewide_top_winners":meta.get("mention_statewide_winners","No"),"priority":priority(a,meta),"manual_review_needs":"" if a["city_town"] else "Verify city/town","confidence":"High",
            })
    pcols = list(packet_rows[0].keys())
    with open(PREVIEW/"packet-plan-newspapers.csv","w",newline="",encoding="utf-8") as fh:
        w=csv.DictWriter(fh,fieldnames=pcols); w.writeheader(); w.writerows(packet_rows)
    (PREVIEW/"packet-plan-newspapers.json").write_text(json.dumps(packet_rows,indent=2),encoding="utf-8")
    radio_rows = []
    for r in RADIO:
        cov = [a for a in athletes if match_keys(athlete_blob(a), r["keys"])]
        if not cov: continue
        radio_rows.append({"radio_group_id":r["group"],"area_school_town_focus":r["area"],"potential_radio_station_name":r["station"],"call_sign":r["call"],"station_city":r["city"],"format":r["format"],"website":r["website"],"contact_email":r["email"],"news_sports_community_contact":r["contact"],"source_url":r["source"],"coverage_area":r["coverage"],"why_it_may_be_useful":r["why"],"athletes_schools_it_may_cover":"; ".join(sorted({a["school_name"] for a in cov})),"suggested_read_length":max((read_length(a) for a in cov), key=lambda x:["15 sec","30 sec","60 sec"].index(x)),"should_mention_riley_goat":"Yes" if any(norm(a["final_level"])=="g.o.a.t" for a in cov) else "No","should_mention_statewide_top_winners":"Yes" if any(a["enrollment_id"] in TOP_WINNER_IDS for a in cov) else "No","user_selected_primary_radio_station":"","user_selected_backup_radio_station":"","user_selected_optional_third_station":"","user_approval_status":"Not Reviewed","confidence":"High" if r["email"]!="not found" else "Medium"})
    rcols = list(radio_rows[0].keys())
    with open(PREVIEW/"packet-plan-radio-options.csv","w",newline="",encoding="utf-8") as fh:
        w=csv.DictWriter(fh,fieldnames=rcols); w.writeheader(); w.writerows(radio_rows)
    (PREVIEW/"packet-plan-radio-options.json").write_text(json.dumps(radio_rows,indent=2),encoding="utf-8")
    checklist = []
    for a in athletes:
        eid = a["enrollment_id"]; npkts = [o["name"] for o in outlet_map.get(eid,[])]; rgroups = sorted(radio_map.get(eid,set())); hs = hd.get(eid,{}).get("headshot_available","No")
        status = "Complete"; notes = []
        if not npkts: status = "Missing Newspaper"
        if not rgroups: status = "Missing Radio" if status=="Complete" else "Missing Both"
        if not a["city_town"]: status = "Needs Location Review"; notes.append("missing city")
        if hs=="No": status = "Needs Headshot Review"; notes.append("missing headshot")
        checklist.append({"athlete_name":a["athlete_name"],"grade":a["grade"],"gender":a["gender"],"school":a["school_name"],"city_town":a["city_town"],"total_shots_counted":a["total_shots_counted"],"final_level_current_level":a["final_level"],"goal_met_status":a["goal_met"],"major_awards":aw.get(eid,{}).get("major_awards",""),"newspaper_packets_assigned":"; ".join(npkts),"count_newspaper_packets":len(npkts),"potential_radio_groups_assigned":"; ".join(rgroups),"count_radio_groups":len(rgroups),"headshot_available":hs,"coverage_status":status,"notes":"; ".join(notes)})
    ccols = list(checklist[0].keys())
    with open(PREVIEW/"master-athlete-coverage-checklist.csv","w",newline="",encoding="utf-8") as fh:
        w=csv.DictWriter(fh,fieldnames=ccols); w.writeheader(); w.writerows(checklist)
    fully = sum(1 for c in checklist if c["coverage_status"]=="Complete")
    miss_np = [c for c in checklist if not c["count_newspaper_packets"]]
    miss_r = [c for c in checklist if not c["count_radio_groups"]]
    miss_hs = [c for c in checklist if c["headshot_available"]=="No"]
    summary = [f"# Packet plan summary\n\n- 10+ shot athletes: {len(athletes)}\n- Newspaper packet rows: {len(packet_rows)}\n- Radio option rows: {len(radio_rows)}\n- Athletes fully covered: {fully}\n- Missing newspaper: {len(miss_np)}\n- Missing radio: {len(miss_r)}\n- Missing headshots: {len(miss_hs)}\n\n## Level-focused direction\nLead with Final Level; always include Total Shots Counted; explain complete development.\n\n## Next step for ChatGPT\nReview checklist, Coach picks radio stations, then draft sample articles per outlet cluster.\n"]
    (PREVIEW/"packet-plan-summary.md").write_text("\n".join(summary),encoding="utf-8")
    amb = ["# Missing or ambiguous athletes\n"]
    amb.append("## No newspaper packet\n" + ("- None" if not miss_np else "\n".join(f"- {c['athlete_name']}" for c in miss_np)))
    amb.append("## No radio group\n" + ("- None" if not miss_r else "\n".join(f"- {c['athlete_name']}" for c in miss_r)))
    loc = [c for c in checklist if c["coverage_status"]=="Needs Location Review"]
    amb.append("## Location review\n" + ("\n".join(f"- {c['athlete_name']} ({c['school']})" for c in loc) if loc else "- None"))
    amb.append("## Missing headshots\n" + ("- None" if not miss_hs else "\n".join(f"- {c['athlete_name']}" for c in miss_hs)))
    amb.append("\n## Fixes\n- Normalize Wibaux city typo.\n- Manhattan Christian: verify Manhattan vs Bozeman dateline.\n- Declo: Idaho outlets only.")
    (PREVIEW/"missing-or-ambiguous-athletes.md").write_text("\n".join(amb),encoding="utf-8")
    by_group = defaultdict(list)
    for r in radio_rows: by_group[r["radio_group_id"]].append(r["potential_radio_station_name"])
    review = ["# User review needed\n\n## Radio station picks (1-3 per area)\n"]
    for g, stations in sorted(by_group.items()):
        if len(stations) >= 2: review.append(f"- **{g}**: {', '.join(stations)}")
    review += ["\n## Check before writing\n- Bridger: local weekly vs Billings\n- Riley/G.O.A.T. mention policy\n- Award names in award-recognition-export.csv"]
    (PREVIEW/"user-review-needed.md").write_text("\n".join(review),encoding="utf-8")
    (PREVIEW/"README.md").write_text("# Newspaper/Radio prep preview\n\nSee packet-plan-summary.md for overview.\n",encoding="utf-8")
    print("Agent5:", len(packet_rows), "newspaper rows,", len(checklist), "checklist,", fully, "complete")

if __name__ == "__main__":
    awards = fix_awards()
    athletes = json.loads((PREVIEW/"athlete-master-export.json").read_text(encoding="utf-8"))
    heads = json.loads((PREVIEW/"headshot-inventory.json").read_text(encoding="utf-8"))
    run_media(athletes)
    run_packets(athletes, awards, heads)
