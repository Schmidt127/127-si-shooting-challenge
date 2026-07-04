#!/usr/bin/env python3
"""Generate 12 radio media kits for immediate review and distribution."""

from __future__ import annotations

import csv
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from media_paths import NEWSPAPER_PREP, radio_root

BASE = NEWSPAPER_PREP
MANIFEST = Path(__file__).resolve().parent / "_preview" / "final-emails" / "manifest.json"
OUT = radio_root()
LEADERBOARD = "www.fairfieldbasketballclub.com/leaderboard"

# Public-facing totals (final-summary-2026-07-03-v2 logic — satisfactory HW / reviewed video only)
PUBLIC_HOMEWORK_COMPLETIONS = 122
PUBLIC_VIDEOS_REVIEWED = 129

MARKETS = [
    {
        "id": "01",
        "slug": "ksen-shelby",
        "title": "KSEN Radio (Shelby)",
        "communities": [
            "Shelby",
            "Cut Bank",
            "Valier",
            "Conrad",
            "Choteau",
            "Fairfield",
            "Greenfield",
            "Power",
            "Ledger",
        ],
        "athletes": [
            "Leyton Bakken",
            "Colton Dahl",
            "Conley Dahl",
            "Eli Cowgill",
            "Emmet Gustafson",
            "Connor Judisch",
            "Leiko Judisch",
            "Lolo Judisch",
        ],
    },
    {
        "id": "02",
        "slug": "great-falls",
        "title": "Great Falls Radio",
        "communities": [
            "Great Falls",
            "Fort Benton",
            "Highwood",
            "Cascade",
            "Belt",
            "Centerville",
        ],
        "athletes": [
            "Jackson Newcomer",
            "Lincoln Newcomer",
            "Charlotte Davison",
            "Nora Davison",
            "Aspyn Bogart",
            "Kenady Bogart",
            "Andrew Brady",
            "Benny Brady",
            "Matthew Brady",
            "Clara Hardy",
            "Daniel Costa",
            "Milton Costa",
        ],
    },
    {
        "id": "03",
        "slug": "helena",
        "title": "Helena Radio",
        "communities": ["Helena", "Clancy", "Townsend"],
        "athletes": ["William Buresh", "Kinsley Heggen"],
    },
    {
        "id": "04",
        "slug": "lewistown",
        "title": "Lewistown Radio",
        "communities": ["Lewistown", "Stanford"],
        "athletes": ["KayDe VandenBos"],
    },
    {
        "id": "05",
        "slug": "bozeman-manhattan",
        "title": "Bozeman / Manhattan Radio",
        "communities": ["Bozeman", "Manhattan", "Belgrade", "Gallatin Valley"],
        "athletes": [
            "Carson Hubers",
            "Blake Hubers",
            "Mckinley Hubers",
            "Brayden Elders",
            "Ryder Elders",
            "Jackson Elders",
            "Tracen Heidema",
            "Kinsley Heidema",
            "Allie Heidema",
            "Dawson Schutter",
            "Tristan Schutter",
            "Koen Kimm",
            "Liam Kimm",
            "Lyle Kimm",
        ],
    },
    {
        "id": "06",
        "slug": "missoula",
        "title": "Missoula Radio",
        "communities": ["Missoula", "Frenchtown", "Darby", "Bitterroot Valley"],
        "athletes": [
            "Riley Geraghty",
            "Jacob Schwenk",
            "Colbie Schwenk",
            "Camden Clark",
            "McKinley Clark",
            "Cash Wieler",
            "Sam Tingley",
            "Jensen Klimkiewicz",
            "Lewis Talbitzer",
        ],
    },
    {
        "id": "07",
        "slug": "billings",
        "title": "Billings Radio",
        "communities": ["Billings", "Bridger", "Yellowstone County"],
        "athletes": [
            "Remington Hill",
            "Easton Hill",
            "Hadley Hill",
            "Tayin Harsha",
            "Hartlie Ehrlich",
            "Seyler Ehrlich",
            "Alyna Keyser",
            "Raya Keyser",
        ],
    },
    {
        "id": "08",
        "slug": "butte-anaconda",
        "title": "Butte / Anaconda Radio",
        "communities": ["Butte", "Anaconda"],
        "athletes": ["Maizee Mitchell"],
    },
    {
        "id": "09",
        "slug": "madison-county",
        "title": "Madison County Radio",
        "communities": ["Sheridan", "Virginia City", "Madison County"],
        "athletes": ["Monroe Mailey", "Myla Mailey"],
    },
    {
        "id": "10",
        "slug": "wibaux",
        "title": "Wibaux Radio",
        "communities": ["Wibaux", "Glendive", "Eastern Montana"],
        "athletes": [
            "Josalin Helvik",
            "Alec Helvik",
            "Jamesy Helvik",
            "Jolie Helvik",
            "Jordyn Nelson",
            "Jack Nelson",
        ],
    },
    {
        "id": "11",
        "slug": "wolf-point",
        "title": "Wolf Point Radio",
        "communities": ["Wolf Point", "Roosevelt County", "Northeast Montana"],
        "athletes": ["Sophia Ricker"],
    },
    {
        "id": "12",
        "slug": "magic-valley",
        "title": "Magic Valley Radio",
        "communities": ["Declo", "Magic Valley", "Southern Idaho"],
        "athletes": ["Dayton Fox"],
    },
]


def norm_name(s: str) -> str:
    return re.sub(r"\s+", " ", str(s or "").strip()).lower()


def norm_key(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", norm_name(s))


def fmt_int(n: int | float) -> str:
    return f"{int(n):,}"


def load_athletes() -> dict[str, dict]:
    rows = {}
    for row in csv.DictReader(open(BASE / "athlete-master-export.csv", newline="", encoding="utf-8")):
        rows[norm_key(row["athlete_name"])] = row
    return rows


def load_awards() -> dict[str, dict]:
    rows = {}
    for row in csv.DictReader(open(BASE / "award-recognition-export.csv", newline="", encoding="utf-8")):
        rows[row["enrollment_id"]] = row
    return rows


def resolve_athlete(requested: str, athletes: dict[str, dict]) -> tuple[dict | None, str | None]:
    key = norm_key(requested)
    if key in athletes:
        return athletes[key], None
    # fuzzy: match last name + first token
    parts = norm_name(requested).split()
    if not parts:
        return None, f"Unknown athlete name: {requested}"
    last = parts[-1]
    matches = [
        row
        for k, row in athletes.items()
        if norm_name(row["athlete_name"]).split()[-1] == last
        and norm_name(row["athlete_name"]).split()[0].startswith(parts[0][:3])
    ]
    if len(matches) == 1:
        return matches[0], None
    if len(matches) > 1:
        names = "; ".join(r["athlete_name"] for r in matches)
        return None, f"Ambiguous match for {requested}: {names}"
    return None, f"No Airtable match for: {requested}"


def load_manifest_totals() -> tuple[int, int]:
    """Satisfactory homework + coach-reviewed videos from final email build."""
    if not MANIFEST.exists():
        return PUBLIC_HOMEWORK_COMPLETIONS, PUBLIC_VIDEOS_REVIEWED
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    hw = vid = 0
    for pkg in data.get("packages", []):
        counts = pkg.get("counts", {})
        hw += int(counts.get("homeworkDone", 0))
        vid += int(counts.get("videoReviewed", 0))
    return hw or PUBLIC_HOMEWORK_COMPLETIONS, vid or PUBLIC_VIDEOS_REVIEWED


def statewide_stats(athlete_rows: list[dict]) -> dict:
    schools = {r["school_name"] for r in athlete_rows}
    towns = {r["city_town"] for r in athlete_rows if r.get("city_town")}
    levels = Counter(r["final_level"] for r in athlete_rows)
    public_hw, public_vid = load_manifest_totals()
    rollup_hw = sum(int(r["homework_count"]) for r in athlete_rows)
    rollup_vid = sum(int(r["video_count"]) for r in athlete_rows)
    return {
        "season": "2025–2026 (Week 0 through Week 10; official shooting window 61 days)",
        "enrolled_active": 91,
        "qualifying_athletes": len(athlete_rows),
        "schools": len(schools),
        "communities": len(towns),
        "total_shots": sum(int(r["total_shots_counted"]) for r in athlete_rows),
        "total_submissions": sum(int(r["counted_submissions"]) for r in athlete_rows),
        "homework_completions_public": public_hw,
        "videos_reviewed_public": public_vid,
        "homework_completions_rollup": rollup_hw,
        "videos_rollup": rollup_vid,
        "zoom_attendances": sum(int(r["zoom_count"]) for r in athlete_rows),
        "zoom_meetings_held": 2,
        "lifetime_xp": sum(int(r["lifetime_xp"]) for r in athlete_rows),
        "levels": levels,
        "goat_count": levels.get("G.O.A.T.", 0),
        "award_rows_june29": 125,
    }


def fast_facts(stats: dict) -> str:
    return f"""\
## Fast Facts — 2025–2026 Shooting Challenge

- **91** active enrollments
- **65** qualifying athletes
- **28** schools
- **23** communities
- **{fmt_int(stats["total_shots"])}** counted shots
- **{fmt_int(stats["total_submissions"])}** submissions
- **{fmt_int(stats["lifetime_xp"])}** lifetime XP
- **1** statewide G.O.A.T.: Riley Geraghty (St. Joseph's, Missoula)
"""


ABOUT_127 = """\
## 2. About 127 Sports Intensity

**127 Sports Intensity** is a youth basketball development program built around the idea of *Educational Athletics* — structured offseason work that develops skill, discipline, and accountability, not just game minutes.

The **Shooting Challenge** is the program's flagship team experience. Young athletes enroll for a full season (this year, Week 0 through Week 10) and progress through **12 shooting levels**, from Beginner through **G.O.A.T.** Athletes earn **experience points (XP)** for complete development:

- **Daily shooting** — logged makes and attempts, tracked over the season
- **Homework** — basketball IQ assignments, shot trackers, and reflection work
- **Coach-reviewed videos** — form and technique feedback
- **Zoom meetings** — live teaching and community (two held this season)
- **Streaks** — consecutive days of logged shooting
- **Weekly awards** — recognition for homework, video, Zoom, dedication, and more

Levels reward the full picture. An athlete can log thousands of shots and still be working toward the next level if homework, video, or consistency gates are part of that level's expectations. The goal is complete player development — shooting, habits, coachability, and follow-through.

Complete season standings and statistics: **{leaderboard}**
"""


def athlete_block(row: dict, award: dict | None) -> str:
    name = re.sub(r"\s+", " ", row["athlete_name"].strip())
    school = row["school_name"]
    town = row.get("city_town", "")
    grade = row["grade"]
    level = row["final_level"]
    shots = fmt_int(row["total_shots_counted"])
    subs = row["counted_submissions"]
    hw = row["homework_count"]
    vid = row["video_count"]
    zoom = row["zoom_count"]
    streak = row["longest_streak_days"]
    xp = fmt_int(row["lifetime_xp"])
    major = ""
    if award and award.get("major_awards"):
        major = award["major_awards"].replace("; ", ", ")

    lines = [
        f"### {name}",
        f"- **School / community:** {school} ({town})",
        f"- **Grade:** {grade}",
        f"- **Final level:** {level}",
        f"- **Counted shots:** {shots}",
        f"- **Counted submissions:** {subs}",
        f"- **Homework completed:** {hw}",
        f"- **Videos reviewed:** {vid}",
        f"- **Zoom meetings attended:** {zoom}",
        f"- **Longest streak:** {streak} days",
        f"- **Lifetime XP:** {xp}",
    ]
    if major:
        lines.append(f"- **Major awards:** {major}")
    return "\n".join(lines)


def cover_letter(market_title: str) -> str:
    return f"""\
## 1. Cover Letter

**To:** News / sports staff — {market_title}

**From:** Coach Mike Schmidt, 127 Sports Intensity

**Re:** 2025–2026 Shooting Challenge — local athlete recognition materials

Hello,

Thank you for serving our communities. I'm sharing materials about local young athletes who completed the **2025–2026 127 Sports Intensity Shooting Challenge**.

These documents are provided **as a convenience**. Your station is welcome to **edit, shorten, expand, or rewrite** any portion. **Interviews are available upon request** with Coach Mike Schmidt and with families, subject to scheduling.

Complete statewide standings and statistics are available at:

**{LEADERBOARD}**

Thank you for considering coverage of youth basketball development in our area.

Coach Mike Schmidt  
127 Sports Intensity
"""


def statewide_section(stats: dict) -> str:
    level_lines = "\n".join(
        f"- **{name}:** {count}" for name, count in stats["levels"].most_common()
    )
    return f"""\
## 3. Statewide Challenge Statistics

*Public totals below match the final challenge summary emails (`final-summary-2026-07-03-v2`) and leaderboard copy.*

| Metric | Total |
|--------|------:|
| Season | {stats["season"]} |
| Active enrollments (season) | {stats["enrolled_active"]} |
| Qualifying athletes (10+ counted shots) | {stats["qualifying_athletes"]} |
| Schools represented | {stats["schools"]} |
| Communities represented | {stats["communities"]} |
| Total counted shots | {fmt_int(stats["total_shots"])} |
| Total counted submissions | {fmt_int(stats["total_submissions"])} |
| Homework satisfactorily completed (public) | {fmt_int(stats["homework_completions_public"])} |
| Coach-reviewed videos (public) | {fmt_int(stats["videos_reviewed_public"])} |
| Zoom meetings held | {stats["zoom_meetings_held"]} |
| Zoom attendances (athlete × meeting) | {fmt_int(stats["zoom_attendances"])} |
| Lifetime XP earned | {fmt_int(stats["lifetime_xp"])} |
| Gift-card awards issued (June 29 export) | {stats["award_rows_june29"]} |

**Athletes reaching G.O.A.T. level:** {stats["goat_count"]} (Riley Geraghty, St. Joseph's, Missoula — only statewide)

**Final level distribution:**

{level_lines}

**Note on homework and video totals:** Enrollment rollups in Airtable sum **linked** homework and video records ({fmt_int(stats["homework_completions_rollup"])} homework links, {fmt_int(stats["videos_rollup"])} video links). Public-facing totals use **final-summary logic**: homework counts only **satisfactory** completions against the season assignment list; videos count only **coach-reviewed** feedback rows (junk/test entries excluded). Radio kits and parent emails use the public numbers above.
"""


def lead_athletes(blocks: list[dict], limit: int = 3) -> list[dict]:
    return sorted(blocks, key=lambda r: -int(r["total_shots_counted"]))[:limit]


def radio_read_45(market: dict, local: list[dict], stats: dict) -> str:
    names = [re.sub(r"\s+", " ", r["athlete_name"].strip()) for r in local]
    top = lead_athletes(local, 2)
    top_bits = []
    for r in top:
        nm = re.sub(r"\s+", " ", r["athlete_name"].strip())
        top_bits.append(f"{nm} of {r['school_name']} finished at {r['final_level']} with {fmt_int(r['total_shots_counted'])} counted shots")
    local_shots = sum(int(r["total_shots_counted"]) for r in local)
    comm = ", ".join(market["communities"][:4])
    if len(market["communities"]) > 4:
        comm += ", and nearby communities"
    return f"""\
## 5. Sample Radio Reads

### Approximately 45 seconds

Young basketball players from {comm} wrapped a full offseason in the 127 Sports Intensity Shooting Challenge — a structured program that tracks shooting, homework, coach-reviewed video, Zoom participation, streaks, and twelve progression levels.

Statewide, {stats["qualifying_athletes"]} qualifying athletes logged more than {fmt_int(stats["total_shots"])} counted shots this season. In this listening area, {len(local)} athletes are recognized, including {'; and '.join(top_bits)}.

Riley Geraghty of St. Joseph's in Missoula was the only athlete statewide to reach G.O.A.T. level. Complete standings are at {LEADERBOARD}. Coach Mike Schmidt says interviews are available on request.
"""


def radio_read_120(market: dict, local: list[dict], stats: dict) -> str:
    comm = ", ".join(market["communities"])
    bullets = []
    for r in lead_athletes(local, 5):
        nm = re.sub(r"\s+", " ", r["athlete_name"].strip())
        award_note = ""
        bullets.append(
            f"{nm}, grade {r['grade']}, {r['school_name']} in {r['city_town']} — "
            f"finished at {r['final_level']} with {fmt_int(r['total_shots_counted'])} counted shots, "
            f"{r['homework_count']} homework assignments, {r['video_count']} reviewed videos, "
            f"and a {r['longest_streak_days']}-day longest streak."
        )
    local_list = "; ".join(bullets) if bullets else "See local athlete list above."
    return f"""\
### Approximately 2 minutes (news copy)

This spring, young athletes across Montana completed the 2025–2026 **127 Sports Intensity Shooting Challenge** — an offseason basketball development program run through Educational Athletics.

The challenge is not a one-day shootout. Athletes enroll for Week 0 through Week 10, log daily shooting, complete homework, submit video for coach feedback, attend Zoom teaching sessions, and advance through twelve levels based on experience points. Levels reward complete development — not just volume.

Statewide totals from the qualifying cohort: **{fmt_int(stats["total_shots"])}** counted shots, **{fmt_int(stats["total_submissions"])}** submissions, **{fmt_int(stats["homework_completions_public"])}** satisfactory homework completions, **{fmt_int(stats["videos_reviewed_public"])}** coach-reviewed videos, across **{stats["schools"]}** schools and **{stats["communities"]}** communities. Two live Zoom meetings were held. More than **{fmt_int(stats["lifetime_xp"])}** experience points were earned.

The only athlete to reach **G.O.A.T.** level — the top of twelve — was **Riley Geraghty**, an eighth grader at St. Joseph's in Missoula, with **15,404** counted shots.

**[OPTIONAL COMMERCIAL BREAK]**

In the **{market["title"]}** listening area, communities including **{comm}** are home to **{len(local)}** recognized athletes.

{local_list}

Standings and full statistics: **{LEADERBOARD}**.

Coach Mike Schmidt, who directs the program, says stations are welcome to adapt this copy and that **interviews are available on request**.

I'm [anchor name], and you're listening to [station name].
"""


def build_kit(
    market: dict,
    resolved: list[dict],
    awards: dict[str, dict],
    stats: dict,
) -> str:
    local_section = "## 4. Local Athlete List\n\n"
    local_section += "\n\n".join(
        athlete_block(r, awards.get(r["enrollment_id"])) for r in resolved
    )
    local_shots = sum(int(r["total_shots_counted"]) for r in resolved)
    local_section += (
        f"\n\n**Local market totals ({len(resolved)} athletes):** "
        f"{fmt_int(local_shots)} counted shots combined.\n"
    )

    parts = [
        f"# Radio Media Kit — {market['title']}",
        f"*Generated {datetime.now(timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M %Z')} from Airtable export*",
        "",
        f"**Market ID:** {market['id']}",
        f"**Communities:** {', '.join(market['communities'])}",
        f"**Athletes in kit:** {len(resolved)}",
        "",
        fast_facts(stats),
        "",
        cover_letter(market["title"]),
        "",
        ABOUT_127.format(leaderboard=LEADERBOARD),
        "",
        statewide_section(stats),
        "",
        local_section,
        "",
        radio_read_45(market, resolved, stats),
        "",
        radio_read_120(market, resolved, stats),
    ]
    return "\n".join(parts)


def email_to_station(market: dict, resolved: list[dict]) -> str:
    comm = ", ".join(market["communities"][:4])
    if len(market["communities"]) > 4:
        comm += ", and nearby areas"
    names_preview = ", ".join(
        re.sub(r"\s+", " ", r["athlete_name"].strip())
        for r in sorted(resolved, key=lambda x: -int(x["total_shots_counted"]))[:3]
    )
    more = len(resolved) - 3
    more_line = f" — plus {more} more local athletes" if more > 0 else ""
    return f"""Subject: Local youth athletes — 2025–2026 Shooting Challenge ({market['title']})

Hello,

I'm Coach Mike Schmidt with 127 Sports Intensity. I'm reaching out to share a short radio media kit about young athletes from {comm} who completed our 2025–2026 Shooting Challenge this spring.

The attached kit includes background on the program, statewide statistics, a local athlete list ({len(resolved)} athletes), and sample 45-second and 2-minute news reads you may use on air. Highlights in this market include {names_preview}{more_line}.

These materials are provided as a convenience. Your station is welcome to use, shorten, edit, or rewrite any portion of the sample reads — whatever fits your format.

Interviews are available on request. Complete standings are at {LEADERBOARD}.

Thank you for considering coverage of youth basketball development in our communities.

Coach Mike Schmidt
127 Sports Intensity
"""


def main() -> None:
    athletes = load_athletes()
    awards = load_awards()
    all_rows = list(athletes.values())
    stats = statewide_stats(all_rows)

    OUT.mkdir(parents=True, exist_ok=True)
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "output_directory": str(OUT.resolve()),
        "kits": [],
        "missing_information": [],
        "manual_review": [],
    }

    assigned_ids: set[str] = set()

    for market in MARKETS:
        folder = OUT / f"{market['id']}-{market['slug']}"
        folder.mkdir(parents=True, exist_ok=True)

        resolved: list[dict] = []
        errors: list[str] = []
        for name in market["athletes"]:
            row, err = resolve_athlete(name, athletes)
            if err:
                errors.append(err)
                continue
            resolved.append(row)
            assigned_ids.add(row["enrollment_id"])

        resolved.sort(key=lambda r: -int(r["total_shots_counted"]))

        kit_path = folder / "RADIO-MEDIA-KIT.md"
        kit_path.write_text(build_kit(market, resolved, awards, stats), encoding="utf-8")

        # plain-text email body stub
        email_path = folder / "EMAIL-TO-STATION.txt"
        email_path.write_text(email_to_station(market, resolved), encoding="utf-8")

        kit_info = {
            "id": market["id"],
            "title": market["title"],
            "folder": str(folder.resolve()),
            "media_kit": str(kit_path.resolve()),
            "athlete_count_requested": len(market["athletes"]),
            "athlete_count_resolved": len(resolved),
            "athletes": [r["athlete_name"] for r in resolved],
            "errors": errors,
        }
        summary["kits"].append(kit_info)
        if errors:
            summary["missing_information"].extend(
                [f"{market['title']}: {e}" for e in errors]
            )

    unassigned = [
        r["athlete_name"]
        for r in all_rows
        if r["enrollment_id"] not in assigned_ids
    ]
    summary["qualifying_athletes_total"] = len(all_rows)
    summary["qualifying_athletes_assigned"] = len(assigned_ids)
    summary["all_qualifying_included"] = len(unassigned) == 0
    summary["unassigned_athletes"] = sorted(unassigned)
    summary["statewide_stats_public"] = {
        "enrolled_active": stats["enrolled_active"],
        "qualifying_athletes": stats["qualifying_athletes"],
        "schools": stats["schools"],
        "communities": stats["communities"],
        "total_shots": stats["total_shots"],
        "total_submissions": stats["total_submissions"],
        "homework_completions_public": stats["homework_completions_public"],
        "videos_reviewed_public": stats["videos_reviewed_public"],
        "homework_completions_rollup_not_used_publicly": stats["homework_completions_rollup"],
        "videos_rollup_not_used_publicly": stats["videos_rollup"],
        "lifetime_xp": stats["lifetime_xp"],
        "zoom_meetings_held": stats["zoom_meetings_held"],
        "zoom_attendances": stats["zoom_attendances"],
        "gift_card_awards_june29": stats["award_rows_june29"],
        "goat": "Riley Geraghty (only statewide)",
    }
    if unassigned:
        summary["missing_information"].append(
            f"Qualifying athletes not in any radio market ({len(unassigned)}): "
            + "; ".join(sorted(unassigned))
        )

    summary["manual_review"].append(
        "Verify station contact emails before sending — most targets in potential-radio-targets.csv show 'not found'."
    )
    summary["manual_review"].append(
        "Lewis Talbitzer (Darby) is assigned to Missoula radio per sprint spec; Darby is Bitterroot geography."
    )
    summary["manual_review"].append(
        "Eli Cowgill: school Greenfield, community Power — listed as Fairfield/Greenfield in sprint spec."
    )
    summary["manual_review"].append(
        "Paste final reads on-air only after station-specific legal/id review."
    )

    summary_path = OUT / "BUILD-SUMMARY.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    total_assigned = sum(k["athlete_count_resolved"] for k in summary["kits"])
    md_lines = [
        "# Radio Media Kits — Build Summary",
        "",
        f"Generated: {summary['generated_at']}",
        f"Output: `{OUT}`",
        "",
        "## Coverage confirmation",
        "",
        f"- **Qualifying athletes in export:** {summary['qualifying_athletes_total']}",
        f"- **Qualifying athletes assigned to kits:** {summary['qualifying_athletes_assigned']}",
        f"- **All 65 included:** {'Yes' if summary['all_qualifying_included'] else 'No — see missing'}",
        f"- **Sum of per-kit athlete counts:** {total_assigned} (each athlete appears in exactly one market)",
        "",
        "## Final statewide stats (public-facing)",
        "",
        "Used in all media kits (Fast Facts + Section 3 + sample reads):",
        "",
        f"- Active enrollments: **{stats['enrolled_active']}**",
        f"- Qualifying athletes: **{stats['qualifying_athletes']}**",
        f"- Schools: **{stats['schools']}**",
        f"- Communities: **{stats['communities']}**",
        f"- Counted shots: **{fmt_int(stats['total_shots'])}**",
        f"- Submissions: **{fmt_int(stats['total_submissions'])}**",
        f"- Homework satisfactorily completed: **{fmt_int(stats['homework_completions_public'])}** (not rollup {fmt_int(stats['homework_completions_rollup'])})",
        f"- Coach-reviewed videos: **{fmt_int(stats['videos_reviewed_public'])}** (not rollup {fmt_int(stats['videos_rollup'])})",
        f"- Lifetime XP: **{fmt_int(stats['lifetime_xp'])}**",
        f"- Zoom meetings held: **{stats['zoom_meetings_held']}**",
        f"- G.O.A.T.: **Riley Geraghty** (only statewide)",
        "",
        "**Homework/video note:** Rollup fields count all linked Airtable records. Public totals use final-summary logic (satisfactory homework + reviewed videos only). Radio kits use public numbers.",
        "",
        "## Athlete count by market",
        "",
        "| ID | Market | Athletes |",
        "|----|--------|----------|",
    ]
    for k in summary["kits"]:
        md_lines.append(f"| {k['id']} | {k['title']} | {k['athlete_count_resolved']} |")
    md_lines.extend(["", f"| **Total** | **12 markets** | **{total_assigned}** |", ""])
    md_lines.extend([
        "## Kit folders",
        "",
        "| ID | Path |",
        "|----|------|",
    ])
    for k in summary["kits"]:
        md_lines.append(f"| {k['id']} | `{k['folder']}` |")
    if summary["missing_information"]:
        md_lines.extend(["", "## Missing / errors", ""])
        for item in summary["missing_information"]:
            md_lines.append(f"- {item}")
    if summary["manual_review"]:
        md_lines.extend(["", "## Remaining warnings before distribution", ""])
        for item in summary["manual_review"]:
            md_lines.append(f"- {item}")

    (OUT / "BUILD-SUMMARY.md").write_text("\n".join(md_lines) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
