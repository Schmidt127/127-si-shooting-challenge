# 2025–26 publicity close-out

End-of-season media for **65** athletes with 10+ counted shots. Built from Award Recipients + enrollment data after June 29, 2026 finalization.

## Deliverables

| Channel | Location | Status |
|---------|----------|--------|
| **Newspapers** | [newspapers/](./newspapers/) | 10 regional packets + `*-SEND-READY.zip` |
| **Radio** | [radio/](./radio/) | 12 market kits (`RADIO-MEDIA-KIT.md` + `EMAIL-TO-STATION.txt`) |
| **Facebook** | [facebook/](./facebook/) | Not started — placeholder |
| **Photos** | Per-packet `Photos/` under newspapers; [photos/](./photos/) for future consolidated set |
| **Captions** | `04 Photo Captions.docx` in each packet; [captions/](./captions/) for exports |
| **Award articles** | Main/short articles in each packet; [award-articles/](./award-articles/) for masters |

## Source data

| File | Purpose |
|------|---------|
| `newspapers/packet-plan-summary.md` | Coverage counts (65 athletes, 91 newspaper rows, 13 radio options) |
| `newspapers/award-recognition-export.csv` | Airtable export driving packet assignment |
| `newspapers/athlete-school-town-index.csv` | City/town → outlet cluster mapping |
| `newspapers/headshot-inventory.csv` | Headshot URL inventory |
| `Award Recipients-Grid view from June 29 FINAL.csv` | Repo-root reference snapshot |

## Regenerate

From `tools/airtable/` (requires `.env` with Airtable PAT):

```bash
python _build_town_packet.py --help
python _build_radio_media_kits.py
```

Outputs land under this folder via `media_paths.py`.

## Manual steps (2025–26)

1. Coach selects radio stations per `newspapers/local-media-research-notes.md`.
2. Paste finalized article copy into packet docx where scripts left `PASTE FINAL TEXT FROM CHATGPT HERE`.
3. Run manual review checklist in each packet before zipping for editors.
