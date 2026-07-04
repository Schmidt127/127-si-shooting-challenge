#!/usr/bin/env python3
"""Regenerate all 12 radio media kits from KSEN master template (Sections 1–3)."""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from media_paths import radio_root

# Reuse market list + data loaders from existing builder
from _build_radio_media_kits import (  # noqa: E402
    LEADERBOARD,
    MARKETS,
    fmt_int,
    load_athletes,
    load_awards,
    resolve_athlete,
    statewide_stats,
)

EVENT = "127 Sports Intensity – Shooting Challenge (2026)"
OUT = radio_root()

MARKET_COPY = {
    "01-ksen-shelby": {
        "listening_area": "KSEN Radio listening area",
        "region_signoff": "north-central Montana",
        "highlights_communities": "Fairfield, Greenfield, Power, Conrad, and Ledger",
        "on_air_45_area": "Fairfield, Greenfield, Conrad, Ledger, and surrounding north-central Montana communities",
        "on_air_120_area": "north-central Montana",
    },
    "02-great-falls": {
        "listening_area": "Great Falls Radio listening area",
        "region_signoff": "north-central Montana",
        "highlights_communities": "Great Falls, Fort Benton, Highwood, Cascade, Belt, and Centerville",
        "on_air_45_area": "Great Falls, Fort Benton, Highwood, Cascade, Belt, and surrounding north-central Montana communities",
        "on_air_120_area": "north-central Montana",
    },
    "03-helena": {
        "listening_area": "Helena Radio listening area",
        "region_signoff": "the Helena area and surrounding communities",
        "highlights_communities": "Helena, Clancy, and Townsend",
        "on_air_45_area": "Helena, Clancy, Townsend, and the surrounding capital region",
        "on_air_120_area": "the Helena area",
    },
    "04-lewistown": {
        "listening_area": "Lewistown Radio listening area",
        "region_signoff": "central Montana",
        "highlights_communities": "Lewistown and Stanford",
        "on_air_45_area": "Lewistown, Stanford, and central Montana",
        "on_air_120_area": "central Montana",
    },
    "05-bozeman-manhattan": {
        "listening_area": "Bozeman / Manhattan Radio listening area",
        "region_signoff": "the Gallatin Valley",
        "highlights_communities": "Bozeman, Manhattan, Belgrade, and Gallatin Valley communities",
        "on_air_45_area": "Bozeman, Manhattan, Belgrade, and the Gallatin Valley",
        "on_air_120_area": "the Gallatin Valley",
    },
    "06-missoula": {
        "listening_area": "Missoula Radio listening area",
        "region_signoff": "western Montana",
        "highlights_communities": "Missoula, Frenchtown, and the Bitterroot Valley",
        "on_air_45_area": "Missoula, Frenchtown, Darby, and western Montana communities",
        "on_air_120_area": "western Montana",
    },
    "07-billings": {
        "listening_area": "Billings Radio listening area",
        "region_signoff": "the Billings area and Yellowstone County",
        "highlights_communities": "Billings, Bridger, and Yellowstone County",
        "on_air_45_area": "Billings, Bridger, and Yellowstone County communities",
        "on_air_120_area": "the Billings area",
    },
    "08-butte-anaconda": {
        "listening_area": "Butte / Anaconda Radio listening area",
        "region_signoff": "southwest Montana",
        "highlights_communities": "Butte and Anaconda",
        "on_air_45_area": "Butte, Anaconda, and southwest Montana",
        "on_air_120_area": "southwest Montana",
    },
    "09-madison-county": {
        "listening_area": "Madison County Radio listening area",
        "region_signoff": "Madison County",
        "highlights_communities": "Sheridan, Virginia City, and Madison County",
        "on_air_45_area": "Sheridan, Virginia City, and Madison County",
        "on_air_120_area": "Madison County",
    },
    "10-wibaux": {
        "listening_area": "Wibaux Radio listening area",
        "region_signoff": "eastern Montana",
        "highlights_communities": "Wibaux, Glendive, and eastern Montana",
        "on_air_45_area": "Wibaux, Glendive, and eastern Montana communities",
        "on_air_120_area": "eastern Montana",
    },
    "11-wolf-point": {
        "listening_area": "Wolf Point Radio listening area",
        "region_signoff": "northeast Montana",
        "highlights_communities": "Wolf Point and Roosevelt County",
        "on_air_45_area": "Wolf Point and northeast Montana",
        "on_air_120_area": "northeast Montana",
    },
    "12-magic-valley": {
        "listening_area": "Magic Valley Radio listening area",
        "region_signoff": "the Magic Valley",
        "highlights_communities": "Declo and the Magic Valley",
        "on_air_45_area": "Declo and the Magic Valley of southern Idaho",
        "on_air_120_area": "the Magic Valley",
    },
}


def clean_name(name: str) -> str:
    return re.sub(r"\s+", " ", str(name or "").strip())


def grade_label(grade: str) -> str:
    g = str(grade or "").strip()
    if g.upper() == "K":
        return "kindergarten"
    return f"grade {g}"


def significant_awards(major: str) -> list[str]:
    if not major:
        return []
    skip = ("Random Drawing", "Thanks for Playing", "Keep Shooting")
    return [a.strip() for a in major.split(";") if a.strip() and not any(s in a for s in skip)]


def award_phrase(major: str) -> str:
    awards = significant_awards(major)
    if not awards:
        return ""
    if len(awards) == 1:
        return f" while earning the **{awards[0]}**"
    if len(awards) == 2:
        return f" while earning the **{awards[0]}** and **{awards[1]}**"
    return (
        f" while earning the **{awards[0]}**, **{awards[1]}**, "
        f"and other season recognition"
    )


def participation_clause(row: dict) -> str:
    hw = int(row.get("homework_count") or 0)
    vid = int(row.get("video_count") or 0)
    zoom = int(row.get("zoom_count") or 0)
    streak = int(row.get("longest_streak_days") or 0)
    bits: list[str] = []
    if hw >= 2:
        bits.append(f"completed **{hw}** homework assignments")
    if vid >= 5:
        bits.append(f"submitted **{vid}** coach-reviewed videos")
    elif vid >= 1 and hw < 2:
        bits.append(f"earned coach feedback on **{vid}** video{'s' if vid != 1 else ''}")
    if zoom >= 2:
        bits.append("attended both live instructional Zoom sessions")
    elif zoom == 1:
        bits.append("participated in a live instructional Zoom session")
    if streak >= 20:
        bits.append(f"built a **{streak}-day** shooting streak")
    elif streak >= 10:
        bits.append(f"maintained a **{streak}-day** shooting streak")
    if not bits:
        return ""
    if len(bits) == 1:
        return f", {bits[0]}"
    return ", " + ", ".join(bits[:-1]) + f", and {bits[-1]}"


LEVEL_RANK = {
    "G.O.A.T.": 100,
    "Pro": 90,
    "Sharpshooter": 70,
    "Dangerous Shooter": 65,
    "Hot Hand": 50,
    "Consistent Shooter": 45,
    "Developing Shooter": 40,
    "Rookie Shooter": 30,
    "Beginner": 10,
}


def athlete_sort_key(row: dict) -> tuple:
    return (-LEVEL_RANK.get(row["final_level"], 0), -int(row["total_shots_counted"]))


def athlete_highlight_paragraph(row: dict, award: dict | None, *, state_leader: bool = False) -> str:
    name = clean_name(row["athlete_name"])
    grade = row["grade"]
    school = row["school_name"].strip()
    shots = int(row["total_shots_counted"])
    level = row["final_level"]
    major = award.get("major_awards", "") if award else ""
    hw = int(row.get("homework_count") or 0)
    vid = int(row.get("video_count") or 0)
    zoom = int(row.get("zoom_count") or 0)
    streak = int(row.get("longest_streak_days") or 0)

    sentences: list[str] = []

    if state_leader:
        sentences.append(
            f"**{name} (Grade {grade})** turned in one of the most remarkable individual "
            f"performances of the entire season. His **{fmt_int(shots)} counted shots** led "
            f"not only this listening area but every participant statewide. He finished at the "
            f"**{level}** level{award_phrase(major)}."
        )
        return " ".join(sentences)

    if level == "G.O.A.T.":
        sentences.append(
            f"**{name} (Grade {grade})** became the **only statewide G.O.A.T.** finisher — "
            f"the highest of twelve development levels — with **{fmt_int(shots)} counted shots**."
        )
    elif level == "Pro":
        sentences.append(
            f"**{name} (Grade {grade})** of {school} reached the **Pro** level, one step below "
            f"G.O.A.T. statewide, with **{fmt_int(shots)} counted shots**."
        )
    elif shots >= 10_000:
        sentences.append(
            f"**{name} (Grade {grade})** surpassed the **10,000-shot milestone**, finishing "
            f"with **{fmt_int(shots)} counted shots** at the **{level}** level."
        )
    elif shots >= 5_000:
        sentences.append(
            f"**{name} (Grade {grade})** recorded **{fmt_int(shots)} counted shots** and "
            f"reached the **{level}** level."
        )
    else:
        sentences.append(
            f"**{name} (Grade {grade})** demonstrated commitment throughout the season with "
            f"**{fmt_int(shots)} counted shots**, reaching the **{level}** level."
        )

    sig = significant_awards(major)
    if sig and level not in ("G.O.A.T.",):
        if len(sig) == 1:
            sentences.append(f"{name.split()[0]} earned the **{sig[0]}**.")
        else:
            sentences.append(
                f"{name.split()[0]} was also recognized with the **{sig[0]}** and other season honors."
            )

    extras: list[str] = []
    if hw >= 2:
        extras.append(f"completed **{hw}** homework assignments")
    if vid >= 5:
        extras.append(f"submitted **{vid}** coach-reviewed videos")
    elif vid >= 1 and hw < 2:
        extras.append(f"earned coach feedback on **{vid}** video{'s' if vid != 1 else ''}")
    if zoom >= 2:
        extras.append("attended both live instructional Zoom sessions")
    elif zoom == 1:
        extras.append("participated in a live instructional Zoom session")
    if streak >= 20:
        extras.append(f"built a **{streak}-day** shooting streak")
    elif streak >= 10:
        extras.append(f"maintained a **{streak}-day** shooting streak")

    if extras:
        who = name.split()[0]
        if len(extras) == 1:
            sentences.append(f"{who} also {extras[0]}.")
        elif len(extras) == 2:
            sentences.append(f"{who} also {extras[0]} and {extras[1]}.")
        else:
            sentences.append(
                f"{who} also {', '.join(extras[:-1])}, and {extras[-1]}."
            )

    return " ".join(sentences)


def group_heading(town: str, school: str, members: list[dict]) -> str:
    schools = {r["school_name"].strip() for r in members}
    if len(schools) == 1 and town:
        sch = next(iter(schools))
        if sch != town:
            return f"{town} / {sch}"
    if town:
        return town
    return school or "Local Athletes"


def family_note(members: list[dict]) -> str | None:
    last_names = [clean_name(m["athlete_name"]).split()[-1] for m in members]
    if len(members) >= 2 and len(set(last_names)) == 1:
        return last_names[0]
    return None


def section_1(market: dict, meta: dict) -> str:
    title = market["title"]
    return f"""## 1. Introduction Letter

**To:** News & Sports Director, {title}

**From:** Mike Schmidt, Founder & Director, 127 Sports Intensity

**Re:** Local Athlete Recognition – **{EVENT}**

Dear News & Sports Director,

Thank you for taking a few moments to review this media kit.

Enclosed are the accomplishments of young athletes from the {meta["listening_area"]} who recently completed the **{EVENT}**. My goal is to make local coverage as easy as possible by providing everything your station needs in one place.

Inside this media kit you will find an overview of the program, statewide participation statistics, highlights from athletes in your listening area, and suggested on-air copy that may be used as written, shortened, expanded, or adapted to fit your programming style.

The **{EVENT}** is built on the Educational Athletics philosophy, which teaches that athletics should develop not only basketball skills, but also the habits that lead to success throughout life. During the eleven-week challenge, athletes worked to improve through daily shooting, educational homework, coach-reviewed videos, live instructional sessions, and a commitment to consistent effort.

Please consider these materials a resource. You are welcome to edit, shorten, expand, or rewrite any portion to best serve your audience. If you would like additional information or would like to arrange an interview with me or one of the participating athletes or families, I would be happy to assist.

Complete athlete standings, season statistics, and award winners are available at:

**{LEADERBOARD}**

Thank you for your continued support of youth athletics and for recognizing the accomplishments of student-athletes throughout {meta["region_signoff"]}.

Sincerely,

**Mike Schmidt**
**Founder & Director**
**127 Sports Intensity**
"""


SECTION_2 = f"""## 2. The Story Behind 127 Sports Intensity

I founded **127 Sports Intensity** because I wanted to accomplish two goals at the same time.

The first was to help young athletes become better basketball players through purposeful, consistent skill development.

The second—and even more important goal—was to use athletics as a vehicle to teach the life skills that lead to success long after the final buzzer.

I have always believed that sports are about much more than wins and losses. Every workout, every practice, every challenge, and every competition provides an opportunity to develop discipline, responsibility, perseverance, accountability, confidence, leadership, and resilience. Those qualities are just as valuable in the classroom, the workplace, and everyday life as they are on a basketball court.

That belief became the foundation of **127 Sports Intensity** and the Educational Athletics philosophy that guides every program I create.

The **{EVENT}** was built around that philosophy. While improving shooting ability is certainly one objective, the challenge was intentionally designed to reward much more than simply taking shots. Athletes earned recognition through consistent daily shooting, educational homework, coach-reviewed videos, live instructional sessions, positive daily habits, and following through on commitments over an eleven-week season.

I believe great athletes are built through **consistent daily habits—not occasional great performances.**

That philosophy is reflected throughout the challenge. Experience Points (XP), achievement levels, awards, and milestones are not simply rewards for talent. They recognize the habits, character, perseverance, and commitment that produce long-term success.

My hope is that every participant finishes the Shooting Challenge with a more confident shot, a stronger work ethic, and a better understanding that the habits developed through sports can become the foundation for success in every area of life.

That is, and always will be, the purpose of **127 Sports Intensity**.

For complete standings, season statistics, and award winners, visit:

**{LEADERBOARD}**
"""


SECTION_3 = f"""## 3. Statewide Challenge Statistics

### Season Overview

The **{EVENT}** concluded its inaugural statewide season after eleven weeks of competition and player development. From Week 0 through Week 10, young athletes from across Montana committed themselves to improving not only as basketball players, but also as students, teammates, and leaders.

Unlike a traditional shooting contest, the challenge measures complete player development. Athletes earned recognition through daily shooting, educational homework, coach-reviewed videos, live instructional sessions, shooting streaks, and Experience Points (XP) that rewarded consistent effort and growth throughout the season.

Every participant progressed through a twelve-level development system, beginning at **Beginner** and culminating with **G.O.A.T.** Advancement required much more than accumulating shots. Athletes were challenged to demonstrate discipline, accountability, perseverance, coachability, and a commitment to continuous improvement.

As the founder of 127 Sports Intensity, I believe one of the greatest lessons sports can teach is that lasting success is earned one day at a time.

> **"I believe great athletes are built through consistent daily habits—not occasional great performances."**

The statistics below represent thousands of individual decisions by young athletes who chose to invest in their own development throughout the offseason.

---

### 2026 By the Numbers

* **Season:** Week 0 through Week 10 (61-day official shooting window)
* **Active Enrollments:** 91
* **Qualifying Athletes:** 65
* **Schools Represented:** 28
* **Communities Represented:** 23
* **Total Counted Shots:** 304,322
* **Total Counted Submissions:** 1,712
* **Homework Successfully Completed:** 122
* **Coach-Reviewed Videos:** 129
* **Live Zoom Instructional Sessions:** 2
* **Total Zoom Attendances:** 32
* **Lifetime Experience Points (XP) Earned:** 54,049
* **Gift Card Awards Presented:** 125

---

### Season Highlights

The inaugural season produced remarkable accomplishments throughout Montana.

Only **one athlete** reached **G.O.A.T.**, the highest of the challenge's twelve development levels. **Riley Geraghty** of Missoula achieved that distinction through excellence across every area of the program—not simply by shooting the most baskets.

**Leyton Bakken** of Fairfield recorded the state's highest individual total with **18,110 counted shots**, while athletes representing **28 schools** and **23 communities** combined for more than **304,000 counted shots** during the eleven-week season.

Throughout the challenge, athletes were recognized with **125 awards**, including **Conquered Goal Awards**, **Grade Band Champion Awards**, **Level Leader Awards**, **Homework Recognition Awards**, **Video Recognition Awards**, and numerous weekly achievement awards celebrating commitment, improvement, and perseverance.

While those accomplishments are impressive, the greatest success of the **{EVENT}** was helping young athletes develop the daily habits, discipline, and character that will benefit them long after the basketball season has ended.
"""


KSEN_SECTION_4 = """## 4. Local Athlete Highlights

The KSEN Radio listening area was well represented during the inaugural **127 Sports Intensity – Shooting Challenge (2026)**. Eight athletes representing Fairfield, Greenfield, Power, Conrad, and Ledger combined to record **53,324 counted shots**, demonstrating the dedication and consistent effort that define the Educational Athletics philosophy.


### Fairfield

**Leyton Bakken (Grade 10)** turned in one of the most remarkable individual performances of the entire season. His **18,110 counted shots** led not only the KSEN market but every participant statewide. Leyton finished the season at the **Developing Shooter** level while earning the **Conquered Goal Award**.

**Colton Dahl (Grade 9)** reached the **Consistent Shooter** level after logging **8,820 counted shots** and earned a **Grade Band Runner-Up Award** for his outstanding season.

**Conley Dahl (Grade 7)** also achieved the **Consistent Shooter** level, recording **8,393 counted shots** while demonstrating steady improvement and commitment throughout the challenge.

### Greenfield / Power

Representing Greenfield, **Eli Cowgill (Grade 8)** surpassed the impressive **10,000-shot milestone**, finishing with **10,010 counted shots**. Eli reached the **Consistent Shooter** level while earning both the **Conquered Goal Award** and a **Random Drawing Incentive Award**.

### Conrad

One of the most complete seasons in the region belonged to **Emmet Gustafson (Grade 3)**. Along with **3,958 counted shots**, Emmet successfully completed homework assignments, submitted eight coach-reviewed videos, attended both live instructional Zoom sessions, built a **10-day shooting streak**, and reached the **Hot Hand** level.

### Ledger

Ledger athletes also demonstrated the value of perseverance throughout the season. **Lolo Judisch** reached the **Developing Shooter** level with **3,400 counted shots**, while **Connor Judisch** and **Leiko Judisch** each earned recognition for their commitment and willingness to improve throughout the eleven-week challenge.

Whether recording a few hundred shots or more than eighteen thousand, every athlete in the KSEN listening area represented their family, school, and community with dedication, perseverance, and a commitment to becoming better both on and off the basketball court."""

KSEN_SECTION_5 = """## 5. Suggested On-Air Copy

The following scripts are provided as a convenience and may be used as written, shortened, expanded, or adapted to fit your station's programming style.

### Approximately 45 Seconds

Young athletes from Fairfield, Greenfield, Conrad, Ledger, and surrounding north-central Montana communities recently completed the **127 Sports Intensity – Shooting Challenge (2026)**, a ten-week offseason basketball development program designed to improve basketball skills while teaching discipline, accountability, and consistency.

Eight athletes from the KSEN listening area earned recognition during this year's challenge, highlighted by **Leyton Bakken of Fairfield**, who led the entire state with **18,110 counted shots**. **Eli Cowgill of Greenfield** also surpassed the **10,000-shot milestone**, while athletes from Conrad and Ledger demonstrated the value of consistent daily effort throughout the season.

The challenge is built on the belief that great athletes are developed through consistent daily habits—not occasional great performances.

Complete athlete standings, season statistics, and award winners are available at:

**www.fairfieldbasketballclub.com/leaderboard**

---

### Approximately 2 Minutes

Young athletes from north-central Montana recently completed the annual **127 Sports Intensity – Shooting Challenge (2026)**, a ten-week offseason basketball development program that encourages young athletes to grow not only as basketball players, but also as disciplined, accountable, and confident young people.

Unlike a traditional shooting contest, participants were recognized for complete player development. Throughout the season, athletes logged daily shooting, completed educational homework, submitted videos for coaching feedback, participated in live instructional sessions, built shooting streaks, and earned Experience Points while progressing through twelve achievement levels.

This year's challenge brought together **91 athletes** representing **28 schools** and **23 Montana communities**. Together, qualifying participants logged more than **304,000 counted shots**, demonstrating an outstanding commitment to offseason improvement.

**[OPTIONAL COMMERCIAL BREAK]**

The KSEN listening area was proudly represented by eight outstanding athletes.

Fairfield's **Leyton Bakken** led the entire state with **18,110 counted shots**, while **Eli Cowgill** of Greenfield surpassed the **10,000-shot milestone** and reached the **Consistent Shooter** level.

Fairfield athletes **Colton Dahl** and **Conley Dahl** were recognized for their steady commitment and improvement throughout the eleven-week challenge, while **Emmet Gustafson** of Conrad distinguished himself through outstanding all-around participation that included shooting, homework, coach-reviewed videos, and perfect attendance at the program's live instructional sessions.

Athletes from Ledger also demonstrated the perseverance and commitment that define the Educational Athletics philosophy, proving that success is measured not only by statistics, but by the willingness to improve one day at a time.

Complete athlete standings, season statistics, and award winners are available at:



Thank you to every athlete, parent, coach, and community that helped make the inaugural **127 Sports Intensity – Shooting Challenge (2026)** a tremendous success.

**www.fairfieldbasketballclub.com/leaderboard**"""


def section_4(market: dict, meta: dict, athletes: list[dict], awards: dict[str, dict]) -> str:
    if f"{market['id']}-{market['slug']}" == "01-ksen-shelby":
        return KSEN_SECTION_4

    local_shots = sum(int(a["total_shots_counted"]) for a in athletes)
    n = len(athletes)
    intro = (
        f"The {meta['listening_area']} was well represented during the inaugural **{EVENT}**. "
        f"{'One athlete' if n == 1 else f'{n} athletes'} representing {meta['highlights_communities']} "
        f"combined to record **{fmt_int(local_shots)} counted shots**, demonstrating the dedication "
        f"and consistent effort that define the Educational Athletics philosophy."
    )

    state_top_shots = max(int(a["total_shots_counted"]) for a in athletes)
    statewide_max = 18110  # Leyton Bakken

    groups: dict[str, list[dict]] = defaultdict(list)
    for a in athletes:
        key = a["city_town"].strip() or a["school_name"].strip()
        groups[key].append(a)

    sorted_groups = sorted(
        groups.items(),
        key=lambda kv: -sum(int(a["total_shots_counted"]) for a in kv[1]),
    )

    body_parts: list[str] = [intro, ""]
    for town, members in sorted_groups:
        members = sorted(members, key=athlete_sort_key)
        heading = group_heading(town, members[0]["school_name"], members)
        body_parts.append(f"### {heading}")
        body_parts.append("")
        fam = family_note(members)
        if fam and len(members) >= 2:
            body_parts.append(
                f"The **{fam}** family was among the standouts from {heading}, "
                f"with multiple athletes earning recognition for their offseason commitment."
            )
            body_parts.append("")
        for a in members:
            aw = awards.get(a["enrollment_id"])
            state_leader = int(a["total_shots_counted"]) == statewide_max
            body_parts.append(
                athlete_highlight_paragraph(a, aw, state_leader=state_leader)
            )
            body_parts.append("")

    closing = (
        "Whether recording a few hundred shots or more than eighteen thousand, every athlete "
        f"in the {meta['listening_area']} represented their family, school, and community with "
        "dedication, perseverance, and a commitment to becoming better both on and off the "
        "basketball court."
    )
    body_parts.extend(["", closing])
    return "## 4. Local Athlete Highlights\n\n" + "\n".join(body_parts).strip()


def radio_name_phrase(row: dict) -> str:
    name = clean_name(row["athlete_name"])
    town = row["city_town"].strip()
    school = row["school_name"].strip()
    if school and town and school.lower() != town.lower():
        place = school
    else:
        place = town or school
    return f"{place}'s **{name}**"


def radio_highlight(row: dict, award: dict | None) -> str:
    name = clean_name(row["athlete_name"])
    shots = int(row["total_shots_counted"])
    level = row["final_level"]
    phrase = radio_name_phrase(row)

    if level == "G.O.A.T.":
        return (
            f"{phrase}, the state's only **G.O.A.T.**-level finisher and a **Grade Band Champion**"
        )
    if name == "Leyton Bakken":
        return f"{phrase}, who led the entire state with **{fmt_int(shots)} counted shots**"
    if level == "Pro":
        return f"{phrase}, who reached the **Pro** level with **{fmt_int(shots)} counted shots**"
    if shots >= 10_000:
        return (
            f"{phrase}, who surpassed the **10,000-shot milestone** and reached the "
            f"**{level}** level"
        )
    if shots >= 5_000:
        return (
            f"{phrase}, who finished at the **{level}** level with **{fmt_int(shots)} counted shots**"
        )
    major = award.get("major_awards", "") if award else ""
    sig = significant_awards(major)
    if sig:
        return (
            f"{phrase}, recognized with the **{sig[0]}** after reaching the **{level}** level"
        )
    return f"{phrase}, who reached the **{level}** level during the eleven-week season"


def section_5(market: dict, meta: dict, athletes: list[dict], awards: dict[str, dict]) -> str:
    if f"{market['id']}-{market['slug']}" == "01-ksen-shelby":
        return KSEN_SECTION_5

    sorted_a = sorted(athletes, key=athlete_sort_key)
    top = sorted_a[:3]
    hl = [radio_highlight(a, awards.get(a["enrollment_id"])) for a in top]
    if len(hl) == 1:
        highlight_text = hl[0]
    elif len(hl) == 2:
        highlight_text = f"{hl[0]}, while {hl[1]}"
    else:
        highlight_text = f"{hl[0]}, {hl[1]}, and {hl[2]}"

    n = len(athletes)
    athlete_word = "athlete" if n == 1 else "athletes"

    sec45 = f"""## 5. Suggested On-Air Copy

The following scripts are provided as a convenience and may be used as written, shortened, expanded, or adapted to fit your station's programming style.

### Approximately 45 Seconds

Young athletes from {meta['on_air_45_area']} recently completed the **{EVENT}**, an eleven-week offseason basketball development program designed to improve basketball skills while teaching discipline, accountability, and consistency.

{n} {athlete_word} from the {meta['listening_area']} earned recognition during this year's challenge, highlighted by {highlight_text}.

The challenge is built on the belief that great athletes are developed through consistent daily habits—not occasional great performances.

Complete athlete standings, season statistics, and award winners are available at:

**{LEADERBOARD}**

---

### Approximately 2 Minutes

Young athletes from {meta['on_air_120_area']} recently completed the **{EVENT}**, an eleven-week offseason basketball development program that encourages young athletes to grow not only as basketball players, but also as disciplined, accountable, and confident young people.

Unlike a traditional shooting contest, participants were recognized for complete player development. Throughout the season, athletes logged daily shooting, completed educational homework, submitted videos for coaching feedback, participated in live instructional sessions, built shooting streaks, and earned Experience Points while progressing through twelve achievement levels.

This year's challenge brought together **91 athletes** representing **28 schools** and **23 Montana communities**. Together, qualifying participants logged more than **304,000 counted shots**, demonstrating an outstanding commitment to offseason improvement.

**[OPTIONAL COMMERCIAL BREAK]**

The {meta['listening_area']} was proudly represented by {n} outstanding {athlete_word}."""

    local_paras = build_local_on_air_paragraphs(market, meta, sorted_a, awards)
    closing = f"""

Complete athlete standings, season statistics, and award winners are available at:

**{LEADERBOARD}**

Thank you to every athlete, parent, coach, and community that helped make the inaugural **{EVENT}** a tremendous success.
"""
    return sec45 + local_paras + closing


def build_local_on_air_paragraphs(
    market: dict,
    meta: dict,
    athletes: list[dict],
    awards: dict[str, dict],
) -> str:
  """Narrative local paragraphs for the 2-minute read."""
  if not athletes:
      return ""

  lines: list[str] = []
  top = athletes[0]
  aw = awards.get(top["enrollment_id"])
  lines.append("")
  lines.append(f"Leading the way was {radio_highlight(top, aw)}.")

  if len(athletes) == 1:
      name = clean_name(top["athlete_name"])
      lines.append("")
      lines.append(
          f"{name}'s commitment throughout the eleven-week season reflects the perseverance "
          "and daily habits that define Educational Athletics."
      )
      return "\n".join(lines)

  # Second paragraph: next 1-2 standouts or thematic cluster
  second_tier = athletes[1:4]
  bits = [radio_highlight(a, awards.get(a["enrollment_id"])) for a in second_tier]
  if bits:
      lines.append("")
      if len(bits) == 1:
          lines.append(f"Also recognized was {bits[0]}.")
      elif len(bits) == 2:
          lines.append(f"Also recognized were {bits[0]} and {bits[1]}.")
      else:
          lines.append(
              f"Also recognized were {bits[0]}, {bits[1]}, and {bits[2]}."
          )

  # Family / participation note
  participation_athletes = [
      a
      for a in athletes
      if int(a.get("homework_count") or 0) >= 2
      or int(a.get("video_count") or 0) >= 5
      or int(a.get("zoom_count") or 0) >= 2
  ]
  if participation_athletes and market["slug"] != "06-missoula":
      a = max(
          participation_athletes,
          key=lambda r: (
              int(r.get("video_count") or 0),
              int(r.get("homework_count") or 0),
          ),
      )
      nm = clean_name(a["athlete_name"])
      town = a["city_town"].strip() or a["school_name"].strip()
      lines.append("")
      lines.append(
          f"{radio_name_phrase(a)} stood out for outstanding all-around participation "
          "including shooting, homework, coach-reviewed videos, and live instructional sessions."
      )

  if len(athletes) > 4:
      lines.append("")
      lines.append(
          f"Additional athletes from {meta['highlights_communities']} also demonstrated the "
          "perseverance and commitment that define the Educational Athletics philosophy, proving "
          "that success is measured not only by statistics, but by the willingness to improve "
          "one day at a time."
      )
  elif len(athletes) > 1:
      lines.append("")
      lines.append(
          "Athletes throughout the listening area demonstrated the perseverance and commitment "
          "that define the Educational Athletics philosophy, proving that success is measured "
          "not only by statistics, but by the willingness to improve one day at a time."
      )

  return "\n".join(lines)


def build_kit(market: dict, athletes: list[dict], awards: dict[str, dict]) -> str:
    slug = f"{market['id']}-{market['slug']}"
    meta = MARKET_COPY[slug]
    header = [
        f"# Radio Media Kit — {market['title']}",
        "",
        f"**Market ID:** {market['id']}",
        f"**Communities:** {', '.join(market['communities'])}",
        f"**Athletes in kit:** {len(athletes)}",
        "",
        section_1(market, meta).strip(),
        "",
        SECTION_2.strip(),
        "",
        SECTION_3.strip(),
        "",
        section_4(market, meta, athletes, awards).strip(),
        "",
        section_5(market, meta, athletes, awards).strip(),
        "",
    ]
    return "\n".join(header)


def run_qa(kits: list[dict]) -> str:
    issues: list[str] = []
    checks_passed: list[str] = []
    forbidden = [
        "TODO",
        "Sample Radio Reads",
        "Cover Letter",
        "About 127 Sports Intensity",
        "2025–2026 Shooting Challenge",
        "Frozen for this release",
        "[anchor name]",
        "[station name]",
    ]
    old_patterns = [r"\[[^\]]+\]\(https?://"]

    for kit in kits:
        folder = Path(kit["folder"])
        path = folder / "RADIO-MEDIA-KIT.md"
        label = kit["id_slug"]

        if not folder.is_dir():
            issues.append(f"{label}: folder missing")
            continue
        if not path.is_file():
            issues.append(f"{label}: RADIO-MEDIA-KIT.md missing")
            continue

        text = path.read_text(encoding="utf-8")
        for sec in (
            "## 1. Introduction Letter",
            "## 2. The Story Behind 127 Sports Intensity",
            "## 3. Statewide Challenge Statistics",
            "## 4. Local Athlete Highlights",
            "## 5. Suggested On-Air Copy",
        ):
            if sec not in text:
                issues.append(f"{label}: missing `{sec}`")

        for term in forbidden:
            if term in text:
                issues.append(f"{label}: contains forbidden `{term}`")

        for pat in old_patterns:
            if re.search(pat, text):
                issues.append(f"{label}: contains Markdown link")

        if EVENT not in text:
            issues.append(f"{label}: missing event name")
        if LEADERBOARD not in text:
            issues.append(f"{label}: missing leaderboard URL")
        if "### Approximately 45 Seconds" not in text:
            issues.append(f"{label}: missing 45-second read")
        if "### Approximately 2 Minutes" not in text:
            issues.append(f"{label}: missing 2-minute read")
        if "**[OPTIONAL COMMERCIAL BREAK]**" not in text:
            issues.append(f"{label}: missing commercial break marker")

        if kit["athlete_count_resolved"] != kit["athlete_count_requested"]:
            issues.append(
                f"{label}: athlete count mismatch "
                f"({kit['athlete_count_resolved']} vs {kit['athlete_count_requested']})"
            )

    if len(kits) == 12:
        checks_passed.append("All 12 market folders processed")
    else:
        issues.append(f"Expected 12 kits, got {len(kits)}")

    total_assigned = sum(k["athlete_count_resolved"] for k in kits)
    if total_assigned == 65:
        checks_passed.append("All 65 qualifying athletes assigned (sum = 65)")
    else:
        issues.append(f"Total athletes assigned = {total_assigned}, expected 65")

    lines = [
        "# Radio Media Kit QA Report",
        "",
        f"Generated: {datetime.now(timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M %Z')}",
        "",
        "## Summary",
        "",
    ]
    if issues:
        lines.append(f"**Status:** FAIL — {len(issues)} issue(s)")
    else:
        lines.append("**Status:** PASS — all checks cleared")
    lines.extend(["", "## Standard checklist", ""])
    mark = "x" if not issues else " "
    checklist = [
        "All 12 folders exist",
        "All 12 kits have Sections 1–5",
        "No kit contains `TODO`",
        "No kit contains `Sample Radio Reads`",
        "No kit contains Markdown links",
        "No kit contains old event names",
        f"Every kit uses `{EVENT}`",
        f"Every kit includes `{LEADERBOARD}`",
        "Every kit has a 45-second read",
        "Every kit has a 2-minute read",
        "Every 2-minute read includes `[OPTIONAL COMMERCIAL BREAK]`",
        "Athlete counts match approved radio market list",
        "No athlete dropped (65 total)",
    ]
    for item in checklist:
        lines.append(f"- [{mark}] {item}")

    lines.extend(["", "## Kits", "", "| ID | Market | Athletes |", "|----|--------|----------|"])
    for k in kits:
        lines.append(
            f"| {k['market_id']} | {k['market_title']} | {k['athlete_count_resolved']} |"
        )

    if issues:
        lines.extend(["", "## Issues", ""])
        for i in issues:
            lines.append(f"- {i}")

    return "\n".join(lines) + "\n"


def main() -> None:
    athletes = load_athletes()
    awards = load_awards()
    all_rows = list(athletes.values())
    statewide_stats(all_rows)  # validate data loads

    kits_meta: list[dict] = []
    assigned: set[str] = set()

    for market in MARKETS:
        slug = f"{market['id']}-{market['slug']}"
        folder = OUT / slug
        folder.mkdir(parents=True, exist_ok=True)

        resolved: list[dict] = []
        for name in market["athletes"]:
            row, err = resolve_athlete(name, athletes)
            if err:
                raise RuntimeError(f"{slug}: {err}")
            resolved.append(row)
            assigned.add(row["enrollment_id"])

        resolved.sort(key=athlete_sort_key)
        kit_text = build_kit(market, resolved, awards)
        (folder / "RADIO-MEDIA-KIT.md").write_text(kit_text, encoding="utf-8", newline="\n")

        kits_meta.append(
            {
                "folder": str(folder),
                "id_slug": slug,
                "market_id": market["id"],
                "market_title": market["title"],
                "athlete_count_requested": len(market["athletes"]),
                "athlete_count_resolved": len(resolved),
                "athletes": [clean_name(r["athlete_name"]) for r in resolved],
            }
        )

    unassigned = [r["athlete_name"] for r in all_rows if r["enrollment_id"] not in assigned]
    if unassigned:
        raise RuntimeError(f"Unassigned athletes: {unassigned}")

    qa = run_qa(kits_meta)
    (OUT / "RADIO-KIT-QA-REPORT.md").write_text(qa, encoding="utf-8", newline="\n")
    print(f"Regenerated {len(kits_meta)} kits -> {OUT}")
    print(qa.splitlines()[6])  # status line


if __name__ == "__main__":
    main()
