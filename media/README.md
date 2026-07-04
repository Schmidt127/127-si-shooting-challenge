# Media & publicity assets

Season-scoped publicity outputs for the Shooting Challenge — newspapers, radio, social, photos, captions, and award articles. Kept separate from Airtable automations, the web app, and one-off Python tooling in `tools/airtable/`.

## Layout

```
media/
└── {season}/                 # e.g. 2025-2026
    ├── newspapers/           # Editor packets (articles, emails, checklists, zips)
    ├── radio/                # Station media kits + EMAIL-TO-STATION drafts
    ├── facebook/             # Social posts and graphics
    ├── photos/               # Consolidated headshots (optional; also per-packet)
    ├── captions/             # Standalone caption exports
    ├── award-articles/       # Long-form award / recognition copy
    ├── templates/            # Reusable doc/email/social templates
    └── future-enhancements/  # Roadmap for platform integration
```

## Build tooling

Python generators live in `tools/airtable/` (e.g. `_build_town_packet.py`, `_build_radio_media_kits.py`). They read verified Airtable data and write into `media/{season}/`.

Path constants: `tools/airtable/media_paths.py`.

## 2025–26 status

See [2025-2026/README.md](./2025-2026/README.md).

## Platform vision (2026–27+)

After awards are finalized, an operator should click **Generate Media Kits** and receive the full package from verified Airtable data — no manual CSV exports or ChatGPT paste steps.

Roadmap: [2025-2026/future-enhancements/ROADMAP.md](./2025-2026/future-enhancements/ROADMAP.md) · backlog item **V2-028** in [docs/v2-change-backlog.md](../docs/v2-change-backlog.md).

## Git notes

- Small text assets (`.md`, `.csv`, `.txt`) belong in git.
- Large binaries (`.jpg`, `.zip`, `.docx` send-ready packages) may stay local until you choose LFS or a release archive — document what was sent in each season README.
