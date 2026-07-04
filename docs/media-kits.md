# Media kits — publicity system

End-of-season publicity for newspapers, radio, social, and related assets. Season outputs live in [`media/`](../media/); generators live in [`tools/airtable/`](../tools/airtable/).

## Quick links

| Doc | Purpose |
|-----|---------|
| [media/README.md](../media/README.md) | Folder layout and git notes |
| [media/2025-2026/README.md](../media/2025-2026/README.md) | Current season status |
| [media/2025-2026/future-enhancements/ROADMAP.md](../media/2025-2026/future-enhancements/ROADMAP.md) | **Generate Media Kits** platform plan |
| [v2-change-backlog.md](./v2-change-backlog.md) | Backlog **V2-028** |

## Path constants

`tools/airtable/media_paths.py` — single source for `media/{season}/` paths. All `_build_*` scripts import from here.

## 2025–26 close-out

| Channel | Path | Builder |
|---------|------|---------|
| Newspapers | `media/2025-2026/newspapers/final-packets/` | `_build_town_packet.py`, `_build_*_packet.py` |
| Radio | `media/2025-2026/radio/` | `_build_radio_media_kits.py` |
| Facebook | `media/2025-2026/facebook/` | Not built yet |

Data gate: Award Recipients finalized (see [PROJECT_STATE.md](./PROJECT_STATE.md) — June 29 snapshot).

## 2026–27 target

One-click **Generate Media Kits** from verified Airtable data after awards close — no manual CSV export or ChatGPT paste step. See ROADMAP for phased delivery (config tables → generator service → ops UI).
