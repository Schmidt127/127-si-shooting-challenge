# Morning distribution list — Saturday Jul 11, 2026

Resumed from overnight publicity sprint (interrupted Jul 10 evening). Scan + zip scripts confirmed **Jul 11 ~8:40 AM**.

---

## Quick status

| Area | Status |
|------|--------|
| **Radio kits (12 markets)** | Ready — attach `RADIO-MEDIA-KIT.docx`, body from `EMAIL-TO-STATION.txt` |
| **Newspaper packets (10 folders)** | Structurally complete — all 10 have `*-SEND-READY.zip` |
| **Placeholder text** | Still in packets **04**, **09**, **10** (see below) |
| **City regrouping** | Blocked — waiting on Mike's revised town map |

---

## Priority 1 — Radio (send today)

Folder: `media/2025-2026/radio/`

| # | Market folder | Athletes | Contact status |
|---|---------------|----------|----------------|
| 01 | `01-ksen-shelby` | Shelby area | **Lookup needed** |
| 02 | `02-great-falls` | North-central | KFBB 406-453-4370; KMON — email not found |
| 03 | `03-helena` | Helena | **Lookup needed** |
| 04 | `04-lewistown` | Lewistown | **Lookup needed** |
| 05 | `05-bozeman-manhattan` | Gallatin + MC | YPR `news@ypradio.org` (Ruth Eddy) |
| 06 | `06-missoula` | Missoula | MTPR `news@mtpr.org` (Eric Whitney); KTMF 406-721-NEWS |
| 07 | `07-billings` | Billings/Bridger | KULR `News@kulr.com`; YPR `news@ypradio.org` |
| 08 | `08-butte-anaconda` | Butte-Anaconda | **Lookup needed** |
| 09 | `09-madison-county` | Madison County | **Lookup needed** |
| 10 | `10-wibaux` | Wibaux | **Lookup needed** |
| 11 | `11-wolf-point` | Wolf Point | **Lookup needed** |
| 12 | `12-magic-valley` | Declo (ID) | **Lookup needed** |

**Per station:** open folder → copy `EMAIL-TO-STATION.txt` → attach `RADIO-MEDIA-KIT.docx`.

QA docs: `FINAL-RADIO-REVIEW.md`, `RADIO-KIT-QA-REPORT.md`, `BUILD-SUMMARY.md`

---

## Priority 2 — Newspapers (paste copy, then send)

Folder: `media/2025-2026/newspapers/final-packets/`

| Packet | Athletes | Photos | SEND-READY zip | Blockers |
|--------|----------|--------|--------------|----------|
| 01-belgrade-bozeman-manhattan-christian | 14 | 14 | Yes | Paste final articles if not done |
| 02-missoula-area-st-joes-frenchtown | 8 | 8 | Yes | — |
| 03-north-central-montana | 23 | 23 | Yes | — |
| 04-billings-yellowstone-bridger-wibaux | 14 | 14 | Yes | **03 Editor Email.txt has placeholder** |
| 05-butte-anaconda | 1 | 1 | Yes | — |
| 06-madison-county | 3 | 3 | Yes | — |
| 07-bitterroot | 1 | 1 | Yes | — |
| 08-declo-magic-valley | 1 | 1 | Yes | — |
| 09-wolf-point | 1 | 1 | Yes | **04 Photo Captions.docx has placeholder** |
| 10-boulder-clancy-helena-butte | 2 | 2 | Yes | **03 Editor Email has placeholder** |

**After pasting final copy:** rebuild zips from `tools/airtable/`:

```bash
python _build_send_ready_zip.py
```

Or one packet: `python _build_send_ready_zip.py 04-billings-yellowstone-bridger-wibaux`

**Per editor:** attach `*-SEND-READY.zip`, body from `03 Editor Email.txt`.

Newspaper contacts (`local-newspaper-targets.csv`) — all show `not found`; look up on each outlet's About/Contact page.

---

## Priority 3 — City groupings (do not rebuild yet)

Mike flagged awkward overlaps Jul 4. **Do not regroup packets** until Mike sends revised map:

- William Buresh (Clancy) in packets **03** and **10**
- Maizee Mitchell (Anaconda) in packets **05** and **10**
- Kinsley Heggen (Townsend) in packets **03** and **06**
- Wibaux lumped with Billings in **04**
- Packet **10** title includes Boulder/Helena but no athletes from those towns

---

## Priority 4 — ChatGPT editorial pass

Paste final articles into each packet:

1. `01 Article - Main Version.docx`
2. `02 Article - Short Version.docx`
3. `03 Editor Email` (txt or docx)
4. `04 Photo Captions.docx`

Then rebuild SEND-READY zips (command above).

Data for writing: `athlete-master-export.csv`, `award-recognition-export.csv`, `packet-plan-summary.md`

---

## Key numbers (use these, not Airtable rollups)

- **122** satisfactory homework submissions
- **129** coach-reviewed videos
- **65** qualifying athletes (10+ counted shots)
- Leaderboard: `www.fairfieldbasketballclub.com/leaderboard`
- Riley Geraghty = only statewide G.O.A.T.

---

## Overnight work completed (Jul 10–11)

- Created `tools/airtable/_scan_packet_status.py`
- Created `tools/airtable/_build_send_ready_zip.py`
- Confirmed all 10 SEND-READY zips exist
- This morning list (was missing when session died)

---

## Not done tonight (manual / blocked)

- [ ] Look up radio station emails (7+ markets)
- [ ] Look up newspaper editor emails (all 15 outlets in CSV)
- [ ] Paste final article copy (ChatGPT)
- [ ] Confirm city regrouping with Mike
- [ ] Commit helper scripts (when Mike asks)
